const fs = require('fs');
const { exiftool } = require('exiftool-vendored');

async function test() {
  fs.writeFileSync('test_image.jpg', 'fake image data');
  try {
    console.log('Writing metadata...');
    await exiftool.write('test_image.jpg', { all: '' });
    console.log('Done.');
    console.log('Exists?', fs.existsSync('test_image.jpg'));
  } catch (e) {
    console.error(e);
  } finally {
    exiftool.end();
  }
}
test();
