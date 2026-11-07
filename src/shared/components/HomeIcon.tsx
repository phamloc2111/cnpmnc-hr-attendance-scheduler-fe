import type { ReactNode } from 'react'

export type HomeIconName = 'clock' | 'calendar' | 'user' | 'pin' | 'bell' | 'left' | 'right' | 'key' | 'logout' | 'refresh'
const paths: Record<HomeIconName, ReactNode> = {
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h7" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  key: <><circle cx="8" cy="9" r="5" /><path d="m12 13 8 8M16 17l3-3M19 20l3-3" /></>,
  logout: <><path d="M9 4H4v16h5M14 8l4 4-4 4M8 12h13" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1" /></>,
}
export function HomeIcon({ name, size = 22 }: { name: HomeIconName; size?: number }) {
  return <svg aria-hidden="true" fill="none" width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</svg>
}
