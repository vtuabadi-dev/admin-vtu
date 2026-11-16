// Resolve an isolated Playwright installation via NODE_PATH to preserve the app lockfile.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const baseUrl = process.env.UI_AUDIT_BASE_URL || 'http://localhost:3000';
  const output = path.resolve('temp/browser-audit');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const resume = ['--resume', '--navigation-check', '--business-entry-check'].some(flag => process.argv.includes(flag));
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ...(resume ? { storageState: path.join(output, 'session.json') } : {}),
  });
  const page = await context.newPage();
  const events = [];
  const results = [];
  const requests = {};
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/api/')) requests[pathname] = (requests[pathname] || 0) + 1;
  });
  page.on('pageerror', error => events.push({ type: 'pageerror', message: error.message }));
  page.on('response', response => {
    if (response.status() >= 400) events.push({ type: 'http', status: response.status(), url: response.url() });
  });
  page.setDefaultTimeout(20000);
  try {
    if (process.argv.includes('--business-entry-check')) {
      const assert = require('node:assert/strict');
      await page.goto(baseUrl + '/admin/jamaah', { timeout: 120000 });
      await page.getByRole('heading', { name: 'Data Jamaah', exact: true }).waitFor({ timeout: 60000 });
      assert.equal(await page.getByRole('button', { name: /Tambah Jamaah/ }).count(), 0);
      await page.screenshot({ path: path.join(output, 'jamaah-final.png') });
      await page.goto(baseUrl + '/admin/pembayaran/laporan', { timeout: 120000 });
      await page.getByRole('button', { name: /Create Invoice/ }).click();
      await page.getByRole('button', { name: 'Tambah Jamaah', exact: true }).click();
      await page.screenshot({ path: path.join(output, 'invoice-tambah-jamaah.png') });
      assert.deepEqual(events.filter(event => event.type === 'pageerror'), []);
      fs.writeFileSync(path.join(output, 'business-entry.json'), JSON.stringify({
        passed: ['retired button absent on Semua Jamaah', 'Create Invoice retains Tambah Jamaah category'], events,
      }, null, 2));
      console.log('Approved business entry checks passed; no form submitted');
      return;
    }
    if (process.argv.includes('--navigation-check')) {
      const assert = require('node:assert/strict');
      await page.goto(baseUrl + '/admin/manifest', { timeout: 120000 });
      const link = page.locator('a[href="/admin/manifest?type=pembayaran"]').first();
      await link.waitFor({ state: 'visible' });
      await link.click();
      await page.waitForURL('**/admin/manifest?type=pembayaran');
      await page.waitForTimeout(1000);
      const opacity = await page.evaluate(() => {
        let element = document.querySelector('main');
        let opacity = 1;
        while (element) {
          opacity *= Number(getComputedStyle(element).opacity);
          element = element.parentElement;
        }
        return opacity;
      });
      assert.equal(opacity, 1);
      await page.screenshot({ path: path.join(output, 'query-navigation.png'), fullPage: true });
      await page.goBack();
      assert.equal(new URL(page.url()).search, '');
      assert.deepEqual(events.filter(event => event.type === 'pageerror'), []);
      fs.writeFileSync(path.join(output, 'navigation.json'), JSON.stringify({ passed: ['same pathname query navigation remains visible', 'browser back'], events }, null, 2));
      console.log('Query navigation and browser back passed');
      return;
    }
    if (process.argv.includes('--public-check')) {
      const assert = require('node:assert/strict');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(baseUrl + '/login', { timeout: 120000 });
      await page.getByRole('button', { name: /Lewati Intro/ }).click().catch(() => {});
      await page.locator('input[type=email]').waitFor({ state: 'visible' });
      await page.locator('#password').fill('uji-tampilan');
      await page.getByRole('button', { name: 'Tampilkan password' }).click();
      assert.equal(await page.locator('#password').getAttribute('type'), 'text');
      await page.getByRole('button', { name: 'Sembunyikan password' }).click();
      assert.equal(await page.locator('#password').getAttribute('type'), 'password');
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(output, 'mobile-login-ready.png'), fullPage: true });
      await page.reload();
      await page.locator('input[type=email]').waitFor({ state: 'visible' });
      await page.getByRole('button', { name: '4 Portal Publik' }).click();
      await page.screenshot({ path: path.join(output, 'mobile-portals-ready.png'), fullPage: true });
      const link = page.locator('a[href="/register"]');
      const popupPromise = context.waitForEvent('page');
      await link.click({ modifiers: ['Control'] });
      const popup = await popupPromise;
      await popup.waitForURL('**/register');
      assert.equal(new URL(page.url()).pathname, '/login');
      await popup.close();
      await link.click();
      await page.waitForURL('**/register');
      await page.getByRole('button', { name: 'Selanjutnya', exact: true }).click();
      await page.getByText('Nama perwakilan wajib diisi', { exact: true }).waitFor();
      await page.screenshot({ path: path.join(output, 'mobile-register-validation.png'), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(events.filter(event => event.type === 'pageerror'), []);
      fs.writeFileSync(path.join(output, 'public-interactions.json'), JSON.stringify({
        passed: ['mobile login', 'password toggle', 'returning visitor hydration', 'mobile portal tabs', 'Ctrl+click new tab', 'portal navigation', 'registration validation', 'no horizontal overflow', 'no page errors'], events,
      }, null, 2));
      console.log('Public UI checks passed');
      return;
    }
    if (resume) {
      const routes = ['/admin/dashboard', '/admin/jamaah', '/admin/pembayaran/laporan',
        '/admin/keberangkatan', '/admin/dokumen', '/admin/pembayaran', '/admin/manifest',
        '/admin/rooming', '/admin/laporan', '/admin/pengaturan'];
      const menuGroups = {
        '/admin/jamaah': 'Jamaah', '/admin/keberangkatan': 'Paket Umroh',
        '/admin/dokumen': 'Jamaah', '/admin/pembayaran': 'Pembayaran & Keuangan',
        '/admin/pembayaran/laporan': 'Pembayaran & Keuangan',
        '/admin/manifest': 'Manifest', '/admin/rooming': 'Manifest',
      };
      for (const route of routes) {
        const start = Date.now();
        let response = null;
        if (route === routes[0]) {
          response = await page.goto(baseUrl + route, { timeout: 120000 });
        } else {
          const link = page.locator(`aside a[href="${route}"]`).first();
          if (!(await link.count()) && menuGroups[route]) {
            await page.getByRole('button', { name: menuGroups[route], exact: true }).first().click();
          }
          await link.click();
          await page.waitForURL(url => url.pathname === route);
        }
        await page.waitForTimeout(4000);
        await page.getByText('Memuat data operasional...', { exact: true }).first().waitFor({ state: 'hidden', timeout: 45000 }).catch(() => {});
        await page.waitForFunction(() => !/Memuat (data|paket|jamaah|dokumen|laporan|manifest|pengaturan)/i.test(document.body.innerText), null, { timeout: 45000 }).catch(() => {});
        const body = await page.locator('body').innerText();
        const result = { route, finalUrl: page.url(), status: response?.status() ?? null, elapsed: Date.now() - start,
          overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          text: body.slice(-2200) };
        results.push(result);
        console.log(JSON.stringify({ route, status: result.status, elapsed: result.elapsed, overflow: result.overflow }));
        await page.screenshot({ path: path.join(output, route.replaceAll('/', '_') + '.png'), fullPage: true });
        fs.writeFileSync(path.join(output, 'routes.json'), JSON.stringify({ results, events, requests }, null, 2));
      }
      await context.clearCookies();
      await page.evaluate(() => localStorage.clear());
      await page.setViewportSize({ width: 390, height: 844 });
      for (const route of ['/login', '/register', '/register/badal-umroh', '/register/wakaf-quran', '/track/badal-wakaf']) {
        await page.goto(baseUrl + route, { timeout: 120000 });
        await page.waitForTimeout(4000);
        await page.getByRole('button', { name: /Lewati Intro/ }).click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(2500);
        results.push({ route, viewport: 'mobile', finalUrl: page.url(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
        await page.screenshot({ path: path.join(output, 'mobile' + route.replaceAll('/', '_') + '.png'), fullPage: true });
        fs.writeFileSync(path.join(output, 'routes.json'), JSON.stringify({ results, events, requests }, null, 2));
      }
      return;
    }
    await page.goto(baseUrl + '/login', { timeout: 120000 });
    await page.waitForTimeout(10000);
    await page.screenshot({ path: path.join(output, 'login-desktop.png'), fullPage: true });
    console.log('Login form rendered');
    await page.locator('input[type=email]').fill(process.env.UI_AUDIT_EMAIL || 'admin@vtu.id');
    await page.locator('input[type=password]').fill(process.env.UI_AUDIT_PASSWORD || 'admin123');
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/admin/dashboard', { timeout: 120000 });
    await page.getByRole('heading', { name: 'Dashboard Operasional', exact: true }).waitFor({ timeout: 120000 });
    await page.waitForTimeout(1000);
    console.log('Dashboard rendered with operational data');
    await page.screenshot({ path: path.join(output, 'dashboard-desktop.png'), fullPage: true });
    fs.writeFileSync(path.join(output, 'session.json'), JSON.stringify(await context.storageState()));
    fs.writeFileSync(path.join(output, 'baseline.json'), JSON.stringify(events, null, 2));
    fs.writeFileSync(path.join(output, 'requests.json'), JSON.stringify(requests, null, 2));
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
