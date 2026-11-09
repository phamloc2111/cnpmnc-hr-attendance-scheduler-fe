import type { ReactNode } from 'react'

export type HomeIconName = 'clock' | 'calendar' | 'user' | 'pin' | 'bell' | 'left' | 'right' | 'key' | 'logout' | 'refresh' | 'dashboard' | 'team' | 'briefcase' | 'shield' | 'menu' | 'close' | 'report' | 'settings' | 'check'
const paths: Record<HomeIconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  team: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="3" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a20 20 0 0 0 18 0M12 11v4" /></>,
  shield: <><path d="m12 3 8 4v6c0 5-8 9-8 9s-8-4-8-9V7Z" /><path d="m8 12 3 3 5-5" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  report: <><path d="M5 3h10l4 4v14H5Z" /><path d="M14 3v5h5M9 16v-3M12 16v-5M15 16v-2" /></>,
  settings: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  check: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="m8 12 3 3 5-6" /></>,
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
