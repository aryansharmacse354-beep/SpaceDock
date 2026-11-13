import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const URL = 'http://127.0.0.1:5173/';
const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});

const page = await browser.newPage();
const errors = [];
const failed = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));
page.on('requestfailed', (request) => failed.push(`${request.url()} ${request.failure()?.errorText}`));

await page.setViewport({ width: 1440, height: 1000 });
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => document.querySelector('#model')?.innerText.includes('HOLDOUT R'), {
  timeout: 30000,
});
await sleep(2600);

const sectionIds = await page.evaluate(() =>
  [...document.querySelectorAll('main section')].map((node) => node.id).filter(Boolean),
);
check(
  'previous site sections restored',
  ['top', 'mission', 'architecture', 'model', 'console', 'telemetry', 'validation', 'audit'].every((id) =>
    sectionIds.includes(id),
  ),
  sectionIds.join(', '),
);

const defaultState = await page.evaluate(() => {
  const model = document.querySelector('#model');
  const consoleSection = document.querySelector('#console');
  const active = [...model.querySelectorAll('button[aria-pressed="true"]')].map((node) => node.textContent.trim());
  const coefficientText = model.innerText.match(/(\d+)\s+COEFFICIENTS/i);
  return {
    active,
    terms: coefficientText ? Number(coefficientText[1]) : null,
    has96Range: Boolean(consoleSection.querySelector('#v96-range')),
    consoleText: consoleSection.innerText.replace(/\s+/g, ' ').slice(0, 220),
    certId: consoleSection.innerText.match(/SD-LOT-\d+-[A-F0-9]{8}/)?.[0] ?? null,
  };
});
check('default slot pair is V0 + V24', defaultState.active.length === 2 && defaultState.active.every((item) => /V₀|V₂₄/.test(item)), defaultState.active.join(' | '));
check('default fit has 6 terms', defaultState.terms === 6, String(defaultState.terms));
check('96h input hidden by default', defaultState.has96Range === false);
check('QA certificate issued', Boolean(defaultState.certId), defaultState.certId ?? 'none');

const clickSlot = (label) =>
  page.evaluate((text) => {
    const button = [...document.querySelectorAll('#model button[aria-pressed]')].find(
      (node) => node.textContent.replace(/\s+/g, '').includes(text),
    );
    if (!button) throw new Error(`slot ${text} not found`);
    button.click();
  }, label);

await clickSlot('V₉₆');
await page.waitForFunction(() => document.querySelector('#console #v96-range'), { timeout: 15000 });
await sleep(1200);
const afterAdd = await page.evaluate(() => {
  const model = document.querySelector('#model');
  const coefficientText = model.innerText.match(/(\d+)\s+COEFFICIENTS/i);
  return {
    active: [...model.querySelectorAll('button[aria-pressed="true"]')].length,
    terms: coefficientText ? Number(coefficientText[1]) : null,
    has96Range: Boolean(document.querySelector('#console #v96-range')),
    forecast: document.querySelector('#console').innerText.match(/168H FORECAST\s*([\d.]+)/i)?.[1] ?? null,
    evidence: document.querySelector('#console').innerText.includes('0 h + 24 h + 96 h') ||
      document.querySelector('#console').innerText.includes('0 H + 24 H + 96 H'),
  };
});
check('adding V96 activates a third slot', afterAdd.active === 3, String(afterAdd.active));
check('adding V96 expands the fit to 10 terms', afterAdd.terms === 10, String(afterAdd.terms));
check('adding V96 reveals console 96h input', afterAdd.has96Range === true);
check('late-read evidence window reported', afterAdd.evidence === true);
check('console still forecasts', Boolean(afterAdd.forecast), afterAdd.forecast ?? 'none');

await page.evaluate(() => {
  const input = document.querySelector('#console #v96-range');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, '14.4');
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(900);
const lateValue = await page.evaluate(() => ({
  range: document.querySelector('#console #v96-range')?.value ?? null,
  number: document.querySelector('#console input[aria-label="96 hour leakage value"]')?.value ?? null,
  forecast: document.querySelector('#console').innerText.match(/168H FORECAST\s*([\d.]+)/i)?.[1] ?? null,
}));
check(
  '96h slider updates console state',
  lateValue.range === '14.4' && lateValue.number === '14.4',
  JSON.stringify(lateValue),
);

await clickSlot('V₉₆');
await page.waitForFunction(() => !document.querySelector('#console #v96-range'), { timeout: 15000 });
await sleep(800);
const afterRemove = await page.evaluate(() => {
  const coefficientText = document.querySelector('#model').innerText.match(/(\d+)\s+COEFFICIENTS/i);
  return {
    terms: coefficientText ? Number(coefficientText[1]) : null,
    has96Range: Boolean(document.querySelector('#console #v96-range')),
  };
});
check('removing V96 restores 6 terms', afterRemove.terms === 6, String(afterRemove.terms));
check('removing V96 hides console 96h input', afterRemove.has96Range === false);

await clickSlot('Δ₀→₂₄');
await sleep(1000);
const derivedState = await page.evaluate(() => {
  const model = document.querySelector('#model');
  const coefficientText = model.innerText.match(/(\d+)\s+COEFFICIENTS/i);
  return {
    terms: coefficientText ? Number(coefficientText[1]) : null,
    has96Range: Boolean(document.querySelector('#console #v96-range')),
  };
});
check('derived slot refits without a new measurement', derivedState.terms === 10 && derivedState.has96Range === false, JSON.stringify(derivedState));

await page.evaluate(() => {
  const reset = [...document.querySelectorAll('#model button')].find((node) =>
    node.textContent.replace(/\s+/g, '').includes('ResettoV₀+V₂₄'),
  );
  reset?.click();
});
await sleep(700);

fs.mkdirSync('reference/shots', { recursive: true });
await page.screenshot({ path: 'reference/shots/restored-desktop.png', fullPage: true });

const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('no desktop horizontal overflow', desktopOverflow <= 1, `overflow ${desktopOverflow}px`);

await page.setViewport({ width: 390, height: 844 });
await sleep(900);
const mobile = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - window.innerWidth,
  slotChips: document.querySelectorAll('#model button[aria-pressed]').length,
  consoleVisible: Boolean(document.querySelector('#console')),
}));
check('no mobile horizontal overflow', mobile.overflow <= 1, `overflow ${mobile.overflow}px`);
check('slot controls render on mobile', mobile.slotChips === 7, String(mobile.slotChips));
await page.screenshot({ path: 'reference/shots/restored-mobile.png', fullPage: true });

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' || '));
check('no failed requests', failed.length === 0, failed.slice(0, 3).join(' || '));

await browser.close();
const failures = results.filter((item) => !item.pass);
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
process.exit(failures.length === 0 ? 0 : 1);
