
export const checkConnection = async (): Promise<boolean> => {
  // Check if Navigator reports offline (web/standard)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  try {
    // Fetch a small, known resource that supports CORS, like Google's favicon
    // or just use a very fast timeout on a HEAD request to a common domain.
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });
    clearTimeout(id);
    return !!response;
  } catch (e) {
    return false;
  }
};
