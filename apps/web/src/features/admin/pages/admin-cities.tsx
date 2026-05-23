import { useState } from "react"
import { MapPin, Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Switch } from "@/shared/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Badge } from "@/shared/components/ui/badge"
import {
  useAdminCities,
  useCreateAdminCity,
  useUpdateAdminCity,
} from "@/features/admin/hooks/use-admin-cities"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { toast } from "sonner"
import { FormGrid, Toolbar } from "@/components/v2"

export function AdminCitiesPage() {
  const { data: cities = [] } = useAdminCities()
  const createCity = useCreateAdminCity()
  const updateCity = useUpdateAdminCity()
  const { toastError } = useAdminToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newCity, setNewCity] = useState({
    name: "",
    state: "",
    country: "US",
    slug: "",
    timezone: "America/New_York",
  })

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await updateCity.mutateAsync({ cityId: id, updates: { is_active: !isActive } })
    } catch (error) {
      toastError(error, "Failed to update city.")
    }
  }

  async function handleAdd() {
    if (!newCity.name || !newCity.slug) {
      toast.error("Name and slug are required")
      return
    }

    try {
      await createCity.mutateAsync({ ...newCity })
      setDialogOpen(false)
      setNewCity({ name: "", state: "", country: "US", slug: "", timezone: "America/New_York" })
      toast.success("City added!")
    } catch (error) {
      toastError(error, "Failed to add city.")
    }
  }

  const activeCount = cities.filter((c) => c.is_active).length

  return (
    <div className="space-y-6">
      <Toolbar
        title="Cities"
        subtitle={`${activeCount} active`}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="min-h-[44px] gap-2">
                <Plus className="size-4" />
                Add City
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New City</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <FormGrid cols={2} gap="3">
                  <div className="space-y-1.5">
                    <Label>City Name</Label>
                    <Input
                      value={newCity.name}
                      onChange={(e) => setNewCity((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Portland"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Input
                      value={newCity.state}
                      onChange={(e) => setNewCity((p) => ({ ...p, state: e.target.value }))}
                      placeholder="OR"
                    />
                  </div>
                </FormGrid>
                <div className="space-y-1.5">
                  <Label>URL Slug</Label>
                  <Input
                    value={newCity.slug}
                    onChange={(e) => setNewCity((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="portland"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Input
                    value={newCity.timezone}
                    onChange={(e) => setNewCity((p) => ({ ...p, timezone: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>Add City</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cities.map((city) => (
          <Card key={city.id} className="border-border/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <MapPin className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{city.name}</h3>
                  {city.state ? (
                    <span className="text-xs text-muted-foreground">{city.state}</span>
                  ) : null}
                </div>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {city.timezone}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={city.is_active ? "secondary" : "outline"} className="text-[10px]">
                  {city.is_active ? "Active" : "Inactive"}
                </Badge>
                <Switch
                  checked={city.is_active}
                  onCheckedChange={() => handleToggle(city.id, city.is_active)}
                  aria-label={`Toggle ${city.name} active`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
