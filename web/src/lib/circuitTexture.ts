import * as THREE from 'three';

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export function createCircuitTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const random = seededRandom(24);
  const palette = ['#4fe3ff', '#6f8cff', '#9a7bff'];

  ctx.fillStyle = '#03070e';
  ctx.fillRect(0, 0, size, size);

  const glow = ctx.createRadialGradient(size / 2, size / 2, size * 0.04, size / 2, size / 2, size * 0.75);
  glow.addColorStop(0, '#081a2a');
  glow.addColorStop(0.55, '#050d18');
  glow.addColorStop(1, '#020509');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(79, 227, 255, 0.09)';
  for (let x = 24; x < size; x += 32) {
    for (let y = 24; y < size; y += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const dieSize = size * 0.36;
  const dieX = (size - dieSize) / 2;
  const dieY = (size - dieSize) / 2;

  const insideDie = (x: number, y: number) =>
    x > dieX - 18 && x < dieX + dieSize + 18 && y > dieY - 18 && y < dieY + dieSize + 18;

  for (let trace = 0; trace < 64; trace += 1) {
    const color = palette[Math.floor(random() * palette.length)];
    const side = Math.floor(random() * 4);
    let x = 0;
    let y = 0;
    let targetX = dieX + random() * dieSize;
    let targetY = dieY + random() * dieSize;

    if (side === 0) {
      x = random() * size;
      y = 14;
    } else if (side === 1) {
      x = size - 14;
      y = random() * size;
    } else if (side === 2) {
      x = random() * size;
      y = size - 14;
    } else {
      x = 14;
      y = random() * size;
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);

    const steps = 5 + Math.floor(random() * 4);
    for (let step = 0; step < steps; step += 1) {
      const moveX = (targetX - x) * (0.18 + random() * 0.22);
      const moveY = (targetY - y) * (0.18 + random() * 0.22);
      if (Math.abs(moveX) > Math.abs(moveY)) {
        x += moveX;
        y += random() > 0.5 ? moveY : 0;
      } else {
        y += moveY;
        x += random() > 0.5 ? moveX : 0;
      }
      if (insideDie(x, y)) break;
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.32 + random() * 0.34;
    ctx.lineWidth = 1.2 + random() * 2.1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(x, y, 2 + random() * 2.4, 0, Math.PI * 2);
    ctx.fill();

    if (random() > 0.55) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, 7 + random() * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = 'rgba(79, 227, 255, 0.55)';
  ctx.shadowBlur = 30;
  roundRect(ctx, dieX, dieY, dieSize, dieSize, 26);
  ctx.fillStyle = '#061320';
  ctx.fill();
  ctx.strokeStyle = 'rgba(79, 227, 255, 0.5)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#4fe3ff';
  ctx.lineWidth = 1;
  const cell = dieSize / 16;
  for (let i = 1; i < 16; i += 1) {
    ctx.beginPath();
    ctx.moveTo(dieX + i * cell, dieY + 8);
    ctx.lineTo(dieX + i * cell, dieY + dieSize - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dieX + 8, dieY + i * cell);
    ctx.lineTo(dieX + dieSize - 8, dieY + i * cell);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = 'rgba(154, 123, 255, 0.6)';
  ctx.lineWidth = 2;
  roundRect(ctx, dieX + dieSize * 0.22, dieY + dieSize * 0.22, dieSize * 0.56, dieSize * 0.56, 12);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(162, 231, 255, 0.6)';
  ctx.font = '500 22px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SPACEDOCK · SD-24', size / 2, dieY + dieSize + 58);
  ctx.globalAlpha = 0.4;
  ctx.font = '400 16px ui-monospace, monospace';
  ctx.fillText('125.0 °C · ESS BURN-IN', size / 2, dieY + dieSize + 86);
  ctx.restore();

  for (const [cornerX, cornerY] of [
    [40, 40],
    [size - 40, 40],
    [40, size - 40],
    [size - 40, size - 40],
  ]) {
    ctx.strokeStyle = 'rgba(79, 227, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cornerX, cornerY, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
