const { getDb } = require('./database');
getDb().then(db => db.run("UPDATE daily_counts SET date = '2026-06-03' WHERE offer_id = 60 AND date = '2026-06-04'")).then(() => console.log('Done')).catch(console.error);
