/** Лого лендинга: лучи, расходящиеся из центра. 24×24, цвет берётся из currentColor. */
export function SunburstIcon({ className }: { className?: string }) {
  const rays = Array.from({ length: 8 }, (_, index) => index * 45);

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.25" />
      {rays.map((angle) => (
        <line
          key={angle}
          x1="12"
          y1="6"
          x2="12"
          y2="2.5"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
    </svg>
  );
}
