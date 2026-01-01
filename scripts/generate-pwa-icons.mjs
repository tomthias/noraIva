import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Read the SVG file
const svgBuffer = readFileSync(join(rootDir, "favicon.svg"));

// Generate PWA icons
const sizes = [192, 512];

async function generateIcons() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(rootDir, "public", `pwa-${size}x${size}.png`));
    console.log(`Generated pwa-${size}x${size}.png`);
  }

  // Also generate apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(rootDir, "public", "apple-touch-icon.png"));
  console.log("Generated apple-touch-icon.png");
}

generateIcons().catch(console.error);
