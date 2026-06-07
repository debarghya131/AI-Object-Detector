"use client";

import {useEffect, useSyncExternalStore} from "react";

const VIEW_COUNT_KEY = "ai-object-detector:view-count";
const VIEW_SESSION_KEY = "ai-object-detector:view-counted";
const VIEW_COUNT_EVENT = "ai-object-detector:view-count-updated";

const getStoredViews = () => {
  if (typeof window === "undefined") {
    return 0;
  }

  return Number(window.localStorage.getItem(VIEW_COUNT_KEY) || 0);
};

const subscribeToViews = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(VIEW_COUNT_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(VIEW_COUNT_EVENT, callback);
  };
};

export default function ViewCounter() {
  const views = useSyncExternalStore(subscribeToViews, getStoredViews, () => 0);

  useEffect(() => {
    const hasCountedThisSession = window.sessionStorage.getItem(VIEW_SESSION_KEY);

    if (hasCountedThisSession) {
      return;
    }

    const nextViews = getStoredViews() + 1;

    window.localStorage.setItem(VIEW_COUNT_KEY, String(nextViews));
    window.sessionStorage.setItem(VIEW_SESSION_KEY, "true");
    window.dispatchEvent(new Event(VIEW_COUNT_EVENT));
  }, []);

  return (
    <div
      aria-label="Website view counter"
      className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[0.68rem] font-bold uppercase text-cyan-100 sm:text-xs"
    >
      <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
      <span>{views.toLocaleString()} views</span>
    </div>
  );
}
