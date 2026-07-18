import type { ReactNode } from 'react';

export type IconName =
  | 'arrow'
  | 'brain'
  | 'building'
  | 'check'
  | 'close'
  | 'community'
  | 'map'
  | 'menu'
  | 'mic'
  | 'moon'
  | 'route'
  | 'sun'
  | 'tracking';

const paths: Record<IconName, ReactNode> = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  brain: <><path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.4A3.6 3.6 0 0 0 4 11.6c0 1.5.9 2.8 2.2 3.4A3.5 3.5 0 0 0 9.5 19H12v-4m0-10v4m0 0h2.5A3.5 3.5 0 0 1 18 12.5c0 .9-.3 1.7-.8 2.4A3.6 3.6 0 0 1 15 19h-3" /><path d="M8 12h4m0-3 3 2m-3 4 3-2" /></>,
  building: <><path d="M4 21h16M6 21V5l6-2v18m0-12h6v12" /><path d="M8 8h.01M8 12h.01M8 16h.01M15 12h.01M15 16h.01" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  community: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  map: <><path d="M9 18 3 21V5l6-3 6 3 6-3v16l-6 3-6-3Z" /><path d="M9 2v16M15 5v16" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  mic: <><rect width="8" height="12" x="8" y="2" rx="4" /><path d="M19 10a7 7 0 0 1-14 0M12 19v3M8 22h8" /></>,
  moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z" />,
  route: <><circle cx="6" cy="19" r="2" /><path d="M8 19h5a3 3 0 0 0 3-3V8a3 3 0 0 1 3-3h1" /><path d="m18 3 3 2-3 2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  tracking: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}
