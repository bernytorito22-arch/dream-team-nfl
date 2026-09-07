export function Stars(props: { filled: number; total?: number; size?: number }) {
  const total = props.total ?? 3;
  const size = props.size ?? 14;
  return (
    <span className="stars" aria-label={`${props.filled} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 2.5 L14.9 8.6 L21.5 9.4 L16.6 14 L18 20.5 L12 17.2 L6 20.5 L7.4 14 L2.5 9.4 L9.1 8.6 Z"
            fill={i < props.filled ? "#c9a227" : "rgba(7,16,24,0.35)"}
            stroke={i < props.filled ? "#8c6a2f" : "rgba(7,16,24,0.45)"}
            strokeWidth={1}
          />
        </svg>
      ))}
    </span>
  );
}
