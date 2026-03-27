import { extend } from "@pixi/react";
import { Container, Graphics, Sprite } from "pixi.js";

import { WEAPON_COPY } from "../../game/config";
import type { DroppedItemSnapshot } from "../../game/protocol";
import { getWeaponTexture } from "./renderConfig";

extend({ Container, Graphics, Sprite });

type DroppedItemProps = {
  item: DroppedItemSnapshot;
  serverTime: number;
};

function hashPhase(id: string) {
  let value = 0;

  for (let index = 0; index < id.length; index += 1) {
    value = (value * 33 + id.charCodeAt(index)) % 360;
  }

  return (value / 180) * Math.PI;
}

function drawPickupGlow(graphics: Graphics, item: DroppedItemSnapshot, bob: number) {
  const weapon = WEAPON_COPY[item.weaponId];

  graphics.clear();

  if (!weapon) {
    return;
  }

  graphics.ellipse(0, 20, 18, 6).fill({
    color: 0x05070b,
    alpha: 0.35,
  });
  graphics.circle(0, bob - 6, 22).stroke({
    color: weapon.trailColor,
    alpha: 0.32,
    width: 2,
  });
  graphics.circle(0, bob - 6, 14).fill({
    color: weapon.bulletColor,
    alpha: 0.12,
  });
}

export function DroppedItem({ item, serverTime }: DroppedItemProps) {
  const weaponTexture = getWeaponTexture(item.weaponId);
  const weapon = WEAPON_COPY[item.weaponId];
  const phase = hashPhase(item.id);
  const bob = Math.sin(serverTime / 220 + phase) * 5;
  const scale = weapon
    ? weapon.pickupScale * (1 + Math.sin(serverTime / 320 + phase) * 0.03)
    : 0.17;

  return (
    <pixiContainer x={item.x} y={item.y}>
      <pixiGraphics draw={(graphics) => drawPickupGlow(graphics, item, bob)} />
      {weaponTexture ? (
        <pixiSprite
          anchor={0.5}
          rotation={Math.sin(serverTime / 420 + phase) * 0.08}
          scale={scale}
          texture={weaponTexture}
          y={bob - 6}
        />
      ) : null}
    </pixiContainer>
  );
}
