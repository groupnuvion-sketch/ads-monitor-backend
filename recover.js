const { getDb } = require('./database');
const { runScraperForOffer } = require('./scraper');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function recover() {
  console.log('Iniciando recuperação de dados...');
  const db = await getDb();
  const offers = await db.all('SELECT * FROM offers');
  
  for (let i = 0; i < offers.length; i++) {
    const offer = offers[i];
    console.log(`[${i+1}/${offers.length}] Lendo oferta: ${offer.name}`);
    try {
      await runScraperForOffer(offer);
      console.log(`Oferta ${offer.name} recuperada com sucesso!`);
    } catch (e) {
      console.error(`Erro ao ler ${offer.name}:`, e.message);
    }
    // Aguarda 8 segundos para evitar bloqueio do Facebook
    await sleep(8000);
  }
  
  console.log('Recuperação finalizada!');
}

recover().catch(console.error);
