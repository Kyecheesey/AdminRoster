import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const DISMISSED_KEY = "rosterme_install_dismissed";

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  // iPadOS 13+ reports itself as a Mac, but it's the only "Mac" with touch
  (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

/**
 * Tracks whether the app can be installed on this device.
 *
 * Chrome and Edge hand us a `beforeinstallprompt` event we can replay on a tap.
 * iOS Safari never fires it and has no API at all, so there the only honest
 * option is to show the user where the Share menu item lives.
 */
export function useInstall() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault(); // stop the mini-infobar; we ask at a moment we choose
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return false;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null); // the event is single-use, whatever they chose
    return true;
  };

  return {
    installed,
    canPrompt: Boolean(deferred),
    needsIOSHelp: !installed && isIOS() && !deferred,
    available: !installed && (Boolean(deferred) || isIOS()),
    install,
  };
}

/** Walks an iPhone/iPad user through Share → Add to Home Screen. */
export function IOSInstallSheet({ onClose }) {
  return createPortal(
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <h2>Add RosterME to your Home Screen</h2>
        <ol className="ios-steps">
          <li>
            <span className="step-n">1</span>
            <span>
              Tap the <strong>Share</strong> button
              <svg className="ios-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 15V3m0 0L8.5 6.5M12 3l3.5 3.5" />
                <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
              </svg>
              at the bottom of Safari.
            </span>
          </li>
          <li>
            <span className="step-n">2</span>
            <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
          </li>
          <li>
            <span className="step-n">3</span>
            <span>Tap <strong>Add</strong>. RosterME now opens like any other app.</span>
          </li>
        </ol>
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * A quiet, dismissible invitation to install. Shown once — if someone waves it
 * away, we remember and don't ask again.
 */
export function InstallBanner({ tone = "dark" }) {
  const { available, canPrompt, install } = useInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [showIOS, setShowIOS] = useState(false);

  if (!available || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* private browsing — it just asks again next time */
    }
  };

  return (
    <>
      <div className={`install-banner ${tone}`}>
        <span className="ib-ic" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="2" width="12" height="20" rx="3" />
            <path d="M12 6v7m0 0-2.5-2.5M12 13l2.5-2.5" />
          </svg>
        </span>
        <span className="ib-text">
          <strong>Install RosterME</strong>
          <span>Add it to your home screen for one-tap access.</span>
        </span>
        <button className="ib-go" onClick={() => (canPrompt ? install() : setShowIOS(true))}>
          Install
        </button>
        <button className="ib-x" onClick={dismiss} aria-label="Not now">×</button>
      </div>
      {showIOS && <IOSInstallSheet onClose={() => setShowIOS(false)} />}
    </>
  );
}

/** Plain text button for menus, where a banner would be too loud. */
export function InstallLink({ className = "" }) {
  const { available, canPrompt, install } = useInstall();
  const [showIOS, setShowIOS] = useState(false);
  if (!available) return null;
  return (
    <>
      <button className={className} onClick={() => (canPrompt ? install() : setShowIOS(true))}>
        Install app
      </button>
      {showIOS && <IOSInstallSheet onClose={() => setShowIOS(false)} />}
    </>
  );
}
