import sharp from "sharp";
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "src-tauri", "icons");

/**
 * Generate all app icons from the master icon.png (256x256 bird logo).
 * 
 * This script produces:
 * - icon.png   — 256x256 master icon (used for window icon)
 * - tray.png   — 256x256 tray icon (Windows auto-scales; high-res avoids blurriness)
 * - 128x128.png — 128x128 for bundling
 * - 32x32@2x.png — 64x64 for Retina/HiDPI
 * - icon.ico   — Multi-size ICO (16, 24, 32, 48, 64, 128, 256)
 */
async function generateIcons() {
  // Read master icon
  const masterIcon = readFileSync(join(iconsDir, "icon.png"));

  console.log("Generating icons from master icon.png...\n");

  // 1. Tray icon — 256x256 (Windows auto-scales to tray size; high-res = crisp)
  //    We keep it at 256x256 so the OS can do proper downscaling
  const tray256 = await sharp(masterIcon)
    .resize(256, 256, { kernel: sharp.kernel.lanczos3 })
    .png({ quality: 100, palette: false })
    .toBuffer();
  writeFileSync(join(iconsDir, "tray.png"), tray256);
  console.log("✓ tray.png (256x256) — system tray icon");

  // 2. 128x128 icon
  const png128 = await sharp(masterIcon)
    .resize(128, 128, { kernel: sharp.kernel.lanczos3 })
    .png({ quality: 100, palette: false })
    .toBuffer();
  writeFileSync(join(iconsDir, "128x128.png"), png128);
  console.log("✓ 128x128.png");

  // 3. 32x32@2x (= 64x64 actual pixels)
  const png64 = await sharp(masterIcon)
    .resize(64, 64, { kernel: sharp.kernel.lanczos3 })
    .png({ quality: 100, palette: false })
    .toBuffer();
  writeFileSync(join(iconsDir, "32x32@2x.png"), png64);
  console.log("✓ 32x32@2x.png (64x64)");

  // 4. Multi-size ICO — include more sizes for crisp display at every resolution
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const images = [];

  for (const s of icoSizes) {
    const img = await sharp(masterIcon)
      .resize(s, s, { kernel: sharp.kernel.lanczos3 })
      .png({ quality: 100, palette: false })
      .toBuffer();
    images.push({ size: s, data: img });
  }

  // ICO header: 6 bytes
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * images.length;
  let dataOffset = headerSize + dirSize;

  // Build the ICO buffer
  const totalSize =
    dataOffset + images.reduce((sum, img) => sum + img.data.length, 0);
  const ico = Buffer.alloc(totalSize);

  // Header
  ico.writeUInt16LE(0, 0); // Reserved
  ico.writeUInt16LE(1, 2); // Type: 1 = ICO
  ico.writeUInt16LE(images.length, 4); // Number of images

  // Directory entries
  let offset = dataOffset;
  for (let i = 0; i < images.length; i++) {
    const entry = headerSize + i * dirEntrySize;
    const s = images[i].size;
    ico.writeUInt8(s === 256 ? 0 : s, entry); // Width (0 = 256)
    ico.writeUInt8(s === 256 ? 0 : s, entry + 1); // Height (0 = 256)
    ico.writeUInt8(0, entry + 2); // Color palette
    ico.writeUInt8(0, entry + 3); // Reserved
    ico.writeUInt16LE(1, entry + 4); // Color planes
    ico.writeUInt16LE(32, entry + 6); // Bits per pixel
    ico.writeUInt32LE(images[i].data.length, entry + 8); // Size of image data
    ico.writeUInt32LE(offset, entry + 12); // Offset to image data
    offset += images[i].data.length;
  }

  // Image data
  offset = dataOffset;
  for (const img of images) {
    img.data.copy(ico, offset);
    offset += img.data.length;
  }

  writeFileSync(join(iconsDir, "icon.ico"), ico);
  console.log(
    `✓ icon.ico (${icoSizes.join(", ")}px) — taskbar & window icon`
  );

  console.log("\n✅ All icons generated successfully!");
  console.log("\nNote: The tray icon is now 256x256. Windows will auto-scale");
  console.log("it to the correct tray size, resulting in a much crisper icon.");
}

generateIcons().catch(console.error);
