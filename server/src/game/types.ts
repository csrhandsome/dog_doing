export type Role = "warrior" | "mage" | "bibilabu";
export type TeamId = "red" | "blue";

export type WeaponId =
  | "knife"
  | "arow"
  | "gun"
  | "spear"
  | "hammer"
  | "staff"
  | "fire-staff";

export type RangedWeaponId = "arow" | "gun" | "staff" | "fire-staff";
export type ProjectileEffect = "normal" | "ice" | "fire";

export type CardId =
  | "ember-fang"
  | "iron-roots"
  | "ghost-plume"
  | "falcon-iris"
  | "duelist-scar"
  | "amber-reactor"
  | "mirror-thorn"
  | "grave-sand"
  | "misfire-dice"
  | "void-tax";

export type CardPolarity = "boon" | "chaos" | "hex";

export type Vector = {
  x: number;
  y: number;
};

export type WorldConfig = {
  width: number;
  height: number;
  cellSize: number;
  playableInset: number;
};

export type MatchSnapshot = {
  durationMs: number;
  endsAt: number;
  remainingMs: number;
  round: number;
};

export type InputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
  block: boolean;
  seq: number;
};

export type PlayerAction =
  | "idle"
  | "move"
  | "attack"
  | "block"
  | "hurt"
  | "dead";

export type Player = {
  id: string;
  socketId: string;
  name: string;
  role: Role;
  team: TeamId;
  equippedWeapon: WeaponId;
  cards: PlayerCard[];
  deaths: number;
  kills: number;
  killStreak: number;
  lastKilledByPlayerId: string | null;
  score: number;
  color: number;
  x: number;
  y: number;
  facing: Vector;
  hp: number;
  maxHp: number;
  radius: number;
  hurtRadius: number;
  speed: number;
  action: PlayerAction;
  actionUntil: number;
  input: InputState;
  previousButtons: {
    attack: boolean;
  };
  attackCooldownUntil: number;
  invulnerableUntil: number;
  frozenUntil: number;
  burningUntil: number;
  nextBurnTickAt: number;
  burnSourcePlayerId: string | null;
  respawnAt: number | null;
  lastProcessedSeq: number;
};

export type DroppedItem = {
  id: string;
  weaponId: WeaponId;
  x: number;
  y: number;
};

export type PlayerCard = {
  cardId: CardId;
  obtainedAt: number;
};

export type SoccerBall = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  lastTouchedByPlayerId: string | null;
};

export type Projectile = {
  id: string;
  ownerId: string;
  ownerTeam: TeamId;
  weaponId: RangedWeaponId;
  x: number;
  y: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  direction: Vector;
  speed: number;
  damage: number;
  radius: number;
  effect: ProjectileEffect;
  spawnedAt: number;
  expiresAt: number;
};

export type ClientJoinMessage = {
  type: "join";
  payload: {
    name: string;
    role: Role;
  };
};

export type ClientInputMessage = {
  type: "input";
  payload: InputState;
};

export type ClientChooseCardMessage = {
  type: "choose-card";
  payload: {
    cardId: CardId;
    offerId: string;
  };
};

export type ClientMessage =
  | ClientJoinMessage
  | ClientInputMessage
  | ClientChooseCardMessage;

export type ServerJoinedMessage = {
  type: "joined";
  payload: {
    playerId: string;
    tickRate: number;
    world: WorldConfig;
  };
};

export type PlayerSnapshot = {
  id: string;
  name: string;
  role: Role;
  team: TeamId;
  equippedWeapon: WeaponId;
  cards: PlayerCard[];
  deaths: number;
  kills: number;
  score: number;
  color: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing: Vector;
  action: PlayerAction;
  frozenUntil: number;
  burningUntil: number;
  lastProcessedSeq: number;
  respawnAt: number | null;
};

export type DroppedItemSnapshot = {
  id: string;
  weaponId: WeaponId;
  x: number;
  y: number;
};

export type ProjectileSnapshot = {
  id: string;
  ownerId: string;
  weaponId: RangedWeaponId;
  x: number;
  y: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  effect: ProjectileEffect;
  spawnedAt: number;
  expiresAt: number;
};

export type SoccerBallSnapshot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  lastTouchedByPlayerId: string | null;
};

export type ServerSnapshotMessage = {
  type: "snapshot";
  payload: {
    match: MatchSnapshot;
    serverTime: number;
    soccerBall: SoccerBallSnapshot | null;
    players: PlayerSnapshot[];
    droppedItems: DroppedItemSnapshot[];
    projectiles: ProjectileSnapshot[];
  };
};

export type ServerSystemMessage = {
  type: "system";
  payload: {
    level: "info" | "warn";
    message: string;
  };
};

export type CardOfferOption = {
  cardId: CardId;
  description: string;
  label: string;
  polarity: CardPolarity;
  summary: string;
};

export type CardOfferPayload = {
  offerId: string;
  options: CardOfferOption[];
};

export type ServerCardOfferMessage = {
  type: "card-offer";
  payload: CardOfferPayload | null;
};

export type AnnouncementTone = "gold" | "crimson" | "cobalt";

export type ServerAnnouncementMessage = {
  type: "announcement";
  payload: {
    id: string;
    kind: "kill" | "streak" | "revenge";
    title: string;
    subtitle: string;
    badge: string;
    tone: AnnouncementTone;
  };
};

export type ServerMessage =
  | ServerJoinedMessage
  | ServerSnapshotMessage
  | ServerSystemMessage
  | ServerAnnouncementMessage
  | ServerCardOfferMessage;
