import type { DateBucket } from "@/features/map/lib/map-helpers"

const PIN_COLORS: Record<DateBucket, string> = {
  today: "var(--color-accent-secondary)",
  soon: "var(--color-accent-primary)",
  future: "var(--color-accent-tertiary)",
}

interface EventPinProps {
  bucket: DateBucket
  highlighted: boolean
}

export function EventPin({ bucket, highlighted }: EventPinProps) {
  const fill = PIN_COLORS[bucket]
  return (
    <span
      className={`relative inline-block ${highlighted ? "scale-125" : ""} transition-transform`}
    >
      {bucket === "today" && (
        <span
          aria-hidden
          className="absolute inset-0 -m-1 rounded-full animate-ping"
          style={{ background: fill, opacity: 0.35 }}
        />
      )}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 28 36"
        width={highlighted ? 32 : 28}
        height={highlighted ? 41 : 36}
        className="relative drop-shadow"
      >
        <path
          d="M14 0C6.27 0 0 6.27 0 14c0 9.94 14 22 14 22S28 23.94 28 14C28 6.27 21.73 0 14 0z"
          fill={fill}
        />
        <circle cx={14} cy={14} r={5.5} fill="white" />
      </svg>
    </span>
  )
}
