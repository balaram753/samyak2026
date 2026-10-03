-- SAMYAK content store (Cloudflare D1).
-- One JSON document per (collection, id), mirroring the old Firestore layout so
-- the site keeps the same shapes: events/<id>, site_content/about, media_files/<id>, ...
CREATE TABLE IF NOT EXISTS docs (
  collection TEXT NOT NULL,
  id         TEXT NOT NULL,
  data       TEXT NOT NULL,            -- JSON object
  created_at INTEGER NOT NULL,         -- ms since epoch
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS docs_by_collection_updated ON docs (collection, updated_at DESC);
