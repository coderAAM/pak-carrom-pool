import { Coin, Pocket, Vector2D } from '@/types/game';

const FRICTION = 0.985;
const MIN_VELOCITY = 0.1;
const RESTITUTION = 0.85;
const WALL_RESTITUTION = 0.7;

export const applyFriction = (coin: Coin): void => {
  coin.vx *= FRICTION;
  coin.vy *= FRICTION;

  if (Math.abs(coin.vx) < MIN_VELOCITY) coin.vx = 0;
  if (Math.abs(coin.vy) < MIN_VELOCITY) coin.vy = 0;
};

export const updatePosition = (coin: Coin): void => {
  coin.x += coin.vx;
  coin.y += coin.vy;
};

export const checkWallCollision = (
  coin: Coin,
  boardSize: number,
  borderWidth: number
): void => {
  const minBound = borderWidth + coin.radius;
  const maxBound = boardSize - borderWidth - coin.radius;

  if (coin.x < minBound) {
    coin.x = minBound;
    coin.vx = -coin.vx * WALL_RESTITUTION;
  } else if (coin.x > maxBound) {
    coin.x = maxBound;
    coin.vx = -coin.vx * WALL_RESTITUTION;
  }

  if (coin.y < minBound) {
    coin.y = minBound;
    coin.vy = -coin.vy * WALL_RESTITUTION;
  } else if (coin.y > maxBound) {
    coin.y = maxBound;
    coin.vy = -coin.vy * WALL_RESTITUTION;
  }
};

export const checkCoinCollision = (coin1: Coin, coin2: Coin): boolean => {
  const dx = coin2.x - coin1.x;
  const dy = coin2.y - coin1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < coin1.radius + coin2.radius;
};

export const resolveCoinCollision = (coin1: Coin, coin2: Coin): void => {
  const dx = coin2.x - coin1.x;
  const dy = coin2.y - coin1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return;

  // Normal vector
  const nx = dx / distance;
  const ny = dy / distance;

  // Relative velocity
  const dvx = coin1.vx - coin2.vx;
  const dvy = coin1.vy - coin2.vy;

  // Relative velocity in collision normal direction
  const dvn = dvx * nx + dvy * ny;

  // Don't resolve if velocities are separating
  if (dvn < 0) return;

  // Mass ratio (assuming equal mass for simplicity)
  const mass1 = coin1.type === 'striker' ? 1.5 : 1;
  const mass2 = coin2.type === 'striker' ? 1.5 : 1;

  // Impulse scalar
  const impulse = (2 * dvn * RESTITUTION) / (mass1 + mass2);

  // Apply impulse
  coin1.vx -= impulse * mass2 * nx;
  coin1.vy -= impulse * mass2 * ny;
  coin2.vx += impulse * mass1 * nx;
  coin2.vy += impulse * mass1 * ny;

  // Separate overlapping coins
  const overlap = coin1.radius + coin2.radius - distance;
  if (overlap > 0) {
    const separationX = (overlap / 2) * nx;
    const separationY = (overlap / 2) * ny;
    coin1.x -= separationX;
    coin1.y -= separationY;
    coin2.x += separationX;
    coin2.y += separationY;
  }
};

export const checkPocketCollision = (coin: Coin, pocket: Pocket): boolean => {
  const dx = pocket.x - coin.x;
  const dy = pocket.y - coin.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < pocket.radius - coin.radius * 0.3;
};

export const isMoving = (coins: Coin[]): boolean => {
  return coins.some(
    (coin) => !coin.isPocketed && (Math.abs(coin.vx) > MIN_VELOCITY || Math.abs(coin.vy) > MIN_VELOCITY)
  );
};

export const calculateShot = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  maxPower: number = 25
): { vx: number; vy: number; power: number } => {
  const dx = startX - endX;
  const dy = startY - endY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const power = Math.min(distance / 5, maxPower);

  if (distance === 0) return { vx: 0, vy: 0, power: 0 };

  const vx = (dx / distance) * power;
  const vy = (dy / distance) * power;

  return { vx, vy, power };
};
