import puppeteer from 'puppeteer-core';

const URL = 'http://127.0.0.1:5173/';
const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
await page.waitForFunction(() => document.querySelector('#workbench')?.innerText.includes('TEST BENCH'), {
  timeout: 30000,
});
await sleep(2600);

const readState = () =>
  page.evaluate(() => {
    const workbench = document.querySelector('#workbench')?.innerText ?? '';
    const lab = document.querySelector('#model-lab')?.innerText ?? '';
    const header = document.querySelector('#top')?.innerText ?? '';
    const r2 = workbench.match(/Holdout R²\n([\d.]+)/i)?.[1] ?? null;
    const mae = workbench.match(/Holdout MAE\n([\d.]+) µA/i)?.[1] ?? null;
    const recall = workbench.match(/Recall\n([\d.]+)%/i)?.[1] ?? null;
    const terms = workbench.match(/(\d+) terms/i)?.[1] ?? null;
    return {
      workbenchSlots: (workbench.match(/(\d+) slots/i) ?? [])[1] ?? null,
      terms,
      r2,
      mae,
      recall,
      headerRecall: (header.match(/DEFECT RECALL\n([\d.]+%)/i) ?? [])[1] ?? null,
      escapes: (header.match(/DEFECT RECALL\n[\d.]+%\n([^\n]+)/i) ?? [])[1] ?? null,
      labStatus: (lab.match(/candidate (matches live|not deployed)/i) ?? [])[1] ?? null,
      workbenchText: workbench.slice(0, 200),
    };
  });

console.log('initial:', JSON.stringify(await readState(), null, 1));

// 1. Quick-add V96 from the workbench slot strip.
await page.evaluate(() => {
  const scope = document.querySelector('#workbench');
  const button = [...scope.querySelectorAll('button')].find((node) => node.textContent.trim().includes('Add slot'));
  button?.click();
});
await sleep(250);
await page.evaluate(() => {
  const scope = document.querySelector('#workbench');
  const button = [...scope.querySelectorAll('button')].find((node) => node.textContent.includes('96 h leakage'));
  button?.click();
});
await sleep(900);
const withV96 = await readState();
console.log('after quick-add V96:', JSON.stringify(withV96, null, 1));
console.log('V96 chip present:', await page.evaluate(() => document.querySelector('#workbench')?.innerText.includes('V₉₆')));

// 2. Remove V96 from the active slot chip.
await page.evaluate(() => {
  const scope = document.querySelector('#workbench');
  const button = scope.querySelector('button[aria-label="Remove 96 h leakage slot"]');
  button?.click();
});
await sleep(900);
const afterRemove = await readState();
console.log('after remove:', JSON.stringify(afterRemove, null, 1));

// 3. Add + deploy V96 from the Model Lab.
await page.evaluate(() => document.querySelector('#model-lab')?.scrollIntoView({ block: 'start' }));
await sleep(600);
await page.evaluate(() => {
  const scope = document.querySelector('#model-lab');
  const button = [...scope.querySelectorAll('button[aria-pressed="false"]')].find((node) =>
    node.textContent.includes('96 h leakage'),
  );
  button?.click();
});
await sleep(900);
console.log('lab after candidate add:', JSON.stringify(await readState(), null, 1));
const deployLabel = await page.evaluate(() => {
  const scope = document.querySelector('#model-lab');
  const button = [...scope.querySelectorAll('button')].find((node) => node.textContent.includes('Deploy to workbench'));
  return { disabled: button?.disabled, text: button?.textContent?.trim() };
});
console.log('deploy button:', JSON.stringify(deployLabel));
await page.evaluate(() => {
  const scope = document.querySelector('#model-lab');
  const button = [...scope.querySelectorAll('button')].find((node) => node.textContent.includes('Deploy to workbench'));
  button?.click();
});
await sleep(1000);
console.log('lab after deploy:', JSON.stringify(await readState(), null, 1));

// 4. Degree 1 deploy.
await page.evaluate(() => {
  const scope = document.querySelector('#model-lab');
  const button = [...scope.querySelectorAll('button')].find((node) => node.textContent.trim() === 'deg 1');
  button?.click();
});
await sleep(700);
await page.evaluate(() => {
  const scope = document.querySelector('#model-lab');
  const button = [...scope.querySelectorAll('button')].find((node) => node.textContent.includes('Deploy to workbench'));
  button?.click();
});
await sleep(900);
const deg1 = await readState();
console.log('after degree 1 deploy:', JSON.stringify(deg1, null, 1));

// 5. Restore the default configuration and deploy.
await page.evaluate(() => {
  const scope = document.querySelector('#model-lab');
  const button = [...scope.querySelectorAll('button')].find((node) => node.textContent.trim() === 'Default');
  button?.click();
});
await sleep(700);
await page.evaluate(() => {
  const scope = document.querySelector('#model-lab');
  const button = [...scope.querySelectorAll('button')].find((node) => node.textContent.includes('Deploy to workbench'));
  button?.click();
});
await sleep(900);
console.log('restored:', JSON.stringify(await readState(), null, 1));

// 6. QA drawer: open, copy, close.
await page.evaluate(() => window.scrollTo({ top: 0 }));
await sleep(500);
await page.evaluate(() => {
  const button = [...document.querySelectorAll('header button')].find((node) => node.textContent.includes('QA record'));
  button?.click();
});
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
await sleep(500);
const qa = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  return {
    hasSchema: dialog?.innerText.includes('spacedock.qa-record/v2'),
    hasChecksum: dialog?.innerText.includes('checksum'),
    hasSlots: dialog?.innerText.includes('V₀') && dialog?.innerText.includes('V₂₄'),
    jsonLength: dialog?.querySelector('pre')?.textContent?.length ?? 0,
  };
});
console.log('qa drawer:', JSON.stringify(qa));
await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  const button = [...dialog.querySelectorAll('button')].find((node) => node.textContent.trim() === 'Copy');
  button?.click();
});
await sleep(400);
console.log(
  'copy feedback:',
  await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText.includes('COPIED')),
);
await page.keyboard.press('Escape');
await sleep(600);
console.log(
  'drawer closed:',
  await page.evaluate(() => !document.querySelector('[role="dialog"]')),
);

// 7. Inspect a fleet die.
await page.evaluate(() => document.querySelector('#fleet')?.scrollIntoView({ block: 'start' }));
await sleep(700);
const inspected = await page.evaluate(() => {
  const firstRow = document.querySelector('#fleet tbody tr');
  const partId = firstRow?.querySelector('td')?.innerText.split('\n')[0]?.trim();
  const button = [...(firstRow?.querySelectorAll('button') ?? [])].find((node) => node.textContent.includes('Inspect'));
  button?.click();
  return partId;
});
await sleep(1300);
const benchTrace = await page.evaluate(() => document.querySelector('#workbench')?.innerText.slice(0, 80));
console.log('inspected:', inspected, '| bench starts:', JSON.stringify(benchTrace));

// 8. Screenshots: workbench bottom, fleet, validation.
await page.evaluate(() => document.querySelector('#workbench')?.scrollIntoView({ block: 'start' }));
await sleep(900);
await page.screenshot({ path: 'reference/shots/ws-workbench.png' });
await page.evaluate(() => document.querySelector('#fleet')?.scrollIntoView({ block: 'start' }));
await sleep(900);
await page.screenshot({ path: 'reference/shots/ws-fleet.png' });
await page.evaluate(() => document.querySelector('#validation')?.scrollIntoView({ block: 'start' }));
await sleep(900);
await page.screenshot({ path: 'reference/shots/ws-validation.png' });
await page.evaluate(() => window.scrollTo({ top: 0 }));
await sleep(700);
await page.screenshot({ path: 'reference/shots/ws-top-final.png' });

// 9. Mobile layout and horizontal overflow.
const mobile = await browser.newPage();
const mobileErrors = [];
mobile.on('pageerror', (error) => mobileErrors.push(error.message));
await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await mobile.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await mobile.waitForFunction(() => document.querySelector('#workbench')?.innerText.includes('TEST BENCH'), {
  timeout: 30000,
});
await sleep(2600);
const mobileInfo = await mobile.evaluate(() => ({
  width: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  docHeight: document.body.scrollHeight,
  canvas: !!document.querySelector('canvas'),
  addSlot: [...document.querySelectorAll('#workbench button')].some((node) => node.textContent.includes('Add slot')),
  nav: !!document.querySelector('header'),
}));
console.log('mobile:', JSON.stringify(mobileInfo));
await mobile.screenshot({ path: 'reference/shots/ws-mobile.png', fullPage: false });
await mobile.evaluate(() => document.querySelector('#model-lab')?.scrollIntoView({ block: 'start' }));
await sleep(900);
await mobile.screenshot({ path: 'reference/shots/ws-mobile-lab.png', fullPage: false });
console.log('mobile errors:', mobileErrors.length ? mobileErrors.join(' | ') : 'none');

console.log('failed requests:', failed.length ? failed.join(' | ') : 'none');
console.log('console errors:', errors.length ? errors.join(' | ') : 'none');

await browser.close();
