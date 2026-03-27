import { MATCH_DURATION_MS, SOCCER_BALL_RADIUS } from "../game/config";
import type {
  DroppedItem,
  Player,
  Projectile,
  SoccerBall,
} from "../game/types";

import { getPitchBounds } from "./core";
import type {
  GameSocket,
  PendingCardOffer,
  PendingDroppedWeapon,
} from "./types";

export type GameRoomStore = {
  sockets: Map<string, GameSocket>;
  socketToPlayerId: Map<string, string>;
  players: Map<string, Player>;
  droppedItems: Map<string, DroppedItem>;
  projectiles: Map<string, Projectile>;
  soccerBall: SoccerBall;
  pendingDroppedWeapons: PendingDroppedWeapon[];
  pendingCardOffers: Map<string, PendingCardOffer>;
  matchEndsAt: number;
  matchRound: number;
  previousTick: number;
};

function createSoccerBall(): SoccerBall {
  const pitch = getPitchBounds(SOCCER_BALL_RADIUS);

  return {
    lastTouchedByPlayerId: null,
    radius: SOCCER_BALL_RADIUS,
    vx: 0,
    vy: 0,
    x: pitch.centerX,
    y: pitch.centerY,
  };
}

export function createGameRoomStore(now = Date.now()): GameRoomStore {
  return {
    sockets: new Map(),
    socketToPlayerId: new Map(),
    players: new Map(),
    droppedItems: new Map(),
    projectiles: new Map(),
    soccerBall: createSoccerBall(),
    pendingDroppedWeapons: [],
    pendingCardOffers: new Map(),
    matchEndsAt: now + MATCH_DURATION_MS,
    matchRound: 1,
    previousTick: now,
  };
}
