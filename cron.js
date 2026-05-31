const cron = require('node-cron');
const { getDb } = require('./database');
const { runScraperForOffer } = require('./scraper');

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
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
  } catch (error) {
    console.error('Error running daily cron job:', error);
  }
});

console.log('Cron jobs initialized');
