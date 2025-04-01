"use client";

import { useEffect, useRef } from "react";

export default function AskForNotification() {
  const asked = useRef<boolean>(false);

  useEffect(() => {
    function ask() {
      if (asked.current) {
        return;
      }
      asked.current = true;
      if (!("Notification" in window)) {
        return;
      }
      if (Notification.permission === "granted") {
        return;
      }
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          return;
        }
      });
    }

    ask();
  });

  return null;
}
