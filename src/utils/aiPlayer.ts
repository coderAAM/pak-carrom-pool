import { Coin, Pocket } from '@/types/game';
import { BOARD_SIZE, BORDER_WIDTH, CENTER } from './gameSetup';

interface Shot {
  targetX: number;
  targetY: number;
  power: number;
  score: number;
}

// Calculate if a shot is possible (no blocking coins)
const isPathClear = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  coins: Coin[],
  excludeIds: string[]
): boolean => {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) return false;

  const steps = Math.ceil(distance / 10);
  
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const checkX = startX + dx * t;
    const checkY = startY + dy * t;
    
    for (const coin of coins) {
      if (coin.isPocketed || excludeIds.includes(coin.id)) continue;
      
      const coinDx = checkX - coin.x;
      const coinDy = checkY - coin.y;
      const coinDist = Math.sqrt(coinDx * coinDx + coinDy * coinDy);
      
      if (coinDist < coin.radius + 10) {
        return false;
      }
    }
  }
  
  return true;
};

// Calculate the best striker position for a shot
const calculateStrikerPosition = (
  targetCoin: Coin,
  pocket: Pocket,
  currentPlayer: 1 | 2
): { x: number; y: number } | null => {
  // Direction from coin to pocket
  const dx = pocket.x - targetCoin.x;
  const dy = pocket.y - targetCoin.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) return null;
  
  // Position striker behind the coin (opposite to pocket direction)
  const strikerDistance = 40; // Distance behind the target coin
  const strikerX = targetCoin.x - (dx / distance) * strikerDistance;
  const strikerY = currentPlayer === 2 
    ? BORDER_WIDTH + 40 
    : BOARD_SIZE - BORDER_WIDTH - 40;
  
  // Check if striker X is within bounds
  const padding = 60;
  const minX = BORDER_WIDTH + padding;
  const maxX = BOARD_SIZE - BORDER_WIDTH - padding;
  
  if (strikerX < minX || strikerX > maxX) return null;
  
  return { x: Math.max(minX, Math.min(maxX, strikerX)), y: strikerY };
};

// Evaluate a potential shot
const evaluateShot = (
  strikerPos: { x: number; y: number },
  targetCoin: Coin,
  pocket: Pocket,
  coins: Coin[],
  isOwnColor: boolean,
  isQueen: boolean
): Shot | null => {
  // Check if path from striker to target is clear
  if (!isPathClear(strikerPos.x, strikerPos.y, targetCoin.x, targetCoin.y, coins, ['striker', targetCoin.id])) {
    return null;
  }
  
  // Check if path from target to pocket is somewhat clear
  if (!isPathClear(targetCoin.x, targetCoin.y, pocket.x, pocket.y, coins, ['striker', targetCoin.id])) {
    return null;
  }
  
  // Calculate required angle accuracy
  const toPocketDx = pocket.x - targetCoin.x;
  const toPocketDy = pocket.y - targetCoin.y;
  const toPocketDist = Math.sqrt(toPocketDx * toPocketDx + toPocketDy * toPocketDy);
  
  const toTargetDx = targetCoin.x - strikerPos.x;
  const toTargetDy = targetCoin.y - strikerPos.y;
  const toTargetDist = Math.sqrt(toTargetDx * toTargetDx + toTargetDy * toTargetDy);
  
  // Score based on distance (closer = better)
  let score = 100 - (toPocketDist + toTargetDist) / 10;
  
  // Bonus for own color
  if (isOwnColor) score += 30;
  
  // Bonus for queen (if we have scored at least one)
  if (isQueen) score += 20;
  
  // Penalty for very long shots
  if (toTargetDist > 200) score -= 20;
  
  // Calculate power based on total distance
  const totalDistance = toTargetDist + toPocketDist * 0.5;
  const power = Math.min(Math.max(totalDistance / 15, 8), 20);
  
  // Calculate aim point (slightly behind pocket direction)
  const aimX = strikerPos.x - toTargetDx * 2;
  const aimY = strikerPos.y - toTargetDy * 2;
  
  return {
    targetX: aimX,
    targetY: aimY,
    power,
    score: Math.max(0, score),
  };
};

export const calculateAIShot = (
  striker: Coin,
  coins: Coin[],
  pockets: Pocket[],
  aiColor: 'white' | 'black' | null,
  currentPlayer: 1 | 2
): { strikerX: number; aimX: number; aimY: number; power: number } => {
  const shots: (Shot & { strikerX: number })[] = [];
  
  // Get active coins
  const activeCoins = coins.filter(c => !c.isPocketed);
  
  // Try each coin-pocket combination
  for (const coin of activeCoins) {
    const isOwnColor = aiColor ? coin.type === aiColor : true;
    const isQueen = coin.type === 'queen';
    
    // Skip opponent's coins if we have a color assigned
    if (aiColor && coin.type !== aiColor && coin.type !== 'queen') {
      continue;
    }
    
    for (const pocket of pockets) {
      const strikerPos = calculateStrikerPosition(coin, pocket, currentPlayer);
      if (!strikerPos) continue;
      
      const shot = evaluateShot(strikerPos, coin, pocket, activeCoins, isOwnColor, isQueen);
      if (shot && shot.score > 0) {
        shots.push({ ...shot, strikerX: strikerPos.x });
      }
    }
  }
  
  // Sort by score and pick the best
  shots.sort((a, b) => b.score - a.score);
  
  if (shots.length > 0) {
    const bestShot = shots[0];
    // Add some randomness for natural feel
    const randomOffset = (Math.random() - 0.5) * 15;
    
    return {
      strikerX: bestShot.strikerX + randomOffset * 0.5,
      aimX: bestShot.targetX + randomOffset,
      aimY: bestShot.targetY + randomOffset,
      power: bestShot.power * (0.9 + Math.random() * 0.2),
    };
  }
  
  // Fallback: random shot towards center
  const bounds = {
    minX: BORDER_WIDTH + 60,
    maxX: BOARD_SIZE - BORDER_WIDTH - 60,
  };
  
  return {
    strikerX: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
    aimX: CENTER + (Math.random() - 0.5) * 100,
    aimY: CENTER + (Math.random() - 0.5) * 100,
    power: 10 + Math.random() * 8,
  };
};
