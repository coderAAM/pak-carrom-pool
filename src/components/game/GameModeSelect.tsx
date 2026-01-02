import React from 'react';
import { GameMode } from '@/types/game';
import { cn } from '@/lib/utils';

interface GameModeSelectProps {
  currentMode: GameMode;
  onModeChange: (mode: GameMode) => void;
}

export const GameModeSelect: React.FC<GameModeSelectProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex gap-2 bg-card/50 p-1 rounded-lg border border-border">
      <button
        onClick={() => onModeChange('vs-ai')}
        className={cn(
          'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
          currentMode === 'vs-ai'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        🤖 vs AI
      </button>
      <button
        onClick={() => onModeChange('two-player')}
        className={cn(
          'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
          currentMode === 'two-player'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        👥 2 Players
      </button>
    </div>
  );
};
