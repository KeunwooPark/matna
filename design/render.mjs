// Renders the brand assets from design/: public/og.png, src/app/favicon.ico (16/32/48 PNG entries) and
// src/app/apple-icon.png. Needs Playwright with Chromium: npm i --no-save playwright && npx playwright install chromium && node design/render.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');

function ico(pngs) {
  // ICONDIR + one ICONDIRENTRY per image, followed by the PNG data.
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...pngs.map(p => p.data)]);
}

await (async () => {
  const b = await chromium.launch();
  const svg = fs.readFileSync(`${ROOT}/design/icon.svg`, 'utf8');
  async function iconPng(size, { square = false } = {}) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    // Apple touch icons get square corners: iOS applies its own mask.
    const src = square ? svg.replace('rx="14" ', '') : svg;
    await p.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    const data = await p.screenshot({ omitBackground: true });
    await p.close();
    return data;
  }
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const size of sizes) pngs.push({ size, data: await iconPng(size) });
  fs.writeFileSync(`${ROOT}/src/app/favicon.ico`, ico(pngs));
  fs.writeFileSync(`${ROOT}/src/app/apple-icon.png`, await iconPng(180, { square: true }));

  const og = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto(`file://${ROOT}/design/og-image.html`);
  await og.waitForTimeout(300);
  await og.screenshot({ path: `${ROOT}/public/og.png` });
  await b.close();
  console.log('rendered favicon.ico (16/32/48), apple-icon.png (180), og.png (1200x630)');
})();
