"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import getCurrentSessionAction from "./actions/get-current-working-time.action";
import getLongestSessionAction from "./actions/get-longest-session.action";

export default function Session() {
  const currentWorkingTime = useCurrentWorkingTime();
  const longestWorkingHour = useLongestWorkingTime();

  return (
    <div className="text-center">
      Current working hours: {timeFormat(currentWorkingTime)} <br />
      {!!longestWorkingHour.date && (
        <span>
          Longest working hours: {timeFormat(longestWorkingHour.time)} |{" "}
          {!!longestWorkingHour.date && dateFormat(longestWorkingHour.date)}
        </span>
      )}
    </div>
  );
}

function useLongestWorkingTime(): { time: number; date: Date | null } {
  const [time, setTime] = useState(0);
  const [date, setDate] = useState<null | Date>(null);

  const query = useQuery({
    queryKey: ["longestWorkingTime"],
    queryFn: () => getLongestSessionAction(new Date().getTimezoneOffset()),
  });

  useEffect(() => {
    if (!query.data) return;

    if (query.data.success) {
      setTime(query.data.time);
      setDate(query.data.date);
    } else {
      toast.error(query.data.message);
    }
  }, [query.data]);

  return { time, date };
}

function dateFormat(date: Date): string {
  return `${date.getFullYear().toString().padStart(4, "0")}-${(
    date.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

function useCurrentWorkingTime(): number {
  const [time, setTime] = useState(0);

  const query = useQuery({
    queryKey: ["currentWorkingTime"],
    queryFn: () => getCurrentSessionAction(new Date().getTimezoneOffset()),
  });

  useEffect(() => {
    if (query.data) {
      if (query.data.success) {
        setTime(query.data.time);
      } else {
        toast.error(query.data.message);
      }
    }
  }, [query.data]);

  return time;
}

function timeFormat(time: number): string {
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}
