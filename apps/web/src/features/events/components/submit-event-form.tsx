import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, type Resolver } from "react-hook-form"
import { z } from "zod"
import { CalendarDays, DollarSign, FileText, Loader2, MapPin, Type, Users } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Switch } from "@/shared/components/ui/switch"
import { Separator } from "@/shared/components/ui/separator"

export const communityEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  description: z.string().max(5000).optional(),
  start_datetime: z.string().min(1, "Date and time required"),
  end_datetime: z.string().optional(),
  venue_name: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city_id: z.string().uuid("City is required"),
  age_min: z.coerce.number().int().min(0).max(18).nullable().optional(),
  age_max: z.coerce.number().int().min(0).max(18).nullable().optional(),
  is_free: z.boolean(),
  price: z.coerce.number().min(0).max(10000).nullable().optional(),
})

export type CommunityEventFormData = z.infer<typeof communityEventSchema>

interface SubmitEventFormProps {
  cityId: string | undefined
  onSubmit: (data: CommunityEventFormData) => Promise<void>
  isSubmitting: boolean
}

// The schema's `start_datetime`/`end_datetime` are single strings, but the UI
// collects a date plus separate start/end times. These auxiliary fields hold
// the split inputs; they are combined into the schema strings at submit time.
interface SubmitEventFormValues extends CommunityEventFormData {
  startDate: string
  startTime: string
  endTime: string
}

// Empty numeric inputs map to `null` (not 0) — the original form treated a blank
// age/price as "unset". zod's `z.coerce.number()` then validates the number.
function emptyToNull(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null
  return Number(value)
}

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-4 pl-10">{children}</div>
    </div>
  )
}

function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function SubmitEventForm({ cityId, onSubmit, isSubmitting }: SubmitEventFormProps) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<SubmitEventFormValues, unknown, CommunityEventFormData>({
    // The resolver only knows the schema fields; `SubmitEventFormValues` adds the
    // UI-only split date/time fields (stripped by zod), so widen its field type.
    resolver: zodResolver(communityEventSchema) as unknown as Resolver<
      SubmitEventFormValues,
      unknown,
      CommunityEventFormData
    >,
    defaultValues: {
      title: "",
      description: "",
      start_datetime: "",
      end_datetime: "",
      venue_name: "",
      address: "",
      city_id: cityId as string,
      age_min: null,
      age_max: null,
      is_free: true,
      price: null,
      startDate: "",
      startTime: "",
      endTime: "",
    },
  })

  const isFree = watch("is_free")
  const description = watch("description") ?? ""

  // Sync prop-derived and split inputs into the schema fields before validation:
  //  - `city_id` comes from a prop, not an input (kept raw so the zod `uuid`
  //    check sees `undefined` when no city is selected).
  //  - the split date + time inputs combine into the schema's single
  //    `start_datetime`/`end_datetime` strings as `${date}T${time}:00`,
  //    preserved exactly from the original form.
  function syncSchemaFields() {
    const { startDate, startTime, endTime } = getValues()
    setValue("city_id", cityId as string)
    setValue("start_datetime", startDate && startTime ? `${startDate}T${startTime}:00` : "")
    setValue("end_datetime", startDate && endTime ? `${startDate}T${endTime}:00` : "")
  }

  // zod has already stripped the UI-only split fields and coerced the numbers,
  // so `data` is the parsed `CommunityEventFormData`. Trim strings and gate
  // price on the free toggle, matching the original form's output exactly.
  function submit(data: CommunityEventFormData) {
    onSubmit({
      ...data,
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      end_datetime: data.end_datetime || undefined,
      venue_name: data.venue_name?.trim() || undefined,
      address: data.address?.trim() || undefined,
      price: data.is_free ? null : data.price,
    })
  }

  return (
    <form
      onSubmit={(e) => {
        syncSchemaFields()
        void handleSubmit(submit)(e)
      }}
      className="space-y-6"
    >
      {/* Event Details */}
      <FormSection icon={Type} title="Event Details">
        <FormField label="Event Title" required error={errors.title?.message}>
          <Input
            {...register("title")}
            placeholder="e.g. Neighborhood Playdate at the Park"
            maxLength={200}
            className="h-11"
          />
        </FormField>

        <FormField label="Description" hint="Help families know what to expect">
          <Textarea
            {...register("description")}
            placeholder="Describe the event, what to bring, parking info..."
            rows={4}
            maxLength={5000}
            className="resize-none"
          />
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">{description.length}/5000</span>
          </div>
        </FormField>
      </FormSection>

      <Separator />

      {/* Date & Time */}
      <FormSection icon={CalendarDays} title="Date & Time">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date" required error={errors.start_datetime?.message}>
            <Input type="date" {...register("startDate")} className="h-11" />
          </FormField>
          <FormField label="Start Time" required>
            <Input type="time" {...register("startTime")} className="h-11" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="End Time" hint="Optional">
            <Input type="time" {...register("endTime")} className="h-11" />
          </FormField>
        </div>
      </FormSection>

      <Separator />

      {/* Location */}
      <FormSection icon={MapPin} title="Location">
        <FormField label="Venue Name" hint="e.g. Moncus Park, Lafayette Public Library">
          <Input {...register("venue_name")} placeholder="Where is the event?" className="h-11" />
        </FormField>
        <FormField label="Address">
          <Input
            {...register("address")}
            placeholder="Street address or cross streets"
            className="h-11"
          />
        </FormField>
      </FormSection>

      <Separator />

      {/* Audience */}
      <FormSection icon={Users} title="Audience">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Min Age"
            hint="Leave blank for all ages"
            error={errors.age_min?.message}
          >
            <Input
              type="number"
              min={0}
              max={18}
              {...register("age_min", { setValueAs: emptyToNull })}
              placeholder="Any"
              className="h-11"
            />
          </FormField>
          <FormField label="Max Age" error={errors.age_max?.message}>
            <Input
              type="number"
              min={0}
              max={18}
              {...register("age_max", { setValueAs: emptyToNull })}
              placeholder="Any"
              className="h-11"
            />
          </FormField>
        </div>
      </FormSection>

      <Separator />

      {/* Pricing */}
      <FormSection icon={DollarSign} title="Pricing">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Free Event</p>
            <p className="text-xs text-muted-foreground">Toggle off to set a price</p>
          </div>
          <Controller
            control={control}
            name="is_free"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {!isFree && (
          <FormField label="Ticket Price" hint="Per person" error={errors.price?.message}>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                step={0.01}
                {...register("price", { setValueAs: emptyToNull })}
                placeholder="0.00"
                className="h-11 pl-9"
              />
            </div>
          </FormField>
        )}
      </FormSection>

      <Separator />

      {/* Submit */}
      <div className="space-y-3 pt-2">
        {errors.city_id && (
          <p className="text-sm text-destructive text-center">{errors.city_id.message}</p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full h-12 text-base font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <FileText className="size-4 mr-2" />
              Submit Event for Review
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Your event will be reviewed by our team before being published.
          <br />
          Max 5 submissions per day.
        </p>
      </div>
    </form>
  )
}
