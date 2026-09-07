export function Shield(props: { size?: number }) {
  const size = props.size ?? 44;
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 64 74"
      aria-label="NFL shield"
      role="img"
    >
      <defs>
        <linearGradient id="shield-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8c95c" />
          <stop offset="0.5" stopColor="#c9a227" />
          <stop offset="1" stopColor="#8c6a2f" />
        </linearGradient>
      </defs>
      <path
        d="M4 4 H60 V34 Q60 58 32 70 Q4 58 4 34 Z"
        fill="#0a1628"
        stroke="url(#shield-gold)"
        strokeWidth={4}
      />
      <path d="M9 9 H55 V24 H9 Z" fill="#c8102e" />
      <path d="M9 24 H55 V34 Q55 54 32 64.5 Q9 54 9 34 Z" fill="#1a3a6b" />
      {[14, 23, 32, 41, 50].map((x) => (
        <circle key={x} cx={x} cy={16.5} r={2.1} fill="#f4efe4" />
      ))}
      <ellipse cx={32} cy={34} rx={9} ry={4.6} fill="#f4efe4" transform="rotate(-18 32 34)" />
      <text
        x={32}
        y={56}
        textAnchor="middle"
        fill="#f4efe4"
        fontFamily="'Barlow Condensed', sans-serif"
        fontStyle="italic"
        fontWeight={700}
        fontSize={19}
        letterSpacing={1}
      >
        NFL
      </text>
    </svg>
  );
}
