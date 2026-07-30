"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// Minimal typing for the pieces of the grecaptcha global we actually use.
declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => number;
      reset: (widgetId?: number) => void;
    };
    onRecaptchaApiLoad?: () => void;
  }
}

const SCRIPT_ID = "google-recaptcha-api";
let apiLoadPromise: Promise<void> | null = null;

/**
 * Loads the Google reCAPTCHA v2 ("I'm not a robot") script exactly once,
 * regardless of how many <Recaptcha /> instances are mounted. Implemented
 * as a plain <script> load (rather than the react-google-recaptcha package)
 * since it needs no extra dependency - the widget is just a container div
 * that google's script renders into via window.grecaptcha.render().
 */
function loadRecaptchaApi(): Promise<void> {
  if (window.grecaptcha) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve, reject) => {
    window.onRecaptchaApiLoad = () => resolve();

    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      "https://www.google.com/recaptcha/api.js?onload=onRecaptchaApiLoad&render=explicit";
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });

  return apiLoadPromise;
}

export interface RecaptchaHandle {
  /** Clears the checked state so the user must re-verify (e.g. after a failed submit). */
  reset: () => void;
}

interface RecaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

/**
 * Renders Google's "I'm not a robot" reCAPTCHA v2 checkbox widget.
 * Calls `onVerify` with the response token once the user completes the
 * challenge, and `onExpire` if that token later expires.
 */
const Recaptcha = forwardRef<RecaptchaHandle, RecaptchaProps>(({
  siteKey,
  onVerify,
  onExpire,
  className,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [error, setError] = useState(false);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current !== null) {
        window.grecaptcha?.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;

    loadRecaptchaApi()
      .then(() => {
        if (cancelled || !containerRef.current || !window.grecaptcha) return;
        // Guard against double-render in React StrictMode / re-mounts.
        if (widgetIdRef.current !== null) return;

        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onVerify(token),
          "expired-callback": () => onExpire?.(),
          "error-callback": () => setError(true),
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) {
    return (
      <p className="text-sm text-red-500">
        reCAPTCHA is not configured (missing VITE_RECAPTCHA_SITE_KEY).
      </p>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} />
      {error && (
        <p className="text-sm text-red-500 mt-1">
          Couldn't load the "I'm not a robot" check. Please refresh and try
          again.
        </p>
      )}
    </div>
  );
});

Recaptcha.displayName = "Recaptcha";

export default Recaptcha;
