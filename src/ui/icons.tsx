/**
 * Curl Tracker — icons.
 * Strokes use currentColor so the tab bar and the wordmark share one accent.
 */
interface IconProps {
  class?: string
}

export function Mark(props: IconProps) {
  return (
    <svg class={props.class ?? 'mark'} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M32 52c-11 0-20-9-20-20S21 12 32 12s16 5 16 12-5 10-10 10-7-3-7-6 2.2-5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconToday() {
  return (
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.2v2M12 18.8v2M3.2 12h2M18.8 12h2M5.8 5.8l1.4 1.4M16.8 16.8l1.4 1.4M18.2 5.8l-1.4 1.4M7.2 16.8l-1.4 1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconHistory() {
  return (
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3.5v3M16 3.5v3M4 9.5h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconProducts() {
  return (
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 8h6l-.6 11.2a2 2 0 0 1-2 .8h-1.8a2 2 0 0 1-2-.8L9 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 8c0-2 1.2-4 3-4s3 2 3 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconMore() {
  return (
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" />
    </svg>
  )
}
