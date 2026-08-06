/**
 * App icon generation.
 *
 * The mark is a ladder read as ascent: five rungs stepping up and to the right,
 * the top one in the signal tint. It avoids the literal two-rail ladder because
 * rails vanish below about 40px, and it avoids a plain bar chart because the
 * diagonal offset is what makes it read as climbing rather than measuring.
 *
 *   node scripts/make-icons.mjs
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const INK = '#22384F';       // deep ink blue ground
const INK_DEEP = '#182838';  // gradient foot
const PAPER = '#F7F4EC';     // warm paper rungs
const SIGNAL = '#7FC6E8';    // top rung, the one you are climbing toward

/** The mark alone, on a transparent 1024 canvas. `inset` leaves safe-zone room. */
function markSvg({ size = 1024, rung = PAPER, top = SIGNAL, scale = 1 }) {
  const c = size / 2;
  // Five rungs, each stepping up and right. Widths taper slightly so the stack
  // reads as receding into distance rather than as a flat chart.
  const rungs = [
    { x: 168, y: 700, w: 420, h: 74 },
    { x: 232, y: 574, w: 420, h: 74 },
    { x: 296, y: 448, w: 420, h: 74 },
    { x: 360, y: 322, w: 420, h: 74 },
    { x: 424, y: 196, w: 420, h: 74 },
  ];

  const bars = rungs
    .map((r, i) => {
      const fill = i === rungs.length - 1 ? top : rung;
      const opacity = i === rungs.length - 1 ? 1 : 0.55 + i * 0.11;
      return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="37" fill="${fill}" opacity="${opacity}"/>`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <g transform="translate(${c} ${c}) scale(${scale}) translate(${-c} ${-c})">
    ${bars}
  </g>
</svg>`;
}

/** Full icon: gradient ground plus the mark. */
function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${INK}"/>
      <stop offset="1" stop-color="${INK_DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  ${markSvg({ scale: 0.86 }).replace(/<\/?svg[^>]*>/g, '')}
</svg>`;
}

const OUT = 'assets/images';

async function png(svg, path, size) {
  const buffer = await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writeFile(path, buffer);
  console.log(`  ${path}  ${size}x${size}`);
}

await mkdir(OUT, { recursive: true });
console.log('\n  AI Ladder icons\n');

// iOS / general app icon, opaque, full bleed.
await png(iconSvg(), `${OUT}/icon.png`, 1024);

// Splash: mark only on transparent, so it sits on the themed splash colour.
await png(markSvg({ scale: 0.8 }), `${OUT}/splash-icon.png`, 512);

// Favicon / web.
await png(iconSvg(), `${OUT}/favicon.png`, 96);

// Android adaptive: foreground must sit inside the 66% safe circle, so the mark
// is scaled well down; background is the flat ground colour.
await png(markSvg({ scale: 0.56 }), `${OUT}/android-icon-foreground.png`, 1024);
await png(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${INK}"/></svg>`,
  `${OUT}/android-icon-background.png`,
  1024
);
// Monochrome (themed icons), single colour, system tints it.
await png(
  markSvg({ scale: 0.56, rung: '#FFFFFF', top: '#FFFFFF' }),
  `${OUT}/android-icon-monochrome.png`,
  1024
);

// Keep the source next to the output so the mark can be re-cut later.
await writeFile(`${OUT}/logo.svg`, iconSvg());
console.log(`  ${OUT}/logo.svg\n`);
