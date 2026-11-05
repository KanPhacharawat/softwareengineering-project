// Builds docs/deliverable-1/deliverable-1.pdf from the repository documents (Parts A-F).
// Usage: node docs/deliverable-1/build-report.mjs [config.json]
// Needs: pandoc, pdftotext, Playwright Chromium, devDependency mermaid.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const docs = path.resolve(here, '..');
const root = path.resolve(docs, '..');
const require = createRequire(path.join(root, 'package.json'));
const { chromium } = require('playwright');

const cfgPath = process.argv[2] ?? path.join(here, 'report.config.json');
const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};

const parts = [
  ['cover', null, ['deliverable-1/cover.md']],
  ['A', 'Part A. SRS and product scope', ['srs.md']],
  ['B', 'Part B. Feature inventory and traceability', ['features.md', 'traceability.md']],
  ['C', 'Part C. System-Level SDS', ['system-sds.md']],
  ['D', 'Part D. Three-sprint plan', ['sprints/plan.md']],
  ['E', 'Part E. Sprint 1 engineering contracts', [
    'sprints/sprint-1/F-01-authentication.md', 'sprints/sprint-1/F-02-authorization.md',
    'sprints/sprint-1/F-03-milestones.md', 'sprints/sprint-1/F-04-submission.md',
    'sprints/sprint-1/F-05-feedback.md', 'sprints/sprint-1/sts.md', 'sprints/sprint-1/dod.md']],
  ['F', null, ['deliverable-1/part-f.md']],
];

const fill = (s, extra = {}) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => {
  const v = extra[k] ?? cfg[k];
  return v ? String(v) : `<mark>[TO FILL: ${k}]</mark>`;
});

function md2html(file, shift) {
  const src = fs.readFileSync(path.join(docs, file), 'utf8');
  return execFileSync('pandoc', ['-f', 'gfm', '-t', 'html', `--shift-heading-level-by=${shift}`], { input: src }).toString();
}

function body(pages = {}) {
  let html = '';
  for (const [id, title, files] of parts) {
    html += `<section class="part" id="part-${id}">`;
    if (title) html += `<h1>${title}</h1>`;
    for (const f of files) html += md2html(f, title ? 1 : 0);
    html += '</section>';
  }
  return fill(html, pages);
}

const css = `
@page { size: A4; margin: 18mm 16mm 20mm 16mm; }
body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 10.5pt; line-height: 1.4; color: #111; }
h1 { font-size: 20pt; border-bottom: 2px solid #2457c5; padding-bottom: 4px; }
h2 { font-size: 14pt; margin-top: 18px; } h3 { font-size: 12pt; }
section.part { break-before: page; } section.part:first-child { break-before: auto; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9pt; page-break-inside: auto; }
tr { break-inside: avoid; }
th, td { border: 1px solid #bbb; padding: 3px 5px; vertical-align: top; text-align: left; }
th { background: #eef2ff; }
code { font-size: 8.5pt; background: #f4f4f4; padding: 0 2px; word-break: break-word; }
pre { background: #f6f8fa; border: 1px solid #ddd; padding: 6px; font-size: 8pt; white-space: pre-wrap; break-inside: avoid; }
pre code { background: none; }
img { max-width: 100%; max-height: 120mm; border: 1px solid #ccc; display: block; margin: 6px auto; }
figure { break-inside: avoid; margin: 8px 0; } figcaption { font-size: 9pt; text-align: center; color: #444; }
mark { background: #ffe08a; }
div.mermaid { text-align: center; break-inside: avoid; }
div.mermaid svg { max-height: 105mm; max-width: 100%; }
`;

async function render(html, out) {
  const file = path.join(here, '_report.html');
  fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><title>Deliverable 1</title><style>${css}</style></head><body>${html}</body></html>`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await page.addScriptTag({ path: require.resolve('mermaid/dist/mermaid.min.js') });
  await page.evaluate(async () => {
    for (const pre of document.querySelectorAll('pre.mermaid')) {
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = pre.textContent;
      pre.replaceWith(div);
    }
    // @ts-ignore
    window.mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
    // @ts-ignore
    await window.mermaid.run();
  });
  await page.pdf({
    path: out, format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666">CPMS Deliverable 1 · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
  });
  await browser.close();
  fs.unlinkSync(file);
}

function pageRanges(pdf) {
  const text = execFileSync('pdftotext', ['-layout', pdf, '-']).toString().split('\f');
  const starts = {};
  for (const [id, title] of parts) {
    if (!title && id !== 'F') continue;
    const needle = id === 'F' ? 'Part F. Working Sprint 1' : title;
    const idx = text.findIndex((p, i) => i > 0 && p.includes(needle));
    starts[id] = idx + 1;
  }
  const order = ['A', 'B', 'C', 'D', 'E', 'F'];
  const total = text.filter((p) => p.trim()).length;
  const pages = {};
  order.forEach((id, i) => {
    const end = i < order.length - 1 ? starts[order[i + 1]] - 1 : total;
    pages[`PAGES_${id}`] = `${starts[id]}–${end}`;
  });
  return pages;
}

const out = path.join(here, 'deliverable-1.pdf');
await render(body({ PAGES_A: '0', PAGES_B: '0', PAGES_C: '0', PAGES_D: '0', PAGES_E: '0', PAGES_F: '0' }), out);
const pages = pageRanges(out);
await render(body(pages), out);
console.log('Wrote', out, pages);
