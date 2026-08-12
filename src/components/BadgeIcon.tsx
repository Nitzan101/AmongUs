const SIZES = {
  sm: { box: 28, stroke: 3, emoji: 13 },
  md: { box: 44, stroke: 4, emoji: 20 },
  lg: { box: 68, stroke: 5, emoji: 28 },
} as const

/**
 * A badge, drawn as a circle: a coloured ring, an emoji at the centre, and a
 * star for each tier earned above it.
 *
 * **Two rings, not one.** The full ring underneath is the tier actually held,
 * so the badge reads as what it *is* at a glance — the same colour it shows
 * beside your name in a room. The arc drawn over it is progress toward the
 * next tier, in that tier's colour.
 *
 * Doing it with a single ring meant the colour and the stars disagreed: a gold
 * badge one point into its platinum rung drew a platinum ring (so it read as
 * platinum) and, because the arc was still near zero, drew almost none of it —
 * leaving three gold stars sitting above what looked like an empty circle.
 */
export function BadgeIcon({
  icon,
  color,
  progressColor,
  filled,
  stars = 0,
  size = 'lg',
  showStars = true,
  dim = false,
  title,
}: {
  icon: string
  /** The tier held: a full ring, and the star colour. */
  color: string
  /** The tier being climbed toward, for the progress arc. Defaults to `color`. */
  progressColor?: string
  /** 0..1 of the arc to draw over the ring. */
  filled: number
  /** Stars above the circle (0 still reserves the space, to keep rows aligned). */
  stars?: number
  size?: keyof typeof SIZES
  /** Hide the star row entirely — used in compact contexts like a player row. */
  showStars?: boolean
  /** Nothing earned and nothing started: grey ring, muted icon. */
  dim?: boolean
  title?: string
}) {
  const { box, stroke, emoji } = SIZES[size]
  const radius = (box - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const amount = dim ? 0 : Math.max(0, Math.min(1, filled))
  const dash = `${circumference * amount} ${circumference}`
  const ring = dim ? 'var(--line)' : color

  return (
    <div
      className="inline-flex flex-col items-center"
      style={{ width: box }}
      title={title}
    >
      {showStars && (
        <div style={{ height: 12, marginBottom: 1 }} className="leading-none">
          {stars > 0 && (
            <span style={{ fontSize: 9, letterSpacing: -1, color }}>
              {'★'.repeat(stars)}
            </span>
          )}
        </div>
      )}
      <div className="relative" style={{ width: box, height: box }}>
        <svg width={box} height={box} className="-rotate-90">
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke={ring}
            strokeWidth={stroke}
          />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke={dim ? 'var(--line)' : (progressColor ?? color)}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeLinecap="round"
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full"
          style={{
            fontSize: emoji,
            filter: dim ? 'grayscale(1)' : undefined,
            opacity: dim ? 0.35 : 1,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}
