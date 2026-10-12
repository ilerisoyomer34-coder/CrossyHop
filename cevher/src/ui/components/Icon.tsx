/** Small hand-made SVG icon set (no external icon font, works offline). */
import type { JSX } from 'preact';

export type IconName =
  | 'coin'
  | 'crystal'
  | 'gear'
  | 'up'
  | 'warning'
  | 'tap'
  | 'plus'
  | 'close'
  | 'chevron'
  | 'pickaxe'
  | 'elevator'
  | 'cart'
  | 'clock'
  | 'dynamite'
  | 'bug'
  | 'auto'
  | 'mountain';

const PATHS: Record<IconName, JSX.Element> = {
  coin: (
    <>
      <circle cx="12" cy="12" r="9" fill="#E9B949" stroke="#3B2A20" stroke-width="2" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#B8892F" stroke-width="1.6" />
      <path
        d="M12 8.5v7M10 10.2h3.2a1.4 1.4 0 0 1 0 2.8H10"
        fill="none"
        stroke="#7A5512"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </>
  ),
  crystal: (
    <>
      <path
        d="M7 4h10l4 5-9 11L3 9z"
        fill="#8FD3E8"
        stroke="#3B2A20"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <path
        d="M3 9h18M9 4l3 16 3-16"
        fill="none"
        stroke="#3B2A20"
        stroke-width="1.2"
        opacity=".55"
      />
    </>
  ),
  gear: (
    <path
      d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.2 4.7-1.9.4a6.6 6.6 0 0 1-.8 1.9l1.1 1.6-1.6 1.6-1.6-1.1c-.6.4-1.2.6-1.9.8l-.4 1.9h-2.2l-.4-1.9a6.6 6.6 0 0 1-1.9-.8l-1.6 1.1-1.6-1.6 1.1-1.6a6.6 6.6 0 0 1-.8-1.9l-1.9-.4v-2.2l1.9-.4c.2-.7.4-1.3.8-1.9L5.4 6.6 7 5l1.6 1.1c.6-.4 1.2-.6 1.9-.8L10.9 3.4h2.2l.4 1.9c.7.2 1.3.4 1.9.8L17 5l1.6 1.6-1.1 1.6c.4.6.6 1.2.8 1.9l1.9.4z"
      fill="currentColor"
    />
  ),
  up: <path d="M12 4l7 8h-4.5v8h-5v-8H5z" fill="currentColor" />,
  warning: (
    <>
      <path
        d="M12 3 2 20h20z"
        fill="#F4A261"
        stroke="#3B2A20"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <path d="M12 9v5" stroke="#3B2A20" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="12" cy="17" r="1.4" fill="#3B2A20" />
    </>
  ),
  tap: (
    <path
      d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10l4.6 1.1a2 2 0 0 1 1.5 2.3l-.9 4.8a2.5 2.5 0 0 1-2.5 2H11a2.5 2.5 0 0 1-2-1l-3.5-4.6a1.5 1.5 0 0 1 2.3-1.9L9 13.8z"
      fill="#F6EBD9"
      stroke="#3B2A20"
      stroke-width="1.8"
      stroke-linejoin="round"
    />
  ),
  plus: (
    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
  ),
  close: (
    <path
      d="M6 6l12 12M18 6 6 18"
      stroke="currentColor"
      stroke-width="2.6"
      stroke-linecap="round"
    />
  ),
  chevron: (
    <path
      d="M9 5l7 7-7 7"
      fill="none"
      stroke="currentColor"
      stroke-width="2.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  ),
  pickaxe: (
    <>
      <path d="M5 20 15 9" stroke="#9C6B3F" stroke-width="2.6" stroke-linecap="round" />
      <path
        d="M8 4c5 0 9 2 12 7l-2 1c-3-3-6-4.5-10-5z"
        fill="#6F7480"
        stroke="#3B2A20"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
    </>
  ),
  elevator: (
    <>
      <rect
        x="5"
        y="3"
        width="14"
        height="18"
        rx="2"
        fill="#6F7480"
        stroke="#3B2A20"
        stroke-width="2"
      />
      <path
        d="M9 9l3-3 3 3M9 15l3 3 3-3"
        fill="none"
        stroke="#F6EBD9"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </>
  ),
  cart: (
    <>
      <path
        d="M3 7h18l-2 9H5z"
        fill="#6F7480"
        stroke="#3B2A20"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <circle cx="8" cy="19" r="2" fill="#3B2A20" />
      <circle cx="16" cy="19" r="2" fill="#3B2A20" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2" />
      <path
        d="M12 7v5l3 2"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
      />
    </>
  ),
  dynamite: (
    <>
      <rect
        x="5"
        y="9"
        width="5"
        height="11"
        rx="1.5"
        fill="#C8553D"
        stroke="#3B2A20"
        stroke-width="1.6"
      />
      <rect
        x="10"
        y="9"
        width="5"
        height="11"
        rx="1.5"
        fill="#C8553D"
        stroke="#3B2A20"
        stroke-width="1.6"
      />
      <path d="M12.5 9c0-3 2-4 4-4" fill="none" stroke="#3B2A20" stroke-width="1.6" />
      <path
        d="M18 3l.8 1.6 1.7.3-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.3z"
        fill="#FFD166"
      />
    </>
  ),
  bug: (
    <>
      <ellipse cx="12" cy="13" rx="5" ry="6.5" fill="currentColor" />
      <path
        d="M12 6.5V20M7 10 3.5 8M17 10l3.5-2M7 14H3M17 14h4M7.5 17.5 4.5 20M16.5 17.5l3 2.5"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    </>
  ),
  auto: (
    <path d="M12 4a8 8 0 1 0 8 8h-2.5A5.5 5.5 0 1 1 12 6.5V9l4-3.5L12 2z" fill="currentColor" />
  ),
  mountain: (
    <path
      d="M2 19 9 7l4 6 2.5-3.5L22 19z"
      fill="#7FA585"
      stroke="#3B2A20"
      stroke-width="1.8"
      stroke-linejoin="round"
    />
  ),
};

export function Icon({
  name,
  size = 20,
  class: className,
}: {
  name: IconName;
  size?: number;
  class?: string;
}) {
  return (
    <svg
      class={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
