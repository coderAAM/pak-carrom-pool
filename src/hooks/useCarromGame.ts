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
import { gameAudio } from '@/utils/gameAudio';

export const useCarromGame = (initialMode: GameMode = 'vs-ai') => {
  const [gameState, setGameState] = useState<GameState>(() => ({
    ...createInitialGameState(),
    gameMode: initialMode,
    message: initialMode === 'vs-ai' ? 'Your turn! Position striker and shoot!' : 'Player 1: Position striker and shoot!',
  }));
  const [aimState, setAimState] = useState<AimState | null>(null);
  const animationRef = useRef<number>();
  const aiTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCollisionsRef = useRef<Set<string>>(new Set());
  const pockets = createPockets();

  // Initialize audio on first interaction
  useEffect(() => {
    const initAudio = () => {
      gameAudio.init();
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('mousedown', initAudio);
    };
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('mousedown', initAudio, { once: true });
  }, []);

  // AI turn handler
  useEffect(() => {
    if (
      gameState.gameMode === 'vs-ai' &&
      gameState.currentPlayer === 2 &&
      gameState.gamePhase === 'placing'
    ) {
      setGameState(prev => ({ ...prev, gamePhase: 'ai-thinking', message: 'AI is thinking...' }));

      aiTimeoutRef.current = setTimeout(() => {
        const aiShot = calculateAIShot(
          gameState.striker,
          gameState.coins,
          pockets,
          gameState.player2Color,
          2
        );

        setGameState(prev => ({
          ...prev,
          striker: { ...prev.striker, x: aiShot.strikerX },
        }));

        setTimeout(() => {
          const { vx, vy } = calculateShot(
            aiShot.strikerX,
            gameState.striker.y,
            aiShot.aimX,
            aiShot.aimY,
            aiShot.power
          );

          gameAudio.playStrike(aiShot.power);

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

  // Points system: Black = 10, White = 20, Queen = 50
  const getPointsForCoin = (coinType: 'white' | 'black' | 'queen' | 'striker'): number => {
    switch (coinType) {
      case 'white': return 20;
      case 'black': return 10;
      case 'queen': return 50;
      default: return 0;
    }
  };

  const gameLoop = useCallback(() => {
    setGameState((prev) => {
      if (prev.gamePhase !== 'moving') return prev;

      const allCoins = [...prev.coins, prev.striker];
      const activeCoins = allCoins.filter((c) => !c.isPocketed);
      const currentCollisions = new Set<string>();

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
            const collisionKey = [activeCoins[i].id, activeCoins[j].id].sort().join('-');
            currentCollisions.add(collisionKey);
            
            // Play collision sound only for new collisions
            if (!lastCollisionsRef.current.has(collisionKey)) {
              const relativeVelocity = Math.sqrt(
                Math.pow(activeCoins[i].vx - activeCoins[j].vx, 2) +
                Math.pow(activeCoins[i].vy - activeCoins[j].vy, 2)
              );
              if (relativeVelocity > 1) {
                gameAudio.playCollision(Math.min(relativeVelocity / 15, 1));
              }
            }
            
            resolveCoinCollision(activeCoins[i], activeCoins[j]);
          }
        }
      }
      
      lastCollisionsRef.current = currentCollisions;

      // Check pocket collisions - track pocketed coins this turn
      const pocketedThisTurn: Coin[] = [];
      let strikerPocketed = false;

      activeCoins.forEach((coin) => {
        pockets.forEach((pocket) => {
          if (!coin.isPocketed && checkPocketCollision(coin, pocket)) {
            coin.isPocketed = true;
            coin.vx = 0;
            coin.vy = 0;

            if (coin.type === 'striker') {
              strikerPocketed = true;
              gameAudio.playFoul();
            } else {
              pocketedThisTurn.push(coin);
              if (coin.type === 'queen') {
                gameAudio.playQueenPocket();
              } else {
                gameAudio.playPocket();
              }
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
        let newScore1 = prev.player1Score;
        let newScore2 = prev.player2Score;
        let nextPlayer = prev.currentPlayer;
        let message = '';
        let color1 = prev.player1Color;
        let color2 = prev.player2Color;
        let isFoul = false;

        // Freestyle mode: First coin pocketed determines color
        if (!color1 && pocketedThisTurn.length > 0) {
          const firstPocketed = pocketedThisTurn.find(c => c.type !== 'queen');
          if (firstPocketed) {
            color1 = firstPocketed.type as 'white' | 'black';
            color2 = color1 === 'white' ? 'black' : 'white';
          }
        }

        // Calculate points and check for fouls
        let validPockets = 0;
        let foulPockets = 0;

        pocketedThisTurn.forEach((coin) => {
          const points = getPointsForCoin(coin.type);
          
          if (coin.type === 'queen') {
            // Queen can be pocketed by anyone
            if (prev.currentPlayer === 1) {
              newScore1 += points;
            } else {
              newScore2 += points;
            }
            validPockets++;
          } else {
            // Check if player pocketed opponent's coin (FOUL in freestyle)
            const isPlayer1 = prev.currentPlayer === 1;
            const playerColor = isPlayer1 ? color1 : color2;
            
            if (playerColor && coin.type !== playerColor) {
              // Foul! Player pocketed opponent's coin
              isFoul = true;
              foulPockets++;
              // Give points to opponent
              if (isPlayer1) {
                newScore2 += points;
              } else {
                newScore1 += points;
              }
            } else {
              // Valid pocket - own color
              if (isPlayer1) {
                newScore1 += points;
              } else {
                newScore2 += points;
              }
              validPockets++;
            }
          }
        });

        // Handle striker pocketed foul
        if (strikerPocketed) {
          isFoul = true;
          // Penalty: deduct 10 points
          if (prev.currentPlayer === 1) {
            newScore1 = Math.max(0, newScore1 - 10);
          } else {
            newScore2 = Math.max(0, newScore2 - 10);
          }
        }

        // Determine next player and message
        if (isFoul) {
          nextPlayer = prev.currentPlayer === 1 ? 2 : 1;
          gameAudio.playFoul();
          
          if (strikerPocketed && foulPockets > 0) {
            message = prev.gameMode === 'vs-ai'
              ? (prev.currentPlayer === 1 ? 'Foul! Striker + opponent coin pocketed!' : 'AI fouled!')
              : `Foul! Player ${prev.currentPlayer} pocketed striker and opponent's coin!`;
          } else if (strikerPocketed) {
            message = prev.gameMode === 'vs-ai'
              ? (prev.currentPlayer === 1 ? 'Foul! Striker pocketed. -10 points!' : 'AI fouled! -10 points!')
              : `Foul! Striker pocketed. -10 points!`;
          } else {
            message = prev.gameMode === 'vs-ai'
              ? (prev.currentPlayer === 1 ? 'Foul! You pocketed opponent\'s coin!' : 'AI pocketed your coin! Points for you!')
              : `Foul! Player ${prev.currentPlayer} pocketed opponent's coin!`;
          }
        } else if (validPockets === 0) {
          nextPlayer = prev.currentPlayer === 1 ? 2 : 1;
          if (prev.gameMode === 'vs-ai') {
            message = nextPlayer === 1 ? 'Your turn!' : 'AI\'s turn...';
          } else {
            message = `Player ${nextPlayer}'s turn`;
          }
          gameAudio.playTurnChange();
        } else {
          // Valid pockets - continue turn
          if (prev.gameMode === 'vs-ai') {
            const pointsEarned = pocketedThisTurn.reduce((sum, c) => sum + getPointsForCoin(c.type), 0);
            message = prev.currentPlayer === 1 
              ? `Great! +${pointsEarned} points! Your turn again!` 
              : `AI scored +${pointsEarned} points!`;
          } else {
            message = `Great shot! Player ${prev.currentPlayer} continues`;
          }
        }

        // Check for winner - all coins of one color pocketed
        const whiteCoins = updatedCoins.filter(c => c.type === 'white' && !c.isPocketed);
        const blackCoins = updatedCoins.filter(c => c.type === 'black' && !c.isPocketed);
        const queenPocketed = updatedCoins.find(c => c.type === 'queen')?.isPocketed;
        let winner: 1 | 2 | null = null;

        // Win condition: pocket all your coins (and queen for bonus)
        if (whiteCoins.length === 0 || blackCoins.length === 0) {
          // Determine winner by score
          if (newScore1 > newScore2) {
            winner = 1;
          } else if (newScore2 > newScore1) {
            winner = 2;
          } else {
            // Tie - whoever pocketed last wins
            winner = prev.currentPlayer;
          }
        }

        if (winner) {
          const playerWon = prev.gameMode === 'vs-ai' ? winner === 1 : true;
          if (playerWon) {
            gameAudio.playWin();
          } else {
            gameAudio.playLose();
          }
        }

        const newStriker = createStriker(nextPlayer === 1 ? 'bottom' : 'top');
        lastCollisionsRef.current.clear();

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
              ? (winner === 1 ? '🎉 You Win!' : '🤖 AI Wins!') 
              : `🏆 Player ${winner} Wins!`)
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

    gameAudio.playStrike(power);

    setGameState((prev) => ({
      ...prev,
      striker: { ...prev.striker, vx, vy },
      gamePhase: 'moving',
      message: 'Shooting...',
    }));

    setAimState(null);
  }, [aimState, gameState.gamePhase]);

  const resetGame = useCallback((mode?: GameMode) => {
    gameAudio.playClick();
    const newMode = mode || gameState.gameMode;
    lastCollisionsRef.current.clear();
    setGameState({
      ...createInitialGameState(),
      gameMode: newMode,
      message: newMode === 'vs-ai' ? 'Your turn! Position striker and shoot!' : 'Player 1: Position striker and shoot!',
    });
    setAimState(null);
  }, [gameState.gameMode]);

  const setGameMode = useCallback((mode: GameMode) => {
    gameAudio.playClick();
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
