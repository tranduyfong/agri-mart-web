export const getFileUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return (
    (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '') +
    '/' +
    url.replace(/^\//, '')
  );
};
