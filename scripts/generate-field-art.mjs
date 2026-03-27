import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const SMALL_SIZE = 120;
const SCALE = 4;
const OUTPUT_SIZE = SMALL_SIZE * SCALE;
const OUTLINE = hex(0x0b0a08);

function hex(value, alpha = 255) {
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
    a: alpha,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function withAlpha(pixel, alpha) {
  return { ...pixel, a: alpha };
}

function darken(pixel, amount) {
  return hex(
    ((clamp(Math.round(pixel.r * (1 - amount)), 0, 255) & 0xff) << 16) |
      ((clamp(Math.round(pixel.g * (1 - amount)), 0, 255) & 0xff) << 8) |
      (clamp(Math.round(pixel.b * (1 - amount)), 0, 255) & 0xff),
    pixel.a,
  );
}

function lighten(pixel, amount) {
  return hex(
    ((clamp(Math.round(pixel.r + (255 - pixel.r) * amount), 0, 255) & 0xff) << 16) |
      ((clamp(Math.round(pixel.g + (255 - pixel.g) * amount), 0, 255) & 0xff) << 8) |
      (clamp(Math.round(pixel.b + (255 - pixel.b) * amount), 0, 255) & 0xff),
    pixel.a,
  );
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const projection = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSquared, 0, 1);
  const closestX = x1 + dx * projection;
  const closestY = y1 + dy * projection;

  return Math.hypot(px - closestX, py - closestY);
}

function pointInPolygon(x, y, points) {
  let inside = false;

  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const current = points[index];
    const last = points[previous];
    const intersects =
      current.y > y !== last.y > y &&
      x < ((last.x - current.x) * (y - current.y)) / (last.y - current.y) + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function regularPolygon(cx, cy, radius, sides, rotation = -Math.PI / 2) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (Math.PI * 2 * index) / sides;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });
}

class PixelSurface {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  clone() {
    const clone = new PixelSurface(this.width, this.height);
    clone.data.set(this.data);
    return clone;
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  index(x, y) {
    return (y * this.width + x) * 4;
  }

  getPixel(x, y) {
    if (!this.inBounds(x, y)) {
      return hex(0x000000, 0);
    }

    const index = this.index(x, y);
    return {
      r: this.data[index],
      g: this.data[index + 1],
      b: this.data[index + 2],
      a: this.data[index + 3],
    };
  }

  setPixel(x, y, pixel) {
    if (!this.inBounds(x, y)) {
      return;
    }

    const index = this.index(x, y);
    this.data[index] = pixel.r;
    this.data[index + 1] = pixel.g;
    this.data[index + 2] = pixel.b;
    this.data[index + 3] = pixel.a;
  }

  blendPixel(x, y, pixel) {
    if (!this.inBounds(x, y) || pixel.a === 0) {
      return;
    }

    const index = this.index(x, y);
    const sourceAlpha = pixel.a / 255;
    const targetAlpha = this.data[index + 3] / 255;
    const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

    if (outAlpha === 0) {
      return;
    }

    this.data[index] = Math.round(
      (pixel.r * sourceAlpha + this.data[index] * targetAlpha * (1 - sourceAlpha)) /
        outAlpha,
    );
    this.data[index + 1] = Math.round(
      (pixel.g * sourceAlpha + this.data[index + 1] * targetAlpha * (1 - sourceAlpha)) /
        outAlpha,
    );
    this.data[index + 2] = Math.round(
      (pixel.b * sourceAlpha + this.data[index + 2] * targetAlpha * (1 - sourceAlpha)) /
        outAlpha,
    );
    this.data[index + 3] = Math.round(outAlpha * 255);
  }

  fillEllipse(cx, cy, rx, ry, pixel) {
    const minX = Math.floor(cx - rx);
    const maxX = Math.ceil(cx + rx);
    const minY = Math.floor(cy - ry);
    const maxY = Math.ceil(cy + ry);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;

        if (dx * dx + dy * dy <= 1) {
          this.blendPixel(x, y, pixel);
        }
      }
    }
  }

  fillPolygon(points, pixel) {
    const minX = Math.floor(Math.min(...points.map((point) => point.x)));
    const maxX = Math.ceil(Math.max(...points.map((point) => point.x)));
    const minY = Math.floor(Math.min(...points.map((point) => point.y)));
    const maxY = Math.ceil(Math.max(...points.map((point) => point.y)));

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (pointInPolygon(x + 0.5, y + 0.5, points)) {
          this.blendPixel(x, y, pixel);
        }
      }
    }
  }

  strokeSegment(x1, y1, x2, y2, thickness, pixel) {
    const minX = Math.floor(Math.min(x1, x2) - thickness);
    const maxX = Math.ceil(Math.max(x1, x2) + thickness);
    const minY = Math.floor(Math.min(y1, y2) - thickness);
    const maxY = Math.ceil(Math.max(y1, y2) + thickness);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (distanceToSegment(x + 0.5, y + 0.5, x1, y1, x2, y2) <= thickness / 2) {
          this.blendPixel(x, y, pixel);
        }
      }
    }
  }
}

function createOutline(surface) {
  const clone = surface.clone();

  for (let y = 0; y < surface.height; y += 1) {
    for (let x = 0; x < surface.width; x += 1) {
      if (surface.getPixel(x, y).a > 0) {
        continue;
      }

      let shouldOutline = false;

      for (let offsetY = -1; offsetY <= 1 && !shouldOutline; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) {
            continue;
          }

          if (surface.getPixel(x + offsetX, y + offsetY).a > 0) {
            shouldOutline = true;
            break;
          }
        }
      }

      if (shouldOutline) {
        clone.setPixel(x, y, OUTLINE);
      }
    }
  }

  return clone;
}

function applyGlow(surface, glowColor, radius = 6) {
  const alphaMap = new Float32Array(surface.width * surface.height);

  for (let y = 0; y < surface.height; y += 1) {
    for (let x = 0; x < surface.width; x += 1) {
      if (surface.getPixel(x, y).a === 0) {
        continue;
      }

      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const distance = Math.hypot(offsetX, offsetY);

          if (distance > radius) {
            continue;
          }

          const targetX = x + offsetX;
          const targetY = y + offsetY;

          if (!surface.inBounds(targetX, targetY) || surface.getPixel(targetX, targetY).a > 0) {
            continue;
          }

          const alpha = Math.pow(1 - distance / radius, 2) * (glowColor.a / 255);
          const index = targetY * surface.width + targetX;
          alphaMap[index] = Math.max(alphaMap[index], alpha);
        }
      }
    }
  }

  const clone = surface.clone();

  for (let y = 0; y < clone.height; y += 1) {
    for (let x = 0; x < clone.width; x += 1) {
      const alpha = alphaMap[y * clone.width + x];

      if (alpha > 0) {
        clone.blendPixel(x, y, withAlpha(glowColor, Math.round(alpha * 255)));
      }
    }
  }

  return clone;
}

function scaleNearest(surface, scale) {
  const scaled = new PixelSurface(surface.width * scale, surface.height * scale);

  for (let y = 0; y < surface.height; y += 1) {
    for (let x = 0; x < surface.width; x += 1) {
      const pixel = surface.getPixel(x, y);

      if (pixel.a === 0) {
        continue;
      }

      for (let offsetY = 0; offsetY < scale; offsetY += 1) {
        for (let offsetX = 0; offsetX < scale; offsetX += 1) {
          scaled.setPixel(x * scale + offsetX, y * scale + offsetY, pixel);
        }
      }
    }
  }

  return scaled;
}

function encodePng(surface) {
  const rows = [];

  for (let y = 0; y < surface.height; y += 1) {
    const row = Buffer.alloc(surface.width * 4 + 1);
    row[0] = 0;

    for (let x = 0; x < surface.width; x += 1) {
      const source = surface.index(x, y);
      const target = 1 + x * 4;
      row[target] = surface.data[source];
      row[target + 1] = surface.data[source + 1];
      row[target + 2] = surface.data[source + 2];
      row[target + 3] = surface.data[source + 3];
    }

    rows.push(row);
  }

  const compressed = deflateSync(Buffer.concat(rows), { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header(surface.width, surface.height)),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function header(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  return buffer;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];

    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function drawSoccerBall(surface) {
  const leather = hex(0xf7f5ee);
  const shadow = hex(0xd5d0c2);
  const patch = hex(0x2b2a28);
  const seam = withAlpha(hex(0x151412), 220);
  const highlight = withAlpha(hex(0xffffff), 118);

  surface.fillEllipse(60, 61, 35, 35, shadow);
  surface.fillEllipse(60, 58, 35, 34, leather);
  surface.fillEllipse(52, 45, 15, 10, highlight);
  surface.fillEllipse(68, 73, 17, 11, withAlpha(shadow, 110));

  surface.fillPolygon(regularPolygon(60, 58, 10, 5), patch);
  surface.fillPolygon(regularPolygon(59, 58, 7.4, 5), lighten(patch, 0.1));

  const orbitPatches = [
    { x: 44, y: 46, radius: 8.2, rotation: -0.2 },
    { x: 76, y: 47, radius: 8.4, rotation: 0.22 },
    { x: 39, y: 69, radius: 8.8, rotation: 0.1 },
    { x: 81, y: 70, radius: 8.6, rotation: -0.08 },
    { x: 60, y: 82, radius: 8.4, rotation: Math.PI / 5 },
  ];

  for (const orbit of orbitPatches) {
    const shape = regularPolygon(orbit.x, orbit.y, orbit.radius, 5, orbit.rotation);
    surface.fillPolygon(shape, patch);
    surface.fillPolygon(
      regularPolygon(orbit.x - 0.6, orbit.y - 0.4, orbit.radius * 0.7, 5, orbit.rotation),
      lighten(patch, 0.12),
    );
  }

  const seams = [
    [48, 51, 53, 56],
    [67, 56, 72, 52],
    [53, 64, 45, 66],
    [68, 64, 76, 66],
    [58, 68, 60, 76],
    [51, 48, 60, 50],
    [61, 50, 69, 48],
  ];

  for (const [x1, y1, x2, y2] of seams) {
    surface.strokeSegment(x1, y1, x2, y2, 2.4, seam);
  }

  surface.strokeSegment(45, 40, 36, 34, 1.8, withAlpha(lighten(leather, 0.1), 180));
  surface.strokeSegment(75, 79, 82, 85, 2.2, withAlpha(darken(shadow, 0.2), 144));
}

function drawGoal(surface) {
  const ivory = hex(0xf2efe4);
  const steel = hex(0xd7dce0);
  const net = withAlpha(hex(0xa8b7c8), 180);
  const netShadow = withAlpha(hex(0x5f7286), 100);
  const turfShadow = withAlpha(hex(0x43602e), 86);

  surface.fillPolygon(
    [
      { x: 18, y: 21 },
      { x: 75, y: 15 },
      { x: 101, y: 32 },
      { x: 102, y: 91 },
      { x: 76, y: 103 },
      { x: 18, y: 96 },
    ],
    turfShadow,
  );

  surface.strokeSegment(25, 23, 82, 20, 6, steel);
  surface.strokeSegment(26, 95, 82, 98, 6, steel);
  surface.strokeSegment(26, 24, 26, 94, 6, steel);
  surface.strokeSegment(83, 20, 99, 31, 6, steel);
  surface.strokeSegment(83, 98, 99, 88, 6, steel);
  surface.strokeSegment(99, 31, 99, 88, 6, steel);

  surface.strokeSegment(26, 24, 82, 20, 2, ivory);
  surface.strokeSegment(26, 95, 82, 98, 2, ivory);
  surface.strokeSegment(26, 24, 26, 94, 2, ivory);
  surface.strokeSegment(83, 20, 99, 31, 2, ivory);
  surface.strokeSegment(83, 98, 99, 88, 2, ivory);
  surface.strokeSegment(99, 31, 99, 88, 2, ivory);

  for (let index = 0; index <= 5; index += 1) {
    const alpha = index / 5;
    const startY = 24 + alpha * 70;
    const endY = 30 + alpha * 58;
    surface.strokeSegment(28, startY, 97, endY, 1.2, net);
    surface.strokeSegment(28, startY + 1.8, 97, endY + 1.8, 1, netShadow);
  }

  for (let index = 0; index <= 5; index += 1) {
    const alpha = index / 5;
    const topX = 28 + alpha * 54;
    const bottomX = 28 + alpha * 54;
    const backX = 83 + alpha * 16;
    surface.strokeSegment(topX, 24, backX, 31, 1.2, net);
    surface.strokeSegment(bottomX, 95, backX, 88, 1.2, net);
  }

  surface.strokeSegment(77, 22, 94, 33, 1.4, withAlpha(ivory, 220));
  surface.strokeSegment(77, 96, 94, 86, 1.4, withAlpha(ivory, 220));
}

function renderArtifact(draw, glow) {
  const surface = new PixelSurface(SMALL_SIZE, SMALL_SIZE);
  draw(surface);
  const outlined = createOutline(surface);
  const glowing = applyGlow(outlined, glow);
  return scaleNearest(glowing, SCALE);
}

const artifacts = [
  {
    draw: drawSoccerBall,
    glow: hex(0xf5f0df, 108),
    name: "soccer-ball",
  },
  {
    draw: drawGoal,
    glow: hex(0xf7f4e8, 90),
    name: "goal",
  },
];

for (const artifact of artifacts) {
  const output = renderArtifact(artifact.draw, artifact.glow);
  const target = resolve("client/src/assets/field", `${artifact.name}.png`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, encodePng(output));
  console.log(`generated ${artifact.name}.png ${OUTPUT_SIZE}x${OUTPUT_SIZE}`);
}
