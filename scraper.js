const puppeteer = require('puppeteer');
const { getDb } = require('./database');

async function runScraperForOffer(offer) {
  let browser;
  try {
    console.log(`Starting browser to scrape ${offer.url}`);
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=pt-BR,pt']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' });

    await page.goto(offer.url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const resultObj = await page.waitForFunction(() => {
      const text = document.body.innerText || '';
      if (/(?:^|\s)0\s*(resultados|results|anúncios|ads)/i.test(text) || /Nenhum anúncio|No ads/i.test(text)) {
        return { count: 0 };
      }
      const match = text.match(/(?:~\s*)?([\d\.,]+)\s*(mil|k|mi|m)?\s*(?:resultados|results|anúncios|ads)/i);
      if (match && match[1]) {
        let numStr = match[1].replace(/\./g, '').replace(/,/g, '.');
        let parsed = parseFloat(numStr);
        let multiplier = 1;
        const suffix = (match[2] || '').toLowerCase();
        if (suffix === 'mil' || suffix === 'k') multiplier = 1000;
        if (suffix === 'mi' || suffix === 'm') multiplier = 1000000;
        parsed = Math.round(parsed * multiplier);
        if (!isNaN(parsed) && parsed > 0) {
          return { count: parsed };
        }
      }
      return false;
    }, { timeout: 20000, polling: 1000 }).catch(() => null);

    let count = 0;
    if (resultObj) {
      const data = await resultObj.jsonValue();
      count = data.count;
    }

    console.log(`Found ${count} ads for ${offer.name}`);

    if (count !== null) {
      const db = await getDb();
      const today = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
      
      await db.run(`
        INSERT INTO daily_counts (offer_id, count, date) 
        VALUES (?, ?, ?)
        ON CONFLICT(offer_id, date) DO UPDATE SET count = excluded.count
      `, [offer.id, count, today]);
    }

  } catch (error) {
    console.error(`Failed to scrape offer ${offer.name}: `, error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { runScraperForOffer };
