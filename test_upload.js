const fs = require('fs');

async function test() {
  const fetch = (await import('node-fetch')).default;
  const FormData = require('form-data');
  
  // Register first to get a token
  const regRes = await fetch('http://localhost:3001/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser' + Date.now(), password: '123' })
  });
  const regData = await regRes.json();
  const token = regData.token;

  // Create a dummy image file
  fs.writeFileSync('test.jpg', Buffer.alloc(100));

  const formData = new FormData();
  formData.append('file', fs.createReadStream('test.jpg'));

  try {
    const res = await fetch('http://localhost:3001/api/clean-metadata', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    if (res.ok) {
      console.log('Success!', res.status);
    } else {
      console.error('Error:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}
test();
