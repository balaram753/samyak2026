import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { buildUpiPaymentUri, parseUpiPaymentUri, PAYMENT_CONFIG } from './src/config/paymentConfig.js';

async function testTier(tier) {
  console.log(`\n======================================================`);
  console.log(`TESTING PAYMENT QR FOR: ${tier.name} (₹${tier.price})`);
  console.log(`======================================================`);

  // 1. Build URI
  const upiUri = buildUpiPaymentUri({
    pa: PAYMENT_CONFIG.MERCHANT_UPI_ID,
    pn: PAYMENT_CONFIG.MERCHANT_NAME,
    am: tier.price,
    cu: PAYMENT_CONFIG.CURRENCY,
  });

  console.log(`Generated URI: ${upiUri}`);

  // Assert URI starts with upi://pay?
  if (!upiUri.startsWith('upi://pay?')) {
    throw new Error(`FAIL: URI does not start with upi://pay?: ${upiUri}`);
  }

  // 2. Generate standard QR Code as PNG Buffer
  const pngBuffer = await QRCode.toBuffer(upiUri, {
    width: 512,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  // 3. Decode QR Code using jsQR
  const png = PNG.sync.read(pngBuffer);
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

  if (!code) {
    throw new Error(`FAIL: jsQR failed to decode the generated QR buffer!`);
  }

  console.log(`Decoded QR Content: "${code.data}"`);

  // Assertions
  if (!code.data.startsWith('upi://pay?')) {
    throw new Error(`FAIL: Decoded content does NOT start with upi://pay?! Got: "${code.data}"`);
  }

  const parsed = parseUpiPaymentUri(code.data);
  if (!parsed || !parsed.isValid) {
    throw new Error(`FAIL: Decoded content could not be parsed as valid UPI URI!`);
  }

  console.log(`Parsed Parameters:`, parsed);

  if (parsed.pa !== 'samyak2026@sbi' && parsed.pa !== 'samyak2026%40sbi') {
    throw new Error(`FAIL: Expected pa to be samyak2026@sbi, got: ${parsed.pa}`);
  }

  if (parsed.pn !== 'SAMYAK 2026' && parsed.pn !== 'SAMYAK%202026') {
    throw new Error(`FAIL: Expected pn to be SAMYAK 2026, got: ${parsed.pn}`);
  }

  const expectedAm = Number(tier.price).toFixed(2);
  if (parsed.am !== expectedAm) {
    throw new Error(`FAIL: Expected am to be ${expectedAm}, got: ${parsed.am}`);
  }

  if (parsed.cu !== 'INR') {
    throw new Error(`FAIL: Expected cu to be INR, got: ${parsed.cu}`);
  }

  console.log(`✓ PASS: ${tier.name} QR decodes perfectly with all required UPI parameters!`);
}

async function run() {
  for (const tier of PAYMENT_CONFIG.PASS_TIERS) {
    await testTier(tier);
  }
  console.log(`\n🎉 ALL TIERS PASSED PAYMENT QR STANDARDS-COMPLIANCE VERIFICATION!\n`);
}

run().catch((err) => {
  console.error(`\n❌ VERIFICATION FAILED:`, err);
  process.exit(1);
});
