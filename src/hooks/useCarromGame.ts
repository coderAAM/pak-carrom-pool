import { useState, useCallback, useRef, useEffect } from 'react';
import { Coin, GameState, AimState, GameMode } from '@/types/game';
import {
  applyFriction,
  updatePosition,
  checkWallCollision,
  checkCoinCollision,
  resolveCoinCollision,
  checkPocketCollision,
  isMoving,
  calculateShot,
} from '@/utils/physics';
import {
  createInitialGameState,
  createPockets,
  BOARD_SIZE,
  BORDER_WIDTH,
  getStrikerBounds,
  createStriker,
} from '@/utils/gameSetup';
import { calculateAIShot } from '@/utils/aiPlayer';

export const useCarromGame = (initialMode: GameMode = 'vs-ai') => {
  const [gameState, setGameState] = useState<GameState>(() => ({
    ...createInitialGameState(),
    gameMode: initialMode,
    message: initialMode === 'vs-ai' ? 'Your turn! Position striker and shoot!' : 'Player 1: Position striker and shoot!',
  }));
  const [aimState, setAimState] = useState<AimState | null>(null);
  const animationRef = useRef<number>();
  const aiTimeoutRef = useRef<NodeJS.Timeout>();
  const pockets = createPockets();

  // AI turn handler
  useEffect(() => {
    if (
      gameState.gameMode === 'vs-ai' &&
      gameState.currentPlayer === 2 &&
      gameState.gamePhase === 'placing'
    ) {
      // Start AI thinking
      setGameState(prev => ({ ...prev, gamePhase: 'ai-thinking', message: 'AI is thinking...' }));

      aiTimeoutRef.current = setTimeout(() => {
        const aiShot = calculateAIShot(
          gameState.striker,
          gameState.coins,
          pockets,
          gameState.player2Color,
          2
        );

        // Position striker
        setGameState(prev => ({
          ...prev,
          striker: { ...prev.striker, x: aiShot.strikerX },
        }));

        // Simulate aiming animation
        setTimeout(() => {
          const { vx, vy } = calculateShot(
            aiShot.strikerX,
            gameState.striker.y,
            aiShot.aimX,
            aiShot.aimY,
            aiShot.power
          );

          setGameState(prev => ({
            ...prev,
            striker: { ...prev.striker, vx, vy },
            gamePhase: 'moving',
            message: 'AI shoots!',
          }));
        }, 800);
      }, 1000);
    }

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [gameState.currentPlayer, gameState.gamePhase, gameState.gameMode, gameState.striker, gameState.coins, gameState.player2Color, pockets]);

  const gameLoop = useCallback(() => {
    setGameState((prev) => {
      if (prev.gamePhase !== 'moving') return prev;

      const allCoins = [...prev.coins, prev.striker];
      const activeCoins = allCoins.filter((c) => !c.isPocketed);

      // Update physics
      activeCoins.forEach((coin) => {
        updatePosition(coin);
        applyFriction(coin);
        checkWallCollision(coin, BOARD_SIZE, BORDER_WIDTH);
      });

      // Check collisions between coins
      for (let i = 0; i < activeCoins.length; i++) {
        for (let j = i + 1; j < activeCoins.length; j++) {
          if (checkCoinCollision(activeCoins[i], activeCoins[j])) {
            resolveCoinCollision(activeCoins[i], activeCoins[j]);
          }
        }
      }

      // Check pocket collisions
      let pocketedThisTurn: Coin[] = [];
      let strikerPocketed = false;

      activeCoins.forEach((coin) => {
        pockets.forEach((pocket) => {
          if (!coin.isPocketed && checkPocketCollision(coin, pocket)) {
            coin.isPocketed = true;
            coin.vx = 0;
            coin.vy = 0;

            if (coin.type === 'striker') {
              strikerPocketed = true;
            } else {
              pocketedThisTurn.push(coin);
            }
          }
        });
      });

      const updatedCoins = prev.coins.map((c) => 
        activeCoins.find((ac) => ac.id === c.id) || c
      );
      const updatedStriker = activeCoins.find((c) => c.id === 'striker') || prev.striker;

      // Check if still moving
      if (!isMoving(allCoins)) {
        // Process turn end
        let newScore1 = prev.player1Score;
        let newScore2 = prev.player2Score;
        let nextPlayer = prev.currentPlayer;
        let message = '';
        let color1 = prev.player1Color;
        let color2 = prev.player2Color;

        // Assign colors on first pocket
        if (!color1 && pocketedThisTurn.length > 0) {
          const firstPocketed = pocketedThisTurn.find(c => c.type !== 'queen');
          if (firstPocketed) {
            color1 = firstPocketed.type as 'white' | 'black';
            color2 = color1 === 'white' ? 'black' : 'white';
          }
        }

        // Calculate score
        pocketedThisTurn.forEach((coin) => {
          if (coin.type === 'queen') {
            if (prev.currentPlayer === 1) newScore1 += 3;
            else newScore2 += 3;
          } else if (coin.type === color1 && prev.currentPlayer === 1) {
            newScore1 += 1;
          } else if (coin.type === color2 && prev.currentPlayer === 2) {
            newScore2 += 1;
          }
        });

        // Foul: striker pocketed
        if (strikerPocketed) {
          if (prev.currentPlayer === 1) newScore1 = Math.max(0, newScore1 - 1);
          else newScore2 = Math.max(0, newScore2 - 1);
          
          if (prev.gameMode === 'vs-ai') {
            message = prev.currentPlayer === 1 ? 'Foul! Striker pocketed. -1 point.' : 'AI fouled! -1 point.';
          } else {
            message = 'Foul! Striker pocketed. -1 point.';
          }
          nextPlayer = prev.currentPlayer === 1 ? 2 : 1;
        } else if (pocketedThisTurn.length === 0) {
          nextPlayer = prev.currentPlayer === 1 ? 2 : 1;
          if (prev.gameMode === 'vs-ai') {
            message = nextPlayer === 1 ? 'Your turn!' : 'AI\'s turn...';
          } else {
            message = `Player ${nextPlayer}'s turn`;
          }
        } else {
          if (prev.gameMode === 'vs-ai') {
            message = prev.currentPlayer === 1 ? 'Great shot! Your turn again!' : 'AI pocketed a coin!';
          } else {
            message = `Great shot! Player ${prev.currentPlayer} continues`;
          }
        }

        // Check win condition
        const whiteCoins = updatedCoins.filter(c => c.type === 'white' && !c.isPocketed);
        const blackCoins = updatedCoins.filter(c => c.type === 'black' && !c.isPocketed);
        let winner: 1 | 2 | null = null;

        if (whiteCoins.length === 0 && color1 === 'white') winner = 1;
        else if (whiteCoins.length === 0 && color2 === 'white') winner = 2;
        else if (blackCoins.length === 0 && color1 === 'black') winner = 1;
        else if (blackCoins.length === 0 && color2 === 'black') winner = 2;

        // Reset striker
        const newStriker = createStriker(nextPlayer === 1 ? 'bottom' : 'top');

        return {
          ...prev,
          coins: updatedCoins,
          striker: newStriker,
          player1Score: newScore1,
          player2Score: newScore2,
          player1Color: color1,
          player2Color: color2,
          currentPlayer: nextPlayer,
          gamePhase: winner ? 'ended' : 'placing',
          winner,
          message: winner 
            ? (prev.gameMode === 'vs-ai' 
              ? (winner === 1 ? 'You Win! 🎉' : 'AI Wins!') 
              : `Player ${winner} wins!`)
            : message,
        };
      }

      return {
        ...prev,
        coins: updatedCoins,
        striker: updatedStriker,
      };
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [pockets]);

  useEffect(() => {
    if (gameState.gamePhase === 'moving') {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.gamePhase, gameLoop]);

  const moveStriker = useCallback((x: number) => {
    if (gameState.gamePhase !== 'placing' && gameState.gamePhase !== 'aiming') return;
    if (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2) return;

    const bounds = getStrikerBounds(gameState.currentPlayer);
    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, x));

    setGameState((prev) => ({
      ...prev,
      striker: { ...prev.striker, x: clampedX },
      gamePhase: 'placing',
    }));
  }, [gameState.gamePhase, gameState.currentPlayer, gameState.gameMode]);

  const startAiming = useCallback((x: number, y: number) => {
    if (gameState.gamePhase !== 'placing' && gameState.gamePhase !== 'aiming') return;
    if (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2) return;

    setAimState({
      startX: gameState.striker.x,
      startY: gameState.striker.y,
      endX: x,
      endY: y,
      power: 0,
      angle: 0,
    });

    setGameState((prev) => ({ ...prev, gamePhase: 'aiming' }));
  }, [gameState.gamePhase, gameState.striker, gameState.gameMode, gameState.currentPlayer]);

  const updateAim = useCallback((x: number, y: number) => {
    if (!aimState || gameState.gamePhase !== 'aiming') return;

    const { power } = calculateShot(aimState.startX, aimState.startY, x, y);

    setAimState((prev) => prev ? {
      ...prev,
      endX: x,
      endY: y,
      power,
    } : null);
  }, [aimState, gameState.gamePhase]);

  const shoot = useCallback(() => {
    if (!aimState || gameState.gamePhase !== 'aiming') return;

    const { vx, vy, power } = calculateShot(
      aimState.startX,
      aimState.startY,
      aimState.endX,
      aimState.endY
    );

    if (power < 1) {
      setAimState(null);
      setGameState((prev) => ({ ...prev, gamePhase: 'placing' }));
      return;
    }

    setGameState((prev) => ({
      ...prev,
      striker: { ...prev.striker, vx, vy },
      gamePhase: 'moving',
      message: 'Shooting...',
    }));

    setAimState(null);
  }, [aimState, gameState.gamePhase]);

  const resetGame = useCallback((mode?: GameMode) => {
    const newMode = mode || gameState.gameMode;
    setGameState({
      ...createInitialGameState(),
      gameMode: newMode,
      message: newMode === 'vs-ai' ? 'Your turn! Position striker and shoot!' : 'Player 1: Position striker and shoot!',
    });
    setAimState(null);
  }, [gameState.gameMode]);

  const setGameMode = useCallback((mode: GameMode) => {
    resetGame(mode);
  }, [resetGame]);

  return {
    gameState,
    aimState,
    pockets,
    moveStriker,
    startAiming,
    updateAim,
    shoot,
    resetGame,
    setGameMode,
  };
};
