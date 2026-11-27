// Render build/report.html to build/lab7-report.pdf with Chromium (Playwright).
const path = require('path');
const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(OUT, 'report.html'), { waitUntil: 'load' });
  await p.pdf({
    path: path.join(OUT, 'lab7-report.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:7pt;color:#71717a;width:100%;padding:0 14mm;display:flex;justify-content:space-between;font-family:Inter,sans-serif"><span>CPMS · Lab 7 · CR-01 BR-06 v2 · release v0.2.0 (4b4b7e0) · revision cpms-00007-7sf</span><span>page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
  });
  await b.close();
})();
