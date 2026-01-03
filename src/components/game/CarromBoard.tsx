import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCarromGame } from '@/hooks/useCarromGame';
import { CoinComponent } from './CoinComponent';
import { PocketComponent } from './PocketComponent';
import { AimLine } from './AimLine';
import { GameModeSelect } from './GameModeSelect';
import { SoundToggle } from './SoundToggle';
import { BOARD_SIZE, BORDER_WIDTH } from '@/utils/gameSetup';
import { Loader2 } from 'lucide-react';

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
    setGameMode,
  } = useCarromGame('vs-ai');

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
      
      // Don't allow interaction during AI turn
      if (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2) return;
      if (gameState.gamePhase === 'moving' || gameState.gamePhase === 'ai-thinking') return;

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
    [getEventPosition, gameState.striker, gameState.gamePhase, gameState.currentPlayer, gameState.gameMode, startAiming, moveStriker]
  );

  const handleMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      
      if (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2) return;

      const { x, y } = getEventPosition(e);

      if (gameState.gamePhase === 'aiming' && aimState) {
        updateAim(x, y);
      } else if (gameState.gamePhase === 'placing') {
        moveStriker(x);
      }
    },
    [getEventPosition, gameState.gamePhase, gameState.currentPlayer, gameState.gameMode, aimState, updateAim, moveStriker]
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
  const isAITurn = gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2;

  return (
    <div className="flex flex-col items-center gap-4 p-4 animate-fade-in">
      {/* Game mode selector and sound toggle */}
      <div className="flex items-center gap-3">
        <GameModeSelect currentMode={gameState.gameMode} onModeChange={setGameMode} />
        <SoundToggle />
      </div>

      {/* Score display */}
      <div className="flex justify-between w-full max-w-[400px] px-2">
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {gameState.gameMode === 'vs-ai' ? 'You' : 'Player 1'}
          </span>
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
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              gameState.currentPlayer === 1 
                ? 'bg-primary text-primary-foreground glow-animation' 
                : 'bg-secondary text-secondary-foreground'
            } ${isAITurn ? 'animate-pulse' : ''}`}
          >
            {gameState.gameMode === 'vs-ai' 
              ? (gameState.currentPlayer === 1 ? '👤' : '🤖')
              : `P${gameState.currentPlayer}`
            }
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {gameState.gameMode === 'vs-ai' ? 'AI' : 'Player 2'}
          </span>
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
      <div className="h-8 flex items-center gap-2">
        {gameState.gamePhase === 'ai-thinking' && (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        )}
        <p className="text-sm text-muted-foreground text-center animate-fade-in">
          {gameState.message}
        </p>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className={`relative board-shadow rounded-lg overflow-hidden transition-opacity duration-200 ${
          isAITurn ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
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
        {/* AI thinking overlay */}
        {isAITurn && (
          <div className="absolute inset-0 bg-background/20 z-10 pointer-events-none" />
        )}

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
        {gameState.gamePhase === 'placing' && !isAITurn && (
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
          onClick={() => resetGame()}
          className="px-6 py-2 bg-card hover:bg-muted text-foreground rounded-lg font-medium transition-colors border border-border"
        >
          New Game
        </button>
      </div>

      {/* Instructions & Rules */}
      <div className="text-xs text-muted-foreground text-center max-w-[320px] mt-2 space-y-1">
        <p>Drag striker sideways to position, pull back and release to shoot!</p>
        <div className="flex justify-center gap-3 text-[10px] opacity-70">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-game-coin-black inline-block"></span> 10pts
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-game-coin-white border border-border inline-block"></span> 20pts
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-game-coin-queen inline-block"></span> 50pts
          </span>
        </div>
      </div>

      {/* Winner overlay */}
      {gameState.winner && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-card to-muted rounded-3xl p-10 text-center animate-scale-in border-2 border-primary/50 shadow-2xl max-w-sm mx-4">
            {/* Trophy/celebration icon */}
            <div className="text-6xl mb-4">
              {gameState.gameMode === 'vs-ai'
                ? (gameState.winner === 1 ? '🏆' : '🤖')
                : '🏆'
              }
            </div>
            
            {/* Winner text */}
            <h2 className="text-4xl font-display font-bold mb-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
              {gameState.gameMode === 'vs-ai'
                ? (gameState.winner === 1 ? 'YOU WIN!' : 'AI WINS!')
                : `PLAYER ${gameState.winner} WINS!`
              }
            </h2>
            
            {/* Winner label */}
            <p className="text-xl text-primary font-semibold mb-4">
              {gameState.gameMode === 'vs-ai'
                ? (gameState.winner === 1 ? '👤 Player 1 is the Champion!' : '🤖 Computer Victory!')
                : `🎯 Player ${gameState.winner} is the Champion!`
              }
            </p>
            
            {/* Score display */}
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase">
                  {gameState.gameMode === 'vs-ai' ? 'You' : 'P1'}
                </p>
                <p className={`text-3xl font-bold ${gameState.winner === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {gameState.player1Score}
                </p>
              </div>
              <div className="text-2xl text-muted-foreground self-center">vs</div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase">
                  {gameState.gameMode === 'vs-ai' ? 'AI' : 'P2'}
                </p>
                <p className={`text-3xl font-bold ${gameState.winner === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {gameState.player2Score}
                </p>
              </div>
            </div>
            
            {/* Play again button */}
            <button
              onClick={() => resetGame()}
              className="w-full px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-all hover:scale-105 shadow-lg"
            >
              🎮 Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
