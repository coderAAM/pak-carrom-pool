import { Coin, Pocket } from '@/types/game';
import { BOARD_SIZE, BORDER_WIDTH, CENTER } from './gameSetup';

interface Shot {
  strikerX: number;
  targetX: number;
  targetY: number;
  power: number;
  score: number;
}

// Calculate distance between two points
const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

// Check if path is clear between two points
const isPathClear = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  coins: Coin[],
  excludeIds: string[],
  checkRadius: number = 12
): boolean => {
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = distance(startX, startY, endX, endY);
  
  if (dist < 1) return false;

  const steps = Math.ceil(dist / 8);
  
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const checkX = startX + dx * t;
    const checkY = startY + dy * t;
    
    for (const coin of coins) {
      if (coin.isPocketed || excludeIds.includes(coin.id)) continue;
      
      const coinDist = distance(checkX, checkY, coin.x, coin.y);
      
      if (coinDist < coin.radius + checkRadius) {
        return false;
      }
    }
  }
  
  return true;
};

// Find best striker X position to hit a coin toward a pocket
const findStrikerPosition = (
  targetCoin: Coin,
  pocket: Pocket,
  currentPlayer: 1 | 2,
  coins: Coin[]
): { x: number; y: number } | null => {
  const strikerY = currentPlayer === 2 
    ? BORDER_WIDTH + 50 
    : BOARD_SIZE - BORDER_WIDTH - 50;

  // Direction from coin to pocket
  const toPocketX = pocket.x - targetCoin.x;
  const toPocketY = pocket.y - targetCoin.y;
  const toPocketDist = distance(targetCoin.x, targetCoin.y, pocket.x, pocket.y);
  
  if (toPocketDist < 1) return null;

  // Normalize direction
  const dirX = toPocketX / toPocketDist;
  const dirY = toPocketY / toPocketDist;

  // Find the point behind the coin (opposite to pocket direction)
  // The striker needs to hit the coin from behind to push it toward pocket
  const hitPointX = targetCoin.x - dirX * (targetCoin.radius + 15);
  const hitPointY = targetCoin.y - dirY * (targetCoin.radius + 15);

  // Calculate where striker should be positioned on its baseline
  // We need to find X such that a straight line from (strikerX, strikerY) to (hitPointX, hitPointY) works
  
  // If the hit point is roughly aligned vertically, use its X
  // Otherwise calculate based on trajectory
  const verticalDist = Math.abs(hitPointY - strikerY);
  if (verticalDist < 10) return null; // Can't hit if on same line
  
  // Simple approach: position striker so it aims directly at the hit point
  // But we need to consider the striker baseline constraint
  
  // For now, use the hit point's X position as striker X (with bounds)
  const padding = 60;
  const minX = BORDER_WIDTH + padding;
  const maxX = BOARD_SIZE - BORDER_WIDTH - padding;
  
  let strikerX = hitPointX;
  
  // Adjust if out of bounds - try to find best angle
  if (strikerX < minX) strikerX = minX;
  if (strikerX > maxX) strikerX = maxX;

  // Check if path from striker to coin is clear
  if (!isPathClear(strikerX, strikerY, targetCoin.x, targetCoin.y, coins, ['striker', targetCoin.id])) {
    return null;
  }

  return { x: strikerX, y: strikerY };
};

// Calculate shot quality score
const evaluateShot = (
  strikerPos: { x: number; y: number },
  targetCoin: Coin,
  pocket: Pocket,
  coins: Coin[],
  isOwnColor: boolean,
  isQueen: boolean,
  playerColor: 'white' | 'black' | null
): Shot | null => {
  // Calculate distances
  const strikerToCoin = distance(strikerPos.x, strikerPos.y, targetCoin.x, targetCoin.y);
  const coinToPocket = distance(targetCoin.x, targetCoin.y, pocket.x, pocket.y);
  
  // Check if coin to pocket path is somewhat clear
  if (!isPathClear(targetCoin.x, targetCoin.y, pocket.x, pocket.y, coins, ['striker', targetCoin.id], 8)) {
    return null;
  }

  // Calculate angle alignment (how well striker->coin->pocket aligns)
  const strikerToCoinX = targetCoin.x - strikerPos.x;
  const strikerToCoinY = targetCoin.y - strikerPos.y;
  const coinToPocketX = pocket.x - targetCoin.x;
  const coinToPocketY = pocket.y - targetCoin.y;
  
  // Normalize vectors
  const s2cLen = Math.sqrt(strikerToCoinX ** 2 + strikerToCoinY ** 2);
  const c2pLen = Math.sqrt(coinToPocketX ** 2 + coinToPocketY ** 2);
  
  if (s2cLen < 1 || c2pLen < 1) return null;
  
  const s2cNormX = strikerToCoinX / s2cLen;
  const s2cNormY = strikerToCoinY / s2cLen;
  const c2pNormX = coinToPocketX / c2pLen;
  const c2pNormY = coinToPocketY / c2pLen;
  
  // Dot product gives alignment (-1 to 1, where 1 is perfect alignment)
  const alignment = s2cNormX * c2pNormX + s2cNormY * c2pNormY;
  
  // Need positive alignment (striker pushing coin toward pocket)
  if (alignment < 0.3) return null;
  
  // Score calculation
  let score = 50;
  
  // Alignment bonus (more aligned = better)
  score += alignment * 30;
  
  // Distance penalty (shorter shots are easier)
  score -= (strikerToCoin + coinToPocket) / 20;
  
  // Own color bonus
  if (isOwnColor) score += 25;
  
  // Queen bonus (high value)
  if (isQueen) score += 15;
  
  // Penalty for opponent's coins
  if (!isOwnColor && !isQueen && playerColor) score -= 40;
  
  // Calculate required power
  const totalDist = strikerToCoin + coinToPocket * 0.6;
  const power = Math.min(Math.max(totalDist / 12, 6), 18);
  
  // Aim point: continue past the coin in the direction of the pocket
  const aimX = targetCoin.x + coinToPocketX * 0.5;
  const aimY = targetCoin.y + coinToPocketY * 0.5;

  return {
    strikerX: strikerPos.x,
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
  const shots: Shot[] = [];
  
  // Get active coins
  const activeCoins = coins.filter(c => !c.isPocketed);
  
  // Determine which coins to target
  const targetableCoins = activeCoins.filter(coin => {
    if (coin.type === 'queen') return true; // Can always pocket queen
    if (!aiColor) return true; // No color assigned yet, can pocket any
    return coin.type === aiColor; // Only own color
  });
  
  // Try each targetable coin with each pocket
  for (const coin of targetableCoins) {
    const isOwnColor = aiColor ? coin.type === aiColor : true;
    const isQueen = coin.type === 'queen';
    
    for (const pocket of pockets) {
      const strikerPos = findStrikerPosition(coin, pocket, currentPlayer, activeCoins);
      if (!strikerPos) continue;
      
      const shot = evaluateShot(
        strikerPos, 
        coin, 
        pocket, 
        activeCoins, 
        isOwnColor, 
        isQueen,
        aiColor
      );
      
      if (shot && shot.score > 20) {
        shots.push(shot);
      }
    }
  }
  
  // Sort by score and pick best
  shots.sort((a, b) => b.score - a.score);
  
  if (shots.length > 0) {
    const bestShot = shots[0];
    
    // Add slight randomness for natural feel (±5 pixels)
    const randomX = (Math.random() - 0.5) * 10;
    const randomY = (Math.random() - 0.5) * 10;
    const powerVariation = 0.9 + Math.random() * 0.2;
    
    return {
      strikerX: bestShot.strikerX + randomX * 0.3,
      aimX: bestShot.targetX + randomX,
      aimY: bestShot.targetY + randomY,
      power: bestShot.power * powerVariation,
    };
  }
  
  // Fallback: if no good shot found, aim at center or closest coin
  const bounds = {
    minX: BORDER_WIDTH + 60,
    maxX: BOARD_SIZE - BORDER_WIDTH - 60,
  };
  
  // Try to at least hit something
  const closestCoin = targetableCoins.reduce((closest, coin) => {
    const dist = distance(CENTER, striker.y, coin.x, coin.y);
    const closestDist = closest ? distance(CENTER, striker.y, closest.x, closest.y) : Infinity;
    return dist < closestDist ? coin : closest;
  }, null as Coin | null);
  
  if (closestCoin) {
    return {
      strikerX: Math.max(bounds.minX, Math.min(bounds.maxX, closestCoin.x)),
      aimX: closestCoin.x,
      aimY: closestCoin.y,
      power: 12 + Math.random() * 5,
    };
  }
  
  return {
    strikerX: CENTER,
    aimX: CENTER + (Math.random() - 0.5) * 80,
    aimY: CENTER,
    power: 10 + Math.random() * 6,
  };
};
