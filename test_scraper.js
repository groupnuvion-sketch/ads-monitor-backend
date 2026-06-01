const { runScraperForOffer } = require('./scraper');

(async () => {
  const offer = {
    id: 4,
    name: 'TESTE',
    url: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&sort_data[direction]=desc&sort_data[mode]=total_impressions&view_all_page_id=108760115291118'
  };
  console.log('Testing scraper locally...');
  await runScraperForOffer(offer);
  console.log('Done.');
  process.exit(0);
})();
