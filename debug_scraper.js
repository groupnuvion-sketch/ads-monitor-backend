const puppeteer = require('puppeteer');

async function testUrl() {
  const url = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&is_targeted_country=false&media_type=all&search_type=keyword_unordered&q=DIABETES";
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=pt-BR,pt']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' });

    console.log("Navigating to URL...");
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const fullText = await page.evaluate(() => document.body.innerText);
    require('fs').writeFileSync('page_text.txt', fullText);
    console.log('Saved page text to page_text.txt');
    return;
    const match = text.match(/.{0,50}(resultados|results|anúncios|ads|Nenhum anúncio|No ads).{0,50}/gi);
    console.log(match);
    
    console.log("==== REGEX TEST ====");
    const match2 = text.match(/(?:~\s*)?([\d\.,]+)\s*(mil|k|mi|m)?\s*(?:resultados|results|anúncios|ads)/i);
    console.log("Match2:", match2);

    await page.screenshot({path: 'C:/Users/User/.gemini/antigravity/scratch/fb_screenshot.png', fullPage: true});
  } catch (error) {
    console.error(error);
  } finally {
    if (browser) await browser.close();
  }
}
testUrl();
