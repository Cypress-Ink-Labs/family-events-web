import { Collapsible as CollapsiblePrimitive } from "radix-ui"

export { CollapsibleTrigger } from "@/shared/components/ui/collapsible-trigger"
export { CollapsibleContent } from "@/shared/components/ui/collapsible-content"

function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

export { Collapsible }
