import { useState } from "react"
import { z } from "zod"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Switch } from "@/shared/components/ui/switch"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Loader2 } from "lucide-react"

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
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Neighborhood Playdate at the Park"
              maxLength={200}
            />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell families what to expect..."
              rows={4}
              maxLength={5000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Date *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {errors.start_datetime && (
                <p className="text-sm text-destructive mt-1">{errors.start_datetime}</p>
              )}
            </div>
            <div>
              <Label htmlFor="start-time">Start Time *</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="end-time">End Time (optional)</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="venue">Venue Name</Label>
            <Input
              id="venue"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g. Moncus Park"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 2913 Johnston St, Lafayette, LA"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="age-min">Min Age</Label>
              <Input
                id="age-min"
                type="number"
                min={0}
                max={18}
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="age-max">Max Age</Label>
              <Input
                id="age-max"
                type="number"
                min={0}
                max={18}
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                placeholder="18"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is-free" className="cursor-pointer">
              Free Event
            </Label>
            <Switch id="is-free" checked={isFree} onCheckedChange={setIsFree} />
          </div>

          {!isFree && (
            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="10.00"
              />
            </div>
          )}

          {errors.city_id && <p className="text-sm text-destructive">{errors.city_id}</p>}

          <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Event for Review"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your event will be reviewed by our team before being published. Max 5 submissions per
            day.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
