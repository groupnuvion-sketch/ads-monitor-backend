const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { getDb } = require('./database');

async function runScraperForOffer(offer) {
  let browser;
  try {
    let finalUrl = offer.url;
    try {
      let u = new URL(offer.url);
      u.searchParams.set('sort_data[direction]', 'asc');
      u.searchParams.set('sort_data[mode]', 'all_ads_time_status');
      finalUrl = u.toString();
    } catch(e) {}

    console.log(`Starting browser to scrape ${finalUrl}`);
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=pt-BR,pt']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' });

    await page.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for the page to render (mirroring test_fb.js which worked)
    await new Promise(r => setTimeout(r, 10000));
    
    const text = await page.evaluate(() => document.body.innerText);
    let match = text ? text.match(/(?:~\s*)?([\d\.,]+)\s*(mil|k|mi|m)?\s*(?:resultados|results|anúncios|ads)/i) : null;
    let resultObj = match ? { text } : null;

    if (!resultObj && text && text.match(/0\s*(resultados|results|anúncios|ads)/i)) {
      resultObj = { text };
    }

    if (!resultObj) {
      console.log(`Failed to find count for ${offer.name}. Page may have been blocked or format changed.`);
      return;
    }
    
    const data = await page.evaluate((text) => {
      if (/(?:^|\s)0\s*(resultados|results|anúncios|ads)/i.test(text) || /Nenhum anúncio|No ads/i.test(text)) {
        return { count: 0, oldestDate: null };
      }

      const match = text.match(/(?:~\s*)?([\d\.,]+)\s*(mil|k|mi|m)?\s*(?:resultados|results|anúncios|ads)/i);
      let count = 0;
      if (match) {
        let numStr = match[1].replace(/\./g, '').replace(/,/g, '');
        count = parseInt(numStr, 10);
        if (match[2]) {
           const mult = match[2].toLowerCase();
           if (mult.includes('mil') || mult.includes('k')) count *= 1000;
           else if (mult.includes('mi') || mult.includes('m')) count *= 1000000;
        }
      }

      let oldestDate = null;
      const dateMatch = text.match(/(?:Iniciou a veiculação em|Veicula\u00e7\u00e3o iniciada em|Veiculação iniciada em|Started running on)\s*(\d{1,2})\s*de\s*([A-Za-zç]+)\.?\s*de\s*(\d{4})/i);
      if (dateMatch) {
        const day = dateMatch[1];
        const monthName = dateMatch[2].toLowerCase();
        const year = dateMatch[3];
        
        const months = {
          'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
          'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
          'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04', 'maio': '05', 'junho': '06',
          'julho': '07', 'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
        };
        
        let month = '01';
        for (const [key, val] of Object.entries(months)) {
          if (monthName.startsWith(key)) {
            month = val;
            break;
          }
        }
        oldestDate = `${year}-${month}-${day.padStart(2, '0')}`;
      } else {
        const dateMatchEn = text.match(/(?:Started running on)\s*([A-Za-z]+)\s*(\d{1,2}),?\s*(\d{4})/i);
        if (dateMatchEn) {
          const monthName = dateMatchEn[1].toLowerCase();
          const day = dateMatchEn[2];
          const year = dateMatchEn[3];
          
          const monthsEn = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
            'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
          };
          
          let month = '01';
          for (const [key, val] of Object.entries(monthsEn)) {
            if (monthName.startsWith(key)) {
              month = val;
              break;
            }
          }
          oldestDate = `${year}-${month}-${day.padStart(2, '0')}`;
        }
      }

      return { count, oldestDate };
    }, resultObj.text);

    const db = await getDb();
    const options = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' };
    const brDate = new Intl.DateTimeFormat('pt-BR', options).format(new Date());
    const [day, month, year] = brDate.split('/');
    const today = `${year}-${month}-${day}`;
    
    // Deleta os counts 50 que eu coloquei manualmente agora pouco
    await db.run('DELETE FROM daily_counts WHERE offer_id = ? AND count = 50 AND date = ?', [offer.id, today]);

    const existingCount = await db.get('SELECT count FROM daily_counts WHERE offer_id = ? AND date = ?', [offer.id, today]);
    
    if (existingCount) {
      await db.run('UPDATE daily_counts SET count = ? WHERE offer_id = ? AND date = ?', [data.count, offer.id, today]);
    } else {
      await db.run('INSERT INTO daily_counts (offer_id, count, date) VALUES (?, ?, ?)', [offer.id, data.count, today]);
    }

    if (data.oldestDate) {
      await db.run('UPDATE offers SET oldest_ad_date = ? WHERE id = ?', [data.oldestDate, offer.id]);
    }

    console.log(`Updated count for ${offer.name} to ${data.count} on ${today}`);
  } catch (error) {
    console.log(`Failed to scrape offer ${offer.name} : `, error);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { runScraperForOffer };
