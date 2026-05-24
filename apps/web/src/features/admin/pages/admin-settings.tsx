import { useState } from "react"
import {
  useAiFeatureConfigs,
  useApprovedAiModels,
  useUpsertAiFeatureConfig,
} from "@/features/admin/hooks/use-admin-ai-settings"
import { AiFeatureCard } from "@/features/admin/components/admin-settings-sections"

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

  if (isModelsLoading || isConfigsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg border bg-card" />
          <div className="h-64 animate-pulse rounded-lg border bg-card" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">AI Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select the active model for each AI feature. Changes take effect on the next request.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AiFeatureCard
          title="Event Tagging"
          description="Model used to classify events and extract tags, age range, price, and venue."
          feature="tagging"
          config={taggingConfig}
          models={models}
          showEnabledToggle={false}
          selectedModelId={selectedModelIdFor("tagging")}
          enabled={enabledFor("tagging")}
          isSaving={isPending}
          onModelChange={(modelId) => updateDraft("tagging", { modelId })}
          onEnabledChange={(enabled) => updateDraft("tagging", { enabled })}
          onSave={(modelId, enabled) => {
            save(
              { feature: "tagging", modelId, enabled },
              { onSuccess: () => clearDraft("tagging") }
            )
          }}
        />
        <AiFeatureCard
          title="Event Review"
          description="Model used to automatically approve or flag events before they are published."
          feature="event-review"
          config={reviewConfig}
          models={models}
          showEnabledToggle={true}
          selectedModelId={selectedModelIdFor("event-review")}
          enabled={enabledFor("event-review")}
          isSaving={isPending}
          onModelChange={(modelId) => updateDraft("event-review", { modelId })}
          onEnabledChange={(enabled) => updateDraft("event-review", { enabled })}
          onSave={(modelId, enabled) => {
            save(
              { feature: "event-review", modelId, enabled },
              { onSuccess: () => clearDraft("event-review") }
            )
          }}
        />
      </div>
    </div>
  )
}
