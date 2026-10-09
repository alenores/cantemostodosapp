"use client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let globalInstallPrompt: BeforeInstallPromptEvent | null = null;
const promptSubscribers = new Set<() => void>();

function notifyPromptSubscribers() {
  promptSubscribers.forEach((callback) => callback());
}

export function subscribeInstallPrompt(callback: () => void) {
  promptSubscribers.add(callback);
  return () => {
    promptSubscribers.delete(callback);
  };
}

export function getInstallPromptSnapshot(): BeforeInstallPromptEvent | null {
  return globalInstallPrompt;
}

export function clearInstallPrompt() {
  globalInstallPrompt = null;
  notifyPromptSubscribers();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event: Event) => {
    event.preventDefault();
    globalInstallPrompt = event as BeforeInstallPromptEvent;
    notifyPromptSubscribers();
  });

  window.addEventListener("appinstalled", () => {
    clearInstallPrompt();
  });
}
