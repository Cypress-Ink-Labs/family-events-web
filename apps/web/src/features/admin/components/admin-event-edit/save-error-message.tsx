export function SaveErrorMessage({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  )
}
