const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=pt-BR,pt']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  let url = new URL("https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&sort_data[mode]=total_impressions&sort_data[direction]=desc&source=page-transparency-widget&view_all_page_id=110710602093109");
  url.searchParams.set('sort_data[direction]', 'asc');
  url.searchParams.set('sort_data[mode]', 'all_ads_time_status');
  console.log("Navigating to " + url.toString());
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 10000));
  await page.screenshot({ path: 'screenshot2.png' });
  const text = await page.evaluate(() => document.body.innerText);
  
  // Debug text snippet
  console.log("Snippet length:", text ? text.length : 0);
  console.log("Snippet:", text ? text.substring(0, 300) : "EMPTY");
  
  const match = text ? text.match(/(?:~\s*)?([\d\.,]+)\s*(mil|k|mi|m)?\s*(?:resultados|results|anúncios|ads)/i) : null;
  console.log("Match:", match);
  await browser.close();
})();
