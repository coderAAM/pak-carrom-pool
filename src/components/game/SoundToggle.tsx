import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { gameAudio } from '@/utils/gameAudio';
import { cn } from '@/lib/utils';

interface SoundToggleProps {
  className?: string;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({ className }) => {
  const [isMuted, setIsMuted] = React.useState(gameAudio.isSoundMuted());

  const handleToggle = () => {
    const newMuted = gameAudio.toggleMute();
    setIsMuted(newMuted);
    if (!newMuted) {
      gameAudio.playClick();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'p-2 rounded-lg bg-card/50 border border-border hover:bg-muted/50 transition-colors',
        className
      )}
      aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {isMuted ? (
        <VolumeX className="w-5 h-5 text-muted-foreground" />
      ) : (
        <Volume2 className="w-5 h-5 text-primary" />
      )}
    </button>
  );
};
