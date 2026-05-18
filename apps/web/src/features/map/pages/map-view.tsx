import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type RefObject,
} from "react"
import { Link } from "react-router-dom"
import {
  Map as MapGL,
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import { Clock, Locate, List, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useApp } from "@/app/stores/app-store"
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"
import { useMapStyle } from "@/hooks/use-map-style"
import { Skeleton } from "@/components/ui/skeleton"
import type { EventWithDetails } from "@/lib/types"
import {
  ClusterBubble,
  EventListItem,
  EventPin,
  EventPopup,
  UserLocationDot,
  type MappedEvent,
} from "@/features/map/components/map-pieces"
import { useClusters, type ClusterOrPoint } from "@/features/map/hooks/use-clusters"
import { useUserLocation } from "@/features/map/hooks/use-user-location"
import { dateBucket } from "@/features/map/lib/map-helpers"
import type { PointFeature } from "supercluster"

function hasCoords(
  e: EventWithDetails
): e is EventWithDetails & { latitude: number; longitude: number } {
  return typeof e.latitude === "number" && typeof e.longitude === "number"
}

function isClusterFeature(
  f: ClusterOrPoint
): f is Extract<ClusterOrPoint, { properties: { cluster: true } }> {
  return Boolean((f.properties as { cluster?: boolean }).cluster)
}

interface MapViewState {
  popupEvent: MappedEvent | null
  hoveredId: string | null
  mobilePane: "map" | "list"
  showPastEvents: boolean
  viewState: {
    longitude: number
    latitude: number
    zoom: number
    bounds: [number, number, number, number] | null
  }
}

type MapViewStatePatch = Partial<MapViewState> | ((state: MapViewState) => Partial<MapViewState>)
type MapBodyKey = "map-city-loading" | "map-events-loading" | "map-empty" | "map-content"
type UserLocation = ReturnType<typeof useUserLocation>["location"]
type SelectedCity = ReturnType<typeof useApp>["selectedCity"]
type LocationStatus = ReturnType<typeof useUserLocation>["status"]

function mapViewReducer(state: MapViewState, patch: MapViewStatePatch): MapViewState {
  return { ...state, ...(typeof patch === "function" ? patch(state) : patch) }
}

export function MapViewPage() {
  const { user } = useAuth()
  const { selectedCity, isCitiesLoading } = useApp()
  const mapStyle = useMapStyle()
  const mapRef = useRef<MapRef>(null)

  const [mapState, setMapState] = useReducer(mapViewReducer, {
    popupEvent: null,
    hoveredId: null,
    mobilePane: "map",
    showPastEvents: false,
    // Viewport state drives supercluster's `getClusters(bounds, zoom)` call.
    viewState: {
      longitude: selectedCity?.longitude ?? -98,
      latitude: selectedCity?.latitude ?? 39,
      zoom: 11,
      bounds: null,
    },
  } satisfies MapViewState)
  const { popupEvent, hoveredId, mobilePane, showPastEvents, viewState } = mapState

  const {
    location: userLocation,
    status: locationStatus,
    request: requestLocation,
  } = useUserLocation()

  const { data: events = [], isLoading: isEventsLoading } = useEnrichedEvents({
    cityId: selectedCity?.id,
    userId: user?.id,
    includePast: showPastEvents,
    enabled: Boolean(selectedCity?.id),
  })

  const mappable: MappedEvent[] = useMemo(() => events.filter(hasCoords), [events])

  // Convert events → GeoJSON for supercluster. Memoised so the index isn't
  // rebuilt on every viewport tick.
  const points: PointFeature<{ eventId: string }>[] = useMemo(
    () =>
      mappable.map((event) => ({
        type: "Feature" as const,
        properties: { eventId: event.id },
        geometry: {
          type: "Point" as const,
          coordinates: [event.longitude, event.latitude],
        },
      })),
    [mappable]
  )

  const { clusters, expand } = useClusters({
    points,
    bounds: viewState.bounds,
    zoom: viewState.zoom,
  })

  // Fly to city center when the city selector changes.
  const centerLat = selectedCity?.latitude
  const centerLng = selectedCity?.longitude
  useEffect(() => {
    if (centerLat == null || centerLng == null) return
    mapRef.current?.flyTo({
      center: [centerLng, centerLat],
      zoom: 11,
      speed: 1.2,
      essential: true,
    })
  }, [centerLat, centerLng])

  // Initial-bounds capture: when the map mounts and reports its first viewport,
  // we need the bounds populated so supercluster can render anything.
  const handleLoad = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const b = map.getMap().getBounds()
    setMapState((state) => ({
      viewState: {
        ...state.viewState,
        bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        zoom: map.getZoom(),
      },
    }))
  }, [])

  const handleMove = useCallback((e: ViewStateChangeEvent) => {
    const map = e.target
    const b = map.getBounds()
    setMapState({
      viewState: {
        longitude: e.viewState.longitude,
        latitude: e.viewState.latitude,
        zoom: e.viewState.zoom,
        bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      },
    })
  }, [])

  // Lookup map for O(1) id → event (used by list-click → fly-to-pin and
  // cluster-feature → event resolution).
  const eventById = useMemo(() => {
    const m = new Map<string, MappedEvent>()
    for (const e of mappable) m.set(e.id, e)
    return m
  }, [mappable])

  const handleSelectEvent = useCallback(
    (event: MappedEvent) => {
      setMapState({ popupEvent: event })
      mapRef.current?.flyTo({
        center: [event.longitude, event.latitude],
        zoom: Math.max(13, viewState.zoom),
        speed: 1.4,
        essential: true,
      })
      setMapState({ mobilePane: "map" })
    },
    [viewState.zoom]
  )

  // Sort the list by date ascending — most-imminent first, which lines up with
  // how a parent planning the weekend wants to browse.
  const sortedList = useMemo(
    () =>
      mappable.toSorted(
        (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      ),
    [mappable]
  )

  const bodyKey =
    !selectedCity || centerLat == null || centerLng == null
      ? "map-city-loading"
      : isEventsLoading
        ? "map-events-loading"
        : mappable.length === 0
          ? "map-empty"
          : "map-content"

  return (
    <MapViewShell
      bodyKey={bodyKey}
      centerLat={centerLat}
      centerLng={centerLng}
      clusters={clusters}
      eventById={eventById}
      eventsCount={events.length}
      expand={expand}
      handleLoad={handleLoad}
      handleMove={handleMove}
      handleSelectEvent={handleSelectEvent}
      hoveredId={hoveredId}
      isCitiesLoading={isCitiesLoading}
      isEventsLoading={isEventsLoading}
      locationStatus={locationStatus}
      mapRef={mapRef}
      mapState={mapState}
      mapStyle={mapStyle}
      mappableCount={mappable.length}
      popupEvent={popupEvent}
      requestLocation={requestLocation}
      selectedCity={selectedCity}
      setMapState={setMapState}
      sortedList={sortedList}
      userLocation={userLocation}
    />
  )
}

interface MapViewShellProps {
  bodyKey: MapBodyKey
  centerLat: number | null | undefined
  centerLng: number | null | undefined
  clusters: ClusterOrPoint[]
  eventById: Map<string, MappedEvent>
  eventsCount: number
  expand: (clusterId: number) => number
  handleLoad: () => void
  handleMove: (event: ViewStateChangeEvent) => void
  handleSelectEvent: (event: MappedEvent) => void
  hoveredId: string | null
  isCitiesLoading: boolean
  isEventsLoading: boolean
  locationStatus: LocationStatus
  mapRef: RefObject<MapRef | null>
  mapState: MapViewState
  mapStyle: ReturnType<typeof useMapStyle>
  mappableCount: number
  popupEvent: MappedEvent | null
  requestLocation: () => void
  selectedCity: SelectedCity
  setMapState: Dispatch<MapViewStatePatch>
  sortedList: MappedEvent[]
  userLocation: UserLocation
}

function MapViewShell(props: MapViewShellProps) {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-5rem)] md:h-[calc(100dvh-3.5rem-3rem)] overflow-hidden">
      <MapViewHeader {...props} />
      <MapViewBody {...props} />
    </div>
  )
}

function MapViewHeader({
  eventsCount,
  isCitiesLoading,
  isEventsLoading,
  mapState,
  mappableCount,
  selectedCity,
  setMapState,
}: MapViewShellProps) {
  const { mobilePane, showPastEvents } = mapState

  return (
    <div className="px-4 lg:px-6 py-3 flex items-center justify-between gap-4 border-b border-border/60 shrink-0">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Map</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {!selectedCity || isCitiesLoading
            ? "Loading your city..."
            : isEventsLoading
              ? "Loading events..."
              : mappableCount > 0
                ? `${mappableCount} event${mappableCount === 1 ? "" : "s"} in ${selectedCity.name}`
                : `No mapped events in ${selectedCity.name} yet`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={showPastEvents ? "default" : "outline"}
          onClick={() => setMapState((state) => ({ showPastEvents: !state.showPastEvents }))}
          className="h-8 gap-1.5 text-xs"
        >
          <Clock className="size-3.5" />
          Past events
        </Button>
        {eventsCount > mappableCount && (
          <Badge variant="outline" className="text-xs hidden sm:inline-flex">
            {eventsCount - mappableCount} missing coords
          </Badge>
        )}
        <div className="flex md:hidden border border-border/60 rounded-md overflow-hidden">
          <MapPaneToggle
            isActive={mobilePane === "map"}
            label="Map"
            onClick={() => setMapState({ mobilePane: "map" })}
          />
          <MapPaneToggle
            isActive={mobilePane === "list"}
            label="List"
            onClick={() => setMapState({ mobilePane: "list" })}
          />
        </div>
      </div>
    </div>
  )
}

function MapPaneToggle({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium ${
        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
    </button>
  )
}

function MapViewBody(props: MapViewShellProps) {
  if (props.bodyKey === "map-city-loading") {
    return (
      <div className="p-4 lg:p-6 flex-1 min-h-0">
        <Skeleton className="size-full min-h-[400px] rounded-2xl" />
      </div>
    )
  }

  if (props.bodyKey === "map-empty") {
    return <MapEmptyState />
  }

  return (
    <div className="flex-1 min-h-0 grid md:grid-cols-[minmax(280px,360px)_1fr]">
      <MapEventList {...props} />
      <MapCanvas {...props} />
    </div>
  )
}

function MapEmptyState() {
  return (
    <div className="p-4 lg:p-6 flex-1 min-h-0 overflow-auto">
      <Card className="border-border/60">
        <CardContent className="p-8 text-center space-y-3">
          <MapPin className="size-8 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-semibold">No events with locations yet</h2>
          <p className="text-sm text-muted-foreground">
            Published events need latitude + longitude to appear on the map. Try a different city or
            switch to the explore view.
          </p>
          <Button asChild>
            <Link to="/explore">Browse Explore</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function MapEventList({
  handleSelectEvent,
  hoveredId,
  mapState,
  popupEvent,
  setMapState,
  sortedList,
  userLocation,
}: MapViewShellProps) {
  return (
    <aside
      className={`${
        mapState.mobilePane === "list" ? "flex" : "hidden md:flex"
      } flex-col border-r border-border/60 bg-background/50 min-h-0`}
    >
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/60 flex items-center gap-1">
        <List className="size-3" />
        {sortedList.length} sorted by date
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {sortedList.map((event) => (
          <EventListItem
            key={event.id}
            event={event}
            active={popupEvent?.id === event.id || hoveredId === event.id}
            userLocation={userLocation}
            onHover={(hoveredId) => setMapState({ hoveredId })}
            onSelect={handleSelectEvent}
          />
        ))}
      </div>
    </aside>
  )
}

function MapCanvas(props: MapViewShellProps) {
  const { centerLat, centerLng, handleLoad, handleMove, mapRef, mapState, mapStyle } = props

  return (
    <div className={`${mapState.mobilePane === "map" ? "block" : "hidden md:block"} relative min-h-0`}>
      <MapGL
        ref={mapRef}
        initialViewState={{
          longitude: centerLng!,
          latitude: centerLat!,
          zoom: 11,
        }}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        attributionControl={{ compact: true }}
        onLoad={handleLoad}
        onMove={handleMove}
      >
        <NavigationControl position="top-left" showCompass={false} />
        <MapLocationControl {...props} />
        <MapUserLocationMarker {...props} />
        <MapClusterMarkers {...props} />
        <MapEventPopup {...props} />
      </MapGL>
    </div>
  )
}

function MapLocationControl({ locationStatus, requestLocation }: MapViewShellProps) {
  return (
    <div className="absolute top-2 right-2 z-10">
      <Button
        size="sm"
        variant={locationStatus === "granted" ? "default" : "outline"}
        onClick={requestLocation}
        disabled={locationStatus === "loading"}
        className="gap-1.5 h-8 text-xs shadow"
      >
        <Locate className="size-3.5" />
        {locationStatus === "loading"
          ? "Locating..."
          : locationStatus === "granted"
            ? "You're here"
            : locationStatus === "denied"
              ? "Location blocked"
              : "Use my location"}
      </Button>
    </div>
  )
}

function MapUserLocationMarker({ userLocation }: MapViewShellProps) {
  if (!userLocation) {
    return null
  }

  return (
    <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
      <UserLocationDot />
    </Marker>
  )
}

function MapClusterMarkers({
  clusters,
  eventById,
  expand,
  hoveredId,
  mapRef,
  popupEvent,
  setMapState,
}: MapViewShellProps) {
  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates as [number, number]
        if (isClusterFeature(feature)) {
          const clusterId = feature.id as number
          const count = feature.properties.point_count
          return (
            <Marker
              key={`cluster-${clusterId}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                const targetZoom = expand(clusterId)
                mapRef.current?.flyTo({
                  center: [lng, lat],
                  zoom: Math.min(targetZoom + 0.5, 18),
                  speed: 1.4,
                  essential: true,
                })
              }}
            >
              <ClusterBubble count={count} />
            </Marker>
          )
        }

        const event = eventById.get(feature.properties.eventId)
        if (!event) return null
        const bucket = dateBucket(event.start_datetime)
        return (
          <Marker
            key={event.id}
            longitude={lng}
            latitude={lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              setMapState({ popupEvent: event })
            }}
          >
            <button
              type="button"
              aria-label={event.title}
              onMouseEnter={() => setMapState({ hoveredId: event.id })}
              onMouseLeave={() => setMapState({ hoveredId: null })}
              className="block transition-transform hover:scale-110 active:scale-95"
            >
              <EventPin
                bucket={bucket}
                highlighted={hoveredId === event.id || popupEvent?.id === event.id}
              />
            </button>
          </Marker>
        )
      })}
    </>
  )
}

function MapEventPopup({ popupEvent, setMapState, userLocation }: MapViewShellProps) {
  if (!popupEvent) {
    return null
  }

  return (
    <Popup
      longitude={popupEvent.longitude}
      latitude={popupEvent.latitude}
      anchor="bottom"
      offset={36}
      closeButton
      closeOnClick={false}
      onClose={() => setMapState({ popupEvent: null })}
      maxWidth="280px"
    >
      <EventPopup event={popupEvent} userLocation={userLocation} />
    </Popup>
  )
}
