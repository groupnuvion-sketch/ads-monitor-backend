const { getDb } = require('./database');
const { runScraperForOffer } = require('./scraper');

async function runDailyScraper() {
  console.log('Running daily scraper job...');
  try {
    const db = await getDb();
    const offers = await db.all('SELECT * FROM offers');
    
    for (const offer of offers) {
      console.log(`Scraping offer: ${offer.name}`);
      await runScraperForOffer(offer);
      // Wait a bit between requests to avoid rate limits
      await new Promise(res => setTimeout(res, 5000));
    }
    console.log('Daily scraper job completed.');
    return { success: true, count: offers.length };
  } catch (error) {
    console.error('Error running daily cron job:', error);
    throw error;
  }
}

module.exports = { runDailyScraper };
