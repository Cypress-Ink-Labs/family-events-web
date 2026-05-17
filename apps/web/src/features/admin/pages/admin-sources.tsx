import { useMemo, useState } from "react"
import {
  AdminSourcesHeader,
  AdminSourcesList,
} from "@/features/admin/components/admin-sources-sections"
import { AdminCityFilterBar } from "@/features/admin/components/admin-city-filter-bar"
import { useAdminCities } from "@/features/admin/hooks/use-admin-cities"
import { useCityFilter } from "@/features/admin/hooks/use-city-filter"
import { UNASSIGNED_CITY_KEY } from "@/lib/group-by-city"
import { useAdminStore } from "@/features/admin/stores/admin-store"
import {
  useAdminSources,
  useCreateAdminSource,
  useTriggerSourceScrape,
  useUpdateAdminSource,
  useAdminBulkSetAutoApprove,
} from "@/features/admin/hooks/use-admin-sources"
import { useAdminSourceRunErrors } from "@/features/admin/hooks/use-admin-source-runs"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { toast } from "sonner"

type SourceType = "website" | "ical" | "rss" | "manual" | "macaronikid"

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
  const bulkAutoApprove = useAdminBulkSetAutoApprove()

  const scrapingSourceIds = useAdminStore((s) => s.scrapingSourceIds)
  const addScrapingId = useAdminStore((s) => s.addScrapingId)
  const removeScrapingId = useAdminStore((s) => s.removeScrapingId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newSource, setNewSource] = useState({
    name: "",
    url: "",
    source_type: "website" as SourceType,
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
    } catch (error) {
      toastError(error, "Failed to trigger scrape.")
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

  async function handleToggleAutoApprove(sourceId: string, autoApprove: boolean) {
    try {
      await updateSource.mutateAsync({ sourceId, updates: { auto_approve: autoApprove } })
    } catch (error) {
      toastError(error, "Failed to update source.")
    }
  }

  async function handleBulkAutoApprove(enable: boolean) {
    try {
      await bulkAutoApprove.mutateAsync(enable)
      toast.success(
        enable ? "Auto-approve enabled for all sources" : "Auto-approve disabled for all sources"
      )
    } catch (error) {
      toastError(error, "Failed to update sources.")
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
        city_id: newSource.city_id || null,
        is_active: true,
        auto_approve: false,
        scrape_interval_hours: 24,
        last_scraped_at: null,
        last_status: "pending",
        error_count: 0,
        notes: null,
      })
      setDialogOpen(false)
      setNewSource({ name: "", url: "", source_type: "website", city_id: "" })
      toast.success("Source added!", { description: "Trigger a scrape to import events." })
    } catch (error) {
      toastError(error, "Failed to create source.")
    }
  }

  function openAddDialogForCity(cityId: string) {
    setNewSource((prev) => ({ ...prev, city_id: cityId }))
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <AdminSourcesHeader
        activeSourceCount={sources.filter((source) => source.is_active).length}
        cities={cities}
        dialogOpen={dialogOpen}
        newSource={newSource}
        isBulkPending={bulkAutoApprove.isPending}
        onDialogOpenChange={setDialogOpen}
        onNameChange={(value) => setNewSource((prev) => ({ ...prev, name: value }))}
        onUrlChange={(value) => setNewSource((prev) => ({ ...prev, url: value }))}
        onTypeChange={(value) => setNewSource((prev) => ({ ...prev, source_type: value }))}
        onCityChange={(value) => setNewSource((prev) => ({ ...prev, city_id: value }))}
        onAddSource={handleAddSource}
        onEnableAllAutoApprove={() => handleBulkAutoApprove(true)}
        onDisableAllAutoApprove={() => handleBulkAutoApprove(false)}
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
        onToggleAutoApprove={handleToggleAutoApprove}
        onScrape={handleScrape}
        onAddSourceForCity={openAddDialogForCity}
      />
    </div>
  )
}
