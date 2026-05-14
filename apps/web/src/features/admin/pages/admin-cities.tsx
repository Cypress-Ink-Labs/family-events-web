import { useState } from "react"
import { Plus, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  useAdminCities,
  useCreateAdminCity,
  useUpdateAdminCity,
} from "@/features/admin/hooks/use-admin-cities"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { toast } from "sonner"

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
      await createCity.mutateAsync({
        ...newCity,
      })
      setDialogOpen(false)
      setNewCity({ name: "", state: "", country: "US", slug: "", timezone: "America/New_York" })
      toast.success("City added!")
    } catch (error) {
      toastError(error, "Failed to add city.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cities</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {cities.filter((c) => c.is_active).length} active cities
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Add City
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New City</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
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
              </div>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cities.map((city) => (
          <Card key={city.id} className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <MapPin className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-foreground">{city.name}</h3>
                  {city.state && (
                    <span className="text-xs text-muted-foreground">{city.state}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{city.timezone}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={city.is_active ? "secondary" : "outline"} className="text-[10px]">
                  {city.is_active ? "Active" : "Inactive"}
                </Badge>
                <Switch
                  checked={city.is_active}
                  onCheckedChange={() => handleToggle(city.id, city.is_active)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
