const sharp = require("sharp");
const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const iconsDir = join(__dirname, "apps", "desktop", "src-tauri", "icons");

async function generateIcons() {
    const masterIcon = readFileSync(join(__dirname, "Corvus.png"));

    const png256 = await sharp(masterIcon).resize(256, 256).png().toBuffer();
    writeFileSync(join(iconsDir, "icon.png"), png256);
    console.log("icon.png (256x256)");

    const png32 = await sharp(masterIcon).resize(32, 32).png().toBuffer();
    writeFileSync(join(iconsDir, "tray.png"), png32);
    console.log("tray.png (32x32)");

    const sizes = [16, 32, 48, 256];
    const images = [];
    for (const s of sizes) {
        const img = await sharp(masterIcon).resize(s, s).png().toBuffer();
        images.push({ size: s, data: img });
    }

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
        ico.writeUInt8(s === 256 ? 0 : s, entry);
        ico.writeUInt8(s === 256 ? 0 : s, entry + 1);
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
    console.log("icon.ico (multi-size)");
    console.log("All icons generated!");
}

generateIcons().catch(console.error);
