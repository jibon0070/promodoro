"use client";

import { useQuery } from "@tanstack/react-query";
import { ReactNode, useCallback, useEffect, useState } from "react";
import getYearlyProgress, { Event } from "./actions/get-yearly-progress.action";
import { toast } from "sonner";

export default function YearlyProgress() {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [events, setEvents] = useState<Event[]>([]);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);

  const query = useQuery({
    queryKey: ["get-yearly-progress"],
    queryFn: () => getYearlyProgress(new Date().getTimezoneOffset()),
  });

  useEffect(() => {
    let date = new Date();
    date.setHours(0, 0, 0, 0);

    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 365);

    date.setDate(date.getDate() - date.getDay() - 1);

    setStartDate(date);
  }, []);

  useEffect(() => {
    if (query.data) {
      if (query.data.success) {
        setEvents(query.data.events);
        setMin(query.data.min);
        setMax(query.data.max);
      } else {
        toast.error(query.data.message);
      }
    }
  }, [query.data]);

  const yearLength = useCallback((): number => {
    if (!startDate) {
      return 0;
    }
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    return (currentDate.getTime() - startDate.getTime()) / 1000 / 60 / 60 / 24;
  }, [startDate]);

  return (
    <div className="grid grid-rows-7 grid-flow-col gap-1 border p-2 shadow w-min mx-auto overflow-auto">
      <Day>Saturday</Day>
      <Day>Sunday</Day>
      <Day>Monday</Day>
      <Day>Tuesday</Day>
      <Day>Wednesday</Day>
      <Day>Thursday</Day>
      <Day>Friday</Day>
      {Array(yearLength() + 1)
        .fill(0)
        .map((_, i) => {
          const date = new Date(startDate || 0);
          date.setDate(date.getDate() + i);
          return (
            <Box
              min={min}
              max={max}
              events={events}
              startDate={startDate}
              i={i}
              key={i}
            />
          );
        })}
    </div>
  );
}

function Box({
  i,
  startDate,
  events,
  min,
  max,
}: {
  i: number;
  startDate: Date | undefined;
  events: Event[];
  max: number;
  min: number;
}) {
  const [date, setDate] = useState("");

  useEffect(() => {
    const date = new Date(startDate || 0);
    date.setDate(date.getDate() + i);

    setDate(dateFormat(date));
  }, [i, startDate]);

  const event = useCallback((): Event | undefined => {
    return events.find((event) => event.date === date);
  }, [date, events]);

  const opacity = useCallback((): number => {
    const lEvent = event();

    if (!lEvent) {
      return 0;
    }

    const score = lEvent.minutes - min;
    const lMax = max - min;

    return lerp(0, 100, score / lMax);
  }, [event, max, min]);

  const title = useCallback((): string => {
    if (!date) {
      return "";
    }

    const lEvent = event();
    if (!lEvent) {
      return date;
    }

    return `${date} - ${minutesToTime(lEvent.minutes)}`;
  }, [date, event]);

  return (
    <div className="size-2.5 border" title={title()}>
      <div
        className="size-full bg-black"
        style={{ opacity: opacity() / 100 }}
      />
    </div>
  );
}

function dateFormat(date: Date): string {
  return `${date.getFullYear().toString().padStart(2, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function minutesToTime(minutesLeft: number) {
  const hours = Math.floor(minutesLeft / 60);
  const minutes = minutesLeft % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function Day({ children }: { children: ReactNode }) {
  return <div className="text-[.5em] text-right">{children}</div>;
}
