export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const MAPPLS_TOKEN = import.meta.env.VITE_MAPPLS_ACCESS_TOKEN || '';
// Canonical production origin, used for canonical/OG URLs and structured data.
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://simplyticketz.com';
// Falls back to Google's published test key (always passes, shows a
// "for testing purposes only" watermark) so the widget still renders in
// local dev before a real site key is configured. Replace with a real key
// from https://www.google.com/recaptcha/admin for production.
export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
  '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';