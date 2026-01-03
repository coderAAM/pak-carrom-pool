export interface Vector2D {
  x: number;
  y: number;
}

export interface Coin {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'white' | 'black' | 'queen' | 'striker';
  isPocketed: boolean;
}

export interface Pocket {
  x: number;
  y: number;
  radius: number;
}

export type GameMode = 'vs-ai' | 'two-player';

export interface GameState {
  coins: Coin[];
  striker: Coin;
  currentPlayer: 1 | 2;
  player1Score: number;
  player2Score: number;
  player1Color: 'white' | 'black' | null;
  player2Color: 'white' | 'black' | null;
  isStrikerPlaced: boolean;
  isAiming: boolean;
  gamePhase: 'placing' | 'aiming' | 'shooting' | 'moving' | 'ai-thinking' | 'ended';
  winner: 1 | 2 | null;
  message: string;
  gameMode: GameMode;
  // Carrom specific rules
  queenCovered: boolean; // Queen needs to be covered with own coin
  pendingQueenCover: 1 | 2 | null; // Player who needs to cover queen
  player1Due: number; // Coins owed due to fouls
  player2Due: number;
  lastPocketedBy: 1 | 2 | null; // Track who pocketed last
}

export interface AimState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  power: number;
  angle: number;
}
