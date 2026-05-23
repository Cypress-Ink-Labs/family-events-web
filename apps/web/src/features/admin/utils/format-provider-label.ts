import type { AiTagProvider } from "@/shared/types"

export function formatProviderLabel(provider: AiTagProvider | null | undefined) {
  if (provider === "openai") return "OpenAI"
  if (provider === "ollama") return "Ollama"
  if (provider === "localai") return "LocalAI"
  return "Unknown"
}
