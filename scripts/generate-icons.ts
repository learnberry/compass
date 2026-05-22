/**
 * generate-icons.ts
 *
 * Rasterizes public/icon.svg into the full set of PWA / iOS icons and
 * Apple splash-screen images. Run via `pnpm icons`.
 *
 * Outputs:
 *   public/icons/icon-192.png            — manifest icon, purpose "any"
 *   public/icons/icon-512.png            — manifest icon, purpose "any"
 *   public/icons/icon-maskable-192.png   — manifest icon, purpose "maskable"
 *   public/icons/icon-maskable-512.png   — manifest icon, purpose "maskable"
 *   public/icons/apple-touch-icon.png    — 180x180, opaque
 *   public/icons/favicon-32.png          — 32x32 favicon
 *   public/icons/splash/*.png            — Apple launch images
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { BRAND_COLOR } from "../lib/constants";

const ROOT = process.cwd();
const SRC_SVG = path.join(ROOT, "public", "icon.svg");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const SPLASH_DIR = path.join(ICONS_DIR, "splash");

/** Dark canvas used for opaque icons and splash backgrounds. */
const DARK_BG = "#0b0b0f";

interface SplashSpec {
  /** Device-independent CSS width. */
  width: number;
  /** Device-independent CSS height. */
  height: number;
  /** Physical pixel width. */
  pxWidth: number;
  /** Physical pixel height. */
  pxHeight: number;
}

/** Common modern iPhone portrait launch sizes (physical pixels). */
const SPLASH_SIZES: SplashSpec[] = [
  { width: 390, height: 844, pxWidth: 1170, pxHeight: 2532 }, // iPhone 12/13/14
  { width: 430, height: 932, pxWidth: 1290, pxHeight: 2796 }, // iPhone 14/15 Pro Max
  { width: 393, height: 852, pxWidth: 1179, pxHeight: 2556 }, // iPhone 15/16
  { width: 428, height: 926, pxWidth: 1284, pxHeight: 2778 }, // iPhone 12/13 Pro Max
  { width: 414, height: 896, pxWidth: 828, pxHeight: 1792 }, // iPhone XR / 11
  { width: 375, height: 812, pxWidth: 1125, pxHeight: 2436 }, // iPhone X / XS / 11 Pro
];

/** Hex string -> sharp RGBA background object. */
function rgba(hex: string, alpha = 1): sharp.Color {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    alpha,
  };
}

/** Render the source SVG to a PNG buffer at the given square size. */
async function renderLogo(svg: Buffer, size: number): Promise<Buffer> {
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: rgba("#000000", 0) })
    .png()
    .toBuffer();
}

/** A plain icon with transparent background. */
async function writeIcon(svg: Buffer, size: number, outPath: string): Promise<void> {
  const png = await renderLogo(svg, size);
  await writeFile(outPath, png);
}

/** An opaque icon: logo composited onto a solid background. */
async function writeOpaqueIcon(
  svg: Buffer,
  size: number,
  background: string,
  outPath: string,
): Promise<void> {
  const logo = await renderLogo(svg, size);
  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: rgba(background) },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
  await writeFile(outPath, png);
}

/**
 * A maskable icon: logo on a full-bleed indigo background with a ~12%
 * safe-zone padding so the artwork survives an aggressive circular mask.
 */
async function writeMaskableIcon(svg: Buffer, size: number, outPath: string): Promise<void> {
  const logoSize = Math.round(size * 0.76); // ~12% padding each side
  const logo = await renderLogo(svg, logoSize);
  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: rgba(BRAND_COLOR) },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
  await writeFile(outPath, png);
}

/** An Apple splash screen: centered logo on a solid dark canvas. */
async function writeSplash(svg: Buffer, spec: SplashSpec): Promise<string> {
  const logoSize = Math.round(Math.min(spec.pxWidth, spec.pxHeight) * 0.32);
  const logo = await renderLogo(svg, logoSize);
  const name = `apple-splash-${spec.pxWidth}x${spec.pxHeight}.png`;
  const outPath = path.join(SPLASH_DIR, name);
  const png = await sharp({
    create: {
      width: spec.pxWidth,
      height: spec.pxHeight,
      channels: 4,
      background: rgba(DARK_BG),
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
  await writeFile(outPath, png);
  return name;
}

async function main(): Promise<void> {
  await mkdir(ICONS_DIR, { recursive: true });
  await mkdir(SPLASH_DIR, { recursive: true });

  const svg = await readFile(SRC_SVG);
  const produced: string[] = [];

  await writeIcon(svg, 192, path.join(ICONS_DIR, "icon-192.png"));
  produced.push("icons/icon-192.png");

  await writeIcon(svg, 512, path.join(ICONS_DIR, "icon-512.png"));
  produced.push("icons/icon-512.png");

  await writeMaskableIcon(svg, 192, path.join(ICONS_DIR, "icon-maskable-192.png"));
  produced.push("icons/icon-maskable-192.png");

  await writeMaskableIcon(svg, 512, path.join(ICONS_DIR, "icon-maskable-512.png"));
  produced.push("icons/icon-maskable-512.png");

  await writeOpaqueIcon(svg, 180, BRAND_COLOR, path.join(ICONS_DIR, "apple-touch-icon.png"));
  produced.push("icons/apple-touch-icon.png");

  await writeIcon(svg, 32, path.join(ICONS_DIR, "favicon-32.png"));
  produced.push("icons/favicon-32.png");

  for (const spec of SPLASH_SIZES) {
    const name = await writeSplash(svg, spec);
    produced.push(`icons/splash/${name}`);
  }

  console.log("Compass icons generated:");
  for (const file of produced) {
    console.log(`  public/${file}`);
  }
  console.log(`\n${produced.length} files written to public/icons/.`);
}

main().catch((err: unknown) => {
  console.error("Icon generation failed:", err);
  process.exitCode = 1;
});
