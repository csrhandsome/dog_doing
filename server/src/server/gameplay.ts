import {
  ACTION_STATE_MS,
  ATTACK_ANIMATION_MS,
  ATTACK_ARC_DOT,
  BASE_SPEED,
  BLOCK_REACTION_MS,
  BLOCK_SPEED_MULTIPLIER,
  CARD_DROP_CHANCE,
  FIRE_BURN_DAMAGE,
  FIRE_BURN_DURATION_MS,
  FIRE_BURN_TICK_MS,
  HURT_STUN_MS,
  ICE_SLOW_DURATION_MS,
  ICE_SLOW_MULTIPLIER,
  MAX_PLAYER_CARDS,
  MATCH_DURATION_MS,
  MIN_PLAYER_MAX_HP,
  PLAYER_MAX_HP,
  PROJECTILE_SPAWN_OFFSET,
  RESPAWN_MS,
  RESPAWN_PADDING,
  SOCCER_BALL_BOUNCE_DAMPING,
  SOCCER_BALL_FRICTION,
  SOCCER_BALL_MAX_SPEED,
  SOCCER_BALL_STOP_SPEED,
  WEAPON_DROP_RESPAWN_MS,
  WEAPON_PICKUP_RADIUS,
  WEAPON_STATS,
  WORLD,
} from "../game/config";
import {
  buildPlayerCardStats,
  CARD_LIBRARY,
  createCardOfferOption,
  drawCardOfferOptions,
} from "../game/cards";
import { clamp, directionFromInput, normalize } from "../game/math";
import type {
  CardId,
  CardOfferPayload,
  Player,
  Projectile,
  RangedWeaponId,
  TeamId,
  WeaponId,
} from "../game/types";

import {
  arePlayersEnemies,
  canPlayerUseShield,
  getKillStreakTitle,
  getPlayableBounds,
  getPitchBounds,
  isPlayerAlive,
  maybeRespawnPlayer,
  randomSpawn,
  setPlayerAction,
  toInputState,
} from "./core";
import type { GameRoomStore } from "./store";
import type {
  RoomAnnouncementPayload,
  RoomSystemLevel,
} from "./types";

const WORLD_WEAPON_IDS: WeaponId[] = [
  "knife",
  "arow",
  "gun",
  "spear",
  "hammer",
  "staff",
  "fire-staff",
];
const SOCCER_GOAL_BOX_HALF_HEIGHT = (WORLD.cellSize * 2.36) / 2;

export type RoomGameplayNotifiers = {
  sendAnnouncementToPlayer(
    playerId: string,
    payload: RoomAnnouncementPayload,
  ): void;
  sendCardOfferToPlayer(
    playerId: string,
    payload: CardOfferPayload | null,
  ): void;
  sendSystemToPlayer(
    playerId: string,
    level: RoomSystemLevel,
    message: string,
  ): void;
};

function applySoccerBallImpulse(
  store: GameRoomStore,
  direction: { x: number; y: number },
  impulse: number,
  sourcePlayerId: string | null,
) {
  const normal = normalize(direction);

  if (normal.x === 0 && normal.y === 0) {
    return;
  }

  const ball = store.soccerBall;
  ball.vx += normal.x * impulse;
  ball.vy += normal.y * impulse;
  ball.lastTouchedByPlayerId = sourcePlayerId;

  const speed = Math.hypot(ball.vx, ball.vy);

  if (speed > SOCCER_BALL_MAX_SPEED) {
    const scale = SOCCER_BALL_MAX_SPEED / speed;
    ball.vx *= scale;
    ball.vy *= scale;
  }
}

function kickSoccerBallWithMeleeAttack(
  store: GameRoomStore,
  attacker: Player,
  direction: { x: number; y: number },
  damage: number,
  range: number,
) {
  const ball = store.soccerBall;
  const toBall = {
    x: ball.x - attacker.x,
    y: ball.y - attacker.y,
  };
  const distance = Math.hypot(toBall.x, toBall.y);

  if (distance > range + ball.radius) {
    return;
  }

  const aim = normalize(toBall);
  const dot = direction.x * aim.x + direction.y * aim.y;

  if (dot < ATTACK_ARC_DOT) {
    return;
  }

  applySoccerBallImpulse(
    store,
    direction,
    Math.max(280, damage * 17 + range * 0.4),
    attacker.id,
  );
}

function doesProjectileHitSoccerBall(
  store: GameRoomStore,
  projectile: Projectile,
) {
  const ball = store.soccerBall;
  const distance = Math.hypot(ball.x - projectile.x, ball.y - projectile.y);

  if (distance > ball.radius + projectile.radius) {
    return false;
  }

  applySoccerBallImpulse(
    store,
    projectile.direction,
    Math.max(300, projectile.damage * 16 + projectile.speed * 0.12),
    projectile.ownerId,
  );

  return true;
}

function resetSoccerBall(store: GameRoomStore) {
  const ball = store.soccerBall;
  const pitch = getPitchBounds(ball.radius);

  ball.x = pitch.centerX;
  ball.y = pitch.centerY;
  ball.vx = 0;
  ball.vy = 0;
  ball.lastTouchedByPlayerId = null;
}

function getConcedingTeamOnGoal(
  ball: GameRoomStore["soccerBall"],
): TeamId | null {
  const pitch = getPitchBounds(ball.radius);
  const withinGoalMouth =
    Math.abs(ball.y - pitch.centerY) <= SOCCER_GOAL_BOX_HALF_HEIGHT;

  if (!withinGoalMouth) {
    return null;
  }

  if (ball.x < pitch.minX) {
    return "red";
  }

  if (ball.x > pitch.maxX) {
    return "blue";
  }

  return null;
}

export function updateMatchClock(store: GameRoomStore, now: number) {
  if (now < store.matchEndsAt) {
    return;
  }

  store.matchRound += 1;
  store.matchEndsAt = now + MATCH_DURATION_MS;

  for (const player of store.players.values()) {
    player.deaths = 0;
    player.kills = 0;
    player.killStreak = 0;
    player.score = 0;
  }
}

export function ensureWorldWeapons(store: GameRoomStore) {
  if (store.droppedItems.size > 0 || store.pendingDroppedWeapons.length > 0) {
    return;
  }

  for (const weaponId of WORLD_WEAPON_IDS) {
    spawnDroppedItem(store, weaponId);
  }
}

function spawnDroppedItem(
  store: GameRoomStore,
  weaponId: WeaponId,
  position = randomSpawn(),
) {
  const bounds = getPlayableBounds(RESPAWN_PADDING);
  const x = clamp(position.x, bounds.minX, bounds.maxX);
  const y = clamp(position.y, bounds.minY, bounds.maxY);
  const id = crypto.randomUUID();

  store.droppedItems.set(id, {
    id,
    weaponId,
    x,
    y,
  });
}

function queueDroppedWeaponRespawn(
  store: GameRoomStore,
  weaponId: WeaponId,
  now: number,
) {
  store.pendingDroppedWeapons.push({
    weaponId,
    respawnAt: now + WEAPON_DROP_RESPAWN_MS,
  });
}

export function respawnDroppedWeapons(store: GameRoomStore, now: number) {
  const ready: WeaponId[] = [];
  const waiting = [];

  for (const item of store.pendingDroppedWeapons) {
    if (item.respawnAt <= now) {
      ready.push(item.weaponId);
    } else {
      waiting.push(item);
    }
  }

  store.pendingDroppedWeapons = waiting;

  for (const weaponId of ready) {
    spawnDroppedItem(store, weaponId);
  }
}

function getPlayerCardStats(player: Player) {
  return buildPlayerCardStats(player.cards);
}

function clearPlayerCombatInput(player: Player) {
  player.input = toInputState({
    ...player.input,
    attack: false,
    block: false,
    up: false,
    down: false,
    left: false,
    right: false,
  });
  player.previousButtons.attack = false;
}

function isRangedWeaponId(weaponId: WeaponId): weaponId is RangedWeaponId {
  return WEAPON_STATS[weaponId].isRanged;
}

function clearPlayerStatusEffects(player: Player) {
  player.frozenUntil = 0;
  player.burningUntil = 0;
  player.nextBurnTickAt = 0;
  player.burnSourcePlayerId = null;
}

export function hasPendingCardOffer(store: GameRoomStore, playerId: string) {
  return store.pendingCardOffers.has(playerId);
}

export function syncPlayerCardState(player: Player) {
  const cardStats = getPlayerCardStats(player);
  player.maxHp = clamp(
    PLAYER_MAX_HP + cardStats.maxHpFlat,
    MIN_PLAYER_MAX_HP,
    PLAYER_MAX_HP + 80,
  );
  player.hp = clamp(player.hp, 0, player.maxHp);
  player.speed = Math.max(140, BASE_SPEED * cardStats.speedMultiplier);
}

function getPlayerRespawnDuration(player: Player) {
  const cardStats = getPlayerCardStats(player);

  return Math.max(1200, RESPAWN_MS + cardStats.respawnTimeDeltaMs);
}

function getWeaponStatsForPlayer(player: Player) {
  const baseStats = WEAPON_STATS[player.equippedWeapon];
  const cardStats = getPlayerCardStats(player);
  const damageTypeMultiplier = baseStats.isRanged
    ? cardStats.rangedDamageMultiplier
    : cardStats.meleeDamageMultiplier;
  const cooldownMultiplier = baseStats.isRanged
    ? cardStats.rangedCooldownMultiplier
    : 1;

  return {
    ...baseStats,
    cooldownMs: Math.max(
      140,
      Math.round(
        baseStats.cooldownMs *
          cardStats.attackCooldownMultiplier *
          cooldownMultiplier,
      ),
    ),
    damage: Math.max(
      6,
      Math.round(
        baseStats.damage *
          cardStats.damageMultiplier *
          damageTypeMultiplier,
      ),
    ),
    projectileSpeed: baseStats.isRanged
      ? Math.max(
          320,
          Math.round(
            baseStats.projectileSpeed * cardStats.projectileSpeedMultiplier,
          ),
        )
      : 0,
  };
}

function maybeOfferKillCards(
  store: GameRoomStore,
  defeated: Player,
  sourcePlayer: Player | undefined,
  now: number,
  notifiers: RoomGameplayNotifiers,
) {
  if (
    !sourcePlayer ||
    sourcePlayer.id === defeated.id ||
    !arePlayersEnemies(sourcePlayer, defeated)
  ) {
    return;
  }

  if (hasPendingCardOffer(store, sourcePlayer.id)) {
    return;
  }

  if (Math.random() > CARD_DROP_CHANCE) {
    return;
  }

  const offer = {
    createdAt: now,
    offerId: crypto.randomUUID(),
    options: drawCardOfferOptions(3).map((cardId) => createCardOfferOption(cardId)),
    playerId: sourcePlayer.id,
  };

  store.pendingCardOffers.set(sourcePlayer.id, offer);
  clearPlayerCombatInput(sourcePlayer);
  setPlayerAction(sourcePlayer, "idle", 0, now);

  notifiers.sendCardOfferToPlayer(sourcePlayer.id, {
    offerId: offer.offerId,
    options: offer.options,
  });
  notifiers.sendSystemToPlayer(
    sourcePlayer.id,
    "info",
    `击败 ${defeated.name}，从三张卡里挑一张`,
  );
}

function addCardToLoadout(
  player: Player,
  cardId: CardId,
  now: number,
  notifiers: RoomGameplayNotifiers,
) {
  const displaced =
    player.cards.length >= MAX_PLAYER_CARDS ? player.cards.shift() : undefined;

  player.cards.push({
    cardId,
    obtainedAt: now,
  });
  syncPlayerCardState(player);

  const pickupLabel = CARD_LIBRARY[cardId].label;
  const displacedLabel = displaced ? CARD_LIBRARY[displaced.cardId].label : null;

  notifiers.sendSystemToPlayer(
    player.id,
    "info",
    displacedLabel
      ? `夺得 ${pickupLabel}，替换 ${displacedLabel}`
      : `夺得 ${pickupLabel}`,
  );
}

export function resolveCardSelection(
  store: GameRoomStore,
  player: Player,
  offerId: string,
  cardId: CardId,
  now: number,
  notifiers: RoomGameplayNotifiers,
) {
  const offer = store.pendingCardOffers.get(player.id);

  if (!offer || offer.offerId !== offerId) {
    notifiers.sendSystemToPlayer(player.id, "warn", "这张卡已经失效");
    return;
  }

  if (!offer.options.some((option) => option.cardId === cardId)) {
    notifiers.sendSystemToPlayer(player.id, "warn", "只能从当前三张卡里选择");
    return;
  }

  store.pendingCardOffers.delete(player.id);
  notifiers.sendCardOfferToPlayer(player.id, null);
  addCardToLoadout(player, cardId, now, notifiers);
}

function applyBlockThorns(
  store: GameRoomStore,
  blocker: Player,
  sourcePlayer: Player | undefined,
  now: number,
  notifiers: RoomGameplayNotifiers,
) {
  if (
    !sourcePlayer ||
    sourcePlayer.id === blocker.id ||
    !arePlayersEnemies(sourcePlayer, blocker) ||
    !isPlayerAlive(sourcePlayer, now) ||
    hasPendingCardOffer(store, sourcePlayer.id) ||
    sourcePlayer.invulnerableUntil > now
  ) {
    return;
  }

  const blockThornsDamage = getPlayerCardStats(blocker).blockThornsDamage;

  if (blockThornsDamage <= 0) {
    return;
  }

  applyDamage(store, sourcePlayer, blockThornsDamage, now, notifiers, blocker);
}

function announceElimination(
  killer: Player,
  target: Player,
  notifiers: RoomGameplayNotifiers,
) {
  const isRevenge = killer.lastKilledByPlayerId === target.id;

  if (isRevenge) {
    killer.lastKilledByPlayerId = null;
    notifiers.sendAnnouncementToPlayer(killer.id, {
      badge: killer.killStreak >= 2 ? `${killer.killStreak} 连` : "复仇",
      kind: "revenge",
      subtitle: `清算 ${target.name}，前账已结`,
      title:
        killer.killStreak >= 2
          ? `复仇成功 · ${getKillStreakTitle(killer.killStreak)}`
          : "复仇成功",
      tone: "crimson",
    });
    return;
  }

  if (killer.killStreak >= 2) {
    notifiers.sendAnnouncementToPlayer(killer.id, {
      badge: `${killer.killStreak} 连`,
      kind: "streak",
      subtitle: `连续击倒 ${killer.killStreak} 人 · 最新目标 ${target.name}`,
      title: getKillStreakTitle(killer.killStreak),
      tone: "gold",
    });
    return;
  }

  notifiers.sendAnnouncementToPlayer(killer.id, {
    badge: "击破",
    kind: "kill",
    subtitle: `${target.name} 已被清出当前回合节奏`,
    title: "目标击破",
    tone: "cobalt",
  });
}

function killPlayer(
  store: GameRoomStore,
  player: Player,
  now: number,
  sourcePlayer: Player | undefined,
  notifiers: RoomGameplayNotifiers,
) {
  const respawnDuration = getPlayerRespawnDuration(player);

  player.deaths += 1;
  player.killStreak = 0;

  if (
    sourcePlayer &&
    sourcePlayer.id !== player.id &&
    arePlayersEnemies(sourcePlayer, player)
  ) {
    sourcePlayer.kills += 1;
    sourcePlayer.killStreak += 1;
    sourcePlayer.score += 100;
    player.lastKilledByPlayerId = sourcePlayer.id;
    announceElimination(sourcePlayer, player, notifiers);
  }

  if (store.pendingCardOffers.delete(player.id)) {
    notifiers.sendCardOfferToPlayer(player.id, null);
  }

  player.hp = 0;
  clearPlayerStatusEffects(player);
  player.respawnAt = now + respawnDuration;
  clearPlayerCombatInput(player);
  setPlayerAction(player, "dead", respawnDuration, now);
  maybeOfferKillCards(store, player, sourcePlayer, now, notifiers);
}

function eliminateTeamOnGoal(
  store: GameRoomStore,
  concedingTeam: TeamId,
  now: number,
  notifiers: RoomGameplayNotifiers,
) {
  const scorer = store.soccerBall.lastTouchedByPlayerId
    ? store.players.get(store.soccerBall.lastTouchedByPlayerId)
    : undefined;

  resetSoccerBall(store);

  for (const player of store.players.values()) {
    if (player.team !== concedingTeam || !isPlayerAlive(player, now)) {
      continue;
    }

    killPlayer(store, player, now, scorer, notifiers);
  }
}

function isBlockingIncoming(
  player: Player,
  source: { x: number; y: number },
  now: number,
) {
  const targetForward = normalize(player.facing);
  const towardSource = normalize({
    x: source.x - player.x,
    y: source.y - player.y,
  });

  return (
    canPlayerUseShield(player) &&
    player.input.block &&
    (player.action === "block" || player.actionUntil > now) &&
    targetForward.x * towardSource.x + targetForward.y * towardSource.y > 0.1
  );
}

function applyDamage(
  store: GameRoomStore,
  target: Player,
  damage: number,
  now: number,
  notifiers: RoomGameplayNotifiers,
  sourcePlayer?: Player,
  options: {
    bypassInvulnerability?: boolean;
    suppressInvulnerability?: boolean;
    suppressReaction?: boolean;
  } = {},
) {
  if (hasPendingCardOffer(store, target.id)) {
    return false;
  }

  if (sourcePlayer && !arePlayersEnemies(sourcePlayer, target)) {
    return false;
  }

  if (!options.bypassInvulnerability && target.invulnerableUntil > now) {
    return false;
  }

  target.hp = clamp(target.hp - damage, 0, target.maxHp);

  if (!options.suppressInvulnerability) {
    target.invulnerableUntil = now + HURT_STUN_MS;
  }

  if (target.hp <= 0) {
    killPlayer(store, target, now, sourcePlayer, notifiers);
    return false;
  }

  if (!options.suppressReaction) {
    setPlayerAction(target, "hurt", HURT_STUN_MS, now);
  }

  return true;
}

function applyProjectileStatusEffect(
  target: Player,
  projectile: Pick<Projectile, "effect" | "ownerId">,
  now: number,
) {
  if (projectile.effect === "ice") {
    target.frozenUntil = Math.max(target.frozenUntil, now + ICE_SLOW_DURATION_MS);
    return;
  }

  if (projectile.effect === "fire") {
    const wasBurning = target.burningUntil > now;
    target.burningUntil = Math.max(target.burningUntil, now + FIRE_BURN_DURATION_MS);
    target.burnSourcePlayerId = projectile.ownerId;

    if (!wasBurning || target.nextBurnTickAt <= now) {
      target.nextBurnTickAt = now + FIRE_BURN_TICK_MS;
    }
  }
}

function applyBurnDamage(
  store: GameRoomStore,
  player: Player,
  now: number,
  notifiers: RoomGameplayNotifiers,
) {
  if (player.burningUntil <= now) {
    player.burningUntil = 0;
    player.nextBurnTickAt = 0;
    player.burnSourcePlayerId = null;
    return;
  }

  while (
    player.nextBurnTickAt > 0 &&
    player.nextBurnTickAt <= now &&
    player.burningUntil > now &&
    isPlayerAlive(player, now)
  ) {
    const sourcePlayer = player.burnSourcePlayerId
      ? store.players.get(player.burnSourcePlayerId)
      : undefined;
    const survived = applyDamage(
      store,
      player,
      FIRE_BURN_DAMAGE,
      now,
      notifiers,
      sourcePlayer,
      {
        bypassInvulnerability: true,
        suppressInvulnerability: true,
        suppressReaction: true,
      },
    );

    if (!survived) {
      return;
    }

    player.nextBurnTickAt += FIRE_BURN_TICK_MS;
  }

  if (player.burningUntil <= now) {
    player.burningUntil = 0;
    player.nextBurnTickAt = 0;
    player.burnSourcePlayerId = null;
  }
}

function resolveKnifeAttack(
  store: GameRoomStore,
  attacker: Player,
  now: number,
  notifiers: RoomGameplayNotifiers,
) {
  const rawForward = normalize(attacker.facing);
  const forward =
    rawForward.x === 0 && rawForward.y === 0 ? { x: 1, y: 0 } : rawForward;
  const weaponStats = getWeaponStatsForPlayer(attacker);

  kickSoccerBallWithMeleeAttack(
    store,
    attacker,
    forward,
    weaponStats.damage,
    weaponStats.range,
  );

  for (const target of store.players.values()) {
    if (
      target.id === attacker.id ||
      !arePlayersEnemies(attacker, target) ||
      !isPlayerAlive(target, now) ||
      hasPendingCardOffer(store, target.id) ||
      target.invulnerableUntil > now
    ) {
      continue;
    }

    const toTarget = {
      x: target.x - attacker.x,
      y: target.y - attacker.y,
    };
    const distance = Math.hypot(toTarget.x, toTarget.y);

    if (distance > weaponStats.range + target.hurtRadius) {
      continue;
    }

    const aim = normalize(toTarget);
    const dot = forward.x * aim.x + forward.y * aim.y;

    if (dot < ATTACK_ARC_DOT) {
      continue;
    }

    if (isBlockingIncoming(target, attacker, now)) {
      setPlayerAction(target, "block", BLOCK_REACTION_MS, now);
      applyBlockThorns(store, target, attacker, now, notifiers);
      continue;
    }

    applyDamage(store, target, weaponStats.damage, now, notifiers, attacker);

    if (hasPendingCardOffer(store, attacker.id)) {
      return;
    }
  }
}

function spawnProjectile(store: GameRoomStore, player: Player, now: number) {
  const weaponId = player.equippedWeapon;

  if (!isRangedWeaponId(weaponId)) {
    return;
  }

  const stats = getWeaponStatsForPlayer(player);
  const rawFacing = normalize(player.facing);
  const direction =
    rawFacing.x === 0 && rawFacing.y === 0 ? { x: 1, y: 0 } : rawFacing;
  const bounds = getPlayableBounds(stats.projectileRadius);
  const startX = clamp(
    player.x + direction.x * PROJECTILE_SPAWN_OFFSET,
    bounds.minX,
    bounds.maxX,
  );
  const startY = clamp(
    player.y + direction.y * PROJECTILE_SPAWN_OFFSET,
    bounds.minY,
    bounds.maxY,
  );
  const unclampedEndX = startX + direction.x * stats.range;
  const unclampedEndY = startY + direction.y * stats.range;
  const endX = clamp(unclampedEndX, bounds.minX, bounds.maxX);
  const endY = clamp(unclampedEndY, bounds.minY, bounds.maxY);
  const travelDistance = Math.hypot(endX - startX, endY - startY);

  if (travelDistance === 0) {
    return;
  }

  const id = crypto.randomUUID();

  store.projectiles.set(id, {
    id,
    ownerId: player.id,
    ownerTeam: player.team,
    weaponId,
    x: startX,
    y: startY,
    startX,
    startY,
    endX,
    endY,
    direction: normalize({
      x: endX - startX,
      y: endY - startY,
    }),
    speed: stats.projectileSpeed,
    damage: stats.damage,
    radius: stats.projectileRadius,
    effect: stats.projectileEffect,
    spawnedAt: now,
    expiresAt: now + (travelDistance / stats.projectileSpeed) * 1000,
  });
}

export function resolveWeaponPickup(
  store: GameRoomStore,
  player: Player,
  now: number,
) {
  if (!isPlayerAlive(player, now)) {
    return;
  }

  if (hasPendingCardOffer(store, player.id)) {
    return;
  }

  for (const item of store.droppedItems.values()) {
    if (item.weaponId === player.equippedWeapon) {
      continue;
    }

    const distance = Math.hypot(item.x - player.x, item.y - player.y);

    if (distance > player.radius + WEAPON_PICKUP_RADIUS) {
      continue;
    }

    player.equippedWeapon = item.weaponId;
    store.droppedItems.delete(item.id);
    queueDroppedWeaponRespawn(store, item.weaponId, now);
    return;
  }
}

export function updateProjectiles(
  store: GameRoomStore,
  deltaSeconds: number,
  now: number,
  notifiers: RoomGameplayNotifiers,
) {
  for (const projectile of store.projectiles.values()) {
    const owner = store.players.get(projectile.ownerId);

    if (owner && hasPendingCardOffer(store, owner.id)) {
      continue;
    }

    const remainingDistance = Math.hypot(
      projectile.endX - projectile.x,
      projectile.endY - projectile.y,
    );

    if (remainingDistance <= 0.5) {
      store.projectiles.delete(projectile.id);
      continue;
    }

    const stepDistance = projectile.speed * deltaSeconds;
    const travelledDistance = Math.min(stepDistance, remainingDistance);
    projectile.x += projectile.direction.x * travelledDistance;
    projectile.y += projectile.direction.y * travelledDistance;
    const reachedEnd = travelledDistance >= remainingDistance - 0.5;

    if (reachedEnd || now >= projectile.expiresAt) {
      projectile.x = projectile.endX;
      projectile.y = projectile.endY;
    }

    if (doesProjectileHitSoccerBall(store, projectile)) {
      store.projectiles.delete(projectile.id);
      continue;
    }

    let consumed = false;

    for (const target of store.players.values()) {
      if (
        target.id === projectile.ownerId ||
        target.team === projectile.ownerTeam ||
        !isPlayerAlive(target, now) ||
        hasPendingCardOffer(store, target.id) ||
        target.invulnerableUntil > now
      ) {
        continue;
      }

      const distance = Math.hypot(
        target.x - projectile.x,
        target.y - projectile.y,
      );

      if (distance > target.hurtRadius + projectile.radius) {
        continue;
      }

      if (isBlockingIncoming(target, projectile, now)) {
        setPlayerAction(target, "block", BLOCK_REACTION_MS, now);
        applyBlockThorns(store, target, owner, now, notifiers);
      } else {
        const survived = applyDamage(
          store,
          target,
          projectile.damage,
          now,
          notifiers,
          owner,
        );

        if (survived) {
          applyProjectileStatusEffect(target, projectile, now);
        }
      }

      consumed = true;
      break;
    }

    if (consumed) {
      store.projectiles.delete(projectile.id);
      continue;
    }

    if (reachedEnd || now >= projectile.expiresAt) {
      store.projectiles.delete(projectile.id);
    }
  }
}

export function updateSoccerBall(
  store: GameRoomStore,
  deltaSeconds: number,
  now: number,
  notifiers: RoomGameplayNotifiers,
) {
  const ball = store.soccerBall;

  ball.x += ball.vx * deltaSeconds;
  ball.y += ball.vy * deltaSeconds;

  const bounds = getPitchBounds(ball.radius);
  const concedingTeam = getConcedingTeamOnGoal(ball);

  if (concedingTeam) {
    eliminateTeamOnGoal(store, concedingTeam, now, notifiers);
    return;
  }

  if (ball.x < bounds.minX || ball.x > bounds.maxX) {
    ball.x = clamp(ball.x, bounds.minX, bounds.maxX);
    ball.vx *= -SOCCER_BALL_BOUNCE_DAMPING;
    ball.vy *= 0.94;
  }

  if (ball.y < bounds.minY || ball.y > bounds.maxY) {
    ball.y = clamp(ball.y, bounds.minY, bounds.maxY);
    ball.vy *= -SOCCER_BALL_BOUNCE_DAMPING;
    ball.vx *= 0.94;
  }

  const damping = Math.max(0, 1 - SOCCER_BALL_FRICTION * deltaSeconds);
  ball.vx *= damping;
  ball.vy *= damping;

  if (Math.hypot(ball.vx, ball.vy) < SOCCER_BALL_STOP_SPEED) {
    ball.vx = 0;
    ball.vy = 0;
  }
}

export function updatePlayer(
  store: GameRoomStore,
  player: Player,
  deltaSeconds: number,
  now: number,
  notifiers: RoomGameplayNotifiers,
) {
  maybeRespawnPlayer(player, now);

  if (!isPlayerAlive(player, now)) {
    return;
  }

  if (hasPendingCardOffer(store, player.id)) {
    clearPlayerCombatInput(player);
    setPlayerAction(player, "idle", 0, now);
    player.lastProcessedSeq = player.input.seq;
    return;
  }

  applyBurnDamage(store, player, now, notifiers);

  if (!isPlayerAlive(player, now)) {
    player.lastProcessedSeq = player.input.seq;
    return;
  }

  const moveDirection = directionFromInput(player.input);

  if (moveDirection.x !== 0 || moveDirection.y !== 0) {
    player.facing = moveDirection;
  }

  const attackPressed = player.input.attack && !player.previousButtons.attack;
  const weaponStats = getWeaponStatsForPlayer(player);
  player.previousButtons.attack = player.input.attack;

  if (
    attackPressed &&
    player.attackCooldownUntil <= now &&
    player.action !== "hurt"
  ) {
    player.attackCooldownUntil = now + weaponStats.cooldownMs;
    setPlayerAction(player, "attack", ATTACK_ANIMATION_MS, now);

    if (weaponStats.isRanged) {
      spawnProjectile(store, player, now);
    } else {
      resolveKnifeAttack(store, player, now, notifiers);
    }
  }

  if (player.action === "hurt" && player.actionUntil > now) {
    player.lastProcessedSeq = player.input.seq;
    return;
  }

  const blocking =
    canPlayerUseShield(player) &&
    player.input.block &&
    player.action !== "attack";
  const speed =
    player.speed *
    (player.frozenUntil > now ? ICE_SLOW_MULTIPLIER : 1) *
    (blocking ? BLOCK_SPEED_MULTIPLIER : 1);
  const bounds = getPlayableBounds(player.radius);

  if (moveDirection.x !== 0 || moveDirection.y !== 0) {
    player.x = clamp(
      player.x + moveDirection.x * speed * deltaSeconds,
      bounds.minX,
      bounds.maxX,
    );
    player.y = clamp(
      player.y + moveDirection.y * speed * deltaSeconds,
      bounds.minY,
      bounds.maxY,
    );
  }

  if (player.actionUntil <= now) {
    if (blocking) {
      setPlayerAction(player, "block", ACTION_STATE_MS, now);
    } else if (moveDirection.x !== 0 || moveDirection.y !== 0) {
      setPlayerAction(player, "move", ACTION_STATE_MS, now);
    } else {
      setPlayerAction(player, "idle", ACTION_STATE_MS, now);
    }
  }

  player.lastProcessedSeq = player.input.seq;
}
