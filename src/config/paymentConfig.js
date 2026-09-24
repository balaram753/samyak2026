/**
 * SAMYAK 2026 — Authoritative Payment Configuration & UPI URI Utilities
 * 
 * Strict standards-compliant UPI deep link configuration:
 * upi://pay?pa=<UPI_ID>&pn=<MERCHANT_NAME>&am=<AMOUNT>&cu=INR
 */

export const PAYMENT_CONFIG = {
  // Real merchant UPI configuration from environment variables with verified fallback
  MERCHANT_UPI_ID: ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MERCHANT_UPI_ID) || (typeof process !== 'undefined' && process.env?.VITE_MERCHANT_UPI_ID) || 'samyak2026@sbi').trim(),
  MERCHANT_NAME: ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MERCHANT_NAME) || (typeof process !== 'undefined' && process.env?.VITE_MERCHANT_NAME) || 'SAMYAK 2026').trim(),
  CURRENCY: ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_REGISTRATION_CURRENCY) || (typeof process !== 'undefined' && process.env?.VITE_REGISTRATION_CURRENCY) || 'INR').trim(),

  // Authoritative single-time unified pass
  PASS_TIERS: [
    {
      id: 'event-fee-pass',
      name: 'PAY EVENT FEE & PASS',
      price: 499,
      features: [
        'Complete 3-Day Fest Entry & Grand Stages Access',
        'Direct Participation in All Registered Events & Competitions',
        'Official SAMYAK 2026 QR Gate Pass & Check-In',
        'Digital Certificate of Participation & Delegate Kit'
      ],
      badge: 'All-In-One Pass',
      recommended: true
    }
  ]
};

/**
 * Builds a standards-compliant UPI deep link URL.
 * 
 * Format:
 * upi://pay?pa=<UPI_ID>&pn=<MERCHANT_NAME>&am=<AMOUNT>&cu=INR
 * 
 * Rules:
 * - Uses URLSearchParams for robust RFC-compliant parameter encoding.
 * - Replaces '+' with '%20' for cross-app compatibility (GPay, PhonePe, Paytm, BHIM).
 * - am is strictly formatted to 2 decimal places (e.g. 500.00).
 * - Never includes user details, tokens, or sensitive client data in the payment QR.
 * 
 * @param {Object} options
 * @param {string} options.pa - Merchant VPA / UPI ID
 * @param {string} options.pn - Merchant Display Name
 * @param {number|string} options.am - Payment Amount
 * @param {string} [options.cu='INR'] - Currency code
 * @returns {string|null} Full upi://pay?... URI or null if invalid
 */
export function buildUpiPaymentUri({ pa, pn, am, cu = 'INR' }) {
  if (!pa || !pa.trim()) {
    return null;
  }

  const cleanPa = pa.trim();
  const cleanPn = (pn || 'SAMYAK 2026').trim();
  const numericAmount = Number(am);

  if (isNaN(numericAmount) || numericAmount <= 0) {
    return null;
  }

  const cleanAm = numericAmount.toFixed(2);
  const cleanCu = (cu || 'INR').trim().toUpperCase();

  const params = new URLSearchParams({
    pa: cleanPa,
    pn: cleanPn,
    am: cleanAm,
    cu: cleanCu
  });

  // Cross-app UPI compatibility: convert '+' to '%20'
  const queryString = params.toString().replace(/\+/g, '%20');
  return `upi://pay?${queryString}`;
}

/**
 * Validates and parses an existing upi://pay URI to verify integrity.
 * @param {string} uri 
 * @returns {Object|null}
 */
export function parseUpiPaymentUri(uri) {
  if (!uri || typeof uri !== 'string' || !uri.startsWith('upi://pay?')) {
    return null;
  }

  try {
    const rawQuery = uri.slice('upi://pay?'.length);
    const searchParams = new URLSearchParams(rawQuery);

    const pa = searchParams.get('pa');
    const pn = searchParams.get('pn');
    const am = searchParams.get('am');
    const cu = searchParams.get('cu');

    if (!pa || !pn || !am || !cu) {
      return null;
    }

    return {
      isValid: true,
      pa,
      pn,
      am,
      cu,
      numericAmount: parseFloat(am)
    };
  } catch {
    return null;
  }
}

/**
 * Validates the runtime payment configuration.
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validatePaymentConfig() {
  const upiId = PAYMENT_CONFIG.MERCHANT_UPI_ID;
  if (!upiId || !upiId.includes('@') || upiId.length < 5) {
    return {
      isValid: false,
      error: 'Invalid or missing merchant UPI ID in configuration.'
    };
  }

  return { isValid: true };
}
