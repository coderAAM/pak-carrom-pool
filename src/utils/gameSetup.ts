import { Coin, Pocket, GameState } from '@/types/game';

export const BOARD_SIZE = 320;
export const BORDER_WIDTH = 20;
export const POCKET_RADIUS = 18;
export const COIN_RADIUS = 12;
export const STRIKER_RADIUS = 14;
export const CENTER = BOARD_SIZE / 2;

export const createPockets = (): Pocket[] => {
  const offset = BORDER_WIDTH + 5;
  return [
    { x: offset, y: offset, radius: POCKET_RADIUS },
    { x: BOARD_SIZE - offset, y: offset, radius: POCKET_RADIUS },
    { x: offset, y: BOARD_SIZE - offset, radius: POCKET_RADIUS },
    { x: BOARD_SIZE - offset, y: BOARD_SIZE - offset, radius: POCKET_RADIUS },
  ];
};

export const createInitialCoins = (): Coin[] => {
  const coins: Coin[] = [];
  const innerRadius = 25;
  const outerRadius = 45;

  // Queen in center
  coins.push({
    id: 'queen',
    x: CENTER,
    y: CENTER,
    vx: 0,
    vy: 0,
    radius: COIN_RADIUS,
    type: 'queen',
    isPocketed: false,
  });

  // Inner ring - alternating colors
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    coins.push({
      id: `inner-${i}`,
      x: CENTER + Math.cos(angle) * innerRadius,
      y: CENTER + Math.sin(angle) * innerRadius,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      type: i % 2 === 0 ? 'white' : 'black',
      isPocketed: false,
    });
  }

  // Outer ring - alternating colors (offset)
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI * 2) / 12 + Math.PI / 12;
    coins.push({
      id: `outer-${i}`,
      x: CENTER + Math.cos(angle) * outerRadius,
      y: CENTER + Math.sin(angle) * outerRadius,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      type: i % 2 === 0 ? 'white' : 'black',
      isPocketed: false,
    });
  }

  return coins;
};

export const createStriker = (playerPosition: 'bottom' | 'top' = 'bottom'): Coin => {
  const y = playerPosition === 'bottom' ? BOARD_SIZE - BORDER_WIDTH - 40 : BORDER_WIDTH + 40;
  return {
    id: 'striker',
    x: CENTER,
    y,
    vx: 0,
    vy: 0,
    radius: STRIKER_RADIUS,
    type: 'striker',
    isPocketed: false,
  };
};

export const createInitialGameState = (): GameState => ({
  coins: createInitialCoins(),
  striker: createStriker('bottom'),
  currentPlayer: 1,
  player1Score: 0,
  player2Score: 0,
  player1Color: null,
  player2Color: null,
  isStrikerPlaced: true,
  isAiming: false,
  gamePhase: 'placing',
  winner: null,
  message: 'Player 1: Position striker and shoot!',
  gameMode: 'vs-ai',
});

export const getStrikerBounds = (currentPlayer: 1 | 2): { minX: number; maxX: number; y: number } => {
  const y = currentPlayer === 1 ? BOARD_SIZE - BORDER_WIDTH - 40 : BORDER_WIDTH + 40;
  const padding = 60;
  return {
    minX: BORDER_WIDTH + padding,
    maxX: BOARD_SIZE - BORDER_WIDTH - padding,
    y,
  };
};
