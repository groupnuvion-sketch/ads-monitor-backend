async function test() {
  try {
    const regRes = await fetch('http://localhost:3001/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser' + Date.now(), password: '123' })
    });
    const regData = await regRes.json();
    const token = regData.token;

    const offerRes = await fetch('http://localhost:3001/api/offers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        name: 'Test Offer',
        url: 'https://facebook.com',
        site_url: '',
        checkout_url: '',
        tags: ['test'],
        idiomas: ['BR']
      })
    });
    
    if (offerRes.ok) {
      console.log('Success:', await offerRes.json());
    } else {
      console.error('Error:', await offerRes.text());
    }
  } catch (err) {
    console.error('Network/Internal Error:', err);
  }
}
test();
