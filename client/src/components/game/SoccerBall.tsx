import { extend } from "@pixi/react";
import { Container, Graphics, Sprite } from "pixi.js";

import type { SoccerBallSnapshot } from "../../game/protocol";
import { getSoccerBallTexture } from "./renderConfig";

extend({ Container, Graphics, Sprite });

type SoccerBallProps = {
  ball: SoccerBallSnapshot;
};

const SOCCER_PATCH_OFFSETS = [
  { x: 0, y: -0.02, radius: 0.24, rotation: -Math.PI / 2 },
  { x: -0.3, y: -0.24, radius: 0.18, rotation: -0.15 },
  { x: 0.3, y: -0.22, radius: 0.18, rotation: 0.18 },
  { x: -0.38, y: 0.18, radius: 0.19, rotation: 0.08 },
  { x: 0.4, y: 0.2, radius: 0.19, rotation: -0.08 },
  { x: 0.02, y: 0.42, radius: 0.18, rotation: Math.PI / 5 },
];

function drawBallShadow(graphics: Graphics, ball: SoccerBallSnapshot) {
  const speed = Math.hypot(ball.vx, ball.vy);
  const radius = ball.radius * (0.78 + Math.min(speed / 1600, 0.16));

  graphics.clear();
  graphics.ellipse(ball.x, ball.y + ball.radius * 0.92, radius, ball.radius * 0.46).fill({
    color: 0x101010,
    alpha: 0.18,
  });
}

function drawBallAura(graphics: Graphics, ball: SoccerBallSnapshot) {
  const speed = Math.hypot(ball.vx, ball.vy);
  const aura = Math.min(0.16, speed / 2200);

  graphics.clear();

  if (aura <= 0.01) {
    return;
  }

  graphics.circle(ball.x, ball.y, ball.radius * 1.22).fill({
    color: 0xffffff,
    alpha: aura,
  });
}

function drawFallbackBall(graphics: Graphics, ball: SoccerBallSnapshot) {
  const radius = ball.radius;
  const panelColor = 0x2b2a28;

  graphics.clear();
  graphics.circle(ball.x, ball.y - 3, radius).fill({
    color: 0xf7f5ee,
  });
  graphics.circle(ball.x, ball.y - 3, radius).stroke({
    color: 0x1a1714,
    alpha: 0.24,
    width: 1.6,
  });
  graphics.circle(ball.x - radius * 0.22, ball.y - radius * 0.5, radius * 0.26).fill({
    color: 0xffffff,
    alpha: 0.4,
  });

  for (const patch of SOCCER_PATCH_OFFSETS) {
    graphics.poly(
      Array.from({ length: 5 }, (_, index) => {
        const angle = patch.rotation + (Math.PI * 2 * index) / 5;

        return {
          x: ball.x + patch.x * radius + Math.cos(angle) * radius * patch.radius,
          y:
            ball.y -
            3 +
            patch.y * radius +
            Math.sin(angle) * radius * patch.radius,
        };
      }),
      true,
    ).fill({
      color: panelColor,
      alpha: patch.radius > 0.2 ? 1 : 0.94,
    });
  }
}

export function SoccerBall({ ball }: SoccerBallProps) {
  const texture = getSoccerBallTexture();
  const spin = ball.x * 0.014 + ball.y * 0.01;

  return (
    <pixiContainer>
      <pixiGraphics draw={(graphics) => drawBallShadow(graphics, ball)} />
      {texture ? (
        <pixiSprite
          anchor={0.5}
          rotation={spin}
          scale={0.21}
          texture={texture}
          x={ball.x}
          y={ball.y - 3}
        />
      ) : (
        <pixiGraphics draw={(graphics) => drawFallbackBall(graphics, ball)} />
      )}
      <pixiGraphics draw={(graphics) => drawBallAura(graphics, ball)} />
    </pixiContainer>
  );
}
