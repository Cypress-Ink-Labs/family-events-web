import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Check, Cpu, ShieldCheck, Tag } from "lucide-react"

import type { AiFeatureConfig, AiFeatureId, ApprovedAiModel } from "@/features/admin/types"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Switch } from "@/shared/components/ui/switch"
import { cn } from "@/shared/utils/format"

const FEATURE_ICON: Record<string, typeof Tag> = {
  tagging: Tag,
  "event-review": ShieldCheck,
}

const TIER_META: Record<string, { label: string; cells: number; color: string }> = {
  low: { label: "low cost", cells: 1, color: "var(--color-success)" },
  medium: { label: "medium cost", cells: 2, color: "var(--color-warning)" },
  high: { label: "high cost", cells: 3, color: "var(--color-error)" },
}

function CostMeter({ tier }: { tier: "low" | "medium" | "high" }) {
  const meta = TIER_META[tier] ?? TIER_META.medium
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3].map((cell) => (
          <span
            key={cell}
            className="h-1.5 w-7 rounded-full transition-colors duration-300"
            style={{ background: cell <= meta.cells ? meta.color : "var(--color-border)" }}
          />
        ))}
      </div>
      <span
        className="font-mono text-[10px] font-medium uppercase tracking-[0.12em]"
        style={{ color: meta.color }}
      >
        {meta.label}
      </span>
    </div>
  )
}

interface AiFeatureCardProps {
  title: string
  description: string
  feature: AiFeatureId
  config: AiFeatureConfig | undefined
  models: ApprovedAiModel[]
  showEnabledToggle: boolean
  selectedModelId: string
  enabled: boolean
  isSaving: boolean
  isDirty: boolean
  index: number
  onModelChange: (modelId: string) => void
  onEnabledChange: (enabled: boolean) => void
  onSave: (modelId: string, enabled: boolean) => void
}

export function AiFeatureCard({
  title,
  description,
  feature,
  config,
  models,
  showEnabledToggle,
  selectedModelId,
  enabled,
  isSaving,
  isDirty,
  index,
  onModelChange,
  onEnabledChange,
  onSave,
}: AiFeatureCardProps) {
  const Icon = FEATURE_ICON[feature] ?? Tag
  const openaiModels = models.filter((m) => m.provider === "openai")
  const ollamaModels = models.filter((m) => m.provider === "ollama")
  const selectedModel = models.find((m) => m.id === selectedModelId)
  const active = showEnabledToggle ? enabled : true

  return (
    <section
      className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-md)] animate-in fade-in slide-in-from-bottom-3 fill-mode-both"
      style={{ animationDuration: "560ms", animationDelay: `${index * 90}ms` }}
    >
      {/* status rail */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] transition-colors duration-300"
        style={{ background: active ? "var(--color-accent-primary)" : "var(--color-border)" }}
      />

      <header className="flex items-start gap-4 border-b border-border/70 p-6">
        <div
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"
          aria-hidden
        >
          <Icon className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            {String(index + 1).padStart(2, "0")} · {feature}
          </span>
          <h3 className="font-display text-lg font-semibold leading-tight">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        {showEnabledToggle ? (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Switch
              checked={enabled}
              onCheckedChange={onEnabledChange}
              aria-label={`${title} enabled`}
            />
            <span
              className={cn(
                "font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
                enabled ? "text-[var(--color-success)]" : "text-muted-foreground"
              )}
            >
              {enabled ? "online" : "paused"}
            </span>
          </div>
        ) : (
          <span className="shrink-0 rounded-full bg-[var(--color-success)]/12 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-success)]">
            always on
          </span>
        )}
      </header>

      <div className={cn("space-y-5 p-6 transition-opacity duration-300", !active && "opacity-55")}>
        <div className="space-y-2">
          <Label
            className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
            htmlFor={`${feature}-model`}
          >
            Active model
            {selectedModel ? (
              <span className="font-mono text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                {selectedModel.provider}
              </span>
            ) : null}
          </Label>

          <Select value={selectedModelId} onValueChange={onModelChange} disabled={!active}>
            <SelectTrigger id={`${feature}-model`} className="w-full">
              <span className="flex min-w-0 items-center gap-2">
                <Cpu className="size-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Select a model" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {openaiModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="font-mono text-[10px] uppercase tracking-[0.12em]">
                    OpenAI
                  </SelectLabel>
                  {openaiModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.display_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {ollamaModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="font-mono text-[10px] uppercase tracking-[0.12em]">
                    Ollama · self-hosted
                  </SelectLabel>
                  {ollamaModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.display_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedModel && (
          <div className="space-y-3 rounded-xl border border-border/60 bg-[var(--color-surface-raised)]/40 p-4">
            <CostMeter tier={selectedModel.cost_tier} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {selectedModel.description}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {isDirty ? (
              <>
                <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-[var(--color-warning)]" />
                unsaved changes
              </>
            ) : config?.updated_at ? (
              <>
                <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-success)]" />
                <span className="truncate normal-case tracking-normal">
                  saved {new Date(config.updated_at).toLocaleString()}
                </span>
              </>
            ) : (
              <span className="normal-case tracking-normal text-muted-foreground/60">
                not yet configured
              </span>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            disabled={isSaving || !selectedModelId || !isDirty}
            onClick={() => onSave(selectedModelId, enabled)}
          >
            {isSaving ? (
              "Saving…"
            ) : isDirty ? (
              "Save changes"
            ) : (
              <>
                Saved
                <Check className="size-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  )
}

interface FeatureSectionProps {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
}

export function FeatureSection({ eyebrow, title, description, children }: FeatureSectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
          {eyebrow}
        </span>
        <h3 className="font-display text-xl font-semibold leading-tight">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

interface MemoryToggleRowProps {
  title: string
  description: string
  icon: LucideIcon
  enabled: boolean
  isSaving: boolean
  isDirty: boolean
  onEnabledChange: (enabled: boolean) => void
  onSave: () => void
  ariaLabel: string
}

export function MemoryToggleRow({
  title,
  description,
  icon: Icon,
  enabled,
  isSaving,
  isDirty,
  onEnabledChange,
  onSave,
  ariaLabel,
}: MemoryToggleRowProps) {
  return (
    <div className="relative flex items-start gap-4 p-5">
      <span
        aria-hidden
        className="absolute inset-y-3 left-0 w-[3px] rounded-full transition-colors duration-300"
        style={{ background: enabled ? "var(--color-accent-primary)" : "transparent" }}
      />
      <div
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"
        aria-hidden
      >
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold leading-tight">{title}</h4>
          <span
            className={cn(
              "font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
              enabled ? "text-[var(--color-success)]" : "text-muted-foreground/70"
            )}
          >
            {enabled ? "online" : "off"}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {isDirty ? (
          <span
            className="size-1.5 animate-pulse rounded-full bg-[var(--color-warning)]"
            aria-hidden
          />
        ) : null}
        <Switch checked={enabled} onCheckedChange={onEnabledChange} aria-label={ariaLabel} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSaving || !isDirty}
          onClick={onSave}
        >
          {isSaving ? "Saving…" : isDirty ? "Save" : <Check className="size-3.5" />}
        </Button>
      </div>
    </div>
  )
}
