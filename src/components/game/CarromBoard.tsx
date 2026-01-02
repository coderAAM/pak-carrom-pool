import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCarromGame } from '@/hooks/useCarromGame';
import { CoinComponent } from './CoinComponent';
import { PocketComponent } from './PocketComponent';
import { AimLine } from './AimLine';
import { BOARD_SIZE, BORDER_WIDTH } from '@/utils/gameSetup';

export const CarromBoard: React.FC = () => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const {
    gameState,
    aimState,
    pockets,
    moveStriker,
    startAiming,
    updateAim,
    shoot,
    resetGame,
  } = useCarromGame();

  // Calculate scale based on container size
  useEffect(() => {
    const updateScale = () => {
      if (boardRef.current) {
        const containerWidth = Math.min(window.innerWidth - 32, 400);
        setScale(containerWidth / BOARD_SIZE);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const getEventPosition = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!boardRef.current) return { x: 0, y: 0 };

      const rect = boardRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  const handleStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      const { x, y } = getEventPosition(e);

      // Check if touching near striker for positioning
      const strikerDist = Math.sqrt(
        Math.pow(x - gameState.striker.x, 2) + Math.pow(y - gameState.striker.y, 2)
      );

      if (strikerDist < 40 && gameState.gamePhase === 'placing') {
        startAiming(x, y);
      } else if (gameState.gamePhase === 'placing') {
        moveStriker(x);
      }
    },
    [getEventPosition, gameState.striker, gameState.gamePhase, startAiming, moveStriker]
  );

  const handleMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      const { x, y } = getEventPosition(e);

      if (gameState.gamePhase === 'aiming' && aimState) {
        updateAim(x, y);
      } else if (gameState.gamePhase === 'placing') {
        moveStriker(x);
      }
    },
    [getEventPosition, gameState.gamePhase, aimState, updateAim, moveStriker]
  );

  const handleEnd = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      if (gameState.gamePhase === 'aiming') {
        shoot();
      }
    },
    [gameState.gamePhase, shoot]
  );

  const boardWidth = BOARD_SIZE * scale;

  return (
    <div className="flex flex-col items-center gap-4 p-4 animate-fade-in">
      {/* Score display */}
      <div className="flex justify-between w-full max-w-[400px] px-2">
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Player 1</span>
          <span className="text-2xl font-display text-primary">{gameState.player1Score}</span>
          {gameState.player1Color && (
            <div
              className={`w-4 h-4 rounded-full mt-1 ${
                gameState.player1Color === 'white' ? 'bg-game-coin-white' : 'bg-game-coin-black'
              }`}
            />
          )}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground">Turn</span>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold glow-animation ${
              gameState.currentPlayer === 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            P{gameState.currentPlayer}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Player 2</span>
          <span className="text-2xl font-display text-primary">{gameState.player2Score}</span>
          {gameState.player2Color && (
            <div
              className={`w-4 h-4 rounded-full mt-1 ${
                gameState.player2Color === 'white' ? 'bg-game-coin-white' : 'bg-game-coin-black'
              }`}
            />
          )}
        </div>
      </div>

      {/* Game message */}
      <div className="h-8 flex items-center">
        <p className="text-sm text-muted-foreground text-center animate-fade-in">
          {gameState.message}
        </p>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="relative board-shadow rounded-lg overflow-hidden cursor-pointer"
        style={{
          width: boardWidth,
          height: boardWidth,
          background: `linear-gradient(135deg, hsl(var(--board-wood)) 0%, hsl(var(--board-wood-dark)) 100%)`,
        }}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        {/* Playing surface */}
        <div
          className="absolute bg-gradient-to-br from-game-surface to-game-surface-dark"
          style={{
            left: BORDER_WIDTH * scale,
            top: BORDER_WIDTH * scale,
            width: (BOARD_SIZE - BORDER_WIDTH * 2) * scale,
            height: (BOARD_SIZE - BORDER_WIDTH * 2) * scale,
            borderRadius: 4,
          }}
        />

        {/* Center circle */}
        <div
          className="absolute rounded-full border-2 border-game-line opacity-40"
          style={{
            width: 80 * scale,
            height: 80 * scale,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Inner center circle */}
        <div
          className="absolute rounded-full border border-game-line opacity-30"
          style={{
            width: 40 * scale,
            height: 40 * scale,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Striker baseline (bottom) */}
        <div
          className="absolute border-t border-game-line opacity-40"
          style={{
            width: (BOARD_SIZE - BORDER_WIDTH * 2 - 80) * scale,
            left: (BORDER_WIDTH + 40) * scale,
            top: (BOARD_SIZE - BORDER_WIDTH - 50) * scale,
          }}
        />

        {/* Striker baseline (top) */}
        <div
          className="absolute border-t border-game-line opacity-40"
          style={{
            width: (BOARD_SIZE - BORDER_WIDTH * 2 - 80) * scale,
            left: (BORDER_WIDTH + 40) * scale,
            top: (BORDER_WIDTH + 50) * scale,
          }}
        />

        {/* Pockets */}
        {pockets.map((pocket, i) => (
          <PocketComponent key={i} pocket={pocket} scale={scale} />
        ))}

        {/* Coins */}
        {gameState.coins.map((coin) => (
          <CoinComponent key={coin.id} coin={coin} scale={scale} />
        ))}

        {/* Striker */}
        <CoinComponent coin={gameState.striker} scale={scale} />

        {/* Aim line */}
        {aimState && <AimLine aimState={aimState} scale={scale} />}

        {/* Striker position indicator */}
        {gameState.gamePhase === 'placing' && (
          <div
            className="absolute w-12 h-12 rounded-full border-2 border-primary border-dashed opacity-50 pulse-ring pointer-events-none"
            style={{
              left: gameState.striker.x * scale - 24,
              top: gameState.striker.y * scale - 24,
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-2">
        <button
          onClick={resetGame}
          className="px-6 py-2 bg-card hover:bg-muted text-foreground rounded-lg font-medium transition-colors border border-border"
        >
          New Game
        </button>
      </div>

      {/* Instructions */}
      <div className="text-xs text-muted-foreground text-center max-w-[300px] mt-2">
        <p>Drag the striker sideways to position, then pull back and release to shoot!</p>
      </div>

      {/* Winner overlay */}
      {gameState.winner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-card rounded-2xl p-8 text-center animate-scale-in border border-border">
            <h2 className="text-3xl font-display game-title mb-4">
              Player {gameState.winner} Wins!
            </h2>
            <p className="text-muted-foreground mb-6">
              Final Score: {gameState.player1Score} - {gameState.player2Score}
            </p>
            <button
              onClick={resetGame}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
