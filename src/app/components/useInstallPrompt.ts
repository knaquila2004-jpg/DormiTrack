// Real PWA install-prompt handling — no fake "Install" button. Chrome/Edge/
// Android fire a real `beforeinstallprompt` event we can capture and replay
// on demand; browsers that never fire it (iOS Safari, or a browser that's
// already running the installed app) simply never make `canInstall` true, so
// callers can hide the button or show a real instruction instead of a dead
// control that does nothing when tapped.
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  // iOS Safari's own (non-standard) flag for "launched from the home screen".
  const iosStandalone = (window.navigator as any).standalone === true;
  return mm || iosStandalone;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalonePwa());

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome === "accepted";
  };

  return {
    // True only when the browser actually offered a real install prompt.
    canInstall: !installed && deferred !== null,
    installed,
    promptInstall,
  };
}
