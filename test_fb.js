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
  
  let url = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=%22FEEDLOOP.ONLINE%22&search_type=keyword_exact_phrase&sort_data%5Bmode%5D=all_ads_time_status&sort_data%5Bdirection%5D=asc&source=page-transparency-widget";

  console.log("Navigating...");
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 10000));
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log("Snippet length:", text ? text.length : 0);
  console.log("Snippet:", text ? text.substring(0, 300) : "EMPTY");
  
  const match = text ? text.match(/(?:~\s*)?([\d\.,]+)\s*(mil|k|mi|m)?\s*(?:resultados|results|anúncios|ads)/i) : null;
  console.log("Match:", match ? match[0] : null);
  
  await browser.close();
})();
