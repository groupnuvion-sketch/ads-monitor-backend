const { exiftool } = require('exiftool-vendored');
const fs = require('fs');

async function test() {
  console.log('Writing test file...');
  fs.writeFileSync('test.txt', 'dummy data');
  console.log('Testing exiftool...');
  try {
    await exiftool.write('test.txt', { all: '' });
    console.log('Exiftool write successful!');
  } catch (e) {
    console.error('Exiftool error:', e);
  } finally {
    exiftool.end();
  }
}
test();
