const fs = require('fs');
const sharp = require('sharp');
const { execSync } = require('child_process');

async function main() {
  const sidebarSvg = `
  <svg width="164" height="314" viewBox="0 0 164 314" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a0a0a"/>
        <stop offset="100%" stop-color="#1c1c22"/>
      </linearGradient>
      <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.1"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="82" cy="100" r="150" fill="url(#glow)"/>
    <!-- Abstract Corvus Logo / Brand Mark -->
    <path d="M 50 120 L 82 80 L 114 120 Z" fill="#ffffff" opacity="0.8"/>
    <path d="M 60 125 L 104 125 L 82 150 Z" fill="#a0a0aa" opacity="0.5"/>
    <text x="82" y="280" font-family="sans-serif" font-size="16" fill="#ffffff" font-weight="bold" text-anchor="middle" letter-spacing="2">CORVUS</text>
  </svg>
  `;

  const headerSvg = `
  <svg width="150" height="57" viewBox="0 0 150 57" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0a0a0a"/>
        <stop offset="100%" stop-color="#2a2a32"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <!-- Abstract Corvus Logo -->
    <path d="M 20 28 L 30 15 L 40 28 Z" fill="#ffffff" opacity="0.8"/>
    <path d="M 23 30 L 37 30 L 30 38 Z" fill="#a0a0aa" opacity="0.5"/>
    <text x="50" y="34" font-family="sans-serif" font-size="16" fill="#ffffff" font-weight="bold" text-anchor="start" letter-spacing="1">CORVUS</text>
  </svg>
  `;

  await sharp(Buffer.from(sidebarSvg))
    .png()
    .toFile('src-tauri/icons/nsis_sidebar.png');

  await sharp(Buffer.from(headerSvg))
    .png()
    .toFile('src-tauri/icons/nsis_header.png');

  execSync('ffmpeg -y -i src-tauri/icons/nsis_sidebar.png src-tauri/icons/nsis_sidebar.bmp');
  execSync('ffmpeg -y -i src-tauri/icons/nsis_header.png src-tauri/icons/nsis_header.bmp');

  console.log("Assets created");
}

main().catch(console.error);
