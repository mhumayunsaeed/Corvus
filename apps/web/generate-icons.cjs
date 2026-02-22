const sharp = require("sharp");
const { writeFileSync } = require("fs");
const { join } = require("path");

const iconsDir = join(__dirname, "..", "desktop", "src-tauri", "icons");

async function generateIcons() {
    // Use a proper vector path for "V" instead of text (text renders poorly)
    // The V is drawn as a geometric shape for crisp rendering at all sizes
    const makeSvg = (size) => `
    <svg width="${size}" height="${size}" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7C6AF7"/>
          <stop offset="100%" style="stop-color:#3ECFCF"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="48" fill="url(#bg)"/>
      <path d="M78 68 L128 196 L178 68 L156 68 L128 152 L100 68 Z" fill="white"/>
    </svg>
  `;

    // Generate PNG at multiple sizes with high quality — force RGBA (no palette)
    const png256 = await sharp(Buffer.from(makeSvg(256)), { density: 300 })
        .resize(256, 256)
        .ensureAlpha()
        .png({ quality: 100, palette: false })
        .toBuffer();
    writeFileSync(join(iconsDir, "icon.png"), png256);
    console.log("icon.png (256x256)");

    // 32x32 with lanczos3 for better quality downscale
    const png32 = await sharp(Buffer.from(makeSvg(256)), { density: 300 })
        .resize(32, 32, { kernel: sharp.kernel.lanczos3 })
        .ensureAlpha()
        .png({ quality: 100, palette: false })
        .toBuffer();
    writeFileSync(join(iconsDir, "tray.png"), png32);
    console.log("tray.png (32x32)");

    // Generate multi-size ICO
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const images = [];
    for (const s of sizes) {
        const img = await sharp(Buffer.from(makeSvg(256)), { density: 300 })
            .resize(s, s, { kernel: sharp.kernel.lanczos3 })
            .ensureAlpha()
            .png({ quality: 100, palette: false })
            .toBuffer();
        images.push({ size: s, data: img });
    }

    // Build ICO file
    const headerSize = 6;
    const dirEntrySize = 16;
    const dirSize = dirEntrySize * images.length;
    let dataOffset = headerSize + dirSize;
    const totalSize = dataOffset + images.reduce((sum, img) => sum + img.data.length, 0);
    const ico = Buffer.alloc(totalSize);

    ico.writeUInt16LE(0, 0);
    ico.writeUInt16LE(1, 2);
    ico.writeUInt16LE(images.length, 4);

    let offset = dataOffset;
    for (let i = 0; i < images.length; i++) {
        const entry = headerSize + i * dirEntrySize;
        const s = images[i].size;
        ico.writeUInt8(s >= 256 ? 0 : s, entry);
        ico.writeUInt8(s >= 256 ? 0 : s, entry + 1);
        ico.writeUInt8(0, entry + 2);
        ico.writeUInt8(0, entry + 3);
        ico.writeUInt16LE(1, entry + 4);
        ico.writeUInt16LE(32, entry + 6);
        ico.writeUInt32LE(images[i].data.length, entry + 8);
        ico.writeUInt32LE(offset, entry + 12);
        offset += images[i].data.length;
    }

    offset = dataOffset;
    for (const img of images) {
        img.data.copy(ico, offset);
        offset += img.data.length;
    }

    writeFileSync(join(iconsDir, "icon.ico"), ico);
    console.log("icon.ico (multi-size: " + sizes.join(", ") + ")");
    console.log("\nAll icons generated!");
}

generateIcons().catch(console.error);
