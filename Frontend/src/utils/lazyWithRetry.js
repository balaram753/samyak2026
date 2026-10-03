import { lazy } from 'react';

/**
 * Enhanced React.lazy with automatic chunk-retry and deployment cache recovery.
 *
 * When a new deployment is pushed to production (e.g. Cloudflare / Firebase),
 * older clients may request stale JS chunks that return 404 / text/html fallback.
 * This wrapper catches those errors, cleans up stale state, and gracefully
 * reloads the window to fetch the new build assets.
 */
export function lazyWithRetry(componentImport, componentName = 'Component') {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem(`chunk_retry_${componentName}`) || 'false'
    );

    try {
      const module = await componentImport();
      // Reset the refresh flag upon successful import
      window.sessionStorage.removeItem(`chunk_retry_${componentName}`);
      return module;
    } catch (error) {
      console.warn(`[LazyRetry] Dynamic chunk import failed for ${componentName}:`, error);

      const errorMessage = String(error?.message || '');
      const isChunkOrMimeError =
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Failed to load module script') ||
        errorMessage.includes('Expected a JavaScript-or-Wasm module script') ||
        errorMessage.includes('error loading dynamically imported module') ||
        error?.name === 'ChunkLoadError';

      if (isChunkOrMimeError && !pageHasBeenForceRefreshed) {
        console.info(`[LazyRetry] Auto-refreshing page to load latest version of ${componentName}...`);
        window.sessionStorage.setItem(`chunk_retry_${componentName}`, 'true');
        window.location.reload();
        // Return a pending promise so the component doesn't attempt to render stale error state while reloading
        return new Promise(() => {});
      }

      // If already retried once and still fails, pass through to ErrorBoundary
      throw error;
    }
  });
}

export default lazyWithRetry;
