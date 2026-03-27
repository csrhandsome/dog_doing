import {
  BASE_SPEED,
  PLAYER_HURT_RADIUS,
  PLAYER_MAX_HP,
  PLAYER_RADIUS,
  RESPAWN_INVULNERABILITY_MS,
  RESPAWN_PADDING,
  TEAM_COLORS,
  WORLD,
} from "../game/config";
import type {
  ClientMessage,
  InputState,
  Player,
  PlayerAction,
  Role,
  TeamId,
} from "../game/types";

export type PlayableBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function getPlayableBounds(padding = 0): PlayableBounds {
  return {
    minX: WORLD.playableInset + padding,
    maxX: WORLD.width - WORLD.playableInset - padding,
    minY: WORLD.playableInset + padding,
    maxY: WORLD.height - WORLD.playableInset - padding,
  };
}

export function getPitchBounds(padding = 0): PlayableBounds & {
  centerX: number;
  centerY: number;
  fieldHeight: number;
  fieldWidth: number;
  fieldX: number;
  fieldY: number;
  trackWidth: number;
} {
  const outer = getPlayableBounds();
  const trackWidth = WORLD.cellSize * 0.98;
  const fieldX = outer.minX + trackWidth;
  const fieldY = outer.minY + trackWidth;
  const fieldWidth = outer.maxX - outer.minX - trackWidth * 2;
  const fieldHeight = outer.maxY - outer.minY - trackWidth * 2;

  return {
    centerX: WORLD.width / 2,
    centerY: WORLD.height / 2,
    fieldHeight,
    fieldWidth,
    fieldX,
    fieldY,
    maxX: fieldX + fieldWidth - padding,
    maxY: fieldY + fieldHeight - padding,
    minX: fieldX + padding,
    minY: fieldY + padding,
    trackWidth,
  };
}

function getTeamSpawnBounds(team?: TeamId) {
  const bounds = getPlayableBounds(RESPAWN_PADDING);

  if (!team) {
    return bounds;
  }

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const splitGap = Math.min(96, (bounds.maxX - bounds.minX) * 0.08);

  if (team === "red") {
    return {
      ...bounds,
      maxX: Math.max(bounds.minX, centerX - splitGap),
    };
  }

  return {
    ...bounds,
    minX: Math.min(bounds.maxX, centerX + splitGap),
  };
}

export function pickBalancedTeam(players: Iterable<Pick<Player, "team">>): TeamId {
  let redCount = 0;
  let blueCount = 0;

  for (const player of players) {
    if (player.team === "red") {
      redCount += 1;
    } else {
      blueCount += 1;
    }
  }

  if (redCount === blueCount) {
    return (redCount + blueCount) % 2 === 0 ? "red" : "blue";
  }

  return redCount < blueCount ? "red" : "blue";
}

export function randomSpawn(team?: TeamId) {
  const bounds = getTeamSpawnBounds(team);

  return {
    x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
    y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
  };
}

export function toInputState(input?: InputState): InputState {
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

export function createPlayer(
  socketId: string,
  name: string,
  role: Role,
  team: TeamId,
): Player {
  const spawn = randomSpawn(team);
  const now = Date.now();
  const safeName =
    name.trim().slice(0, 18) || `guest-${socketId.slice(0, 4)}`;

  return {
    id: crypto.randomUUID(),
    socketId,
    name: safeName,
    role,
    team,
    equippedWeapon: "knife",
    cards: [],
    deaths: 0,
    kills: 0,
    killStreak: 0,
    lastKilledByPlayerId: null,
    score: 0,
    color: TEAM_COLORS[team],
    x: spawn.x,
    y: spawn.y,
    facing: { x: 1, y: 0 },
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    radius: PLAYER_RADIUS,
    hurtRadius: PLAYER_HURT_RADIUS,
    speed: BASE_SPEED,
    action: "idle",
    actionUntil: now,
    input: toInputState(),
    previousButtons: {
      attack: false,
    },
    attackCooldownUntil: now,
    invulnerableUntil: now,
    frozenUntil: 0,
    burningUntil: 0,
    nextBurnTickAt: 0,
    burnSourcePlayerId: null,
    respawnAt: null,
    lastProcessedSeq: 0,
  };
}

export function parseClientMessage(raw: unknown): ClientMessage | null {
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

export function setPlayerAction(
  player: Player,
  action: PlayerAction,
  durationMs = 0,
  now = Date.now(),
) {
  player.action = action;
  player.actionUntil = now + durationMs;
}

export function maybeRespawnPlayer(player: Player, now: number) {
  if (player.respawnAt === null || player.respawnAt > now) {
    return;
  }

  const spawn = randomSpawn(player.team);
  player.x = spawn.x;
  player.y = spawn.y;
  player.hp = player.maxHp;
  player.frozenUntil = 0;
  player.burningUntil = 0;
  player.nextBurnTickAt = 0;
  player.burnSourcePlayerId = null;
  player.respawnAt = null;
  player.invulnerableUntil = now + RESPAWN_INVULNERABILITY_MS;
  setPlayerAction(player, "idle", 0, now);
}

export function isPlayerAlive(player: Player, now: number) {
  return player.hp > 0 && (player.respawnAt === null || player.respawnAt <= now);
}

export function canPlayerUseShield(player: Pick<Player, "role">) {
  return player.role === "warrior";
}

export function arePlayersEnemies(
  left: Pick<Player, "team">,
  right: Pick<Player, "team">,
) {
  return left.team !== right.team;
}

export function getKillStreakTitle(streak: number) {
  if (streak >= 5) {
    return "暴走连杀";
  }

  if (streak === 4) {
    return "四连统治";
  }

  if (streak === 3) {
    return "三连击破";
  }

  if (streak === 2) {
    return "双连击破";
  }

  return "目标击破";
}
