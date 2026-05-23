import { useMemo, useState } from "react"
import {
  AdminSourcesHeader,
  AdminSourcesList,
  type SourceDraft,
} from "@/features/admin/components/admin-sources-sections"
import type { AdminSourceType } from "@/features/admin/lib/source-types"
import { AdminCityFilterBar } from "@/features/admin/components/admin-city-filter-bar"
import { useAdminCities } from "@/features/admin/hooks/use-admin-cities"
import { useCityFilter } from "@/features/admin/hooks/use-city-filter"
import { UNASSIGNED_CITY_KEY } from "@/lib/events/group-by-city"
import { useAdminStore } from "@/features/admin/stores/admin-store"
import {
  useAdminSources,
  useCreateAdminSource,
  useTriggerSourceScrape,
  useUpdateAdminSource,
  useAdminBulkSetProcessingMode,
} from "@/features/admin/hooks/sources/use-admin-sources"
import { useAdminSourceRunErrors } from "@/features/admin/hooks/sources/use-admin-source-runs"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { toast } from "sonner"
import type { EventProcessingMode, ExtractionMode } from "@/shared/types"

function defaultExtractionModeForSourceType(sourceType: AdminSourceType): ExtractionMode {
  return sourceType === "website" ? "deterministic_then_llm" : "deterministic"
}

export function AdminSourcesPage() {
  const { data: sources = [] } = useAdminSources()
  const sourceIds = useMemo(() => sources.map((source) => source.id), [sources])
  const { data: sourceRunErrors = [] } = useAdminSourceRunErrors(sourceIds)
  const { data: cities = [] } = useAdminCities()
  const createSource = useCreateAdminSource()
  const updateSource = useUpdateAdminSource()
  const triggerScrape = useTriggerSourceScrape()
  const { value: cityFilter, setValue: setCityFilter } = useCityFilter()
  const { toastError } = useAdminToast()
  const bulkProcessingMode = useAdminBulkSetProcessingMode()

  const scrapingSourceIds = useAdminStore((s) => s.scrapingSourceIds)
  const addScrapingId = useAdminStore((s) => s.addScrapingId)
  const removeScrapingId = useAdminStore((s) => s.removeScrapingId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newSource, setNewSource] = useState<SourceDraft>({
    name: "",
    url: "",
    source_type: "website",
    extraction_mode: "deterministic_then_llm" as ExtractionMode,
    processing_mode: "manual_review",
    city_id: "",
  })

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const source of sources) {
      const key = source.city_id ?? UNASSIGNED_CITY_KEY
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [sources])

  const latestErrorBySourceId = useMemo(() => {
    const errors = new Map<string, string>()
    for (const run of sourceRunErrors) {
      if (!run.source_id) continue
      if (!errors.has(run.source_id) && run.error_log) {
        errors.set(run.source_id, run.error_log)
      }
    }

    return errors
  }, [sourceRunErrors])

  async function handleScrape(sourceId: string) {
    addScrapingId(sourceId)
    try {
      await triggerScrape.mutateAsync({ sourceId })
      toast.success("Scrape started!", { description: "Ingestion run queued." })
      return true
    } catch (error) {
      toastError(error, "Failed to trigger scrape.")
      return false
    } finally {
      removeScrapingId(sourceId)
    }
  }

  async function handleToggleActive(sourceId: string, nextActive: boolean) {
    try {
      await updateSource.mutateAsync({
        sourceId,
        updates: { is_active: nextActive },
      })
    } catch (error) {
      toastError(error, "Failed to update source.")
    }
  }

  async function handleSetProcessingMode(sourceId: string, mode: EventProcessingMode) {
    try {
      await updateSource.mutateAsync({
        sourceId,
        updates: {
          processing_mode: mode,
          auto_approve: mode === "auto_approve",
        },
      })
    } catch (error) {
      toastError(error, "Failed to update source.")
    }
  }

  async function handleBulkSetProcessingMode(mode: EventProcessingMode) {
    try {
      await bulkProcessingMode.mutateAsync(mode)
      toast.success(`Set all sources to ${mode.replaceAll("_", " ")}`)
    } catch (error) {
      toastError(error, "Failed to update sources.")
    }
  }

  const [isScrapeAllPending, setIsScrapeAllPending] = useState(false)

  async function handleScrapeAll() {
    const activeSources = sources.filter((source) => source.is_active)
    if (activeSources.length === 0) return

    setIsScrapeAllPending(true)
    const results = await Promise.all(activeSources.map((source) => handleScrape(source.id)))
    setIsScrapeAllPending(false)

    const failed = results.filter((queued) => !queued).length
    if (failed > 0) {
      toast.warning(`Scrape All: ${activeSources.length - failed} queued, ${failed} failed.`)
    } else {
      toast.success(`All ${activeSources.length} sources queued for scraping.`)
    }
  }

  async function handleAddSource() {
    if (!newSource.name || !newSource.url) {
      toast.error("Name and URL are required")
      return
    }

    try {
      await createSource.mutateAsync({
        name: newSource.name,
        url: newSource.url,
        source_type: newSource.source_type,
        extraction_mode: newSource.extraction_mode,
        processing_mode: newSource.processing_mode,
        city_id: newSource.city_id || null,
        is_active: true,
        auto_approve: newSource.processing_mode === "auto_approve",
        scrape_interval_hours: 24,
        last_scraped_at: null,
        last_status: "pending",
        error_count: 0,
        notes: null,
      })
      setDialogOpen(false)
      setNewSource({
        name: "",
        url: "",
        source_type: "website",
        extraction_mode: "deterministic_then_llm",
        processing_mode: "manual_review",
        city_id: "",
      })
      toast.success("Source added!", { description: "Trigger a scrape to import events." })
    } catch (error) {
      toastError(error, "Failed to create source.")
    }
  }

  function openAddDialogForCity(cityId: string) {
    setNewSource((prev) => ({ ...prev, city_id: cityId }))
    setDialogOpen(true)
  }

  function handleSourceDraftPatch(patch: Partial<SourceDraft>) {
    setNewSource((prev) => ({
      ...prev,
      ...patch,
      extraction_mode:
        patch.source_type && patch.source_type !== prev.source_type && !patch.extraction_mode
          ? defaultExtractionModeForSourceType(patch.source_type)
          : (patch.extraction_mode ?? prev.extraction_mode),
    }))
  }

  return (
    <div className="space-y-6">
      <AdminSourcesHeader
        activeSourceCount={sources.filter((source) => source.is_active).length}
        cities={cities}
        dialogOpen={dialogOpen}
        newSource={newSource}
        isBulkPending={bulkProcessingMode.isPending}
        isScrapeAllPending={isScrapeAllPending}
        onDialogOpenChange={setDialogOpen}
        onSourceDraftPatch={handleSourceDraftPatch}
        onAddSource={handleAddSource}
        onBulkSetProcessingMode={handleBulkSetProcessingMode}
        onScrapeAll={handleScrapeAll}
      />
      <AdminCityFilterBar
        cities={cities}
        counts={cityCounts}
        total={sources.length}
        value={cityFilter}
        onChange={setCityFilter}
      />
      <AdminSourcesList
        sources={sources}
        cities={cities}
        cityFilter={cityFilter}
        latestErrorBySourceId={latestErrorBySourceId}
        scrapingSourceIds={scrapingSourceIds}
        onToggleActive={handleToggleActive}
        onSetProcessingMode={handleSetProcessingMode}
        onScrape={handleScrape}
        onAddSourceForCity={openAddDialogForCity}
      />
    </div>
  )
}
