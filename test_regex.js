const tests = [
  "~ 14 mil resultados",
  "1.200 anúncios",
  "~ 1,5 mil resultados",
  "14K ads",
  "1M results",
  "Nenhum anúncio encontrado",
  "0 resultados"
];

for (const text of tests) {
  if (/(?:^|\s)0\s*(resultados|results|anúncios|ads)/i.test(text) || /Nenhum anúncio|No ads/i.test(text)) {
    console.log(`[${text}] -> 0`);
    continue;
  }
  const match = text.match(/(?:~\s*)?([\d\.,]+)\s*(mil|k|mi|m)?\s*(?:resultados|results|anúncios|ads)/i);
  if (match) {
    let numStr = match[1].replace(/\./g, '').replace(/,/g, '.');
    let parsed = parseFloat(numStr);
    let multiplier = 1;
    const suffix = (match[2] || '').toLowerCase();
    if (suffix === 'mil' || suffix === 'k') multiplier = 1000;
    if (suffix === 'mi' || suffix === 'm') multiplier = 1000000;
    parsed = Math.round(parsed * multiplier);
    console.log(`[${text}] -> ${parsed}`);
  } else {
    console.log(`[${text}] -> NO MATCH`);
  }
}
