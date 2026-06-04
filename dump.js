const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=pt-BR,pt']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  await page.goto("https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=%22FEEDLOOP.ONLINE%22&search_type=keyword_exact_phrase&sort_data%5Bmode%5D=all_ads_time_status&sort_data%5Bdirection%5D=asc&source=page-transparency-widget", { waitUntil: 'networkidle2', timeout: 30000 });
  
  await new Promise(r => setTimeout(r, 10000));
  const html = await page.content();
  require('fs').writeFileSync('debug.html', html);
  console.log("Dumped HTML, length:", html.length);
  await browser.close();
})();
