const test = require('node:test');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
test('product media parity, source guards and metadata invariants', () => {
  execFileSync(process.env.PYTHON || 'python3', [path.join(__dirname, 'product_media_test.py')], {stdio:'pipe'});
});
