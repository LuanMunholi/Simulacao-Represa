/** Mini gráfico de linha (usa currentColor — defina a cor no elemento pai). */
export function Sparkline({
  values,
  width = 120,
  height = 24,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pad = 2;
  const usable = height - pad * 2;

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = pad + (1 - (v - min) / range) * usable;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.85}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
