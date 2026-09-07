export function NflMark(props: { size?: number; gold?: boolean }) {
  const s = props.size ?? 40;
  const stroke = props.gold === false ? "#f4efe4" : "#c9a227";
  const fill = props.gold === false ? "#f4efe4" : "#c9a227";
  return (
    <svg
      width={s}
      height={s * 1.25}
      viewBox="0 0 40 50"
      aria-label="NFL"
      role="img"
    >
      <path
        d="M20 2 L36 8 V26 C36 37 29 44 20 48 C11 44 4 37 4 26 V8 Z"
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
      />
      <path
        d="M20 7 L31 11.5 V25.5 C31 33.5 26.5 39.5 20 43 C13.5 39.5 9 33.5 9 25.5 V11.5 Z"
        fill="rgba(201,162,39,0.08)"
        stroke={stroke}
        strokeWidth={1}
      />
      <text
        x={20}
        y={30}
        textAnchor="middle"
        fill={fill}
        fontFamily="Oswald, sans-serif"
        fontWeight={700}
        fontSize={12}
        letterSpacing={1}
      >
        NFL
      </text>
      <circle cx={14} cy={15} r={1.1} fill={fill} />
      <circle cx={20} cy={13.5} r={1.1} fill={fill} />
      <circle cx={26} cy={15} r={1.1} fill={fill} />
    </svg>
  );
}
