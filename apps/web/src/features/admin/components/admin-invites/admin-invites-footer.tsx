export function AdminInvitesFooter() {
  return (
    <div className="text-xs text-muted-foreground border-t border-border/40 pt-4 space-y-1">
      <p className="font-semibold">Gate status</p>
      <p>
        The signup gate is controlled by the{" "}
        <code className="font-mono text-[11px]">app.settings.require_invite</code> database setting.
        When <code className="font-mono text-[11px]">true</code>, sign-up requires a code. Unset now
        defaults to <code className="font-mono text-[11px]">true</code>. Local override lives in{" "}
        <code className="font-mono text-[11px]">scripts/setup-local.sh</code>.
      </p>
    </div>
  )
}
