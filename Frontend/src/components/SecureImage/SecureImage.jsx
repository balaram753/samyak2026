import { useEffect, useState } from 'react';
import { isPrivateFileUrl, fetchPrivateFile } from '../../services/cloudApi';

/**
 * Drop-in <img> for files that may be private (ID cards, payment proofs).
 * Public URLs and data: URLs render as-is; private Worker URLs are fetched
 * with the signed-in user's token and shown through a temporary blob URL.
 */
export default function SecureImage({ src, alt = '', ...props }) {
  const isPrivate = isPrivateFileUrl(src);
  const [resolved, setResolved] = useState(isPrivate ? null : src);

  useEffect(() => {
    if (!isPrivate) {
      setResolved(src);
      return undefined;
    }
    let objectUrl = null;
    let cancelled = false;
    setResolved(null);
    fetchPrivateFile(src)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolved(objectUrl);
      })
      .catch((err) => console.warn('Private file load note:', err.message));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, isPrivate]);

  return <img src={resolved || undefined} alt={alt} {...props} />;
}
