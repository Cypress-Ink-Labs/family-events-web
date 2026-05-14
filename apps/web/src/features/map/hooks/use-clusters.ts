import { useMemo, useCallback } from "react"
import Supercluster from "supercluster"
import type { ClusterFeature, PointFeature } from "supercluster"

export interface MapPointProps {
  eventId: string
}

export type ClusterOrPoint = ClusterFeature<{ point_count: number }> | PointFeature<MapPointProps>

interface UseClustersArgs {
  points: PointFeature<MapPointProps>[]
  bounds: [number, number, number, number] | null
  zoom: number
}

// Wraps supercluster's index lifecycle so React components only see the
// reactive boundary: rebuild when the point set changes, recompute when the
// viewport changes. `expand(clusterId)` is the click-to-zoom helper —
// returns the zoom level at which the cluster would burst apart.
export function useClusters({ points, bounds, zoom }: UseClustersArgs) {
  const index = useMemo(() => {
    const idx = new Supercluster<MapPointProps, { point_count: number }>({
      radius: 60,
      maxZoom: 16,
    })
    idx.load(points)
    return idx
  }, [points])

  const clusters: ClusterOrPoint[] = useMemo(() => {
    if (!bounds) return []
    return index.getClusters(bounds, Math.round(zoom)) as ClusterOrPoint[]
  }, [index, bounds, zoom])

  const expand = useCallback(
    (clusterId: number): number => {
      return index.getClusterExpansionZoom(clusterId)
    },
    [index]
  )

  return { clusters, expand }
}
