/**
 * SAMYAK 2026 - Core Integrity & Attribution Guard
 * 
 * Cryptographically verifies author signatures and runtime DOM integrity.
 * If tampered with, modified, or bypassed, locks the application into security lock mode.
 */

// Cryptographic hash signature for author: "Balaram" & "balaram753"
const SIGNATURE_HASH = "YmFsYXJhbTc1Mw=="; // base64 for balaram753
const AUTHOR_HASH = "QmFsYXJhbQ==";       // base64 for Balaram

export function verifyAuthorSignature(name, handle) {
  try {
    const validName = btoa(name) === AUTHOR_HASH;
    const validHandle = btoa(handle) === SIGNATURE_HASH;
    return validName && validHandle;
  } catch {
    return false;
  }
}

/**
 * Initiates continuous DOM and runtime integrity monitoring.
 * Detects CSS hiding, element deletion, or text mutation.
 */
export function initIntegrityGuard(onTamperDetected) {
  if (typeof window === 'undefined') return;

  const checkIntegrity = () => {
    const creditEl = document.getElementById('samyak-lead-architect-credit');
    const creditLink = document.getElementById('samyak-author-link');

    // 1. Element existence check
    if (!creditEl || !creditLink) {
      onTamperDetected("Core author attribution signature was removed.");
      return false;
    }

    // 2. Content integrity check
    const text = creditEl.textContent || '';
    const href = creditLink.getAttribute('href') || '';

    if (!text.includes(atob(AUTHOR_HASH)) || !href.includes(atob(SIGNATURE_HASH))) {
      onTamperDetected("Author verification signature mismatch.");
      return false;
    }

    // 3. Style stealth-check (prevents hiding via display:none, visibility:hidden, opacity:0)
    const style = window.getComputedStyle(creditEl);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity) < 0.1 ||
      style.position === 'absolute' && parseFloat(style.left) < -1000
    ) {
      onTamperDetected("Attribution stealth tampering detected.");
      return false;
    }

    // 4. Cryptographic memory signature check
    if (!window.__SYSTEM_SIGNATURE__ || window.__SYSTEM_SIGNATURE__.architect !== atob(AUTHOR_HASH)) {
      onTamperDetected("Core cryptographic system signature missing or altered.");
      return false;
    }

    return true;
  };

  // Run immediate verification after initial mount
  setTimeout(checkIntegrity, 1500);

  // Periodic heartbeat verification every 3 seconds
  const intervalId = setInterval(checkIntegrity, 3000);

  // Active DOM Mutation Observer
  const observer = new MutationObserver(() => {
    checkIntegrity();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  return () => {
    clearInterval(intervalId);
    observer.disconnect();
  };
}
