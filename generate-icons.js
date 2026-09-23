import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

// Minimal pure-Node PNG encoder without external dependencies
function createPNG(width, height, getPixel) {
  // RGBA buffer: each scanline has 1 filter byte (0) + width * 4 bytes
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // Color type 6 (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressedData);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Pixel generator for BatBlack icon
function batPixelGenerator(isMaskable) {
  return (x, y, w, h) => {
    const nx = x / w;
    const ny = y / h;

    // Dark background #202124
    let r = 32, g = 33, b = 36, a = 255;

    // Center bat sprite coordinates
    // Bat grid: 20 columns, 16 rows
    // Scale safe zone: if maskable, shrink bat to 60% of canvas, else 70%
    const scale = isMaskable ? 0.55 : 0.65;
    const cx = 0.5, cy = 0.5;
    const gx = (nx - cx) / scale + 0.5;
    const gy = (ny - cy) / scale + 0.5;

    if (gx >= 0 && gx <= 1 && gy >= 0 && gy <= 1) {
      const col = Math.floor(gx * 20);
      const row = Math.floor(gy * 16);

      // Bat pixel matrix (20x16)
      // 1 = White (#FFFFFF), 2 = Eye dark (#202124)
      const batMap = [
        // 0-3: Ears
        [0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,0],
        [0,0,0,0,1,0,0,1,1,0,0,1,1,0,0,1,0,0,0,0],
        [0,0,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,0,0],
        // 4-7: Wings & Head
        [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        // 8-11: Body & Wings middle
        [0,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
        [0,0,0,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,0,0],
        [0,0,0,0,1,0,0,0,1,1,1,1,0,0,0,1,0,0,0,0],
        // 12-15: Feet
        [0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      ];

      if (row >= 0 && row < batMap.length && col >= 0 && col < batMap[row].length) {
        const val = batMap[row][col];
        if (val === 1) {
          r = 255; g = 255; b = 255;
        } else if (val === 2) {
          r = 32; g = 33; b = 36;
        }
      }
    }

    return [r, g, b, a];
  };
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating 192x192 PNG...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, batPixelGenerator(false)));

console.log('Generating 512x512 PNG...');
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, batPixelGenerator(false)));

console.log('Generating 512x512 Maskable PNG...');
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, batPixelGenerator(true)));

console.log('Generating apple-touch-icon.png (180x180)...');
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, batPixelGenerator(false)));

console.log('Icons generated successfully!');
