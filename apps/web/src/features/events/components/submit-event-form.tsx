import { useState } from "react"
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
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [venueName, setVenueName] = useState("")
  const [address, setAddress] = useState("")
  const [ageMin, setAgeMin] = useState("")
  const [ageMax, setAgeMax] = useState("")
  const [isFree, setIsFree] = useState(true)
  const [price, setPrice] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const startDatetime = startDate && startTime ? `${startDate}T${startTime}:00` : ""
    const endDatetime = startDate && endTime ? `${startDate}T${endTime}:00` : undefined

    const result = communityEventSchema.safeParse({
      title: title.trim(),
      description: description.trim() || undefined,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      venue_name: venueName.trim() || undefined,
      address: address.trim() || undefined,
      city_id: cityId,
      age_min: ageMin ? Number(ageMin) : null,
      age_max: ageMax ? Number(ageMax) : null,
      is_free: isFree,
      price: !isFree && price ? Number(price) : null,
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0]
        if (key && !fieldErrors[String(key)]) {
          fieldErrors[String(key)] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Event Details */}
      <FormSection icon={Type} title="Event Details">
        <FormField label="Event Title" required error={errors.title}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Neighborhood Playdate at the Park"
            maxLength={200}
            className="h-11"
          />
        </FormField>

        <FormField label="Description" hint="Help families know what to expect">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          <FormField label="Date" required error={errors.start_datetime}>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11"
            />
          </FormField>
          <FormField label="Start Time" required>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-11"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="End Time" hint="Optional">
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-11"
            />
          </FormField>
        </div>
      </FormSection>

      <Separator />

      {/* Location */}
      <FormSection icon={MapPin} title="Location">
        <FormField label="Venue Name" hint="e.g. Moncus Park, Lafayette Public Library">
          <Input
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="Where is the event?"
            className="h-11"
          />
        </FormField>
        <FormField label="Address">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address or cross streets"
            className="h-11"
          />
        </FormField>
      </FormSection>

      <Separator />

      {/* Audience */}
      <FormSection icon={Users} title="Audience">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Min Age" hint="Leave blank for all ages">
            <Input
              type="number"
              min={0}
              max={18}
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              placeholder="Any"
              className="h-11"
            />
          </FormField>
          <FormField label="Max Age">
            <Input
              type="number"
              min={0}
              max={18}
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
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
          <Switch checked={isFree} onCheckedChange={setIsFree} />
        </div>

        {!isFree && (
          <FormField label="Ticket Price" hint="Per person">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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
        {errors.city_id && <p className="text-sm text-destructive text-center">{errors.city_id}</p>}

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
