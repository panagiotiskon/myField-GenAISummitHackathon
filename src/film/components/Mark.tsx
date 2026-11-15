import { colors } from "../../config";

/** The in-app survey mark from components/Chrome.tsx. */
export function Mark({ size, color = colors.ink }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M3.5 6.5L19 3l2 15.5-15 3z" fill={colors.uncertain} fillOpacity={0.35} />
      <path
        d="M3.5 6.5L19 3l2 15.5-15 3z"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <g fill={color}>
        <circle cx="3.5" cy="6.5" r="2" />
        <circle cx="19" cy="3" r="2" />
        <circle cx="21" cy="18.5" r="2" />
        <circle cx="6" cy="21.5" r="2" />
      </g>
    </svg>
  );
}
