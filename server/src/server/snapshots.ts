import { MATCH_DURATION_MS, TICK_RATE, WORLD } from "../game/config";
import type {
  DroppedItem,
  Player,
  Projectile,
  SoccerBall,
  ServerSnapshotMessage,
} from "../game/types";

import { isPlayerAlive } from "./core";
import type { GameRoomStore } from "./store";
import type { ServerRuntimeInfo } from "./runtime";

function toPlayerSnapshot(player: Player) {
  return {
    id: player.id,
    name: player.name,
    role: player.role,
    team: player.team,
    equippedWeapon: player.equippedWeapon,
    cards: player.cards,
    deaths: player.deaths,
    kills: player.kills,
    score: player.score,
    color: player.color,
    x: Number(player.x.toFixed(2)),
    y: Number(player.y.toFixed(2)),
    hp: player.hp,
    maxHp: player.maxHp,
    facing: player.facing,
    action: player.action,
    frozenUntil: player.frozenUntil,
    burningUntil: player.burningUntil,
    lastProcessedSeq: player.lastProcessedSeq,
    respawnAt: player.respawnAt,
  };
}

function toDroppedItemSnapshot(item: DroppedItem) {
  return {
    id: item.id,
    weaponId: item.weaponId,
    x: Number(item.x.toFixed(2)),
    y: Number(item.y.toFixed(2)),
  };
}

function toProjectileSnapshot(projectile: Projectile) {
  return {
    id: projectile.id,
    ownerId: projectile.ownerId,
    weaponId: projectile.weaponId,
    x: Number(projectile.x.toFixed(2)),
    y: Number(projectile.y.toFixed(2)),
    startX: Number(projectile.startX.toFixed(2)),
    startY: Number(projectile.startY.toFixed(2)),
    endX: Number(projectile.endX.toFixed(2)),
    endY: Number(projectile.endY.toFixed(2)),
    effect: projectile.effect,
    spawnedAt: projectile.spawnedAt,
    expiresAt: projectile.expiresAt,
  };
}

function toSoccerBallSnapshot(ball: SoccerBall) {
  return {
    lastTouchedByPlayerId: ball.lastTouchedByPlayerId,
    radius: ball.radius,
    vx: Number(ball.vx.toFixed(2)),
    vy: Number(ball.vy.toFixed(2)),
    x: Number(ball.x.toFixed(2)),
    y: Number(ball.y.toFixed(2)),
  };
}

function toDebugPlayer(
  player: Player,
  sockets: GameRoomStore["sockets"],
  now: number,
) {
  return {
    id: player.id,
    socketId: player.socketId,
    connected: sockets.has(player.socketId),
    isAlive: isPlayerAlive(player, now),
    name: player.name,
    role: player.role,
    team: player.team,
    equippedWeapon: player.equippedWeapon,
    cards: player.cards,
    deaths: player.deaths,
    kills: player.kills,
    killStreak: player.killStreak,
    lastKilledByPlayerId: player.lastKilledByPlayerId,
    score: player.score,
    color: player.color,
    x: Number(player.x.toFixed(2)),
    y: Number(player.y.toFixed(2)),
    hp: player.hp,
    maxHp: player.maxHp,
    radius: player.radius,
    hurtRadius: player.hurtRadius,
    speed: player.speed,
    facing: player.facing,
    action: player.action,
    actionUntil: player.actionUntil,
    frozenUntil: player.frozenUntil,
    burningUntil: player.burningUntil,
    input: player.input,
    attackCooldownUntil: player.attackCooldownUntil,
    invulnerableUntil: player.invulnerableUntil,
    respawnAt: player.respawnAt,
    lastProcessedSeq: player.lastProcessedSeq,
  };
}

export function createSnapshot(
  store: GameRoomStore,
  now: number,
): ServerSnapshotMessage {
  return {
    type: "snapshot",
    payload: {
      match: {
        durationMs: MATCH_DURATION_MS,
        endsAt: store.matchEndsAt,
        remainingMs: Math.max(store.matchEndsAt - now, 0),
        round: store.matchRound,
      },
      serverTime: now,
      soccerBall: toSoccerBallSnapshot(store.soccerBall),
      players: Array.from(store.players.values()).map((player) =>
        toPlayerSnapshot(player),
      ),
      droppedItems: Array.from(store.droppedItems.values()).map((item) =>
        toDroppedItemSnapshot(item),
      ),
      projectiles: Array.from(store.projectiles.values()).map((projectile) =>
        toProjectileSnapshot(projectile),
      ),
    },
  };
}

export function createPlayersDebug(
  store: GameRoomStore,
  runtime: ServerRuntimeInfo,
  now = Date.now(),
) {
  return {
    ok: true,
    generatedAt: now,
    instance: runtime,
    players: Array.from(store.players.values()).map((player) =>
      toDebugPlayer(player, store.sockets, now),
    ),
  };
}

export function createStateDebug(
  store: GameRoomStore,
  runtime: ServerRuntimeInfo,
  running: boolean,
  now = Date.now(),
) {
  return {
    ok: true,
    generatedAt: now,
    running,
    tickRate: TICK_RATE,
    instance: runtime,
    world: WORLD,
    socketCount: store.sockets.size,
    playerCount: store.players.size,
    pendingCardOfferCount: store.pendingCardOffers.size,
    pendingDroppedWeaponCount: store.pendingDroppedWeapons.length,
    soccerBall: toSoccerBallSnapshot(store.soccerBall),
    socketBindings: Array.from(store.socketToPlayerId.entries()).map(
      ([socketId, playerId]) => ({
        socketId,
        playerId,
      }),
    ),
    pendingCardOffers: Array.from(store.pendingCardOffers.values()).map(
      ({ createdAt, offerId, options, playerId }) => ({
        createdAt,
        offerId,
        options,
        playerId,
      }),
    ),
    pendingDroppedWeapons: store.pendingDroppedWeapons.map(
      ({ weaponId, respawnAt }) => ({
        weaponId,
        respawnAt,
      }),
    ),
    snapshot: createSnapshot(store, now).payload,
  };
}
