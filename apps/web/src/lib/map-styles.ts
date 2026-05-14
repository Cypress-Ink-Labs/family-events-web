import type { StyleSpecification } from "maplibre-gl"

const LIBERTY_URL = "https://tiles.openfreemap.org/styles/liberty"

/**
 * Apple Maps Dark-inspired palette.
 * Tuned against Liberty's layer schema (parks, landcover, water, roads,
 * buildings, boundaries, labels). Edit values here to retune the dark map.
 */
const DARK = {
  background: "#10141c",

  park: "#16321d",
  parkOutline: "#1f3a24",
  pitch: "#1c2c20",
  cemetery: "#1a2820",
  hospital: "#221c2a",
  school: "#1d2330",
  residential: "#1c2230",
  track: "#1d2630",

  wood: "#143420",
  grass: "#1a3a22",
  ice: "#2a3b48",
  wetland: "#152838",
  sand: "#2c2823",

  water: "#0d2540",
  waterway: "#143b5e",

  aerowayFill: "#262d3a",
  aerowayLine: "#3a4150",

  // Roads — line color (inside), darker casing (border).
  motorway: "#5a6373",
  motorwayCasing: "#3a4351",
  motorwayLink: "#454e5e",
  motorwayLinkCasing: "#32384a",
  trunkPrimary: "#4a5260",
  trunkPrimaryCasing: "#2e3540",
  secondaryTertiary: "#3e4654",
  secondaryTertiaryCasing: "#2a323c",
  street: "#343a4a",
  streetCasing: "#252a36",
  minor: "#2c3240",
  minorCasing: "#1e232c",
  link: "#343a4a",
  linkCasing: "#252a36",
  service: "#262c38",
  serviceCasing: "#1c2129",
  path: "#2c3343",
  rail: "#3a4250",
  railHatching: "#10141c",

  building: "#1c2334",
  buildingOutline: "#10141c",
  building3d: "#202740",

  boundary: "#3a4250",
  boundaryDisputed: "#5a4250",

  // Labels
  textPlace: "#e6ebf5",
  textPoi: "#bdc4d2",
  textGeneric: "#c8cfdc",
  textWater: "#7aa5c4",
  textHalo: "#0a0d14",
} as const

function paint(layer: { paint?: Record<string, unknown> }, key: string, value: unknown) {
  layer.paint = { ...layer.paint, [key]: value }
}

/**
 * Walk Liberty layers and rewrite paint properties to dark equivalents.
 * Liberty uses stable ids (e.g. "park", "road_motorway"), which makes this
 * a maintainable mapping rather than a regex fight.
 */
function darkenLibertyStyle(style: StyleSpecification): StyleSpecification {
  for (const rawLayer of style.layers) {
    const layer = rawLayer as Record<string, unknown> & {
      id: string
      type: string
      paint?: Record<string, unknown>
      layout?: Record<string, unknown>
    }
    const id = layer.id
    const sl = layer["source-layer"] as string | undefined
    const type = layer.type

    if (id === "natural_earth") {
      // Hillshade in dark mode would tint brown — hide it.
      layer.layout = { ...layer.layout, visibility: "none" }
      continue
    }

    if (type === "background") {
      layer.paint = { "background-color": DARK.background }
      continue
    }

    // Parks
    if (id === "park") {
      paint(layer, "fill-color", DARK.park)
      paint(layer, "fill-opacity", 0.7)
      continue
    }
    if (id === "park_outline") {
      paint(layer, "line-color", DARK.parkOutline)
      paint(layer, "line-opacity", 0.6)
      continue
    }

    // Landuse
    if (id === "landuse_residential") {
      paint(layer, "fill-color", DARK.residential)
      continue
    }
    if (id === "landuse_pitch") {
      paint(layer, "fill-color", DARK.pitch)
      continue
    }
    if (id === "landuse_track") {
      paint(layer, "fill-color", DARK.track)
      continue
    }
    if (id === "landuse_cemetery") {
      paint(layer, "fill-color", DARK.cemetery)
      continue
    }
    if (id === "landuse_hospital") {
      paint(layer, "fill-color", DARK.hospital)
      continue
    }
    if (id === "landuse_school") {
      paint(layer, "fill-color", DARK.school)
      continue
    }

    // Landcover
    if (id === "landcover_wood") {
      paint(layer, "fill-color", DARK.wood)
      continue
    }
    if (id === "landcover_grass") {
      paint(layer, "fill-color", DARK.grass)
      continue
    }
    if (id === "landcover_ice") {
      paint(layer, "fill-color", DARK.ice)
      continue
    }
    if (id === "landcover_wetland") {
      paint(layer, "fill-color", DARK.wetland)
      continue
    }
    if (id === "landcover_sand") {
      paint(layer, "fill-color", DARK.sand)
      continue
    }

    // Water
    if (id === "water") {
      paint(layer, "fill-color", DARK.water)
      continue
    }
    if (sl === "waterway" && type === "line") {
      paint(layer, "line-color", DARK.waterway)
      continue
    }

    // Aeroway
    if (id === "aeroway_fill") {
      paint(layer, "fill-color", DARK.aerowayFill)
      continue
    }
    if (id === "aeroway_runway" || id === "aeroway_taxiway") {
      paint(layer, "line-color", DARK.aerowayLine)
      continue
    }

    // Buildings
    if (id === "building") {
      paint(layer, "fill-color", DARK.building)
      paint(layer, "fill-outline-color", DARK.buildingOutline)
      continue
    }
    if (id === "building-3d") {
      paint(layer, "fill-extrusion-color", DARK.building3d)
      continue
    }

    // Boundaries
    if (sl === "boundary" && type === "line") {
      paint(layer, "line-color", id.includes("disputed") ? DARK.boundaryDisputed : DARK.boundary)
      continue
    }

    // Roads (transportation source-layer, line type)
    if (sl === "transportation" && type === "line") {
      const isCasing = id.includes("casing")
      const isHatching = id.includes("hatching")

      if (id.includes("rail")) {
        paint(layer, "line-color", isHatching ? DARK.railHatching : DARK.rail)
        continue
      }
      if (id.includes("motorway") && !id.includes("link")) {
        paint(layer, "line-color", isCasing ? DARK.motorwayCasing : DARK.motorway)
        continue
      }
      if (id.includes("motorway_link")) {
        paint(layer, "line-color", isCasing ? DARK.motorwayLinkCasing : DARK.motorwayLink)
        continue
      }
      if (id.includes("trunk_primary")) {
        paint(layer, "line-color", isCasing ? DARK.trunkPrimaryCasing : DARK.trunkPrimary)
        continue
      }
      if (id.includes("secondary_tertiary")) {
        paint(layer, "line-color", isCasing ? DARK.secondaryTertiaryCasing : DARK.secondaryTertiary)
        continue
      }
      if (id.includes("street")) {
        paint(layer, "line-color", isCasing ? DARK.streetCasing : DARK.street)
        continue
      }
      if (id.includes("minor")) {
        paint(layer, "line-color", isCasing ? DARK.minorCasing : DARK.minor)
        continue
      }
      if (id.includes("path") || id.includes("pedestrian")) {
        paint(layer, "line-color", DARK.path)
        continue
      }
      if (id.includes("service") || id.includes("track")) {
        paint(layer, "line-color", isCasing ? DARK.serviceCasing : DARK.service)
        continue
      }
      if (id.includes("link")) {
        paint(layer, "line-color", isCasing ? DARK.linkCasing : DARK.link)
        continue
      }
    }

    // Road area patterns
    if (id === "road_area_pattern" && type === "fill") {
      paint(layer, "fill-color", DARK.street)
      continue
    }

    // Symbol layers — labels, POIs, road shields
    if (type === "symbol") {
      const isWaterLabel = sl === "water_name" || sl === "waterway"
      const isPoi = sl === "poi" || sl === "aerodrome_label"
      const isPlace = sl === "place"

      paint(
        layer,
        "text-color",
        isWaterLabel
          ? DARK.textWater
          : isPlace
            ? DARK.textPlace
            : isPoi
              ? DARK.textPoi
              : DARK.textGeneric
      )
      paint(layer, "text-halo-color", DARK.textHalo)
      paint(layer, "text-halo-width", 1.4)
      paint(layer, "text-halo-blur", 0.5)
    }
  }

  return style
}

let darkStylePromise: Promise<StyleSpecification> | null = null

/**
 * Build (or return cached) dark variant of Liberty by fetching the upstream
 * JSON once and rewriting paint properties. Cached at module scope so every
 * map mount after the first is instant.
 */
export function getDarkLibertyStyle(): Promise<StyleSpecification> {
  if (!darkStylePromise) {
    darkStylePromise = fetch(LIBERTY_URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Liberty style fetch failed: ${res.status}`)
        }
        return res.json() as Promise<StyleSpecification>
      })
      .then(darkenLibertyStyle)
      .catch((err) => {
        darkStylePromise = null
        throw err
      })
  }
  return darkStylePromise
}

export const LIBERTY_STYLE_URL = LIBERTY_URL
