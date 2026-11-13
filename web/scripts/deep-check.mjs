import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const URL = 'http://127.0.0.1:5173/';
const downloads = path.resolve('reference/tmp-downloads');
fs.mkdirSync(downloads, { recursive: true });
for (const file of fs.readdirSync(downloads)) fs.rmSync(path.join(downloads, file), { force: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
await page.setViewport({ width: 1440, height: 1000 });
const client = await page.createCDPSession();
await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => document.querySelector('#workbench')?.innerText.includes('TEST BENCH'));
await sleep(2200);

const verdict = () =>
  page.evaluate(() => {
    const text = document.querySelector('#workbench')?.innerText ?? '';
    const banner = document.querySelector('#workbench .display');
    const rationale = /(Static datasheet limit breached\.|Projected thermal runaway at 168 h\.|Lot-relative outlier[^\n]*|Drift approaching[^\n]*|Inside drift and static limits[^\n]*)/.exec(text);
    return { verdict: banner?.textContent?.trim() ?? null, rationale: rationale?.[1] ?? null };
  });

const setNumber = (label, value) =>
  page.evaluate(
    ({ label, value }) => {
      const input = document.querySelector(`input[aria-label="${label} value"]`);
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, String(value));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    { label, value },
  );

// 1. Static limit override.
await setNumber('0 h leakage', 72);
await sleep(700);
console.log('v0=72:', JSON.stringify(await verdict()));

// 2. Latent trace preset.
await page.evaluate(() => {
  const button = [...document.querySelectorAll('#workbench button')].find((node) => node.textContent.trim() === 'Latent trace');
  button?.click();
});
await sleep(800);
const latent = await page.evaluate(() => {
  const text = document.querySelector('#workbench')?.innerText ?? '';
  return {
    verdict: document.querySelector('#workbench .display')?.textContent?.trim() ?? null,
    reads: [...text.matchAll(/H(?:0|24|96)\n([\d.]+)/g)].map((match) => match[1]),
  };
});
console.log('latent preset:', JSON.stringify(latent));

// 3. Reset + lot switch.
await page.evaluate(() => {
  const button = [...document.querySelectorAll('#workbench button')].find((node) => node.textContent.trim() === 'Reset');
  button?.click();
});
await sleep(500);
await page.evaluate(() => {
  const select = document.querySelector('#lot-select');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, 'LOT-005');
  select.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(800);
console.log(
  'lot switch:',
  JSON.stringify(
    await page.evaluate(() => {
      const text = document.querySelector('#workbench')?.innerText ?? '';
      return {
        lot: /TEST BENCH\n[^\n]+\n([A-Z0-9-]+)/.exec(text)?.[1],
        mean: /LOT MEAN\n([\d.]+)/i.exec(text)?.[1],
        verdict: document.querySelector('#workbench .display')?.textContent?.trim() ?? null,
      };
    }),
  ),
);

// 4. Model lab: add the derived early-delta slot, inspect candidate terms, tune lambda, deploy.
await page.evaluate(() => document.querySelector('#model-lab')?.scrollIntoView({ block: 'start' }));
await sleep(600);
await page.evaluate(() => {
  const scope = document.querySelector('#model-lab');
  const button = [...scope.querySelectorAll('button[aria-pressed="false"]')].find((node) =>
    node.textContent.includes('Early delta'),
  );
  button?.click();
});
await sleep(900);
const deltaCandidate = await page.evaluate(() => {
  const lab = document.querySelector('#model-lab')?.innerText ?? '';
  return {
    slots: /(\d) \/ 7 slots/i.exec(lab)?.[1],
    terms: /(\d+) coefficients/i.exec(lab)?.[1],
    r2: /Holdout R²\n([\d.]+)/i.exec(lab)?.[1],
    mae: /Holdout MAE\n([\d.]+)/i.exec(lab)?.[1],
    status: /candidate (matches live|not deployed)/i.exec(lab)?.[1],
  };
});
console.log('early-delta candidate:', JSON.stringify(deltaCandidate));

await page.evaluate(() => {
  const slider = document.querySelector('#model-lab input[aria-label="Ridge lambda exponent"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(slider, '-2');
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  slider.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(900);
console.log(
  'lambda 1e-2:',
  JSON.stringify(
    await page.evaluate(() => {
      const lab = document.querySelector('#model-lab')?.innerText ?? '';
      return {
        r2: /Holdout R²\n([\d.]+)/i.exec(lab)?.[1],
        label: /RIDGE Λ\n([^\n]+)/i.exec(lab)?.[1],
      };
    }),
  ),
);

await page.evaluate(() => {
  const button = [...document.querySelectorAll('#model-lab button')].find((node) => node.textContent.includes('Deploy to workbench'));
  button?.click();
});
await sleep(1200);
console.log(
  'deployed delta:',
  JSON.stringify(
    await page.evaluate(() => {
      const text = document.querySelector('#workbench')?.innerText ?? '';
      return {
        config: /(\d SLOTS · DEG \d · \d+ TERMS)/.exec(text)?.[1],
        chips: text.includes('Δ₀→₂₄'),
      };
    }),
  ),
);

// 5. QA record reflects deployed config.
await page.evaluate(() => {
  const button = [...document.querySelectorAll('header button')].find((node) => node.textContent.includes('QA record'));
  button?.click();
});
await page.waitForSelector('[role="dialog"] pre');
await sleep(500);
const qa = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  const payload = JSON.parse(dialog.querySelector('pre').textContent);
  return {
    schema: payload.schema,
    slots: payload.model.slots.map((slot) => slot.id),
    degree: payload.model.degree,
    verdict: payload.decision.verdict,
    checksum: payload.reproducibility.checksum_fnv1a32,
    fingerprint: payload.reproducibility.config_fingerprint,
    termCount: payload.model.terms.length,
    firstTerm: payload.model.terms[0],
  };
});
console.log('qa payload:', JSON.stringify(qa));
await page.screenshot({ path: 'reference/shots/ws-qa.png' });
await page.keyboard.press('Escape');
await sleep(500);

// 6. Fleet CSV download.
await page.evaluate(() => document.querySelector('#fleet')?.scrollIntoView({ block: 'start' }));
await sleep(700);
await page.evaluate(() => {
  const button = [...document.querySelectorAll('#fleet button')].find((node) => node.textContent.trim() === 'CSV');
  button?.click();
});
await sleep(1000);
const csvFile = fs.readdirSync(downloads).find((file) => file.endsWith('.csv'));
const csv = csvFile ? fs.readFileSync(path.join(downloads, csvFile), 'utf8').split('\n') : [];
console.log('csv:', JSON.stringify({ file: csvFile, lines: csv.length, header: csv[0], first: csv[1] }));

// 7. Restore the default model.
await page.evaluate(() => document.querySelector('#model-lab')?.scrollIntoView({ block: 'start' }));
await sleep(500);
await page.evaluate(() => {
  const button = [...document.querySelectorAll('#model-lab button')].find((node) => node.textContent.trim() === 'Default');
  button?.click();
});
await sleep(500);
await page.evaluate(() => {
  const button = [...document.querySelectorAll('#model-lab button')].find((node) => node.textContent.includes('Deploy to workbench'));
  button?.click();
});
await sleep(900);

// 8. Mobile menu and drawer.
const mobile = await browser.newPage();
const mobileErrors = [];
mobile.on('pageerror', (error) => mobileErrors.push(error.message));
await mobile.setViewport({ width: 390, height: 844 });
await mobile.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await mobile.waitForFunction(() => document.querySelector('#workbench')?.innerText.includes('TEST BENCH'));
await sleep(1800);
const toggleMenu = () =>
  mobile.evaluate(() => {
    const button = document.querySelector('header button[aria-expanded]');
    if (button?.getAttribute('aria-expanded') === 'false') button.click();
    return button?.getAttribute('aria-expanded');
  });

await toggleMenu();
await sleep(500);
const menu = await mobile.evaluate(() => {
  const links = [...document.querySelectorAll('header a')].map((node) => node.textContent.trim());
  return { links, qaButton: [...document.querySelectorAll('header button')].some((node) => node.textContent.includes('QA record')) };
});
console.log('mobile menu:', JSON.stringify(menu));
await mobile.screenshot({ path: 'reference/shots/ws-mobile-menu.png' });
await mobile.evaluate(() => {
  const link = [...document.querySelectorAll('header a')].find((node) => node.textContent.includes('Model lab'));
  link?.click();
});
await sleep(1400);
console.log(
  'mobile menu nav:',
  JSON.stringify(
    await mobile.evaluate(() => ({
      scrollY: Math.round(window.scrollY),
      overflow: document.documentElement.scrollWidth,
      status: /candidate (matches live|not deployed)/i.exec(document.querySelector('#model-lab')?.innerText ?? '')?.[1],
    })),
  ),
);

await toggleMenu();
await sleep(400);
await mobile.evaluate(() => {
  const button = [...document.querySelectorAll('header button')].find((node) => node.textContent.includes('QA record'));
  button?.click();
});
await mobile.waitForSelector('[role="dialog"]');
await sleep(600);
console.log(
  'mobile drawer:',
  JSON.stringify(
    await mobile.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const rect = dialog.getBoundingClientRect();
      return { width: Math.round(rect.width), hasSchema: dialog.innerText.includes('spacedock.qa-record/v2') };
    }),
  ),
);
await mobile.screenshot({ path: 'reference/shots/ws-mobile-qa.png' });

console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log('mobile errors:', mobileErrors.length ? mobileErrors.join(' | ') : 'none');

await browser.close();
