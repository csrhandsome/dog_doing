import { extend } from "@pixi/react";
import { Container, Graphics, Sprite } from "pixi.js";

import { WEAPON_COPY, canRoleUseShield } from "../../game/config";
import type { SnapshotPlayer } from "../../game/protocol";
import { getFacing, getWeaponTexture } from "./renderConfig";

extend({ Container, Graphics, Sprite });

type PlayerWeaponProps = {
  player: SnapshotPlayer;
};

function drawWeapon(graphics: Graphics, player: SnapshotPlayer) {
  const facing = getFacing(player);
  const facingX = facing.x;
  const facingY = facing.y;
  const weapon = WEAPON_COPY[player.equippedWeapon];
  const strokeColor = weapon.trailColor;

  graphics.clear();

  if (player.action === "attack") {
    if (player.equippedWeapon === "knife") {
      graphics.moveTo(facingX * 18 - facingY * 14, facingY * 18 + facingX * 14);
      graphics.lineTo(facingX * 32, facingY * 32);
      graphics.lineTo(facingX * 18 + facingY * 14, facingY * 18 - facingX * 14);
      graphics.stroke({
        color: strokeColor,
        width: 4,
        alpha: 0.9,
      });
    } else if (player.equippedWeapon === "gun") {
      graphics.moveTo(facingX * 18, facingY * 18);
      graphics.lineTo(facingX * 58, facingY * 58);
      graphics.stroke({
        color: strokeColor,
        width: 3.2,
        alpha: 0.55,
      });
      graphics.circle(facingX * 60, facingY * 60, 6).fill({
        color: 0xffd27d,
        alpha: 0.6,
      });
    } else {
      graphics.moveTo(facingX * 14, facingY * 14);
      graphics.lineTo(facingX * 30, facingY * 30 - 12);
      graphics.lineTo(facingX * 46, facingY * 46);
      graphics.stroke({
        color: strokeColor,
        width: 3,
        alpha: 0.5,
      });
    }
  }

  if (player.action === "block" && !canRoleUseShield(player.role)) {
    graphics.roundRect(facingX * 16 - 12, facingY * 16 - 12, 24, 24, 8).stroke({
      color: 0x171412,
      width: 4,
      alpha: 0.75,
    });
  }

  if (player.action === "dead") {
    graphics.moveTo(-15, -15);
    graphics.lineTo(15, 15);
    graphics.moveTo(15, -15);
    graphics.lineTo(-15, 15);
    graphics.stroke({
      color: 0x171412,
      width: 4,
      alpha: 0.8,
    });
  }
}

export function PlayerWeapon({ player }: PlayerWeaponProps) {
  const facing = getFacing(player);
  const weaponTexture = getWeaponTexture(player.equippedWeapon);
  const weapon = WEAPON_COPY[player.equippedWeapon];
  const attackReach = player.action === "attack" ? 8 : 0;
  const offsetX = facing.x * (20 + attackReach) - facing.y * 8;
  const offsetY = facing.y * (20 + attackReach) + facing.x * 8;
  const rotation = Math.atan2(facing.y, facing.x);

  return (
    <pixiContainer>
      {weaponTexture ? (
        <pixiSprite
          alpha={player.action === "dead" ? 0.34 : 0.96}
          anchor={{ x: 0.2, y: 0.5 }}
          rotation={rotation}
          scale={weapon.spriteScale}
          texture={weaponTexture}
          x={offsetX}
          y={offsetY - 8}
        />
      ) : null}
      <pixiGraphics draw={(graphics) => drawWeapon(graphics, player)} />
    </pixiContainer>
  );
}
