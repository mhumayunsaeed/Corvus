import sharp from "sharp";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "src-tauri", "icons");

// Create a 256x256 PNG with the Veyra "V" logo
// Using a violet-to-teal gradient background with rounded corners
async function generateIcons() {
    const size = 256;

    // Create the base icon as SVG
    const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7C6AF7"/>
          <stop offset="100%" style="stop-color:#3ECFCF"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="48" fill="url(#bg)"/>
      <text x="50%" y="55%" text-anchor="middle" dominant-baseline="central"
            font-family="Arial, sans-serif" font-weight="bold" font-size="160"
            fill="white">V</text>
    </svg>
  `;

    const svgBuffer = Buffer.from(svg);

    // Generate PNG at 256x256
    const png256 = await sharp(svgBuffer).resize(256, 256).png().toBuffer();
    writeFileSync(join(iconsDir, "icon.png"), png256);
    console.log("✓ icon.png (256x256)");

    // Generate tray icon (smaller, 32x32)
    const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
    writeFileSync(join(iconsDir, "tray.png"), png32);
    console.log("✓ tray.png (32x32)");

    // Generate ICO file manually
    // ICO format: header + directory entries + image data
    const sizes = [16, 32, 48, 256];
    const images = [];

    for (const s of sizes) {
        const img = await sharp(svgBuffer).resize(s, s).png().toBuffer();
        images.push({ size: s, data: img });
    }

    // ICO header: 6 bytes
    const headerSize = 6;
    const dirEntrySize = 16;
    const dirSize = dirEntrySize * images.length;
    let dataOffset = headerSize + dirSize;

    // Build the ICO buffer
    const totalSize = dataOffset + images.reduce((sum, img) => sum + img.data.length, 0);
    const ico = Buffer.alloc(totalSize);

    // Header
    ico.writeUInt16LE(0, 0);      // Reserved
    ico.writeUInt16LE(1, 2);      // Type: 1 = ICO
    ico.writeUInt16LE(images.length, 4); // Number of images

    // Directory entries
    let offset = dataOffset;
    for (let i = 0; i < images.length; i++) {
        const entry = headerSize + i * dirEntrySize;
        const s = images[i].size;
        ico.writeUInt8(s === 256 ? 0 : s, entry);     // Width (0 = 256)
        ico.writeUInt8(s === 256 ? 0 : s, entry + 1); // Height (0 = 256)
        ico.writeUInt8(0, entry + 2);                   // Color palette
        ico.writeUInt8(0, entry + 3);                   // Reserved
        ico.writeUInt16LE(1, entry + 4);                // Color planes
        ico.writeUInt16LE(32, entry + 6);               // Bits per pixel
        ico.writeUInt32LE(images[i].data.length, entry + 8);  // Size of image data
        ico.writeUInt32LE(offset, entry + 12);          // Offset to image data
        offset += images[i].data.length;
    }

    // Image data
    offset = dataOffset;
    for (const img of images) {
        img.data.copy(ico, offset);
        offset += img.data.length;
    }

    writeFileSync(join(iconsDir, "icon.ico"), ico);
    console.log("✓ icon.ico (multi-size)");

    console.log("\nAll icons generated successfully!");
}

generateIcons().catch(console.error);
