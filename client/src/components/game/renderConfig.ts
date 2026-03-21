import { Assets, Texture } from "pixi.js";

import { ROLE_COPY, ROLE_ORDER, WEAPON_COPY, WEAPON_ORDER } from "../../game/config";
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
let textureLoadPromise: Promise<void> | null = null;

export function areRenderTexturesReady() {
  return (
    playerTextureCache.size === ROLE_ORDER.length &&
    weaponTextureCache.size === WEAPON_ORDER.length
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

export function loadRenderTextures() {
  if (!textureLoadPromise) {
    textureLoadPromise = Promise.all([
      ...ROLE_ORDER.map(async (role) => {
        const texture = await Assets.load<Texture>(ROLE_COPY[role].artSrc);
        playerTextureCache.set(role, texture);
      }),
      ...WEAPON_ORDER.map(async (weaponId) => {
        const texture = await Assets.load<Texture>(WEAPON_COPY[weaponId].artSrc);
        weaponTextureCache.set(weaponId, texture);
      }),
    ]).then(() => undefined);
  }

  return textureLoadPromise;
}
