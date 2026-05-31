const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  console.log('Navegando para o login...');
  await page.goto('https://www.auraxapp.com.br/login', { waitUntil: 'networkidle2' });
  
  console.log('Preenchendo credenciais...');
  // Tenta encontrar os campos de email e senha
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'flavioferst@gmail.com');
  
  await page.waitForSelector('input[type="password"]');
  await page.type('input[type="password"]', 'Brasil@2024');
  
  console.log('Enviando form...');
  await page.keyboard.press('Enter');
  
  console.log('Aguardando navegação...');
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  } catch(e) {
    console.log('Timeout ou sem navegação extra, esperando 5s...');
    await new Promise(r => setTimeout(r, 5000));
  }
  
  console.log('Indo para /offers...');
  await page.goto('https://www.auraxapp.com.br/offers', { waitUntil: 'networkidle2' });
  
  // Aguarda carregar algum conteudo dinâmico
  await new Promise(r => setTimeout(r, 5000));

  const html = await page.content();
  fs.writeFileSync('aurax_offers.html', html);
  
  await browser.close();
  console.log('Pronto! HTML salvo em aurax_offers.html');
})();
