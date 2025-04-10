"use client";

import { useEffect } from "react";

export default function KeepScreenWake() {
  useEffect(() => {
    if ("wakeLock" in navigator) {
      let screenLock: WakeLockSentinel | undefined;
      (async () => {
        screenLock = await navigator.wakeLock.request("screen");
      })();
      return () => {
        screenLock?.release();
      };
    }
  }, []);

  return null;
}
