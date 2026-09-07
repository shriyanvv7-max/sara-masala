const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
function load(path, env = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, Buffer, process: { env }, require: id => {
    if (id === 'crypto') return crypto;
    if (id === 'razorpay') return { default: class {} };
    return {};
  } };
  vm.runInNewContext(source, context); return context.exports;
}
test('raw webhook bytes validate; changed whitespace or malformed signatures fail', () => {
  const { validSignature } = load('lib/payment-security.ts');
  const body = '{"event":"payment.captured"}'; const secret = 'unit-test-secret';
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(validSignature(body, signature, secret), true);
  assert.equal(validSignature(body + '\n', signature, secret), false);
  for (const invalid of ['', '0', 'g'.repeat(64), '0'.repeat(64)]) assert.equal(validSignature(body, invalid, secret), false);
});
test('keys must match and live mode requires explicit activation', () => {
  assert.throws(() => load('lib/razorpay.ts').getRazorpayConfig());
  const env = { RAZORPAY_KEY_ID: 'rzp_test_example', NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_test_example', RAZORPAY_KEY_SECRET: 'example' };
  assert.equal(load('lib/razorpay.ts', env).getRazorpayConfig().keyId, env.RAZORPAY_KEY_ID);
  assert.throws(() => load('lib/razorpay.ts', { ...env, NEXT_PUBLIC_RAZORPAY_KEY_ID: 'different' }).getRazorpayConfig());
  const live = { ...env, RAZORPAY_KEY_ID: 'rzp_live_example', NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_live_example' };
  assert.throws(() => load('lib/razorpay.ts', live).getRazorpayConfig());
  assert.equal(load('lib/razorpay.ts', { ...live, RAZORPAY_ALLOW_LIVE: 'true' }).getRazorpayConfig().keyId, live.RAZORPAY_KEY_ID);
});
test('shipping changes exactly at threshold and supports configuration', () => {
  const standard = load('lib/commerce.ts');
  assert.equal(standard.calculateShipping(798.99), 60); assert.equal(standard.calculateShipping(799), 0);
  const custom = load('lib/commerce.ts', { SHIPPING_FEE_INR: '80', FREE_SHIPPING_THRESHOLD_INR: '1000' });
  assert.equal(custom.calculateShipping(999), 80); assert.equal(custom.calculateShipping(1000), 0);
});
