const { getDb } = require('./database');
getDb().then(db => db.run("DELETE FROM daily_counts WHERE offer_id = 60 AND date = '2026-06-04'")).then(() => console.log('Deleted')).catch(console.error);
