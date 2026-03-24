import { extend } from "@pixi/react";
import { Container, Graphics } from "pixi.js";

import type { SnapshotPlayer } from "../../game/protocol";
import { PlayerBody } from "./PlayerBody";
import { PlayerWeapon } from "./PlayerWeapon";

extend({ Container, Graphics });

type PlayerSpriteProps = {
  isLocal: boolean;
  player: SnapshotPlayer;
  serverTime: number;
};

function drawHealthBar(graphics: Graphics, player: SnapshotPlayer) {
  const ratio = Math.max(0, Math.min(1, player.hp / player.maxHp));
  const fillColor = player.color;
  const fillWidth = ratio === 0 ? 0 : Math.max(8, 48 * ratio);

  graphics.clear();
  graphics.roundRect(-24, -42, 48, 8, 4).fill({
    color: 0xffffff,
    alpha: 0.78,
  });
  graphics.roundRect(-24, -42, 48, 8, 4).stroke({
    color: 0x171412,
    width: 2,
    alpha: 0.5,
  });

  if (fillWidth > 0) {
    graphics.roundRect(-24, -42, fillWidth, 8, 4).fill({
      color: fillColor,
      alpha: player.action === "dead" ? 0.3 : 0.95,
    });
  }
}

function drawRespawnDial(
  graphics: Graphics,
  player: SnapshotPlayer,
  serverTime: number,
) {
  graphics.clear();

  if (player.respawnAt === null) {
    return;
  }

  const remaining = Math.max(0, player.respawnAt - serverTime);
  const ratio = 1 - remaining / 2600;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * ratio;

  graphics.arc(0, 0, 28, startAngle, endAngle);
  graphics.stroke({
    color: 0x171412,
    width: 3,
    alpha: 0.6,
  });
}

export function PlayerSprite({
  isLocal,
  player,
  serverTime,
}: PlayerSpriteProps) {
  return (
    <pixiContainer x={player.x} y={player.y}>
      <pixiGraphics
        draw={(graphics) => drawRespawnDial(graphics, player, serverTime)}
      />
      <PlayerBody isLocal={isLocal} player={player} />
      <PlayerWeapon player={player} />
      <pixiGraphics draw={(graphics) => drawHealthBar(graphics, player)} />
    </pixiContainer>
  );
}
