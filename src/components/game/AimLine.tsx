import React from 'react';
import { AimState } from '@/types/game';

interface AimLineProps {
  aimState: AimState;
  scale: number;
}

export const AimLine: React.FC<AimLineProps> = ({ aimState, scale }) => {
  const { startX, startY, endX, endY, power } = aimState;

  // Direction vector (reversed for visual feedback)
  const dx = startX - endX;
  const dy = startY - endY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 5) return null;

  const normalizedDx = dx / length;
  const normalizedDy = dy / length;

  // Scale the visual line based on power
  const visualLength = Math.min(power * 8, 150);
  const lineEndX = startX + normalizedDx * visualLength;
  const lineEndY = startY + normalizedDy * visualLength;

  // Power indicator color
  const powerColor = power < 8 ? '#4ade80' : power < 16 ? '#fbbf24' : '#ef4444';

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Main aim line */}
      <line
        x1={startX * scale}
        y1={startY * scale}
        x2={lineEndX * scale}
        y2={lineEndY * scale}
        stroke={powerColor}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="8,4"
        className="animate-pulse"
      />

      {/* Direction arrow */}
      <circle
        cx={lineEndX * scale}
        cy={lineEndY * scale}
        r={6}
        fill={powerColor}
      />

      {/* Power indicator dots */}
      {Array.from({ length: Math.min(Math.floor(power / 5), 5) }).map((_, i) => {
        const dotDistance = (i + 1) * 20;
        const dotX = startX + normalizedDx * dotDistance;
        const dotY = startY + normalizedDy * dotDistance;
        return (
          <circle
            key={i}
            cx={dotX * scale}
            cy={dotY * scale}
            r={3}
            fill={powerColor}
            opacity={0.6}
          />
        );
      })}

      {/* Pull indicator line (from striker to touch point) */}
      <line
        x1={startX * scale}
        y1={startY * scale}
        x2={endX * scale}
        y2={endY * scale}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
};
