import {
  ACTION_STATE_MS,
  ATTACK_ANIMATION_MS,
  ATTACK_ARC_DOT,
  ATTACK_COOLDOWN_MS,
  ATTACK_DAMAGE,
  ATTACK_RANGE,
  BASE_SPEED,
  BLOCK_REACTION_MS,
  BLOCK_SPEED_MULTIPLIER,
  HURT_STUN_MS,
  PLAYER_MAX_HP,
  PLAYER_RADIUS,
  RESPAWN_INVULNERABILITY_MS,
  RESPAWN_MS,
  RESPAWN_PADDING,
  ROLE_COLORS,
  TICK_MS,
  TICK_RATE,
  WORLD,
} from './config'
import { clamp, directionFromInput, normalize } from './math'
import type { ClientMessage, InputState, Player, PlayerAction, Role, ServerMessage, ServerSnapshotMessage } from './types'

export class GameRoom {
  private readonly sockets = new Map<string, ServerWebSocket<unknown>>()
  private readonly socketToPlayerId = new Map<string, string>()
  private readonly players = new Map<string, Player>()
  private interval: ReturnType<typeof setInterval> | null = null
  private previousTick = Date.now()

  getHealth() {
    return {
      ok: true,
      players: this.players.size,
      tickRate: TICK_RATE,
    }
  }

  start() {
    if (this.interval) {
      return
    }

    this.previousTick = Date.now()
    this.interval = setInterval(() => {
      this.tick()
    }, TICK_MS)
  }

  stop() {
    if (!this.interval) {
      return
    }

    clearInterval(this.interval)
    this.interval = null
  }

  handleOpen(ws: ServerWebSocket<unknown>) {
    this.sockets.set(ws.id, ws)
    this.sendSystem(ws, 'info', 'connected')
  }

  handleMessage(ws: ServerWebSocket<unknown>, rawMessage: unknown) {
    const message = this.parseClientMessage(rawMessage)

    if (!message) {
      this.sendSystem(ws, 'warn', 'invalid message payload')
      return
    }

    if (message.type === 'join') {
      this.handleJoin(ws.id, message.payload.name, message.payload.role, ws)
      return
    }

    const playerId = this.socketToPlayerId.get(ws.id)

    if (!playerId) {
      this.sendSystem(ws, 'warn', 'join first')
      return
    }

    const player = this.players.get(playerId)

    if (!player) {
      return
    }

    player.input = this.toInputState(message.payload)
  }

  handleClose(ws: ServerWebSocket<unknown>) {
    const playerId = this.socketToPlayerId.get(ws.id)

    this.sockets.delete(ws.id)

    if (playerId) {
      this.players.delete(playerId)
      this.socketToPlayerId.delete(ws.id)
      this.broadcast(this.snapshot(Date.now()))
    }
  }

  private handleJoin(socketId: string, name: string, role: Role, ws: ServerWebSocket<unknown>) {
    const existingPlayerId = this.socketToPlayerId.get(socketId)

    if (existingPlayerId) {
      this.players.delete(existingPlayerId)
    }

    const player = this.createPlayer(socketId, name, role)
    this.players.set(player.id, player)
    this.socketToPlayerId.set(socketId, player.id)

    this.send(ws, {
      type: 'joined',
      payload: {
        playerId: player.id,
        tickRate: TICK_RATE,
        world: WORLD,
      },
    })

    this.broadcast(this.snapshot(Date.now()))
  }

  private tick() {
    const now = Date.now()
    const deltaSeconds = (now - this.previousTick) / 1000
    this.previousTick = now

    for (const player of this.players.values()) {
      this.updatePlayer(player, deltaSeconds, now)
    }

    this.broadcast(this.snapshot(now))
  }

  private createPlayer(socketId: string, name: string, role: Role): Player {
    const spawn = this.randomSpawn()
    const now = Date.now()
    const safeName = name.trim().slice(0, 18) || `guest-${socketId.slice(0, 4)}`

    return {
      id: crypto.randomUUID(),
      socketId,
      name: safeName,
      role,
      color: ROLE_COLORS[role],
      x: spawn.x,
      y: spawn.y,
      facing: { x: 1, y: 0 },
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      radius: PLAYER_RADIUS,
      speed: BASE_SPEED,
      action: 'idle',
      actionUntil: now,
      input: this.toInputState(),
      previousButtons: {
        attack: false,
      },
      attackCooldownUntil: now,
      invulnerableUntil: now,
      respawnAt: null,
      lastProcessedSeq: 0,
    }
  }

  private randomSpawn() {
    return {
      x: RESPAWN_PADDING + Math.random() * (WORLD.width - RESPAWN_PADDING * 2),
      y: RESPAWN_PADDING + Math.random() * (WORLD.height - RESPAWN_PADDING * 2),
    }
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
      }
    }

    return {
      up: input.up,
      down: input.down,
      left: input.left,
      right: input.right,
      attack: input.attack,
      block: input.block,
      seq: input.seq,
    }
  }

  private send(ws: ServerWebSocket<unknown>, message: ServerMessage) {
    ws.send(JSON.stringify(message))
  }

  private sendSystem(ws: ServerWebSocket<unknown>, level: 'info' | 'warn', message: string) {
    this.send(ws, {
      type: 'system',
      payload: {
        level,
        message,
      },
    })
  }

  private broadcast(message: ServerMessage) {
    const encoded = JSON.stringify(message)

    for (const ws of this.sockets.values()) {
      ws.send(encoded)
    }
  }

  private snapshot(now: number): ServerSnapshotMessage {
    return {
      type: 'snapshot',
      payload: {
        serverTime: now,
        players: Array.from(this.players.values()).map((player) => ({
          id: player.id,
          name: player.name,
          role: player.role,
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
      },
    }
  }

  private parseClientMessage(raw: unknown): ClientMessage | null {
    if (typeof raw === 'object' && raw !== null && 'type' in raw) {
      return raw as ClientMessage
    }

    if (typeof raw !== 'string') {
      return null
    }

    try {
      return JSON.parse(raw) as ClientMessage
    } catch {
      return null
    }
  }

  private setAction(player: Player, action: PlayerAction, durationMs = 0, now = Date.now()) {
    player.action = action
    player.actionUntil = now + durationMs
  }

  private maybeRespawn(player: Player, now: number) {
    if (player.respawnAt === null || player.respawnAt > now) {
      return
    }

    const spawn = this.randomSpawn()
    player.x = spawn.x
    player.y = spawn.y
    player.hp = player.maxHp
    player.respawnAt = null
    player.invulnerableUntil = now + RESPAWN_INVULNERABILITY_MS
    this.setAction(player, 'idle', 0, now)
  }

  private isAlive(player: Player, now: number) {
    return player.hp > 0 && (player.respawnAt === null || player.respawnAt <= now)
  }

  private killPlayer(player: Player, now: number) {
    player.hp = 0
    player.respawnAt = now + RESPAWN_MS
    player.input = this.toInputState({
      ...player.input,
      attack: false,
      block: false,
      up: false,
      down: false,
      left: false,
      right: false,
    })
    this.setAction(player, 'dead', RESPAWN_MS, now)
  }

  private resolveAttack(attacker: Player, now: number) {
    const forward = normalize(attacker.facing)

    for (const target of this.players.values()) {
      if (target.id === attacker.id || !this.isAlive(target, now) || target.invulnerableUntil > now) {
        continue
      }

      const toTarget = {
        x: target.x - attacker.x,
        y: target.y - attacker.y,
      }
      const distance = Math.hypot(toTarget.x, toTarget.y)

      if (distance > ATTACK_RANGE + target.radius) {
        continue
      }

      const aim = normalize(toTarget)
      const dot = forward.x * aim.x + forward.y * aim.y

      if (dot < ATTACK_ARC_DOT) {
        continue
      }

      const targetForward = normalize(target.facing)
      const towardAttacker = normalize({
        x: attacker.x - target.x,
        y: attacker.y - target.y,
      })
      const isBlockingFront =
        target.input.block &&
        (target.action === 'block' || target.actionUntil > now) &&
        targetForward.x * towardAttacker.x + targetForward.y * towardAttacker.y > 0.1

      if (isBlockingFront) {
        this.setAction(target, 'block', BLOCK_REACTION_MS, now)
        continue
      }

      target.hp = clamp(target.hp - ATTACK_DAMAGE, 0, target.maxHp)
      target.invulnerableUntil = now + HURT_STUN_MS

      if (target.hp <= 0) {
        this.killPlayer(target, now)
      } else {
        this.setAction(target, 'hurt', HURT_STUN_MS, now)
      }
    }
  }

  private updatePlayer(player: Player, deltaSeconds: number, now: number) {
    this.maybeRespawn(player, now)

    if (!this.isAlive(player, now)) {
      return
    }

    const moveDirection = directionFromInput(player.input)

    if (moveDirection.x !== 0 || moveDirection.y !== 0) {
      player.facing = moveDirection
    }

    const attackPressed = player.input.attack && !player.previousButtons.attack
    player.previousButtons.attack = player.input.attack

    if (attackPressed && player.attackCooldownUntil <= now && player.action !== 'hurt') {
      player.attackCooldownUntil = now + ATTACK_COOLDOWN_MS
      this.setAction(player, 'attack', ATTACK_ANIMATION_MS, now)
      this.resolveAttack(player, now)
    }

    if (player.action === 'hurt' && player.actionUntil > now) {
      player.lastProcessedSeq = player.input.seq
      return
    }

    const blocking = player.input.block && player.action !== 'attack'
    const speed = player.speed * (blocking ? BLOCK_SPEED_MULTIPLIER : 1)

    if (moveDirection.x !== 0 || moveDirection.y !== 0) {
      player.x = clamp(player.x + moveDirection.x * speed * deltaSeconds, player.radius, WORLD.width - player.radius)
      player.y = clamp(player.y + moveDirection.y * speed * deltaSeconds, player.radius, WORLD.height - player.radius)
    }

    if (player.actionUntil <= now) {
      if (blocking) {
        this.setAction(player, 'block', ACTION_STATE_MS, now)
      } else if (moveDirection.x !== 0 || moveDirection.y !== 0) {
        this.setAction(player, 'move', ACTION_STATE_MS, now)
      } else {
        this.setAction(player, 'idle', ACTION_STATE_MS, now)
      }
    }

    player.lastProcessedSeq = player.input.seq
  }
}
