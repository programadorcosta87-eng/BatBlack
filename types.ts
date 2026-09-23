export type Lane = 1 | 2 | 3;

export interface BatState {
  lane: Lane;
  targetY: number;
  y: number;
  x: number;
  width: number;
  height: number;
  rotation: number;
  flapFrame: number;
  flapTimer: number;
  isHit: boolean;
}

export type ObstacleType = 'cat' | 'rock' | 'branch';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  lane: Lane;
  x: number;
  y: number;
  width: number;
  height: number;
  passed: boolean;
  animFrame: number;
  animTimer: number;
  wobbleOffset: number;
}

export interface Cloud {
  x: number;
  y: number;
  speed: number;
  width: number;
}

export interface GroundDetail {
  x: number;
  type: number; // 0: pebble, 1: double pebble, 2: small bump, 3: grass tuft
}

export interface Star {
  x: number;
  y: number;
  twinklePhase: number;
}
