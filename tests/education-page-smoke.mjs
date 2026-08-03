import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto('http://127.0.0.1:8765/2026/Education.smoke.html', {
    waitUntil: 'domcontentloaded',
    timeout: 120000
  });
  await page.waitForSelector('#ccorEducationApp', { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#sysStatus')?.textContent?.includes('SYSTEM ACTIVE'), null, { timeout: 120000 });

  assert.equal(await page.locator('.ccor-month-card').count(), 12, 'year calendar should render twelve months');
  assert.equal(await page.locator('.ccor-instructor-card').count(), 10, 'all ten verified instructor profiles should render');
  assert.ok(await page.locator('.ccor-class-card').count() > 0, 'class cards should render');
  assert.ok(await page.locator('.ccor-card-media.is-logo').count() > 0, 'classes without flyers should use the CCOR logo treatment');

  const names = await page.locator('.ccor-instructor-card h3').allTextContents();
  for (const expected of [
    'Sam J. Saad III', 'Sam Colburn', 'Ned Hale', 'Caroline Boland', 'Mark Ledbetter',
    'Jadyn Henderson', 'Julie Lepore', 'Kaz Cisowski', 'Dave Foster', 'Ed Gianos'
  ]) {
    assert.ok(names.includes(expected), `missing instructor card: ${expected}`);
  }
  assert.ok(names.every(name => !name.includes('\n') && !/NABOR|BAR AS-IS|CONTRACT\n/i.test(name)), 'malformed instructor names must not render');

  await page.getByRole('button', { name: 'Past 12 months' }).click();
  await page.waitForTimeout(200);
  assert.ok(await page.locator('.ccor-class-card').count() > 0, 'past-year view should render historical class cards');

  await page.locator('#ccorInstructorFilter').selectOption('caroline-boland');
  await page.waitForTimeout(200);
  const resultMeta = await page.locator('#ccorResultsMeta').textContent();
  assert.match(resultMeta || '', /Caroline Boland/i, 'instructor filter should update the class result summary');

  await page.locator('#ccorClearFilters').click();
  await page.getByRole('button', { name: 'Selected year' }).click();
  await page.locator('.ccor-month-header').first().click();
  assert.ok((await page.locator('#ccorResultsMeta').textContent())?.length > 0, 'month selection should update results');

  assert.deepEqual(pageErrors, [], `browser page errors: ${pageErrors.join('; ')}`);
  console.log(JSON.stringify({
    status: 'passed',
    instructorCount: names.length,
    classCards: await page.locator('.ccor-class-card').count(),
    monthCards: await page.locator('.ccor-month-card').count(),
    logoFallbackCards: await page.locator('.ccor-card-media.is-logo').count()
  }, null, 2));
} finally {
  await browser.close();
}
