import { z } from "zod"

const nullableNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null
  return Number(value)
}, z.number().finite().nullable())

function parseJsonOrEmpty(value: string, ctx: z.RefinementCtx, path: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    ctx.addIssue({
      code: "custom",
      path: [path],
      message: "Must be valid JSON.",
    })
    return z.NEVER
  }
}

export const adminEventEditorSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    description: z.string(),
    start_datetime: z.string().min(1, "Start date is required."),
    end_datetime: z.string().nullable(),
    timezone: z.string().trim().min(1, "Timezone is required."),
    venue_name: z.string(),
    address: z.string(),
    city_id: z.string().nullable(),
    latitude: nullableNumber,
    longitude: nullableNumber,
    age_min: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
      z.number().int().min(0).nullable()
    ),
    age_max: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
      z.number().int().min(0).nullable()
    ),
    price: nullableNumber,
    is_free: z.boolean(),
    is_outdoor: z.boolean().nullable(),
    source_url: z
      .string()
      .trim()
      .refine((value) => {
        if (!value) return true
        try {
          new URL(value)
          return true
        } catch {
          return false
        }
      }, "Source URL must be valid."),
    source_name: z.string(),
    source_id: z.string().nullable(),
    imagesText: z.string(),
    status: z.enum(["draft", "published", "rejected", "archived"]),
    recurrenceInfoText: z.string(),
    is_featured: z.boolean(),
    tagIds: z.array(z.string()),
  })
  .superRefine((value, ctx) => {
    if (value.end_datetime && new Date(value.end_datetime) <= new Date(value.start_datetime)) {
      ctx.addIssue({
        code: "custom",
        path: ["end_datetime"],
        message: "End date must be after the start date.",
      })
    }
    if (value.age_min !== null && value.age_max !== null && value.age_min > value.age_max) {
      ctx.addIssue({
        code: "custom",
        path: ["age_max"],
        message: "Maximum age must be greater than or equal to minimum age.",
      })
    }
    if (value.price !== null && value.price < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: "Price cannot be negative.",
      })
    }
    for (const image of value.imagesText.split("\n")) {
      const trimmed = image.trim()
      if (!trimmed) continue
      try {
        const url = new URL(trimmed)
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("bad protocol")
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["imagesText"],
          message: "Images must be valid HTTP or HTTPS URLs, one per line.",
        })
        break
      }
    }
    parseJsonOrEmpty(value.recurrenceInfoText, ctx, "recurrenceInfoText")
  })

export type AdminEventEditorInput = z.input<typeof adminEventEditorSchema>
export type AdminEventEditorValues = z.output<typeof adminEventEditorSchema>
