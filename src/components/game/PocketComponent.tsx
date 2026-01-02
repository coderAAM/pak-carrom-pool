import React from 'react';
import { Pocket } from '@/types/game';

interface PocketComponentProps {
  pocket: Pocket;
  scale: number;
}

export const PocketComponent: React.FC<PocketComponentProps> = ({ pocket, scale }) => {
  const size = pocket.radius * 2 * scale;
  const x = pocket.x * scale - size / 2;
  const y = pocket.y * scale - size / 2;

  return (
    <div
      className="absolute rounded-full bg-gradient-to-br from-gray-900 via-black to-gray-800 pocket-shadow"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
      }}
    >
      {/* Golden rim */}
      <div
        className="absolute rounded-full border-2 border-game-pocket opacity-60"
        style={{
          width: size + 4,
          height: size + 4,
          left: -2,
          top: -2,
        }}
      />
    </div>
  );
};
