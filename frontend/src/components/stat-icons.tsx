import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 };

export const LayersIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 4h6v6H4zM14 4h6v6h-6zM14 14h6v6h-6zM4 14h6v6H4z" />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 8v4l3 2" />
  </svg>
);

export const AlarmIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 7v5l3 2" />
    <circle cx="12" cy="13" r="7.5" />
  </svg>
);

export const WarningIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 9v4M12 16h.01M10.3 4.9L2.8 18a1.6 1.6 0 0 0 1.4 2.4h15.6a1.6 1.6 0 0 0 1.4-2.4L13.7 4.9a1.6 1.6 0 0 0-2.8 0z" />
  </svg>
);

export const CheckCircleIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M8.5 12.2l2.4 2.4 4.6-5" />
  </svg>
);

export const InboxIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 12h4l2 3h4l2-3h4" />
    <path d="M5 12L6.5 6h11L19 12v6H5v-6z" />
  </svg>
);
