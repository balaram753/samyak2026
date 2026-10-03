/**
 * Content documents stored in Cloudflare D1 via the SAMYAK Worker.
 *
 * Mirrors the small slice of Firestore the site used (get / list / set / add /
 * delete / subscribe) so pages keep the same data shapes:
 *   events/<id>, site_content/<about|schedule|contact|sponsors|department_filters>,
 *   media_folders/<id>, media_files/<id>, gallery_photos/<id>, inquiries/<id>, club_reports/<id>
 *
 * D1 has no push updates, so subscriptions poll (and refresh immediately after
 * any local write, including writes from other tabs).
 */
import { cloudFetch, CloudApiError, isCloudConfigured } from './cloudApi';

const POLL_MS = 20_000;
const changeBus = new EventTarget();
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('samyak_content_bus')
  : null;

if (channel) {
  channel.onmessage = (e) => {
    if (e.data?.collection) changeBus.dispatchEvent(new CustomEvent('change', { detail: e.data.collection }));
  };
}

function announceChange(collection) {
  changeBus.dispatchEvent(new CustomEvent('change', { detail: collection }));
  try { channel?.postMessage({ collection }); } catch { /* closed channel */ }
}

function path(collection, id) {
  return `/api/content/${encodeURIComponent(collection)}${id ? `/${encodeURIComponent(id)}` : ''}`;
}

function listQuery(where = {}, limit) {
  const params = new URLSearchParams();
  for (const [field, value] of Object.entries(where)) {
    if (value !== undefined && value !== null) params.set(`where.${field}`, String(value));
  }
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function getContentDoc(collection, id) {
  if (!isCloudConfigured()) return null;
  try {
    return await cloudFetch(path(collection, id));
  } catch (err) {
    if (err instanceof CloudApiError && err.status === 404) return null;
    throw err;
  }
}

/** Newest first (by last update). `where` does exact-match filtering. */
export function listContent(collection, { where, limit } = {}) {
  if (!isCloudConfigured()) return Promise.resolve([]);
  return cloudFetch(path(collection) + listQuery(where, limit));
}

/** Creates or updates a document. Merges into the existing one by default. */
export async function setContentDoc(collection, id, data, { merge = true } = {}) {
  if (!isCloudConfigured()) {
    announceChange(collection);
    return data;
  }
  const saved = await cloudFetch(path(collection, id), { method: 'PUT', body: { data, merge } });
  announceChange(collection);
  return saved;
}

/** Creates a document with a server-generated id. */
export async function addContentDoc(collection, data) {
  if (!isCloudConfigured()) {
    announceChange(collection);
    return data;
  }
  const saved = await cloudFetch(path(collection), { method: 'POST', body: { data } });
  announceChange(collection);
  return saved;
}

export async function deleteContentDoc(collection, id) {
  if (!isCloudConfigured()) {
    announceChange(collection);
    return;
  }
  await cloudFetch(path(collection, id), { method: 'DELETE' });
  announceChange(collection);
}

function subscribe(collection, load, onData, onError) {
  let stopped = false;
  let inFlight = false;
  let rerun = false;
  const run = async () => {
    if (stopped) return;
    // A load started before a local write may return pre-write data:
    // remember the request and load again once it finishes.
    if (inFlight) { rerun = true; return; }
    inFlight = true;
    try {
      const data = await load();
      if (!stopped && !rerun) onData(data);
    } catch (err) {
      if (!stopped && !rerun) onError?.(err);
    } finally {
      inFlight = false;
      if (rerun && !stopped) { rerun = false; run(); }
    }
  };

  if (!isCloudConfigured()) {
    run();
    const onChange = (e) => { if (e.detail === collection) run(); };
    changeBus.addEventListener('change', onChange);
    return () => {
      stopped = true;
      changeBus.removeEventListener('change', onChange);
    };
  }

  const onChange = (e) => { if (e.detail === collection) run(); };
  const onVisible = () => { if (document.visibilityState === 'visible') run(); };

  run();
  const timer = setInterval(() => { if (document.visibilityState !== 'hidden') run(); }, POLL_MS);
  changeBus.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    stopped = true;
    clearInterval(timer);
    changeBus.removeEventListener('change', onChange);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

/** Calls onData(doc | null) now and whenever the document may have changed. */
export function subscribeContentDoc(collection, id, onData, onError) {
  return subscribe(collection, () => getContentDoc(collection, id), onData, onError);
}

/** Calls onData(docs[]) now and whenever the collection may have changed. */
export function subscribeContent(collection, options, onData, onError) {
  return subscribe(collection, () => listContent(collection, options), onData, onError);
}
