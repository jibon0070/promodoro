"use client";

import { useState } from "react";

type EventName = "Promodoro" | "Short Break" | "Long Break";

export default function Timer() {
  const [currentEventName, setCurrentEventName] =
    useState<EventName>("Promodoro");

  return null;
}
