import type { UseFormReturn } from "react-hook-form"
import type {
  AdminEventEditorInput,
  AdminEventEditorValues,
} from "@/features/admin/lib/event-editor-schema"

/** Sentinel string for "no value" in admin form selects. */
export const NONE_VALUE = "__none__"

export type AdminEventEditorForm = UseFormReturn<
  AdminEventEditorInput,
  unknown,
  AdminEventEditorValues
>
