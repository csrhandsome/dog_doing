import { useEffect, useRef, useState } from "react";

import type {
  ProjectileSnapshot,
  SnapshotPayload,
  SnapshotPlayer,
  SoccerBallSnapshot,
} from "../game/protocol";

const FALLBACK_TICK_MS = 50;

function now() {
  return typeof window === "undefined" ? 0 : window.performance.now();
}

function lerp(start: number, end: number, alpha: number) {
  return start + (end - start) * alpha;
}

function shouldSnapPlayer(
  previous: SnapshotPlayer,
  next: SnapshotPlayer,
  snapDistance: number,
) {
  const dx = next.x - previous.x;
  const dy = next.y - previous.y;
  const distanceSquared = dx * dx + dy * dy;

  return (
    distanceSquared > snapDistance * snapDistance ||
    previous.respawnAt !== next.respawnAt ||
    previous.action === "dead" ||
    next.action === "dead"
  );
}

function interpolateSnapshot(
  previous: SnapshotPayload,
  current: SnapshotPayload,
  alpha: number,
  snapDistance: number,
) {
  const previousPlayers = new Map(
    previous.players.map((player) => [player.id, player]),
  );
  const previousProjectiles = new Map(
    previous.projectiles.map((projectile) => [projectile.id, projectile]),
  );

  return {
    match: current.match,
    serverTime: current.serverTime,
    soccerBall: interpolateSoccerBall(previous.soccerBall, current.soccerBall, alpha),
    droppedItems: current.droppedItems,
    players: current.players.map((player) => {
      const previousPlayer = previousPlayers.get(player.id);

      if (!previousPlayer || shouldSnapPlayer(previousPlayer, player, snapDistance)) {
        return player;
      }

      return {
        ...player,
        x: lerp(previousPlayer.x, player.x, alpha),
        y: lerp(previousPlayer.y, player.y, alpha),
      };
    }),
    projectiles: current.projectiles.map((projectile) =>
      interpolateProjectile(previousProjectiles.get(projectile.id), projectile, alpha),
    ),
  };
}

function interpolateSoccerBall(
  previous: SoccerBallSnapshot | null,
  current: SoccerBallSnapshot | null,
  alpha: number,
) {
  if (!current || !previous || previous.radius !== current.radius) {
    return current;
  }

  return {
    ...current,
    vx: lerp(previous.vx, current.vx, alpha),
    vy: lerp(previous.vy, current.vy, alpha),
    x: lerp(previous.x, current.x, alpha),
    y: lerp(previous.y, current.y, alpha),
  };
}

function interpolateProjectile(
  previous: ProjectileSnapshot | undefined,
  current: ProjectileSnapshot,
  alpha: number,
) {
  if (
    !previous ||
    previous.weaponId !== current.weaponId ||
    previous.effect !== current.effect
  ) {
    return current;
  }

  return {
    ...current,
    x: lerp(previous.x, current.x, alpha),
    y: lerp(previous.y, current.y, alpha),
  };
}

export function useInterpolatedSnapshot(
  snapshot: SnapshotPayload,
  tickRate = 20,
  snapDistance = 192,
) {
  const [renderSnapshot, setRenderSnapshot] = useState(snapshot);
  const animationFrameRef = useRef<number | null>(null);
  const currentSnapshotRef = useRef(snapshot);
  const previousSnapshotRef = useRef(snapshot);
  const renderSnapshotRef = useRef(snapshot);
  const receivedAtRef = useRef(now());

  useEffect(() => {
    previousSnapshotRef.current = renderSnapshotRef.current;
    currentSnapshotRef.current = snapshot;
    receivedAtRef.current = now();

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const tickMs = tickRate > 0 ? 1000 / tickRate : FALLBACK_TICK_MS;

    const step = () => {
      const elapsed = now() - receivedAtRef.current;
      const alpha = Math.max(0, Math.min(1, elapsed / tickMs));
      const nextSnapshot = interpolateSnapshot(
        previousSnapshotRef.current,
        currentSnapshotRef.current,
        alpha,
        snapDistance,
      );

      renderSnapshotRef.current = nextSnapshot;
      setRenderSnapshot(nextSnapshot);

      if (alpha < 1) {
        animationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      animationFrameRef.current = null;
    };

    step();

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [snapshot, tickRate, snapDistance]);

  return renderSnapshot;
}
