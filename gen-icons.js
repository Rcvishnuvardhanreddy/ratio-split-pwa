const fs = require('zlib');
const zlib = require('zlib');
const fspath = require('path');
const fsmod = require('fs');

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size, drawFn) {
  const width = size, height = size;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  const px = (x, y, r, g, b, a) => {
    const rowStart = y * (width * 4 + 1) + 1;
    const idx = rowStart + x * 4;
    raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b; raw[idx + 3] = a;
  };
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      px(x, y, r, g, b, a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function draw(x, y, w, h) {
  const cx = w / 2, cy = h / 2;
  const bg = [37, 99, 235, 255]; // blue-600
  const bar = [255, 255, 255, 255];

  // rounded-square background
  const r = w * 0.22;
  const inCorner = (px, py, ccx, ccy) => (px - ccx) ** 2 + (py - ccy) ** 2 < r * r;
  let inside = true;
  if (x < r && y < r && !inCorner(x, y, r, r)) inside = false;
  if (x > w - r && y < r && !inCorner(x, y, w - r, r)) inside = false;
  if (x < r && y > h - r && !inCorner(x, y, r, h - r)) inside = false;
  if (x > w - r && y > h - r && !inCorner(x, y, w - r, h - r)) inside = false;
  if (!inside) return [0, 0, 0, 0];

  // three ascending bars (ratio/chart motif), centered
  const barW = w * 0.13;
  const gap = w * 0.08;
  const totalW = barW * 3 + gap * 2;
  const startX = cx - totalW / 2;
  const baseY = h * 0.72;
  const heights = [h * 0.22, h * 0.36, h * 0.50];
  for (let i = 0; i < 3; i++) {
    const bx0 = startX + i * (barW + gap);
    const bx1 = bx0 + barW;
    const by0 = baseY - heights[i];
    const by1 = baseY;
    if (x >= bx0 && x < bx1 && y >= by0 && y < by1) return bar;
  }
  return bg;
}

const sizes = [192, 512];
for (const s of sizes) {
  const png = makePng(s, draw);
  const out = fspath.join(__dirname, 'icons', `icon-${s}.png`);
  fsmod.writeFileSync(out, png);
  console.log('wrote', out, png.length, 'bytes');
}
