"use client";

import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import getDailyProgress from "./actions/get-daily-progress.action";
import { toast } from "sonner";

export default function DailyProgress() {
  const [dailyGoal, setDailyGoal] = useState(8);
  const [promodorosUntilLongBreak, setPromodorosUntilLongBreak] = useState(4);
  const [currentPromodoros, setCurrentPromodoros] = useState(0);
  const [date, setDate] = useState<Date | undefined>();

  useEffect(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    setDate(date);
  }, []);

  const query = useQuery({
    queryKey: ["get-daily-progress", date],
    queryFn: () => getDailyProgress(date),
  });

  useEffect(() => {
    if (query.data) {
      if (query.data.success) {
        setDailyGoal(query.data.dailyGoal);
        setPromodorosUntilLongBreak(query.data.promodorosUntilLongBreak);
        setCurrentPromodoros(query.data.currentPromodoros);
      } else {
        toast.error(query.data.message);
      }
    }
  }, [query.data]);

  return (
    <>
      <div className="flex gap-4 justify-center flex-wrap">
        {Array(Math.floor(dailyGoal / promodorosUntilLongBreak))
          .fill(0)
          .map((_, i) => (
            <div key={i} className="flex gap-1">
              {Array(promodorosUntilLongBreak)
                .fill(0)
                .map((_, j) => (
                  <Ball
                    active={
                      j + i * promodorosUntilLongBreak < currentPromodoros
                    }
                    key={`${i}-${j}`}
                  />
                ))}
            </div>
          ))}
        {!!(dailyGoal % promodorosUntilLongBreak) && (
          <div className="flex gap-1">
            {Array(dailyGoal % promodorosUntilLongBreak)
              .fill(0)
              .map((_, i) => (
                <Ball
                  key={i}
                  active={
                    Math.floor(dailyGoal / promodorosUntilLongBreak) *
                      promodorosUntilLongBreak +
                      i <
                    currentPromodoros
                  }
                />
              ))}
          </div>
        )}
      </div>
      {currentPromodoros > dailyGoal && (
        <div className="text-center">+{currentPromodoros - dailyGoal}</div>
      )}
    </>
  );
}

function Ball({ active }: { active: boolean }) {
  return (
    <div
      className={cn("border border-black size-2 rounded-full", {
        "bg-black": active,
      })}
    />
  );
}
