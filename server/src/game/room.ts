import type { ServerWebSocket } from "bun";

import {
  ACTION_STATE_MS,
  ATTACK_ANIMATION_MS,
  ATTACK_ARC_DOT,
  BASE_SPEED,
  BLOCK_REACTION_MS,
  BLOCK_SPEED_MULTIPLIER,
  HURT_STUN_MS,
  PLAYER_MAX_HP,
  PLAYER_RADIUS,
  PROJECTILE_SPAWN_OFFSET,
  RESPAWN_INVULNERABILITY_MS,
  RESPAWN_MS,
  RESPAWN_PADDING,
  ROLE_COLORS,
  TICK_MS,
  TICK_RATE,
  WEAPON_DROP_RESPAWN_MS,
  WEAPON_PICKUP_RADIUS,
  WEAPON_STATS,
  WORLD,
} from "./config";
import { clamp, directionFromInput, normalize } from "./math";
import type {
  ClientMessage,
  DroppedItem,
  InputState,
  Player,
  PlayerAction,
  Projectile,
  Role,
  ServerMessage,
  ServerSnapshotMessage,
  WeaponId,
} from "./types";

const WORLD_WEAPON_IDS: WeaponId[] = ["knife", "arow", "gun"];

export class GameRoom {
  private readonly sockets = new Map<string, ServerWebSocket<unknown>>();
  private readonly socketToPlayerId = new Map<string, string>();
  private readonly players = new Map<string, Player>();
  private readonly droppedItems = new Map<string, DroppedItem>();
  private readonly projectiles = new Map<string, Projectile>();
  private pendingDroppedWeapons: Array<{
    respawnAt: number;
    weaponId: WeaponId;
  }> = [];
  private interval: ReturnType<typeof setInterval> | null = null;
  private previousTick = Date.now();

  getHealth() {
    return {
      ok: true,
      players: this.players.size,
      tickRate: TICK_RATE,
    };
  }

  start() {
    if (this.interval) {
      return;
    }

    this.ensureWorldWeapons();
    this.previousTick = Date.now();
    this.interval = setInterval(() => {
      this.tick();
    }, TICK_MS);
  }

  stop() {
    if (!this.interval) {
      return;
    }

    clearInterval(this.interval);
    this.interval = null;
  }

  handleOpen(ws: ServerWebSocket<unknown>) {
    this.sockets.set(ws.id, ws);
    this.sendSystem(ws, "info", "已建立连接");
  }

  handleMessage(ws: ServerWebSocket<unknown>, rawMessage: unknown) {
    const message = this.parseClientMessage(rawMessage);

    if (!message) {
      this.sendSystem(ws, "warn", "消息格式无效");
      return;
    }

    if (message.type === "join") {
      this.handleJoin(ws.id, message.payload.name, message.payload.role, ws);
      return;
    }

    const playerId = this.socketToPlayerId.get(ws.id);

    if (!playerId) {
      this.sendSystem(ws, "warn", "请先加入对局");
      return;
    }

    const player = this.players.get(playerId);

    if (!player) {
      return;
    }

    player.input = this.toInputState(message.payload);
  }

  handleClose(ws: ServerWebSocket<unknown>) {
    const playerId = this.socketToPlayerId.get(ws.id);

    this.sockets.delete(ws.id);

    if (playerId) {
      this.players.delete(playerId);
      this.socketToPlayerId.delete(ws.id);
      this.broadcast(this.snapshot(Date.now()));
    }
  }

  private handleJoin(
    socketId: string,
    name: string,
    role: Role,
    ws: ServerWebSocket<unknown>,
  ) {
    const existingPlayerId = this.socketToPlayerId.get(socketId);

    if (existingPlayerId) {
      this.players.delete(existingPlayerId);
    }

    this.ensureWorldWeapons();

    const player = this.createPlayer(socketId, name, role);
    this.players.set(player.id, player);
    this.socketToPlayerId.set(socketId, player.id);

    this.send(ws, {
      type: "joined",
      payload: {
        playerId: player.id,
        tickRate: TICK_RATE,
        world: WORLD,
      },
    });

    this.broadcast(this.snapshot(Date.now()));
  }

  private tick() {
    const now = Date.now();
    const deltaSeconds = (now - this.previousTick) / 1000;
    this.previousTick = now;

    this.respawnDroppedWeapons(now);

    for (const player of this.players.values()) {
      this.updatePlayer(player, deltaSeconds, now);
    }

    for (const player of this.players.values()) {
      this.resolveWeaponPickup(player, now);
    }

    this.updateProjectiles(deltaSeconds, now);
    this.broadcast(this.snapshot(now));
  }

  private createPlayer(socketId: string, name: string, role: Role): Player {
    const spawn = this.randomSpawn();
    const now = Date.now();
    const safeName = name.trim().slice(0, 18) || `guest-${socketId.slice(0, 4)}`;

    return {
      id: crypto.randomUUID(),
      socketId,
      name: safeName,
      role,
      equippedWeapon: "knife",
      color: ROLE_COLORS[role],
      x: spawn.x,
      y: spawn.y,
      facing: { x: 1, y: 0 },
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      radius: PLAYER_RADIUS,
      speed: BASE_SPEED,
      action: "idle",
      actionUntil: now,
      input: this.toInputState(),
      previousButtons: {
        attack: false,
      },
      attackCooldownUntil: now,
      invulnerableUntil: now,
      respawnAt: null,
      lastProcessedSeq: 0,
    };
  }

  private randomSpawn() {
    return {
      x: RESPAWN_PADDING + Math.random() * (WORLD.width - RESPAWN_PADDING * 2),
      y: RESPAWN_PADDING + Math.random() * (WORLD.height - RESPAWN_PADDING * 2),
    };
  }

  private toInputState(input?: InputState): InputState {
    if (!input) {
      return {
        up: false,
        down: false,
        left: false,
        right: false,
        attack: false,
        block: false,
        seq: 0,
      };
    }

    return {
      up: input.up,
      down: input.down,
      left: input.left,
      right: input.right,
      attack: input.attack,
      block: input.block,
      seq: input.seq,
    };
  }

  private send(ws: ServerWebSocket<unknown>, message: ServerMessage) {
    ws.send(JSON.stringify(message));
  }

  private sendSystem(
    ws: ServerWebSocket<unknown>,
    level: "info" | "warn",
    message: string,
  ) {
    this.send(ws, {
      type: "system",
      payload: {
        level,
        message,
      },
    });
  }

  private broadcast(message: ServerMessage) {
    const encoded = JSON.stringify(message);

    for (const ws of this.sockets.values()) {
      ws.send(encoded);
    }
  }

  private snapshot(now: number): ServerSnapshotMessage {
    return {
      type: "snapshot",
      payload: {
        serverTime: now,
        players: Array.from(this.players.values()).map((player) => ({
          id: player.id,
          name: player.name,
          role: player.role,
          equippedWeapon: player.equippedWeapon,
          color: player.color,
          x: Number(player.x.toFixed(2)),
          y: Number(player.y.toFixed(2)),
          hp: player.hp,
          maxHp: player.maxHp,
          facing: player.facing,
          action: player.action,
          lastProcessedSeq: player.lastProcessedSeq,
          respawnAt: player.respawnAt,
        })),
        droppedItems: Array.from(this.droppedItems.values()).map((item) => ({
          id: item.id,
          weaponId: item.weaponId,
          x: Number(item.x.toFixed(2)),
          y: Number(item.y.toFixed(2)),
        })),
        projectiles: Array.from(this.projectiles.values()).map(
          (projectile) => ({
            id: projectile.id,
            ownerId: projectile.ownerId,
            weaponId: projectile.weaponId,
            x: Number(projectile.x.toFixed(2)),
            y: Number(projectile.y.toFixed(2)),
            startX: Number(projectile.startX.toFixed(2)),
            startY: Number(projectile.startY.toFixed(2)),
            endX: Number(projectile.endX.toFixed(2)),
            endY: Number(projectile.endY.toFixed(2)),
            spawnedAt: projectile.spawnedAt,
            expiresAt: projectile.expiresAt,
          }),
        ),
      },
    };
  }

  private parseClientMessage(raw: unknown): ClientMessage | null {
    if (typeof raw === "object" && raw !== null && "type" in raw) {
      return raw as ClientMessage;
    }

    if (typeof raw !== "string") {
      return null;
    }

    try {
      return JSON.parse(raw) as ClientMessage;
    } catch {
      return null;
    }
  }

  private setAction(
    player: Player,
    action: PlayerAction,
    durationMs = 0,
    now = Date.now(),
  ) {
    player.action = action;
    player.actionUntil = now + durationMs;
  }

  private ensureWorldWeapons() {
    if (this.droppedItems.size > 0 || this.pendingDroppedWeapons.length > 0) {
      return;
    }

    for (const weaponId of WORLD_WEAPON_IDS) {
      this.spawnDroppedItem(weaponId);
    }
  }

  private spawnDroppedItem(weaponId: WeaponId, position = this.randomSpawn()) {
    const x = clamp(position.x, RESPAWN_PADDING, WORLD.width - RESPAWN_PADDING);
    const y = clamp(
      position.y,
      RESPAWN_PADDING,
      WORLD.height - RESPAWN_PADDING,
    );
    const id = crypto.randomUUID();

    this.droppedItems.set(id, {
      id,
      weaponId,
      x,
      y,
    });
  }

  private queueDroppedWeaponRespawn(weaponId: WeaponId, now: number) {
    this.pendingDroppedWeapons.push({
      weaponId,
      respawnAt: now + WEAPON_DROP_RESPAWN_MS,
    });
  }

  private respawnDroppedWeapons(now: number) {
    const ready: WeaponId[] = [];
    const waiting: Array<{ respawnAt: number; weaponId: WeaponId }> = [];

    for (const item of this.pendingDroppedWeapons) {
      if (item.respawnAt <= now) {
        ready.push(item.weaponId);
      } else {
        waiting.push(item);
      }
    }

    this.pendingDroppedWeapons = waiting;

    for (const weaponId of ready) {
      this.spawnDroppedItem(weaponId);
    }
  }

  private maybeRespawn(player: Player, now: number) {
    if (player.respawnAt === null || player.respawnAt > now) {
      return;
    }

    const spawn = this.randomSpawn();
    player.x = spawn.x;
    player.y = spawn.y;
    player.hp = player.maxHp;
    player.respawnAt = null;
    player.invulnerableUntil = now + RESPAWN_INVULNERABILITY_MS;
    this.setAction(player, "idle", 0, now);
  }

  private isAlive(player: Player, now: number) {
    return (
      player.hp > 0 && (player.respawnAt === null || player.respawnAt <= now)
    );
  }

  private killPlayer(player: Player, now: number) {
    player.hp = 0;
    player.respawnAt = now + RESPAWN_MS;
    player.input = this.toInputState({
      ...player.input,
      attack: false,
      block: false,
      up: false,
      down: false,
      left: false,
      right: false,
    });
    this.setAction(player, "dead", RESPAWN_MS, now);
  }

  private isBlockingIncoming(
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
      player.input.block &&
      (player.action === "block" || player.actionUntil > now) &&
      targetForward.x * towardSource.x + targetForward.y * towardSource.y > 0.1
    );
  }

  private applyDamage(target: Player, damage: number, now: number) {
    target.hp = clamp(target.hp - damage, 0, target.maxHp);
    target.invulnerableUntil = now + HURT_STUN_MS;

    if (target.hp <= 0) {
      this.killPlayer(target, now);
      return;
    }

    this.setAction(target, "hurt", HURT_STUN_MS, now);
  }

  private resolveKnifeAttack(attacker: Player, now: number) {
    const forward = normalize(attacker.facing);
    const weaponStats = WEAPON_STATS.knife;

    for (const target of this.players.values()) {
      if (
        target.id === attacker.id ||
        !this.isAlive(target, now) ||
        target.invulnerableUntil > now
      ) {
        continue;
      }

      const toTarget = {
        x: target.x - attacker.x,
        y: target.y - attacker.y,
      };
      const distance = Math.hypot(toTarget.x, toTarget.y);

      if (distance > weaponStats.range + target.radius) {
        continue;
      }

      const aim = normalize(toTarget);
      const dot = forward.x * aim.x + forward.y * aim.y;

      if (dot < ATTACK_ARC_DOT) {
        continue;
      }

      if (this.isBlockingIncoming(target, attacker, now)) {
        this.setAction(target, "block", BLOCK_REACTION_MS, now);
        continue;
      }

      this.applyDamage(target, weaponStats.damage, now);
    }
  }

  private spawnProjectile(player: Player, now: number) {
    if (player.equippedWeapon === "knife") {
      return;
    }

    const stats = WEAPON_STATS[player.equippedWeapon];
    const rawFacing = normalize(player.facing);
    const direction =
      rawFacing.x === 0 && rawFacing.y === 0 ? { x: 1, y: 0 } : rawFacing;
    const startX = clamp(
      player.x + direction.x * PROJECTILE_SPAWN_OFFSET,
      player.radius,
      WORLD.width - player.radius,
    );
    const startY = clamp(
      player.y + direction.y * PROJECTILE_SPAWN_OFFSET,
      player.radius,
      WORLD.height - player.radius,
    );
    const unclampedEndX = startX + direction.x * stats.range;
    const unclampedEndY = startY + direction.y * stats.range;
    const endX = clamp(
      unclampedEndX,
      player.radius,
      WORLD.width - player.radius,
    );
    const endY = clamp(
      unclampedEndY,
      player.radius,
      WORLD.height - player.radius,
    );
    const travelDistance = Math.hypot(endX - startX, endY - startY);

    if (travelDistance === 0) {
      return;
    }

    const id = crypto.randomUUID();

    this.projectiles.set(id, {
      id,
      ownerId: player.id,
      weaponId: player.equippedWeapon,
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
      spawnedAt: now,
      expiresAt: now + (travelDistance / stats.projectileSpeed) * 1000,
    });
  }

  private resolveWeaponPickup(player: Player, now: number) {
    if (!this.isAlive(player, now)) {
      return;
    }

    for (const item of this.droppedItems.values()) {
      if (item.weaponId === player.equippedWeapon) {
        continue;
      }

      const distance = Math.hypot(item.x - player.x, item.y - player.y);

      if (distance > player.radius + WEAPON_PICKUP_RADIUS) {
        continue;
      }

      player.equippedWeapon = item.weaponId;
      this.droppedItems.delete(item.id);
      this.queueDroppedWeaponRespawn(item.weaponId, now);
      return;
    }
  }

  private updateProjectiles(deltaSeconds: number, now: number) {
    for (const projectile of this.projectiles.values()) {
      const remainingDistance = Math.hypot(
        projectile.endX - projectile.x,
        projectile.endY - projectile.y,
      );

      if (
        remainingDistance <= projectile.radius ||
        now >= projectile.expiresAt
      ) {
        this.projectiles.delete(projectile.id);
        continue;
      }

      const stepDistance = projectile.speed * deltaSeconds;
      const travelledDistance = Math.min(stepDistance, remainingDistance);
      projectile.x += projectile.direction.x * travelledDistance;
      projectile.y += projectile.direction.y * travelledDistance;

      let consumed = false;

      for (const target of this.players.values()) {
        if (
          target.id === projectile.ownerId ||
          !this.isAlive(target, now) ||
          target.invulnerableUntil > now
        ) {
          continue;
        }

        const distance = Math.hypot(
          target.x - projectile.x,
          target.y - projectile.y,
        );

        if (distance > target.radius + projectile.radius) {
          continue;
        }

        if (this.isBlockingIncoming(target, projectile, now)) {
          this.setAction(target, "block", BLOCK_REACTION_MS, now);
        } else {
          this.applyDamage(target, projectile.damage, now);
        }

        consumed = true;
        break;
      }

      if (consumed) {
        this.projectiles.delete(projectile.id);
        continue;
      }

      if (travelledDistance >= remainingDistance) {
        this.projectiles.delete(projectile.id);
      }
    }
  }

  private updatePlayer(player: Player, deltaSeconds: number, now: number) {
    this.maybeRespawn(player, now);

    if (!this.isAlive(player, now)) {
      return;
    }

    const moveDirection = directionFromInput(player.input);

    if (moveDirection.x !== 0 || moveDirection.y !== 0) {
      player.facing = moveDirection;
    }

    const attackPressed = player.input.attack && !player.previousButtons.attack;
    const weaponStats = WEAPON_STATS[player.equippedWeapon];
    player.previousButtons.attack = player.input.attack;

    if (
      attackPressed &&
      player.attackCooldownUntil <= now &&
      player.action !== "hurt"
    ) {
      player.attackCooldownUntil = now + weaponStats.cooldownMs;
      this.setAction(player, "attack", ATTACK_ANIMATION_MS, now);

      if (weaponStats.isRanged) {
        this.spawnProjectile(player, now);
      } else {
        this.resolveKnifeAttack(player, now);
      }
    }

    if (player.action === "hurt" && player.actionUntil > now) {
      player.lastProcessedSeq = player.input.seq;
      return;
    }

    const blocking = player.input.block && player.action !== "attack";
    const speed = player.speed * (blocking ? BLOCK_SPEED_MULTIPLIER : 1);

    if (moveDirection.x !== 0 || moveDirection.y !== 0) {
      player.x = clamp(
        player.x + moveDirection.x * speed * deltaSeconds,
        player.radius,
        WORLD.width - player.radius,
      );
      player.y = clamp(
        player.y + moveDirection.y * speed * deltaSeconds,
        player.radius,
        WORLD.height - player.radius,
      );
    }

    if (player.actionUntil <= now) {
      if (blocking) {
        this.setAction(player, "block", ACTION_STATE_MS, now);
      } else if (moveDirection.x !== 0 || moveDirection.y !== 0) {
        this.setAction(player, "move", ACTION_STATE_MS, now);
      } else {
        this.setAction(player, "idle", ACTION_STATE_MS, now);
      }
    }

    player.lastProcessedSeq = player.input.seq;
  }
}
