import { Button } from "@/shared/components/ui/button"
import { AppleIcon, GoogleIcon } from "@/features/auth/components/provider-icons"

interface OAuthButtonsProps {
  disabled: boolean
  onProviderClick: (provider: "apple" | "google") => void
}

export function OAuthButtons({ disabled, onProviderClick }: OAuthButtonsProps) {
  return (
    <>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] gap-2"
          disabled={disabled}
          onClick={() => onProviderClick("apple")}
        >
          <AppleIcon className="size-4" />
          Apple
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] gap-2"
          disabled={disabled}
          onClick={() => onProviderClick("google")}
        >
          <GoogleIcon className="size-4" />
          Google
        </Button>
      </div>
    </>
  )
}
