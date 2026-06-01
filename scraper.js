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

    await page.goto(offer.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const resultObj = await page.waitForFunction(() => {
      const elements = Array.from(document.querySelectorAll('div, span, h1, h2, h3'));
      for (const el of elements) {
        const text = el.innerText || '';
        const match = text.match(/(?:~\s*)?([\d\.,]+)\s*(?:resultados|results|anúncios|ads)/i);
        if (match && match[1]) {
          const cleanNumber = match[1].replace(/[\.,]/g, '');
          const parsed = parseInt(cleanNumber, 10);
          if (!isNaN(parsed) && parsed > 0 && parsed < 1000000) {
            return { count: parsed };
          }
        }
      }
      
      for (const el of elements) {
        const text = el.innerText || '';
        if (/0\s*(resultados|results|anúncios|ads)/i.test(text) || text.includes('Nenhum anúncio') || text.includes('No ads')) {
           return { count: 0 };
        }
      }
      
      return false;
    }, { timeout: 20000, polling: 500 }).catch(() => null);

    let count = 0;
    if (resultObj) {
      const data = await resultObj.jsonValue();
      count = data.count;
    }

    console.log(`Found ${count} ads for ${offer.name}`);

    if (count !== null) {
      const db = await getDb();
      const today = new Date().toISOString().split('T')[0];
      
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
