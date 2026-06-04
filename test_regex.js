const text = 'Started running on Jun 2, 2026 · Total active time 22 hrs';
console.log(text.match(/(?:Started running on)\s*([A-Za-z]+)\s*(\d{1,2}),\s*(\d{4})/i));
