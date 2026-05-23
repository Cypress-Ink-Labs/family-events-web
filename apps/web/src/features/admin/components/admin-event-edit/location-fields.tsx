import { Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormGrid } from "@/components/v2"
import { AdminEventEditSection } from "@/features/admin/components/admin-event-edit-sections"
import type { City } from "@/shared/types"
import {
  type AdminEventEditorForm,
  NONE_VALUE,
} from "@/features/admin/components/admin-event-edit/_shared"

export function AdminEventLocationFields({
  form,
  cities,
}: {
  form: AdminEventEditorForm
  cities: City[]
}) {
  const { control, register } = form

  return (
    <AdminEventEditSection title="Location">
      <FormGrid cols={2} gap="4">
        <div className="space-y-1.5">
          <Label htmlFor="venue_name">Venue</Label>
          <Input id="venue_name" {...register("venue_name")} />
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Controller
            control={control}
            name="city_id"
            render={({ field }) => (
              <Select
                value={field.value ?? NONE_VALUE}
                onValueChange={(value) => field.onChange(value === NONE_VALUE ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No city</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                      {city.state ? `, ${city.state}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input id="address" {...register("address")} />
        </div>
        <div className="space-y-1.5">
          <Label>Outdoor</Label>
          <Controller
            control={control}
            name="is_outdoor"
            render={({ field }) => (
              <Select
                value={field.value === null ? NONE_VALUE : String(field.value)}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? null : value === "true")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Unknown</SelectItem>
                  <SelectItem value="true">Outdoor</SelectItem>
                  <SelectItem value="false">Indoor</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" inputMode="decimal" {...register("latitude")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" inputMode="decimal" {...register("longitude")} />
        </div>
      </FormGrid>
    </AdminEventEditSection>
  )
}
