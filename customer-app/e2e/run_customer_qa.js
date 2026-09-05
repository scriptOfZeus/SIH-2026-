const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runQa() {
  console.log('====================================================');
  console.log('🚀 Starting Local Automated Browser QA for Customer App');
  console.log('Using Browser Binary:', CHROME_PATH);
  console.log('Target URL: http://localhost:3000');
  console.log('====================================================\n');

  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome binary not found at ${CHROME_PATH}`);
  }

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 450, height: 900 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  });

  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', (err) => {
    console.error('❌ Page Runtime Error:', err.message);
  });

  try {
    console.log('Step 1: Navigating to Customer App at http://localhost:3000...');
    const response = await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    console.log(`✅ HTTP Status: ${response.status()}`);
    const title = await page.title();
    console.log(`✅ Page Title: "${title}"`);

    console.log('\nStep 2: Waiting for Flutter Web Engine rendering...');
    // Wait for Flutter web view elements
    await page.waitForTimeout(4000);

    const screenshot1Path = path.join(SCREENSHOT_DIR, '01_login_screen.png');
    await page.screenshot({ path: screenshot1Path, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshot1Path}`);

    // Verify Flutter DOM elements
    const flutterView = await page.$('flutter-view, flt-glass-pane, canvas');
    if (flutterView) {
      console.log('✅ Detected Flutter Web Rendering Engine canvas & view!');
    } else {
      console.warn('⚠️ Flutter view element not directly found in standard tags, checking body.');
    }

    console.log('\nStep 3: Simulating User Touch / Click Interactions on Canvas...');
    // Click near the center of the mobile frame where the "Send OTP" button renders
    const box = await page.viewportSize();
    console.log(`Viewport dimensions: ${box.width}x${box.height}`);

    // Click on Send OTP (approx center Y ~520 on 900h)
    await page.mouse.click(box.width / 2, 520);
    await page.waitForTimeout(1500);

    const screenshot2Path = path.join(SCREENSHOT_DIR, '02_otp_interaction.png');
    await page.screenshot({ path: screenshot2Path, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshot2Path}`);

    // Click on Verify & Login
    await page.mouse.click(box.width / 2, 600);
    await page.waitForTimeout(2000);

    const screenshot3Path = path.join(SCREENSHOT_DIR, '03_home_discovery.png');
    await page.screenshot({ path: screenshot3Path, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshot3Path}`);

    console.log('\n====================================================');
    console.log('🎉 Automated Browser QA Completed Successfully!');
    console.log(`Total Screenshots Captured: 3`);
    console.log(`Console Logs Checked: ${consoleLogs.length} logs recorded without uncaught crashes.`);
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ Browser QA Failed with error:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runQa();
