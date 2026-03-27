import { Assets, Texture } from "pixi.js";

import {
  GOAL_ART_SRC,
  ROLE_COPY,
  ROLE_ORDER,
  SHIELD_ART_SRC,
  SOCCER_BALL_ART_SRC,
  WEAPON_COPY,
  WEAPON_ORDER,
} from "../../game/config";
import type { Role, SnapshotPlayer, WeaponId } from "../../game/protocol";

export const TEXT_STYLE = {
  fill: "#171412",
  fontFamily:
    '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  fontSize: 17,
  fontWeight: "700" as const,
};

const playerTextureCache = new Map<Role, Texture>();
const weaponTextureCache = new Map<WeaponId, Texture>();
let goalTextureCache: Texture | null = null;
let shieldTextureCache: Texture | null = null;
let soccerBallTextureCache: Texture | null = null;
let textureLoadPromise: Promise<void> | null = null;

async function loadTexture(
  label: string,
  src: string,
  assign: (texture: Texture) => void,
) {
  try {
    const texture = await Assets.load<Texture>(src);
    assign(texture);
  } catch (error) {
    console.warn(`[renderConfig] failed to load ${label} texture`, error);
  }
}

export function areRenderTexturesReady() {
  return (
    playerTextureCache.size === ROLE_ORDER.length &&
    weaponTextureCache.size === WEAPON_ORDER.length &&
    shieldTextureCache !== null &&
    soccerBallTextureCache !== null &&
    goalTextureCache !== null
  );
}

export function getFacing(player: SnapshotPlayer) {
  return {
    x: player.facing.x === 0 && player.facing.y === 0 ? 1 : player.facing.x,
    y: player.facing.x === 0 && player.facing.y === 0 ? 0 : player.facing.y,
  };
}

export function getPlayerTexture(role: Role) {
  return playerTextureCache.get(role) ?? null;
}

export function getWeaponTexture(weaponId: WeaponId) {
  return weaponTextureCache.get(weaponId) ?? null;
}

export function getShieldTexture() {
  return shieldTextureCache;
}

export function getSoccerBallTexture() {
  return soccerBallTextureCache;
}

export function getGoalTexture() {
  return goalTextureCache;
}

export function loadRenderTextures() {
  if (!textureLoadPromise || !areRenderTexturesReady()) {
    textureLoadPromise = Promise.all([
      ...ROLE_ORDER.map((role) =>
        loadTexture(`role:${role}`, ROLE_COPY[role].artSrc, (texture) => {
          playerTextureCache.set(role, texture);
        }),
      ),
      ...WEAPON_ORDER.map((weaponId) =>
        loadTexture(`weapon:${weaponId}`, WEAPON_COPY[weaponId].artSrc, (texture) => {
          weaponTextureCache.set(weaponId, texture);
        }),
      ),
      loadTexture("shield", SHIELD_ART_SRC, (texture) => {
        shieldTextureCache = texture;
      }),
      loadTexture("soccer-ball", SOCCER_BALL_ART_SRC, (texture) => {
        soccerBallTextureCache = texture;
      }),
      loadTexture("goal", GOAL_ART_SRC, (texture) => {
        goalTextureCache = texture;
      }),
    ]).then(() => {
      if (!areRenderTexturesReady()) {
        textureLoadPromise = null;
      }
    });
  }

  return textureLoadPromise;
}
