import React from 'react';

interface CircleProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export const CircleProgress: React.FC<CircleProgressProps> = ({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
}) => {
  const pct = Math.min(Math.max(value, 0), 100);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  const color = pct >= 100 ? '#22c55e' : pct >= 80 ? '#f59e0b' : '#c724ff';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 6px ${color})` }}
      />
      {(label || sublabel) && (
        <g style={{ transform: `rotate(90deg) translate(0, -${size}px)` }}>
          {label && (
            <text
              x={size / 2}
              y={sublabel ? size / 2 - 6 : size / 2 + 5}
              textAnchor="middle"
              fill="white"
              fontSize={size * 0.18}
              fontWeight="700"
              fontFamily="var(--font-body)"
            >
              {label}
            </text>
          )}
          {sublabel && (
            <text
              x={size / 2}
              y={size / 2 + 14}
              textAnchor="middle"
              fill="rgba(252,232,255,0.5)"
              fontSize={size * 0.1}
              fontFamily="var(--font-body)"
            >
              {sublabel}
            </text>
          )}
        </g>
      )}
    </svg>
  );
};
