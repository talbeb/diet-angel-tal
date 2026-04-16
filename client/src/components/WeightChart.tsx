interface DataPoint {
  date: string;
  weight: number;
}

interface Props {
  data: DataPoint[];
  goal: number | null;
  color: string;
}

const W = 400;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 32, left: 44 };

export default function WeightChart({ data, goal, color }: Props) {
  if (data.length < 2) return null;

  const weights = data.map((d) => d.weight);
  const allValues = goal != null ? [...weights, goal] : weights;
  const minVal = Math.min(...allValues) - 1.5;
  const maxVal = Math.max(...allValues) + 1.5;

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  function x(i: number) {
    return PAD.left + (i / (data.length - 1)) * chartW;
  }

  function y(val: number) {
    return PAD.top + ((maxVal - val) / (maxVal - minVal)) * chartH;
  }

  const polyline = data.map((d, i) => `${x(i)},${y(d.weight)}`).join(' ');

  // Y-axis ticks
  const tickCount = 4;
  const yTicks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(minVal + (i / tickCount) * (maxVal - minVal));
  }

  // X-axis labels — show first, last, and middle if ≥5 points
  const xLabelIdxs = new Set([0, data.length - 1]);
  if (data.length >= 5) xLabelIdxs.add(Math.floor((data.length - 1) / 2));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-label="Weight chart"
    >
      {/* Grid lines */}
      {yTicks.map((val) => (
        <line
          key={val}
          x1={PAD.left} y1={y(val)}
          x2={W - PAD.right} y2={y(val)}
          stroke="#f0f0f0" strokeWidth={1}
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((val) => (
        <text
          key={val}
          x={PAD.left - 6} y={y(val)}
          textAnchor="end" dominantBaseline="middle"
          fontSize={10} fill="#aaa"
        >
          {val.toFixed(1)}
        </text>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) =>
        xLabelIdxs.has(i) ? (
          <text
            key={i}
            x={x(i)} y={H - 6}
            textAnchor="middle"
            fontSize={10} fill="#aaa"
          >
            {d.date}
          </text>
        ) : null
      )}

      {/* Goal reference line */}
      {goal != null && (
        <>
          <line
            x1={PAD.left} y1={y(goal)}
            x2={W - PAD.right} y2={y(goal)}
            stroke="#4caf50" strokeWidth={1.5} strokeDasharray="6 3"
          />
          <text
            x={W - PAD.right - 2} y={y(goal) - 4}
            textAnchor="end" fontSize={10} fill="#4caf50"
          >
            goal {goal}kg
          </text>
        </>
      )}

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={x(i)} cy={y(d.weight)}
          r={4}
          fill="#fff" stroke={color} strokeWidth={2}
        >
          <title>{d.date}: {d.weight} kg</title>
        </circle>
      ))}
    </svg>
  );
}
