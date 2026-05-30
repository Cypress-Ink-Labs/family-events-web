import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Brain, Lightbulb, ShieldCheck, ShieldOff, Sparkles, Tag } from "lucide-react"
import { toast } from "sonner"
import {
  useAiFeatureConfigs,
  useApprovedAiModels,
  useUpsertAiFeatureConfig,
} from "@/features/admin/hooks/use-admin-ai-settings"
import {
  AiFeatureCard,
  FeatureSection,
  MemoryToggleRow,
} from "@/features/admin/components/admin-settings-sections"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import type { AiFeatureId } from "@/features/admin/types"

type AiFeatureDraft = {
  modelId?: string
  enabled?: boolean
}

type FeatureMeta = {
  id: AiFeatureId
  title: string
  description: string
  defaultEnabled: boolean
  showEnabledToggle: boolean
  icon: LucideIcon
}

const MODEL_FEATURES: FeatureMeta[] = [
  {
    id: "tagging",
    title: "Event Tagging",
    description: "Model used to classify events and extract tags, age range, price, and venue.",
    defaultEnabled: true,
    showEnabledToggle: false,
    icon: Tag,
  },
  {
    id: "event-review",
    title: "Event Review",
    description: "Model used to automatically approve or flag events before they are published.",
    defaultEnabled: false,
    showEnabledToggle: true,
    icon: ShieldCheck,
  },
  {
    id: "parent-tips",
    title: "Parent Tips",
    description: "Model used to generate parenting tips and guidance shown alongside events.",
    defaultEnabled: false,
    showEnabledToggle: true,
    icon: Lightbulb,
  },
]

const TOGGLE_FEATURES: FeatureMeta[] = [
  {
    id: "tag-memory",
    title: "Tagging memory",
    description:
      "Tag extraction reuses embeddings from similar prior events to improve accuracy.",
    defaultEnabled: false,
    showEnabledToggle: true,
    icon: Brain,
  },
  {
    id: "review-memory",
    title: "Review memory",
    description: "Event review reuses decisions from similar prior events as added context.",
    defaultEnabled: false,
    showEnabledToggle: true,
    icon: Brain,
  },
  {
    id: "source-auto-reject",
    title: "Source auto-reject",
    description:
      "Skip the LLM for sources rejected over 80% of the time — saves cost on low-quality feeds.",
    defaultEnabled: false,
    showEnabledToggle: true,
    icon: ShieldOff,
  },
]

const ALL_FEATURES = [...MODEL_FEATURES, ...TOGGLE_FEATURES]

const DEFAULT_ENABLED = Object.fromEntries(
  ALL_FEATURES.map((f) => [f.id, f.defaultEnabled])
) as Record<AiFeatureId, boolean>

export function AdminSettingsPage() {
  const { data: models = [], isLoading: isModelsLoading } = useApprovedAiModels()
  const { data: configs = [], isLoading: isConfigsLoading } = useAiFeatureConfigs()
  const { mutate: save } = useUpsertAiFeatureConfig()
  const { toastError } = useAdminToast()
  const [drafts, setDrafts] = useState<Partial<Record<AiFeatureId, AiFeatureDraft>>>({})
  const [savingFeature, setSavingFeature] = useState<AiFeatureId | null>(null)

  const fallbackModelId = models[0]?.id ?? ""

  function configFor(feature: AiFeatureId) {
    return configs.find((c) => c.feature === feature)
  }

  function selectedModelIdFor(feature: AiFeatureId) {
    return drafts[feature]?.modelId ?? configFor(feature)?.model_id ?? fallbackModelId
  }

  function enabledFor(feature: AiFeatureId) {
    return drafts[feature]?.enabled ?? configFor(feature)?.enabled ?? DEFAULT_ENABLED[feature]
  }

  function isDirtyFor(feature: AiFeatureId) {
    const config = configFor(feature)
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
    setSavingFeature(feature)
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
        onSettled: () => {
          setSavingFeature(null)
        },
      }
    )
  }

  if (isModelsLoading || isConfigsLoading) {
    return (
      <div className="space-y-10">
        <div className="space-y-3">
          <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl border bg-card" />
          <div className="h-72 animate-pulse rounded-2xl border bg-card" />
        </div>
        <div className="h-48 animate-pulse rounded-2xl border bg-card" />
      </div>
    )
  }

  const memoryOnCount = TOGGLE_FEATURES.filter((f) => enabledFor(f.id)).length

  const summary = MODEL_FEATURES.map((f) => {
    const on = f.showEnabledToggle ? enabledFor(f.id) : true
    const model = models.find((m) => m.id === selectedModelIdFor(f.id))
    return { label: f.title, value: on ? (model?.display_name ?? "—") : "Disabled", on }
  })

  return (
    <div className="relative space-y-10">
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
          Configure every AI feature in the pipeline — model assignments and the memory and
          automation flags. Changes take effect on the next request.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-border bg-card/60 px-5 py-3.5 backdrop-blur-sm">
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
          <div className="flex items-center gap-2.5">
            <span
              className="size-2 rounded-full"
              style={{
                background:
                  memoryOnCount > 0 ? "var(--color-success)" : "var(--color-text-muted)",
              }}
              aria-hidden
            />
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Memory
            </span>
            <span className="text-sm font-medium">
              {memoryOnCount}/{TOGGLE_FEATURES.length} on
            </span>
          </div>
        </div>
      </header>

      <FeatureSection
        eyebrow="Models"
        title="Model assignments"
        description="Pick the active model for each model-backed feature. Cost tier shown per model."
      >
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {MODEL_FEATURES.map((f, i) => (
            <AiFeatureCard
              key={f.id}
              title={f.title}
              description={f.description}
              feature={f.id}
              index={i}
              config={configFor(f.id)}
              models={models}
              showEnabledToggle={f.showEnabledToggle}
              selectedModelId={selectedModelIdFor(f.id)}
              enabled={enabledFor(f.id)}
              isSaving={savingFeature === f.id}
              isDirty={isDirtyFor(f.id)}
              onModelChange={(modelId) => updateDraft(f.id, { modelId })}
              onEnabledChange={(enabled) => updateDraft(f.id, { enabled })}
              onSave={(modelId, enabled) => {
                saveFeatureConfig(f.id, modelId, enabled)
              }}
            />
          ))}
        </div>
      </FeatureSection>

      <FeatureSection
        eyebrow="Memory & automation"
        title="Pipeline learning"
        description="Toggle the embeddings-backed memory features and cost-saving automation."
      >
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-md)]">
          {TOGGLE_FEATURES.map((f) => (
            <MemoryToggleRow
              key={f.id}
              title={f.title}
              description={f.description}
              icon={f.icon}
              ariaLabel={`${f.title} enabled`}
              enabled={enabledFor(f.id)}
              isSaving={savingFeature === f.id}
              isDirty={isDirtyFor(f.id)}
              onEnabledChange={(enabled) => updateDraft(f.id, { enabled })}
              onSave={() => {
                const modelId = configFor(f.id)?.model_id ?? fallbackModelId
                saveFeatureConfig(f.id, modelId, enabledFor(f.id))
              }}
            />
          ))}
        </div>
      </FeatureSection>
    </div>
  )
}
