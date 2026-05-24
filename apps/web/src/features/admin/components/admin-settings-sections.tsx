import { useState, useEffect } from "react"
import type { AiFeatureConfig, ApprovedAiModel } from "@/features/admin/types"

const COST_BADGE: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

interface AiFeatureCardProps {
  title: string
  description: string
  feature: "tagging" | "event-review"
  config: AiFeatureConfig | undefined
  models: ApprovedAiModel[]
  showEnabledToggle: boolean
  isSaving: boolean
  onSave: (modelId: string, enabled: boolean) => void
}

export function AiFeatureCard({
  title,
  description,
  feature,
  config,
  models,
  showEnabledToggle,
  isSaving,
  onSave,
}: AiFeatureCardProps) {
  const [selectedModelId, setSelectedModelId] = useState(config?.model_id ?? "")
  const [enabled, setEnabled] = useState(config?.enabled ?? false)

  useEffect(() => {
    if (config) {
      setSelectedModelId(config.model_id)
      setEnabled(config.enabled)
    }
  }, [config])

  const openaiModels = models.filter((m) => m.provider === "openai")
  const ollamaModels = models.filter((m) => m.provider === "ollama")
  const selectedModel = models.find((m) => m.id === selectedModelId)

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>

      {showEnabledToggle && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`${feature}-enabled`}
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 rounded border-input"
          />
          <label htmlFor={`${feature}-enabled`} className="text-sm">
            Enable LLM review
          </label>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor={`${feature}-model`}>
          Model
        </label>
        <select
          id={`${feature}-model`}
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {openaiModels.length > 0 && (
            <optgroup label="OpenAI">
              {openaiModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name} ({m.cost_tier} cost)
                </option>
              ))}
            </optgroup>
          )}
          {ollamaModels.length > 0 && (
            <optgroup label="Ollama (self-hosted)">
              {ollamaModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name} ({m.cost_tier} cost)
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {selectedModel && (
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COST_BADGE[selectedModel.cost_tier] ?? ""}`}
            >
              {selectedModel.cost_tier} cost
            </span>
            <p className="text-xs text-muted-foreground">{selectedModel.description}</p>
          </div>
        )}
      </div>

      {config?.updated_at && (
        <p className="text-xs text-muted-foreground">
          Last updated {new Date(config.updated_at).toLocaleString()}
        </p>
      )}

      <button
        type="button"
        disabled={isSaving || !selectedModelId}
        onClick={() => onSave(selectedModelId, enabled)}
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? "Saving…" : "Save"}
      </button>
    </div>
  )
}
