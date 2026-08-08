/**
 * Small glyphs for the app's own navigation, drawn inline for the same reason
 * as the Google mark: emoji render inconsistently across platforms, and an
 * icon font would be a dependency for two shapes.
 *
 * They inherit the button's text colour via `currentColor`, so they follow the
 * theme (and the hover state) without any extra styling.
 */

interface IconProps {
  size?: number
}

/** A person, for the profile link. */
export function ProfileIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  )
}

/**
 * A stack of cards, for the word-sets link — a set is a pile of words, and it
 * reads better at this size than a folder, whose tab detail disappears.
 */
export function WordSetsIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="8" y="3" width="13" height="15" rx="2.5" />
      <path d="M16 21H5.5A2.5 2.5 0 0 1 3 18.5V7" />
    </svg>
  )
}
