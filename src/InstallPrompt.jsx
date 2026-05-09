import { useState, useEffect } from 'react';

/**
 * InstallPrompt — handles PWA "Add to Home Screen" across:
 *   - Android Chrome / Edge: uses beforeinstallprompt event
 *   - iOS Safari: detects iOS + not-standalone, shows manual instructions
 *   - Desktop Chrome / Edge: subtle install chip top-right
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [showDesktop, setShowDesktop] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed / running as standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Don't show if user previously dismissed
    if (sessionStorage.getItem('pwa-prompt-dismissed')) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isDesktop = window.innerWidth >= 1024;

    if (isIOS) {
      // iOS Safari: show manual guide after a short delay
      const t = setTimeout(() => setShowIOS(true), 3000);
      return () => clearTimeout(t);
    }

    // Android / Desktop Chrome: listen for the browser prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (isDesktop) {
        setShowDesktop(true);
      } else {
        setShowAndroid(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If already installed
    window.addEventListener('appinstalled', () => {
      setShowAndroid(false);
      setShowDesktop(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroid(false);
      setShowDesktop(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowAndroid(false);
    setShowIOS(false);
    setShowDesktop(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
  };

  if (dismissed) return null;

  // ─── Desktop chip (top-right) ───────────────────────────────────────────────
  if (showDesktop) {
    return (
      <div style={styles.desktopChip}>
        <span style={styles.desktopIcon}>⬇️</span>
        <span style={styles.desktopText}>Install Day Copilot</span>
        <button onClick={handleInstall} style={styles.desktopBtn}>Install</button>
        <button onClick={handleDismiss} style={styles.closeBtn} aria-label="Dismiss">✕</button>
      </div>
    );
  }

  // ─── Android bottom banner ──────────────────────────────────────────────────
  if (showAndroid) {
    return (
      <div style={styles.banner}>
        <div style={styles.bannerLeft}>
          <img src="/pwa-192x192.png" alt="Day Copilot" style={styles.bannerIcon} />
          <div>
            <div style={styles.bannerTitle}>Add to Home Screen</div>
            <div style={styles.bannerSub}>Install Day Copilot for quick access</div>
          </div>
        </div>
        <div style={styles.bannerActions}>
          <button onClick={handleDismiss} style={styles.dismissBtn}>Not now</button>
          <button onClick={handleInstall} style={styles.installBtn}>Install</button>
        </div>
      </div>
    );
  }

  // ─── iOS instructions bottom sheet ─────────────────────────────────────────
  if (showIOS) {
    return (
      <div style={styles.iosSheet}>
        <button onClick={handleDismiss} style={styles.iosClose} aria-label="Close">✕</button>
        <div style={styles.iosTitle}>Add to Home Screen</div>
        <div style={styles.iosSteps}>
          <div style={styles.iosStep}>
            <span style={styles.iosStepNum}>1</span>
            <span>Tap the <strong>Share</strong> button&nbsp;
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle'}}>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              &nbsp;at the bottom of Safari
            </span>
          </div>
          <div style={styles.iosStep}>
            <span style={styles.iosStepNum}>2</span>
            <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
          </div>
          <div style={styles.iosStep}>
            <span style={styles.iosStepNum}>3</span>
            <span>Tap <strong>Add</strong> — done! 🎉</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  // Android banner
  banner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    background: '#1a1a2e',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
    flexWrap: 'wrap',
  },
  bannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    flexShrink: 0,
  },
  bannerTitle: {
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
    lineHeight: 1.3,
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 2,
  },
  bannerActions: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
  },
  dismissBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
  installBtn: {
    background: 'linear-gradient(135deg, #6c63ff, #4f46e5)',
    border: 'none',
    color: '#fff',
    borderRadius: 8,
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(99,102,241,0.4)',
  },
  // iOS bottom sheet
  iosSheet: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    background: '#1a1a2e',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px 16px 0 0',
    padding: '20px 20px 36px',
    boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
  },
  iosClose: {
    position: 'absolute',
    top: 14,
    right: 16,
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    borderRadius: '50%',
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 13,
  },
  iosTitle: {
    color: '#fff',
    fontWeight: 700,
    fontSize: 17,
    marginBottom: 16,
    textAlign: 'center',
  },
  iosSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  iosStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 1.5,
  },
  iosStepNum: {
    background: 'linear-gradient(135deg, #6c63ff, #4f46e5)',
    color: '#fff',
    borderRadius: '50%',
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 13,
    flexShrink: 0,
    marginTop: 1,
  },
  // Desktop chip
  desktopChip: {
    position: 'fixed',
    top: 16,
    right: 16,
    zIndex: 9999,
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  desktopIcon: {
    fontSize: 18,
  },
  desktopText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
  },
  desktopBtn: {
    background: 'linear-gradient(135deg, #6c63ff, #4f46e5)',
    border: 'none',
    color: '#fff',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '2px 4px',
    lineHeight: 1,
  },
};
