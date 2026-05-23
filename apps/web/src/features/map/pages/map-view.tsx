import { useCallback, useEffect, useMemo, useReducer, useRef, type RefObject } from "react"
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
import { cn } from "@/shared/utils/format"
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"
import { useMapStyle } from "@/hooks/use-map-style"
import { Skeleton } from "@/components/ui/skeleton"
import type { EventWithDetails } from "@/shared/types"
import {
  ClusterBubble,
  EventListItem,
  EventPopup,
  UserLocationDot,
  type MappedEvent,
} from "@/features/map/components/map-pieces"
import { EventPin } from "@/features/events/components/event-pin"
import { useClusters, type ClusterOrPoint } from "@/features/map/hooks/use-clusters"
import { useUserLocation } from "@/features/map/hooks/use-user-location"
import { dateBucket, isCityCentroidCoordinate } from "@/features/map/lib/map-helpers"
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
  const { popupEvent, hoveredId, showPastEvents, viewState } = mapState

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

  const eventsWithCoords: MappedEvent[] = useMemo(() => events.filter(hasCoords), [events])
  const mappable: MappedEvent[] = useMemo(
    () => eventsWithCoords.filter((event) => !isCityCentroidCoordinate(event, selectedCity)),
    [eventsWithCoords, selectedCity]
  )

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
    <div className="flex flex-col h-[calc(100dvh-3.5rem-5rem)] md:h-[calc(100dvh-3.5rem-3rem)] overflow-hidden">
      <MapViewHeader
        isCitiesLoading={isCitiesLoading}
        isEventsLoading={isEventsLoading}
        unmappedCount={events.length - mappable.length}
        mappableCount={mappable.length}
        mobilePane={mapState.mobilePane}
        selectedCity={selectedCity}
        showPastEvents={showPastEvents}
        onShowList={() => setMapState({ mobilePane: "list" })}
        onShowMap={() => setMapState({ mobilePane: "map" })}
        onTogglePastEvents={() =>
          setMapState((state) => ({ showPastEvents: !state.showPastEvents }))
        }
      />
      {bodyKey === "map-city-loading" ? (
        <div className="p-4 lg:p-6 flex-1 min-h-0">
          <Skeleton className="size-full min-h-[400px] rounded-2xl" />
        </div>
      ) : bodyKey === "map-empty" ? (
        <MapEmptyState />
      ) : (
        <div className="flex-1 min-h-0 grid md:grid-cols-[minmax(280px,360px)_1fr]">
          <MapEventList
            handleSelectEvent={handleSelectEvent}
            hoveredId={hoveredId}
            mobilePane={mapState.mobilePane}
            popupEvent={popupEvent}
            sortedList={sortedList}
            userLocation={userLocation}
            onHoverEvent={(hoveredId) => setMapState({ hoveredId })}
          />
          <MapCanvas
            centerLat={centerLat}
            centerLng={centerLng}
            clusters={clusters}
            eventById={eventById}
            expand={expand}
            handleLoad={handleLoad}
            handleMove={handleMove}
            hoveredId={hoveredId}
            locationStatus={locationStatus}
            mapRef={mapRef}
            mapStyle={mapStyle}
            mobilePane={mapState.mobilePane}
            popupEvent={popupEvent}
            requestLocation={requestLocation}
            userLocation={userLocation}
            onClosePopup={() => setMapState({ popupEvent: null })}
            onHoverEvent={(hoveredId) => setMapState({ hoveredId })}
            onSelectEvent={(popupEvent) => setMapState({ popupEvent })}
          />
        </div>
      )}
    </div>
  )
}

interface MapViewHeaderProps {
  isCitiesLoading: boolean
  isEventsLoading: boolean
  mappableCount: number
  unmappedCount: number
  mobilePane: MapViewState["mobilePane"]
  selectedCity: SelectedCity
  showPastEvents: boolean
  onShowList: () => void
  onShowMap: () => void
  onTogglePastEvents: () => void
}

interface MapEventListProps {
  handleSelectEvent: (event: MappedEvent) => void
  hoveredId: string | null
  mobilePane: MapViewState["mobilePane"]
  popupEvent: MappedEvent | null
  sortedList: MappedEvent[]
  userLocation: UserLocation
  onHoverEvent: (eventId: string | null) => void
}

interface MapCanvasProps {
  centerLat: number | null | undefined
  centerLng: number | null | undefined
  clusters: ClusterOrPoint[]
  eventById: Map<string, MappedEvent>
  expand: (clusterId: number) => number
  handleLoad: () => void
  handleMove: (event: ViewStateChangeEvent) => void
  hoveredId: string | null
  locationStatus: LocationStatus
  mapRef: RefObject<MapRef | null>
  mapStyle: ReturnType<typeof useMapStyle>
  mobilePane: MapViewState["mobilePane"]
  popupEvent: MappedEvent | null
  requestLocation: () => void
  userLocation: UserLocation
  onClosePopup: () => void
  onHoverEvent: (eventId: string | null) => void
  onSelectEvent: (event: MappedEvent) => void
}

interface MapLocationControlProps {
  locationStatus: LocationStatus
  requestLocation: () => void
}

interface MapUserLocationMarkerProps {
  userLocation: UserLocation
}

interface MapClusterMarkersProps {
  clusters: ClusterOrPoint[]
  eventById: Map<string, MappedEvent>
  expand: (clusterId: number) => number
  hoveredId: string | null
  mapRef: RefObject<MapRef | null>
  popupEvent: MappedEvent | null
  onHoverEvent: (eventId: string | null) => void
  onSelectEvent: (event: MappedEvent) => void
}

interface MapEventPopupProps {
  popupEvent: MappedEvent | null
  userLocation: UserLocation
  onClose: () => void
}

function MapViewHeader({
  isCitiesLoading,
  isEventsLoading,
  mappableCount,
  unmappedCount,
  mobilePane,
  selectedCity,
  showPastEvents,
  onShowList,
  onShowMap,
  onTogglePastEvents,
}: MapViewHeaderProps) {
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
          variant="outline"
          onClick={onTogglePastEvents}
          className={cn(
            "h-8 gap-1.5 text-xs focus-visible:border-accent-secondary focus-visible:ring-accent-secondary/30",
            showPastEvents
              ? "border-accent-secondary bg-accent-secondary text-surface hover:bg-accent-secondary/90 hover:text-surface"
              : "border-border/70 bg-surface hover:bg-accent-secondary-soft hover:text-accent-secondary"
          )}
        >
          <Clock className="size-3.5" />
          Past events
        </Button>
        {unmappedCount > 0 && (
          <Badge variant="outline" className="text-xs hidden sm:inline-flex">
            {unmappedCount} need precise coords
          </Badge>
        )}
        <div className="flex md:hidden border border-border/60 rounded-md overflow-hidden">
          <MapPaneToggle isActive={mobilePane === "map"} label="Map" onClick={onShowMap} />
          <MapPaneToggle isActive={mobilePane === "list"} label="List" onClick={onShowList} />
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
        isActive ? "bg-accent-primary text-surface" : "text-muted-foreground"
      }`}
    >
      {label}
    </button>
  )
}

function MapEmptyState() {
  return (
    <div className="p-4 lg:p-6 flex-1 min-h-0 overflow-auto">
      <Card className="border-border/60">
        <CardContent className="p-8 text-center space-y-3">
          <MapPin className="size-8 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-semibold">No events with precise locations yet</h2>
          <p className="text-sm text-muted-foreground">
            Published events need venue-level latitude + longitude to appear on the map. Try a
            different city or switch to the explore view.
          </p>
          <Button
            asChild
            variant="outline"
            className="border-accent-primary bg-accent-primary text-surface hover:bg-accent-primary/90 hover:text-surface focus-visible:border-accent-primary focus-visible:ring-accent-primary/30"
          >
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
  mobilePane,
  popupEvent,
  sortedList,
  userLocation,
  onHoverEvent,
}: MapEventListProps) {
  return (
    <aside
      className={`${mobilePane === "list" ? "flex" : "hidden md:flex"} flex-col border-r border-border/60 bg-background/50 min-h-0`}
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
            onHover={onHoverEvent}
            onSelect={handleSelectEvent}
          />
        ))}
      </div>
    </aside>
  )
}

function MapCanvas({
  centerLat,
  centerLng,
  clusters,
  eventById,
  expand,
  handleLoad,
  handleMove,
  hoveredId,
  locationStatus,
  mapRef,
  mapStyle,
  mobilePane,
  popupEvent,
  requestLocation,
  userLocation,
  onClosePopup,
  onHoverEvent,
  onSelectEvent,
}: MapCanvasProps) {
  const clusterMarkerProps: MapClusterMarkersProps = {
    clusters,
    eventById,
    expand,
    hoveredId,
    mapRef,
    popupEvent,
    onHoverEvent,
    onSelectEvent,
  }

  return (
    <div className={`${mobilePane === "map" ? "block" : "hidden md:block"} relative min-h-0`}>
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
        <MapLocationControl locationStatus={locationStatus} requestLocation={requestLocation} />
        <MapUserLocationMarker userLocation={userLocation} />
        <MapClusterMarkers {...clusterMarkerProps} />
        <MapEventPopup popupEvent={popupEvent} userLocation={userLocation} onClose={onClosePopup} />
      </MapGL>
    </div>
  )
}

function MapLocationControl({ locationStatus, requestLocation }: MapLocationControlProps) {
  return (
    <div className="absolute top-2 right-2 z-10">
      <Button
        size="sm"
        variant="outline"
        onClick={requestLocation}
        disabled={locationStatus === "loading"}
        className={cn(
          "gap-1.5 h-8 text-xs shadow focus-visible:border-accent-tertiary focus-visible:ring-accent-tertiary/30",
          locationStatus === "granted"
            ? "border-accent-tertiary bg-accent-tertiary text-surface hover:bg-accent-tertiary/90 hover:text-surface"
            : "border-border/70 bg-surface/90 hover:bg-accent-tertiary-soft hover:text-accent-tertiary"
        )}
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

function MapUserLocationMarker({ userLocation }: MapUserLocationMarkerProps) {
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
  onHoverEvent,
  onSelectEvent,
}: MapClusterMarkersProps) {
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
              onSelectEvent(event)
            }}
          >
            <button
              type="button"
              aria-label={event.title}
              onMouseEnter={() => onHoverEvent(event.id)}
              onMouseLeave={() => onHoverEvent(null)}
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

function MapEventPopup({ popupEvent, userLocation, onClose }: MapEventPopupProps) {
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
      onClose={onClose}
      maxWidth="280px"
    >
      <EventPopup event={popupEvent} userLocation={userLocation} />
    </Popup>
  )
}
