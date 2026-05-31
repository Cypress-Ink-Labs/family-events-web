import { useState } from "react"
import { useNavigate } from "react-router"
import { supabase } from "@/infrastructure/supabase/client"
import { humanizeSupabaseError } from "@/infrastructure/supabase/errors"
import { useApp } from "@/app/stores/app-store"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useDocumentTitle } from "@/shared/hooks/use-document-title"
import {
  SubmitEventForm,
  type CommunityEventFormData,
} from "@/features/events/components/submit-event-form"
import { Page, Stack } from "@/components/v2"
import { toast } from "sonner"

export function SubmitEventPage() {
  useDocumentTitle("Submit an Event")
  const navigate = useNavigate()
  const { selectedCity } = useApp()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(data: CommunityEventFormData) {
    if (!user) {
      toast.error("Please sign in to submit an event")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.rpc("submit_community_event", {
        p_title: data.title,
        p_description: data.description || undefined,
        p_start_datetime: data.start_datetime,
        p_end_datetime: data.end_datetime || undefined,
        p_venue_name: data.venue_name || undefined,
        p_address: data.address || undefined,
        p_city_id: data.city_id,
        p_age_min: data.age_min ?? undefined,
        p_age_max: data.age_max ?? undefined,
        p_is_free: data.is_free,
        p_price: data.price ?? undefined,
      })

      if (error) throw error

      toast.success("Event submitted!", {
        description: "Our team will review it shortly.",
      })
      navigate("/explore")
    } catch (error) {
      toast.error(humanizeSupabaseError(error, "Failed to submit event"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Page width="content" className="py-6 max-w-xl mx-auto">
      <Stack gap="4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Submit a Community Event</h1>
          <p className="text-muted-foreground mt-1">
            Know about a family-friendly event the community should know about? Share it here and
            we&apos;ll review it.
          </p>
        </div>
        <SubmitEventForm
          cityId={selectedCity?.id}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </Stack>
    </Page>
  )
}
