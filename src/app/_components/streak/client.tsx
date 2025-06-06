"use client";

import { useQuery } from "@tanstack/react-query";
import getStreakAction, { TStreak } from "./actions/get-streak.action";
import { useEffect, useState } from "react";

function useEngine() {
  const query = useQuery({
    queryKey: ["streak"],
    queryFn: () => getStreakAction(new Date().getTimezoneOffset()),
  });

  const [currentStreak, setCurrentStreak] = useState<TStreak | null>(null);
  const [longestStreak, setLongestStreak] = useState<TStreak | null>(null);

  useEffect(() => {
    if (query.data && query.data.success) {
      setCurrentStreak(query.data.currentStreak);
      setLongestStreak(query.data.longestStreak);
    }
  }, [query.data]);

  return { currentStreak, longestStreak };
}

export default function Streak() {
  const { currentStreak, longestStreak } = useEngine();

  return (
    (!!currentStreak || !!longestStreak) && (
      <div className="text-center">
        {currentStreak && (
          <div>
            Current Streak: {currentStreak.count || 0} days | Since{" "}
            {currentStreak.startAt.toString()}
          </div>
        )}
        {longestStreak && (
          <div>
            {currentStreak?.count === longestStreak.count ? (
              <span>You currently hold the longest Streak 🎉</span>
            ) : (
              <span>
                Longest Streak: {longestStreak.count || 0} days | Since{" "}
                {longestStreak.startAt.toString()} to{" "}
                {longestStreak.endAt.toString()}
              </span>
            )}
          </div>
        )}
      </div>
    )
  );
}
