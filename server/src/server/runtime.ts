import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";

export type ServerRuntimeInfo = {
  hostname: string;
  instanceId: string;
  lockPath: string | null;
  pid: number;
  port: number;
  startedAt: number;
};

type LockFilePayload = {
  hostname: string;
  instanceId: string;
  pid: number;
  port: number;
  startedAt: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorCode(error: unknown) {
  if (!isObject(error) || typeof error.code !== "string") {
    return null;
  }

  return error.code;
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return getErrorCode(error) !== "ESRCH";
  }
}

function readLockPayload(lockPath: string) {
  try {
    const raw = readFileSync(lockPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!isObject(parsed)) {
      return null;
    }

    if (
      typeof parsed.pid !== "number" ||
      typeof parsed.hostname !== "string" ||
      typeof parsed.instanceId !== "string" ||
      typeof parsed.port !== "number" ||
      typeof parsed.startedAt !== "number"
    ) {
      return null;
    }

    return parsed as LockFilePayload;
  } catch {
    return null;
  }
}

function tryRemoveStaleLock(lockPath: string, currentHostname: string) {
  const payload = readLockPayload(lockPath);

  if (!payload) {
    return false;
  }

  if (payload.hostname !== currentHostname) {
    return false;
  }

  if (isProcessAlive(payload.pid)) {
    return false;
  }

  rmSync(lockPath, { force: true });
  return true;
}

function createLockFile(lockPath: string, payload: LockFilePayload): number {
  mkdirSync(dirname(lockPath), { recursive: true });

  try {
    const fd = openSync(lockPath, "wx");
    writeFileSync(fd, JSON.stringify(payload, null, 2));
    return fd;
  } catch (error) {
    if (getErrorCode(error) === "EEXIST" && tryRemoveStaleLock(lockPath, payload.hostname)) {
      const fd = openSync(lockPath, "wx");
      writeFileSync(fd, JSON.stringify(payload, null, 2));
      return fd;
    }

    if (getErrorCode(error) === "EEXIST") {
      const existing = readLockPayload(lockPath);
      const detail = existing
        ? `existing instance=${existing.instanceId} pid=${existing.pid} hostname=${existing.hostname} startedAt=${new Date(existing.startedAt).toISOString()}`
        : "existing lock file present";

      throw new Error(
        `Another dog-doing server instance is already active for port ${payload.port}. lock=${lockPath}. ${detail}.`,
      );
    }

    throw error;
  }
}

export function acquireServerRuntimeInfo(port: number): ServerRuntimeInfo {
  const currentHostname = hostname();
  const startedAt = Date.now();
  const instanceId = `${currentHostname}-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
  const lockDisabled = Bun.env.DOG_DOING_SKIP_SINGLETON_LOCK === "1";

  const info: ServerRuntimeInfo = {
    hostname: currentHostname,
    instanceId,
    lockPath: null,
    pid: process.pid,
    port,
    startedAt,
  };

  if (lockDisabled) {
    return info;
  }

  const lockPath = resolve(
    Bun.env.DOG_DOING_SINGLETON_LOCK_PATH ?? `/tmp/dog-doing-server-${port}.lock`,
  );
  const fd = createLockFile(lockPath, {
    hostname: currentHostname,
    instanceId,
    pid: process.pid,
    port,
    startedAt,
  });
  let released = false;

  const release = () => {
    if (released) {
      return;
    }

    released = true;

    try {
      closeSync(fd);
    } catch {
      // Ignore close errors during shutdown.
    }

    try {
      rmSync(lockPath, { force: true });
    } catch {
      // Ignore cleanup errors during shutdown.
    }
  };

  process.once("exit", release);
  process.once("SIGINT", () => {
    release();
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    release();
    process.exit(0);
  });

  return {
    ...info,
    lockPath,
  };
}
