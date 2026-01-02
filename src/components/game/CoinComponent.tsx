import React from 'react';
import { Coin } from '@/types/game';
import { cn } from '@/lib/utils';

interface CoinComponentProps {
  coin: Coin;
  scale: number;
}

export const CoinComponent: React.FC<CoinComponentProps> = ({ coin, scale }) => {
  if (coin.isPocketed) return null;

  const size = coin.radius * 2 * scale;
  const x = coin.x * scale - size / 2;
  const y = coin.y * scale - size / 2;

  const getGradient = () => {
    switch (coin.type) {
      case 'white':
        return 'bg-gradient-to-br from-game-coin-white via-amber-100 to-amber-200';
      case 'black':
        return 'bg-gradient-to-br from-gray-700 via-game-coin-black to-gray-900';
      case 'queen':
        return 'bg-gradient-to-br from-red-400 via-game-queen to-red-700';
      case 'striker':
        return 'bg-gradient-to-br from-amber-200 via-game-striker to-amber-400';
      default:
        return '';
    }
  };

  const getInnerRing = () => {
    switch (coin.type) {
      case 'white':
        return 'border-amber-300';
      case 'black':
        return 'border-gray-600';
      case 'queen':
        return 'border-red-300';
      case 'striker':
        return 'border-amber-300';
      default:
        return '';
    }
  };

  return (
    <div
      className={cn(
        'absolute rounded-full coin-shadow transition-transform duration-75',
        getGradient()
      )}
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        transform: 'translateZ(0)',
        willChange: 'left, top',
      }}
    >
      {/* Inner decorative ring */}
      <div
        className={cn(
          'absolute rounded-full border-2 opacity-50',
          getInnerRing()
        )}
        style={{
          width: size * 0.6,
          height: size * 0.6,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/* Center dot for queen */}
      {coin.type === 'queen' && (
        <div
          className="absolute rounded-full bg-yellow-400"
          style={{
            width: size * 0.2,
            height: size * 0.2,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </div>
  );
};
