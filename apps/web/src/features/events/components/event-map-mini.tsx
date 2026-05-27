import { useEffect, useRef } from "react"
import { Map as MapGL, Marker, NavigationControl, Popup, type MapRef } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import { useMapStyle } from "@/shared/hooks/use-map-style"
import { EventPin } from "@/features/events/components/event-pin"
import { dateBucket, isCityCentroidCoordinate } from "@/features/map/lib/map-helpers"

const INITIAL_ZOOM = 10

interface EventMapMiniProps {
  latitude: number | null
  longitude: number | null
  cityLatitude?: number | null
  cityLongitude?: number | null
  venueName?: string | null
  address?: string | null
  startDatetime?: string | null
}

export function EventMapMini({
  latitude,
  longitude,
  cityLatitude,
  cityLongitude,
  venueName,
  address,
  startDatetime,
}: EventMapMiniProps) {
  const bucket = startDatetime ? dateBucket(startDatetime) : "soon"
  const mapStyle = useMapStyle()
  const mapRef = useRef<MapRef>(null)

  // Treat city-centroid coordinates as a placeholder rather than a real venue
  // pin — the enrichment pipeline seeds them on insert and overwrites once
  // Nominatim returns a precise hit. Drawing a confident pin at the centroid
  // would mislead the user about where the venue actually is.
  const isCentroidPlaceholder = isCityCentroidCoordinate(
    { latitude, longitude },
    cityLatitude != null && cityLongitude != null
      ? { latitude: cityLatitude, longitude: cityLongitude }
      : null
  )

  // Re-center if the event coordinates change after first render.
  useEffect(() => {
    if (latitude == null || longitude == null || isCentroidPlaceholder) return
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      zoom: INITIAL_ZOOM,
      speed: 1.2,
      essential: true,
    })
  }, [latitude, longitude, isCentroidPlaceholder])

  // No coordinates at all — nothing to show
  if (latitude == null || longitude == null) {
    return (
      <div className="rounded-xl bg-muted/50 border border-border/60 h-36 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Location not mapped</p>
      </div>
    )
  }

  // Centroid placeholder — show map at city zoom but suppress the address popup
  // so the pin isn't mistaken for the exact venue. The address text above the
  // map already tells the user where to go; the map just gives city context.
  const showPopup = !isCentroidPlaceholder && (venueName || address)

  return (
    <div className="rounded-xl overflow-hidden border border-border/60 h-48">
      <MapGL
        ref={mapRef}
        initialViewState={{ longitude, latitude, zoom: isCentroidPlaceholder ? 11 : INITIAL_ZOOM }}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        attributionControl={{ compact: true }}
        scrollZoom={false}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Marker longitude={longitude} latitude={latitude} anchor="bottom">
          <EventPin bucket={bucket} highlighted={false} />
        </Marker>
        {showPopup && (
          <Popup
            longitude={longitude}
            latitude={latitude}
            anchor="bottom"
            offset={36}
            closeButton={false}
            closeOnClick={false}
          >
            {venueName && <p className="font-semibold text-sm text-foreground">{venueName}</p>}
            {address && <p className="text-xs text-muted-foreground">{address}</p>}
          </Popup>
        )}
      </MapGL>
    </div>
  )
}
