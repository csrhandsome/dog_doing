import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const SMALL_SIZE = 120;
const SCALE = 4;
const OUTPUT_SIZE = SMALL_SIZE * SCALE;
const OUTLINE = hex(0x090807);

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

function mix(start, end, alpha) {
  return start + (end - start) * alpha;
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

function hash(x, y, seed) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 93.7123) * 43758.5453;
  return value - Math.floor(value);
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
      (pixel.g * sourceAlpha +
        this.data[index + 1] * targetAlpha * (1 - sourceAlpha)) /
        outAlpha,
    );
    this.data[index + 2] = Math.round(
      (pixel.b * sourceAlpha +
        this.data[index + 2] * targetAlpha * (1 - sourceAlpha)) /
        outAlpha,
    );
    this.data[index + 3] = Math.round(outAlpha * 255);
  }

  fillRect(x, y, width, height, pixel) {
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
        this.blendPixel(column, row, pixel);
      }
    }
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

function applyGlow(surface, glowColor, radius = 5) {
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

function addWood(surface, start, end, width, base, seed) {
  const shade = darken(base, 0.22);
  const highlight = lighten(base, 0.14);

  surface.strokeSegment(start.x, start.y, end.x, end.y, width, base);
  surface.strokeSegment(start.x - 1, start.y - 1, end.x - 1, end.y - 1, width * 0.2, shade);
  surface.strokeSegment(start.x + 1, start.y + 1, end.x + 1, end.y + 1, width * 0.16, highlight);

  const minX = Math.floor(Math.min(start.x, end.x) - width);
  const maxX = Math.ceil(Math.max(start.x, end.x) + width);
  const minY = Math.floor(Math.min(start.y, end.y) - width);
  const maxY = Math.ceil(Math.max(start.y, end.y) + width);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (distanceToSegment(x + 0.5, y + 0.5, start.x, start.y, end.x, end.y) > width / 2) {
        continue;
      }

      const grain = hash(x, y, seed);

      if (grain > 0.84) {
        surface.blendPixel(x, y, darken(base, 0.32));
      } else if (grain < 0.16) {
        surface.blendPixel(x, y, lighten(base, 0.08));
      }
    }
  }
}

function addBand(surface, x, y, width, height, base) {
  surface.fillRect(x, y, width, height, base);
  surface.fillRect(x, y, width, 1, lighten(base, 0.22));
  surface.fillRect(x, y + height - 1, width, 1, darken(base, 0.24));
}

function addBevelRect(surface, x, y, width, height, base) {
  const shade = darken(base, 0.26);
  const highlight = lighten(base, 0.12);

  surface.fillRect(x, y, width, height, base);
  surface.fillRect(x, y, width, 1, highlight);
  surface.fillRect(x, y, 1, height, shade);
  surface.fillRect(x, y + height - 1, width, 1, shade);
  surface.fillRect(x + width - 1, y, 1, height, darken(base, 0.34));
}

function addGripWrap(surface, start, end, width, wrap, count) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / length;
  const normalY = dx / length;

  for (let index = 1; index <= count; index += 1) {
    const alpha = index / (count + 1);
    const x = mix(start.x, end.x, alpha);
    const y = mix(start.y, end.y, alpha);
    surface.strokeSegment(
      x - normalX * (width * 0.48),
      y - normalY * (width * 0.48),
      x + normalX * (width * 0.48),
      y + normalY * (width * 0.48),
      2,
      wrap,
    );
  }
}

function drawKnife(surface) {
  const leather = hex(0x4d3728);
  const copper = hex(0xa86b45);
  const steel = hex(0x748092);

  addWood(surface, { x: 18, y: 95 }, { x: 43, y: 72 }, 13, leather, 2);
  addGripWrap(surface, { x: 20, y: 93 }, { x: 40, y: 75 }, 12, copper, 5);
  surface.fillEllipse(13, 100, 6, 5, lighten(copper, 0.06));
  surface.fillPolygon(
    [
      { x: 35, y: 74 },
      { x: 49, y: 61 },
      { x: 54, y: 66 },
      { x: 39, y: 80 },
    ],
    copper,
  );
  surface.fillPolygon(
    [
      { x: 46, y: 65 },
      { x: 83, y: 25 },
      { x: 97, y: 36 },
      { x: 58, y: 77 },
    ],
    steel,
  );
  surface.fillPolygon(
    [
      { x: 49, y: 67 },
      { x: 85, y: 29 },
      { x: 92, y: 34 },
      { x: 58, y: 71 },
    ],
    lighten(steel, 0.2),
  );
  surface.fillPolygon(
    [
      { x: 46, y: 66 },
      { x: 83, y: 25 },
      { x: 86, y: 31 },
      { x: 52, y: 69 },
    ],
    darken(steel, 0.28),
  );
  surface.strokeSegment(56, 67, 87, 34, 2, lighten(steel, 0.46));
  surface.strokeSegment(59, 73, 79, 50, 1, darken(steel, 0.4));
}

function drawBow(surface) {
  const wood = hex(0x7e5334);
  const limb = hex(0x8e332f);
  const iron = hex(0x31343c);
  const arrowWood = hex(0xaa7c48);
  const feather = hex(0xd6d2ca);

  addWood(surface, { x: 67, y: 68 }, { x: 65, y: 51 }, 9, wood, 6);
  surface.strokeSegment(66, 52, 82, 20, 8, limb);
  surface.strokeSegment(82, 20, 88, 10, 6, limb);
  surface.strokeSegment(66, 67, 44, 103, 8, limb);
  surface.strokeSegment(44, 103, 38, 112, 6, limb);
  surface.strokeSegment(86, 10, 72, 50, 1.5, feather);
  surface.strokeSegment(72, 50, 40, 110, 1.5, feather);
  surface.strokeSegment(49, 90, 83, 42, 4, arrowWood);
  surface.fillPolygon(
    [
      { x: 83, y: 42 },
      { x: 95, y: 38 },
      { x: 89, y: 50 },
    ],
    iron,
  );
  surface.fillPolygon(
    [
      { x: 51, y: 87 },
      { x: 42, y: 91 },
      { x: 47, y: 95 },
    ],
    feather,
  );
  surface.fillPolygon(
    [
      { x: 53, y: 84 },
      { x: 45, y: 88 },
      { x: 49, y: 82 },
    ],
    lighten(feather, 0.14),
  );
  surface.fillEllipse(66, 58, 3, 4, lighten(wood, 0.18));
}

function drawGun(surface) {
  const wood = hex(0x80573a);
  const steel = hex(0x5d616d);
  const steelDeep = hex(0x3b404a);

  surface.fillPolygon(
    [
      { x: 9, y: 60 },
      { x: 30, y: 46 },
      { x: 46, y: 46 },
      { x: 44, y: 69 },
      { x: 21, y: 76 },
    ],
    wood,
  );
  surface.fillPolygon(
    [
      { x: 14, y: 60 },
      { x: 31, y: 50 },
      { x: 39, y: 50 },
      { x: 38, y: 64 },
      { x: 20, y: 69 },
    ],
    lighten(wood, 0.1),
  );
  addBevelRect(surface, 37, 42, 34, 18, steel);
  addBevelRect(surface, 71, 44, 20, 13, wood);
  addBevelRect(surface, 90, 45, 19, 8, steel);
  addBevelRect(surface, 107, 46, 6, 5, steelDeep);
  surface.fillRect(101, 40, 3, 8, steelDeep);
  surface.fillRect(108, 42, 3, 13, steelDeep);
  surface.fillRect(111, 47, 5, 3, lighten(steelDeep, 0.2));
  surface.fillPolygon(
    [
      { x: 55, y: 60 },
      { x: 65, y: 64 },
      { x: 70, y: 92 },
      { x: 63, y: 104 },
      { x: 53, y: 84 },
    ],
    steelDeep,
  );
  surface.fillPolygon(
    [
      { x: 43, y: 59 },
      { x: 51, y: 59 },
      { x: 55, y: 82 },
      { x: 48, y: 89 },
      { x: 41, y: 75 },
    ],
    wood,
  );
  surface.fillRect(42, 48, 23, 3, lighten(steel, 0.2));
  surface.fillRect(75, 48, 27, 2, lighten(steel, 0.18));
  surface.fillEllipse(50, 53, 1.5, 1.5, lighten(steel, 0.36));
  surface.fillEllipse(61, 54, 1.5, 1.5, lighten(steel, 0.36));
}

function drawSpear(surface) {
  const wood = hex(0x7d5638);
  const steel = hex(0x7a869b);
  const brass = hex(0xc59a52);

  addWood(surface, { x: 16, y: 100 }, { x: 76, y: 40 }, 7, wood, 10);
  addBand(surface, 27, 84, 8, 4, brass);
  addBand(surface, 39, 72, 8, 4, brass);
  surface.fillPolygon(
    [
      { x: 79, y: 43 },
      { x: 104, y: 16 },
      { x: 110, y: 23 },
      { x: 85, y: 55 },
    ],
    steel,
  );
  surface.fillPolygon(
    [
      { x: 82, y: 43 },
      { x: 103, y: 20 },
      { x: 106, y: 23 },
      { x: 86, y: 50 },
    ],
    lighten(steel, 0.22),
  );
  surface.fillPolygon(
    [
      { x: 78, y: 44 },
      { x: 103, y: 16 },
      { x: 104, y: 22 },
      { x: 82, y: 53 },
    ],
    darken(steel, 0.28),
  );
  surface.fillPolygon(
    [
      { x: 67, y: 56 },
      { x: 78, y: 47 },
      { x: 84, y: 54 },
      { x: 75, y: 64 },
    ],
    darken(steel, 0.18),
  );
  surface.strokeSegment(82, 45, 103, 21, 2, lighten(steel, 0.44));
  surface.fillPolygon(
    [
      { x: 10, y: 104 },
      { x: 18, y: 97 },
      { x: 21, y: 100 },
      { x: 14, y: 109 },
    ],
    brass,
  );
}

function drawHammer(surface) {
  const wood = hex(0x785038);
  const steel = hex(0x717482);
  const brass = hex(0xc79b49);

  addWood(surface, { x: 33, y: 104 }, { x: 58, y: 51 }, 9, wood, 13);
  addBand(surface, 46, 71, 9, 4, brass);
  surface.fillPolygon(
    [
      { x: 42, y: 31 },
      { x: 71, y: 31 },
      { x: 79, y: 39 },
      { x: 79, y: 55 },
      { x: 70, y: 63 },
      { x: 42, y: 63 },
      { x: 35, y: 52 },
      { x: 35, y: 40 },
    ],
    steel,
  );
  surface.fillPolygon(
    [
      { x: 47, y: 36 },
      { x: 70, y: 36 },
      { x: 73, y: 40 },
      { x: 73, y: 55 },
      { x: 68, y: 58 },
      { x: 47, y: 58 },
      { x: 42, y: 51 },
      { x: 42, y: 41 },
    ],
    lighten(steel, 0.16),
  );
  surface.fillPolygon(
    [
      { x: 35, y: 41 },
      { x: 24, y: 48 },
      { x: 35, y: 55 },
      { x: 41, y: 48 },
    ],
    darken(steel, 0.34),
  );
  surface.fillRect(42, 32, 4, 31, brass);
  surface.fillRect(68, 32, 4, 31, brass);
  surface.fillRect(49, 39, 17, 3, lighten(steel, 0.28));
  surface.fillEllipse(31, 106, 4, 4, brass);
}

function drawStaff(surface) {
  const wood = hex(0x6f4a30);
  const gold = hex(0xcaa35a);
  const crystal = hex(0x69cbff);
  const crystalDeep = hex(0x2c79b8);
  const ribbon = hex(0xdb5875);

  addWood(surface, { x: 24, y: 103 }, { x: 74, y: 42 }, 8, wood, 17);
  addBand(surface, 49, 70, 8, 4, gold);
  surface.strokeSegment(69, 50, 78, 39, 3, gold);
  surface.strokeSegment(78, 39, 88, 42, 3, gold);
  surface.strokeSegment(78, 39, 82, 28, 3, gold);
  surface.strokeSegment(78, 39, 69, 30, 3, gold);
  surface.fillEllipse(80, 38, 9, 9, crystalDeep);
  surface.fillEllipse(80, 38, 7, 7, crystal);
  surface.fillEllipse(77, 35, 2.5, 2.5, lighten(crystal, 0.38));
  surface.strokeSegment(22, 104, 15, 114, 2, ribbon);
  surface.strokeSegment(25, 100, 16, 108, 2, lighten(ribbon, 0.18));
}

function drawFireStaff(surface) {
  const wood = hex(0x6a432d);
  const gold = hex(0xcf8f4b);
  const ember = hex(0xff6338);
  const emberCore = hex(0xffc45e);
  const emberDeep = hex(0x8d2316);
  const ribbon = hex(0xb63a34);

  addWood(surface, { x: 24, y: 103 }, { x: 74, y: 42 }, 8, wood, 23);
  addBand(surface, 49, 70, 8, 4, gold);
  surface.strokeSegment(69, 50, 79, 39, 3, gold);
  surface.strokeSegment(79, 39, 89, 44, 3, gold);
  surface.strokeSegment(79, 39, 84, 27, 3, gold);
  surface.strokeSegment(79, 39, 69, 28, 3, gold);
  surface.fillEllipse(81, 38, 9, 9, emberDeep);
  surface.fillEllipse(81, 38, 7, 7, ember);
  surface.fillEllipse(81, 36, 4.5, 4.5, emberCore);
  surface.fillEllipse(78, 34, 2.5, 2.5, lighten(emberCore, 0.24));
  surface.fillEllipse(90, 31, 1.5, 1.5, ember);
  surface.fillEllipse(86, 22, 1.5, 1.5, emberCore);
  surface.fillEllipse(70, 22, 1.5, 1.5, ember);
  surface.strokeSegment(22, 104, 15, 114, 2, ribbon);
  surface.strokeSegment(25, 100, 16, 108, 2, lighten(ribbon, 0.18));
}

function drawShield(surface) {
  const steel = hex(0x6f7584);
  const brass = hex(0xc4934a);
  const red = hex(0xb6483b);
  const redDeep = hex(0x863128);
  const ivory = hex(0xe4d7ba);

  surface.fillPolygon(
    [
      { x: 60, y: 14 },
      { x: 82, y: 25 },
      { x: 92, y: 52 },
      { x: 79, y: 88 },
      { x: 60, y: 108 },
      { x: 41, y: 88 },
      { x: 28, y: 52 },
      { x: 38, y: 25 },
    ],
    steel,
  );
  surface.fillPolygon(
    [
      { x: 60, y: 20 },
      { x: 77, y: 29 },
      { x: 85, y: 52 },
      { x: 74, y: 83 },
      { x: 60, y: 98 },
      { x: 46, y: 83 },
      { x: 35, y: 52 },
      { x: 43, y: 29 },
    ],
    red,
  );
  surface.fillPolygon(
    [
      { x: 60, y: 20 },
      { x: 68, y: 25 },
      { x: 76, y: 52 },
      { x: 68, y: 82 },
      { x: 60, y: 92 },
    ],
    lighten(red, 0.14),
  );
  surface.fillPolygon(
    [
      { x: 60, y: 98 },
      { x: 74, y: 83 },
      { x: 85, y: 52 },
      { x: 77, y: 29 },
      { x: 60, y: 20 },
      { x: 60, y: 98 },
    ],
    withAlpha(ivory, 52),
  );
  surface.fillRect(56, 28, 8, 52, ivory);
  surface.fillRect(39, 48, 42, 8, ivory);
  surface.fillEllipse(60, 52, 9, 9, brass);
  surface.fillEllipse(60, 52, 5, 5, lighten(brass, 0.22));
  surface.fillEllipse(57, 49, 2, 2, lighten(ivory, 0.28));
  surface.strokeSegment(45, 37, 75, 67, 3, withAlpha(redDeep, 110));
  surface.strokeSegment(75, 37, 45, 67, 3, withAlpha(redDeep, 88));
  surface.strokeSegment(37, 52, 84, 52, 1, withAlpha(lighten(ivory, 0.16), 180));
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

function renderWeapon(draw, glow) {
  const surface = new PixelSurface(SMALL_SIZE, SMALL_SIZE);
  draw(surface);
  const outlined = createOutline(surface);
  const glowing = applyGlow(outlined, glow);
  return scaleNearest(glowing, SCALE);
}

const weapons = [
  { name: "knife", draw: drawKnife, glow: hex(0xf0eddf, 88) },
  { name: "arow", draw: drawBow, glow: hex(0xf2d9b8, 84) },
  { name: "gun", draw: drawGun, glow: hex(0xe8ecef, 78) },
  { name: "spear", draw: drawSpear, glow: hex(0xe9f0fb, 84) },
  { name: "hammer", draw: drawHammer, glow: hex(0xf4dfb7, 84) },
  { name: "staff", draw: drawStaff, glow: hex(0xbfe9ff, 96) },
  { name: "fire-staff", draw: drawFireStaff, glow: hex(0xff915f, 110) },
  { name: "shield", draw: drawShield, glow: hex(0xf7e6c7, 90) },
];

const requestedWeapons = new Set(process.argv.slice(2));

for (const weapon of weapons) {
  if (requestedWeapons.size > 0 && !requestedWeapons.has(weapon.name)) {
    continue;
  }

  const output = renderWeapon(weapon.draw, weapon.glow);
  const target = resolve("client/src/assets/weapon", `${weapon.name}.png`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, encodePng(output));
  console.log(`generated ${weapon.name}.png ${OUTPUT_SIZE}x${OUTPUT_SIZE}`);
}
