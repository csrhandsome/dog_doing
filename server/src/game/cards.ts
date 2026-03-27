import type {
  CardId,
  CardOfferOption,
  CardPolarity,
  PlayerCard,
} from "./types";

type CardStats = {
  attackCooldownMultiplier?: number;
  blockThornsDamage?: number;
  damageMultiplier?: number;
  maxHpFlat?: number;
  meleeDamageMultiplier?: number;
  projectileSpeedMultiplier?: number;
  rangedCooldownMultiplier?: number;
  rangedDamageMultiplier?: number;
  respawnTimeDeltaMs?: number;
  speedMultiplier?: number;
};

export type GameCardDefinition = {
  description: string;
  label: string;
  polarity: CardPolarity;
  stats: CardStats;
  summary: string;
};

export type AggregatedCardStats = {
  attackCooldownMultiplier: number;
  blockThornsDamage: number;
  damageMultiplier: number;
  maxHpFlat: number;
  meleeDamageMultiplier: number;
  projectileSpeedMultiplier: number;
  rangedCooldownMultiplier: number;
  rangedDamageMultiplier: number;
  respawnTimeDeltaMs: number;
  speedMultiplier: number;
};

export const CARD_ORDER: CardId[] = [
  "ember-fang",
  "iron-roots",
  "ghost-plume",
  "falcon-iris",
  "duelist-scar",
  "amber-reactor",
  "mirror-thorn",
  "grave-sand",
  "misfire-dice",
  "void-tax",
];

export const CARD_LIBRARY: Record<CardId, GameCardDefinition> = {
  "amber-reactor": {
    description: "把生命押给枪火与速度，越是脆皮，远程压制越像点燃整个场地。",
    label: "琥珀反应堆",
    polarity: "chaos",
    stats: {
      maxHpFlat: -8,
      projectileSpeedMultiplier: 1.35,
      rangedCooldownMultiplier: 0.9,
    },
    summary: "远程攻速更快，弹道更凶，但生命 -8",
  },
  "duelist-scar": {
    description: "近身决斗时先手更狠，刀锋会抢在对面反应之前撕开空档。",
    label: "决斗刻痕",
    polarity: "boon",
    stats: {
      attackCooldownMultiplier: 0.92,
      meleeDamageMultiplier: 1.28,
    },
    summary: "近战伤害提升，基础攻击间隔缩短",
  },
  "ember-fang": {
    description: "把自己的血条当作燃料，换来每次出手都更像一口真正咬下去的火牙。",
    label: "烬牙契印",
    polarity: "chaos",
    stats: {
      damageMultiplier: 1.26,
      maxHpFlat: -18,
    },
    summary: "总伤害提高，但生命 -18",
  },
  "falcon-iris": {
    description: "远程瞄准被压缩成一种本能，出手会更沉更准，但节奏稍微慢半拍。",
    label: "猎隼瞳芯",
    polarity: "boon",
    stats: {
      rangedCooldownMultiplier: 1.08,
      rangedDamageMultiplier: 1.22,
    },
    summary: "远程伤害提升，但远程冷却略变长",
  },
  "ghost-plume": {
    description: "把重量抽空，腿会先一步离开原地，代价是肉身也跟着更薄。",
    label: "幽羽跃迁",
    polarity: "chaos",
    stats: {
      maxHpFlat: -10,
      speedMultiplier: 1.18,
    },
    summary: "移动速度提升，但生命 -10",
  },
  "grave-sand": {
    description: "把复活计时器往回拨，像从坟里提前半拍爬出来，但血量也会被埋掉一截。",
    label: "墓砂回表",
    polarity: "chaos",
    stats: {
      maxHpFlat: -14,
      respawnTimeDeltaMs: -700,
    },
    summary: "复活更快，但生命 -14",
  },
  "iron-roots": {
    description: "像在脚下长出铁根，站住以后更难被拔起，但换位与追击都会迟钝一些。",
    label: "铁根堡垒",
    polarity: "boon",
    stats: {
      maxHpFlat: 34,
      speedMultiplier: 0.88,
    },
    summary: "生命大幅提升，但移动速度下降",
  },
  "mirror-thorn": {
    description: "把防御做成会反咬人的镜面。挡得住时，对面会先被自己的冲动扎伤。",
    label: "镜棘反甲",
    polarity: "boon",
    stats: {
      blockThornsDamage: 12,
      speedMultiplier: 0.93,
    },
    summary: "格挡成功可反伤，移动速度略降",
  },
  "misfire-dice": {
    description: "把战斗节奏交给失序的骰核。身法会更快，但每次出手都变得不那么值钱。",
    label: "失序骰核",
    polarity: "hex",
    stats: {
      damageMultiplier: 0.84,
      speedMultiplier: 1.24,
    },
    summary: "移动速度提升，但总伤害降低",
  },
  "void-tax": {
    description: "把代价征收到自己身上，换来更高频的压制和额外伤害，代价也最直白。",
    label: "空税王冠",
    polarity: "hex",
    stats: {
      attackCooldownMultiplier: 0.88,
      damageMultiplier: 1.14,
      maxHpFlat: -26,
    },
    summary: "攻击更快更痛，但生命 -26",
  },
};

const DEFAULT_CARD_STATS: AggregatedCardStats = {
  attackCooldownMultiplier: 1,
  blockThornsDamage: 0,
  damageMultiplier: 1,
  maxHpFlat: 0,
  meleeDamageMultiplier: 1,
  projectileSpeedMultiplier: 1,
  rangedCooldownMultiplier: 1,
  rangedDamageMultiplier: 1,
  respawnTimeDeltaMs: 0,
  speedMultiplier: 1,
};

export function buildPlayerCardStats(cards: PlayerCard[]) {
  return cards.reduce<AggregatedCardStats>((accumulator, card) => {
    const definition = CARD_LIBRARY[card.cardId];
    const stats = definition.stats;

    accumulator.attackCooldownMultiplier *= stats.attackCooldownMultiplier ?? 1;
    accumulator.blockThornsDamage += stats.blockThornsDamage ?? 0;
    accumulator.damageMultiplier *= stats.damageMultiplier ?? 1;
    accumulator.maxHpFlat += stats.maxHpFlat ?? 0;
    accumulator.meleeDamageMultiplier *= stats.meleeDamageMultiplier ?? 1;
    accumulator.projectileSpeedMultiplier *=
      stats.projectileSpeedMultiplier ?? 1;
    accumulator.rangedCooldownMultiplier *=
      stats.rangedCooldownMultiplier ?? 1;
    accumulator.rangedDamageMultiplier *= stats.rangedDamageMultiplier ?? 1;
    accumulator.respawnTimeDeltaMs += stats.respawnTimeDeltaMs ?? 0;
    accumulator.speedMultiplier *= stats.speedMultiplier ?? 1;

    return accumulator;
  }, structuredClone(DEFAULT_CARD_STATS));
}

export function createCardOfferOption(cardId: CardId): CardOfferOption {
  const definition = CARD_LIBRARY[cardId];

  return {
    cardId,
    description: definition.description,
    label: definition.label,
    polarity: definition.polarity,
    summary: definition.summary,
  };
}

export function drawCardOfferOptions(count = 3) {
  const pool = [...CARD_ORDER];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = pool[index]!;

    pool[index] = pool[swapIndex]!;
    pool[swapIndex] = current;
  }

  return pool.slice(0, Math.max(1, Math.min(count, pool.length)));
}
