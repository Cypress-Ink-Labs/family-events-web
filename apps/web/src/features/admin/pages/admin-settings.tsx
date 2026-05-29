import { useState } from "react"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import {
  useAiFeatureConfigs,
  useApprovedAiModels,
  useUpsertAiFeatureConfig,
} from "@/features/admin/hooks/use-admin-ai-settings"
import { AiFeatureCard } from "@/features/admin/components/admin-settings-sections"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"

type AiFeatureId = "tagging" | "event-review"

type AiFeatureDraft = {
  modelId?: string
  enabled?: boolean
}

const DEFAULT_ENABLED: Record<AiFeatureId, boolean> = {
  tagging: true,
  "event-review": false,
}

export function AdminSettingsPage() {
  const { data: models = [], isLoading: isModelsLoading } = useApprovedAiModels()
  const { data: configs = [], isLoading: isConfigsLoading } = useAiFeatureConfigs()
  const { mutate: save, isPending } = useUpsertAiFeatureConfig()
  const { toastError } = useAdminToast()
  const [drafts, setDrafts] = useState<Partial<Record<AiFeatureId, AiFeatureDraft>>>({})

  const taggingConfig = configs.find((c) => c.feature === "tagging")
  const reviewConfig = configs.find((c) => c.feature === "event-review")
  const fallbackModelId = models[0]?.id ?? ""

  function selectedModelIdFor(feature: AiFeatureId) {
    const config = feature === "tagging" ? taggingConfig : reviewConfig
    return drafts[feature]?.modelId ?? config?.model_id ?? fallbackModelId
  }

  function enabledFor(feature: AiFeatureId) {
    const config = feature === "tagging" ? taggingConfig : reviewConfig
    return drafts[feature]?.enabled ?? config?.enabled ?? DEFAULT_ENABLED[feature]
  }

  function isDirtyFor(feature: AiFeatureId) {
    const config = feature === "tagging" ? taggingConfig : reviewConfig
    const persistedModel = config?.model_id ?? fallbackModelId
    const persistedEnabled = config?.enabled ?? DEFAULT_ENABLED[feature]
    return (
      selectedModelIdFor(feature) !== persistedModel || enabledFor(feature) !== persistedEnabled
    )
  }

  function updateDraft(feature: AiFeatureId, patch: AiFeatureDraft) {
    setDrafts((current) => ({
      ...current,
      [feature]: {
        ...current[feature],
        ...patch,
      },
    }))
  }

  function clearDraft(feature: AiFeatureId) {
    setDrafts((current) => {
      const next = { ...current }
      delete next[feature]
      return next
    })
  }

  function saveFeatureConfig(feature: AiFeatureId, modelId: string, enabled: boolean) {
    save(
      { feature, modelId, enabled },
      {
        onSuccess: () => {
          clearDraft(feature)
          toast.success("AI setting saved")
        },
        onError: (error) => {
          toastError(error, "Couldn't save AI setting")
        },
      }
    )
  }

  if (isModelsLoading || isConfigsLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl border bg-card" />
          <div className="h-72 animate-pulse rounded-2xl border bg-card" />
        </div>
      </div>
    )
  }

  const taggingModel = models.find((m) => m.id === selectedModelIdFor("tagging"))
  const reviewModel = models.find((m) => m.id === selectedModelIdFor("event-review"))
  const reviewEnabled = enabledFor("event-review")

  const summary: { label: string; value: string; on: boolean }[] = [
    { label: "Tagging", value: taggingModel?.display_name ?? "—", on: true },
    {
      label: "Review",
      value: reviewEnabled ? (reviewModel?.display_name ?? "—") : "Disabled",
      on: reviewEnabled,
    },
  ]

  return (
    <div className="relative space-y-8">
      {/* atmospheric accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 -z-10 size-72 rounded-full opacity-50 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--color-accent-primary-soft), transparent 70%)",
        }}
      />

      <header className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          <Sparkles className="size-3.5 text-[var(--color-accent-primary)]" />
          Model control
        </span>
        <h2 className="font-display text-3xl font-semibold leading-none tracking-tight">
          AI Settings
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Select the active model for each AI feature. Changes take effect on the next request.
        </p>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-border bg-card/60 px-5 py-3.5 backdrop-blur-sm">
          {summary.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span
                className="size-2 rounded-full"
                style={{
                  background: item.on ? "var(--color-success)" : "var(--color-text-muted)",
                }}
                aria-hidden
              />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <AiFeatureCard
          title="Event Tagging"
          description="Model used to classify events and extract tags, age range, price, and venue."
          feature="tagging"
          index={0}
          config={taggingConfig}
          models={models}
          showEnabledToggle={false}
          selectedModelId={selectedModelIdFor("tagging")}
          enabled={enabledFor("tagging")}
          isSaving={isPending}
          isDirty={isDirtyFor("tagging")}
          onModelChange={(modelId) => updateDraft("tagging", { modelId })}
          onEnabledChange={(enabled) => updateDraft("tagging", { enabled })}
          onSave={(modelId, enabled) => {
            saveFeatureConfig("tagging", modelId, enabled)
          }}
        />
        <AiFeatureCard
          title="Event Review"
          description="Model used to automatically approve or flag events before they are published."
          feature="event-review"
          index={1}
          config={reviewConfig}
          models={models}
          showEnabledToggle={true}
          selectedModelId={selectedModelIdFor("event-review")}
          enabled={enabledFor("event-review")}
          isSaving={isPending}
          isDirty={isDirtyFor("event-review")}
          onModelChange={(modelId) => updateDraft("event-review", { modelId })}
          onEnabledChange={(enabled) => updateDraft("event-review", { enabled })}
          onSave={(modelId, enabled) => {
            saveFeatureConfig("event-review", modelId, enabled)
          }}
        />
      </div>
    </div>
  )
}
