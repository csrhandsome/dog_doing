import { MATCH_DURATION_MS } from "../game/config";
import type { Player, Role } from "../game/types";

import { createPlayer, pickBalancedTeam } from "./core";
import {
  ensureWorldWeapons,
  resolveWeaponPickup,
  respawnDroppedWeapons,
  syncPlayerCardState,
  updateMatchClock,
  updatePlayer,
  updateProjectiles,
  updateSoccerBall,
  type RoomGameplayNotifiers,
} from "./gameplay";
import type { GameRoomStore } from "./store";
import type { GameSocket } from "./types";

export type SocketPlayerLookup =
  | { state: "missing" }
  | { state: "stale" }
  | { state: "ready"; player: Player };

function removePlayer(
  store: GameRoomStore,
  playerId: string,
  socketId = store.players.get(playerId)?.socketId,
) {
  store.pendingCardOffers.delete(playerId);
  store.players.delete(playerId);

  if (socketId) {
    store.socketToPlayerId.delete(socketId);
  }
}

export function connectSocket(store: GameRoomStore, ws: GameSocket) {
  store.sockets.set(ws.id, ws);
}

export function disconnectSocket(store: GameRoomStore, socketId: string) {
  const playerId = store.socketToPlayerId.get(socketId);
  store.sockets.delete(socketId);

  if (!playerId) {
    return false;
  }

  removePlayer(store, playerId, socketId);
  return true;
}

export function getSocketPlayer(
  store: GameRoomStore,
  socketId: string,
): SocketPlayerLookup {
  const playerId = store.socketToPlayerId.get(socketId);

  if (!playerId) {
    return { state: "missing" };
  }

  const player = store.players.get(playerId);

  if (!player) {
    return { state: "stale" };
  }

  return {
    state: "ready",
    player,
  };
}

export function joinPlayer(
  store: GameRoomStore,
  socketId: string,
  name: string,
  role: Role,
) {
  const existingPlayerId = store.socketToPlayerId.get(socketId);

  if (existingPlayerId) {
    removePlayer(store, existingPlayerId, socketId);
  }

  ensureWorldWeapons(store);

  const team = pickBalancedTeam(store.players.values());
  const player = createPlayer(socketId, name, role, team);
  store.players.set(player.id, player);
  store.socketToPlayerId.set(socketId, player.id);

  return player;
}

export function initializeMatch(store: GameRoomStore, now: number) {
  ensureWorldWeapons(store);
  store.matchRound = 1;
  store.matchEndsAt = now + MATCH_DURATION_MS;
  store.previousTick = now;
}

export function stepGameRoom(
  store: GameRoomStore,
  now: number,
  gameplayNotifiers: RoomGameplayNotifiers,
) {
  const deltaSeconds = (now - store.previousTick) / 1000;
  store.previousTick = now;

  updateMatchClock(store, now);
  respawnDroppedWeapons(store, now);

  for (const player of store.players.values()) {
    syncPlayerCardState(player);
  }

  for (const player of store.players.values()) {
    updatePlayer(store, player, deltaSeconds, now, gameplayNotifiers);
  }

  for (const player of store.players.values()) {
    resolveWeaponPickup(store, player, now);
  }

  updateProjectiles(store, deltaSeconds, now, gameplayNotifiers);
  updateSoccerBall(store, deltaSeconds, now, gameplayNotifiers);
}
