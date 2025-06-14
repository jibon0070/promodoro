"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import getCurrentEventAction, {
  Event,
} from "./actions/get-current-event.action";
import { toast } from "sonner";
import toggleResumePauseAction from "./actions/toggle-resume-pause.action";
import changeEventAction from "./actions/change-event.action";
import Canvas from "./components/canvas";

export default function Timer() {
  const client = useQueryClient();
  const [date, setDate] = useState<Date | undefined>();

  const queryKey = ["get-current-event", date];
  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!date) {
        return Promise.resolve(null);
      }

      return getCurrentEventAction(date.getTimezoneOffset());
    },
  });

  const [currentEvent, setCurrentEvent] = useState<Event | undefined>();

  useEffect(() => {
    const date = new Date();

    setDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
  }, []);

  useEffect(() => {
    if (!query.data) {
      return;
    }

    if (!query.data.success) {
      toast.error(query.data.message);
      return;
    }

    setCurrentEvent(query.data.event);
  }, [query.data]);

  const changeEventMutation = useMutation({
    mutationFn: changeEventAction,
    onSuccess: (r) => {
      if (r.success) {
        client.invalidateQueries({ queryKey });
      } else {
        toast.error(r.message);
      }
    },
  });

  function changeEvent() {
    if (
      changeEventMutation.isPending ||
      !currentEvent ||
      currentEvent.state === "active"
    ) {
      return;
    }

    changeEventMutation.mutate({ id: currentEvent.id, date });
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      {!!date && !!currentEvent && (
        <Clock date={date} queryKey={queryKey} currentEvent={currentEvent} />
      )}
      <button onClick={changeEvent} className="block mx-auto">
        {currentEvent?.name}
      </button>
    </div>
  );
}

function useTitle({
  endDate,
  currentEvent,
  currentDate,
}: {
  endDate: Date | undefined;
  currentEvent: Event;
  currentDate: Date | undefined;
}) {
  useEffect(() => {
    if (!endDate || !currentDate) {
      return;
    }

    const diffInMiliSeconds = endDate.getTime() - currentDate.getTime();
    const { minute, second } = convertFromMilliseconds(diffInMiliSeconds);
    document.title = `${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")} ${currentEvent.state.split(" ").map((word) => word.at(0)?.toUpperCase() + word.slice(1))} ${currentEvent.name}`;
  }, [currentDate, currentEvent.name, currentEvent.state, endDate]);
}

function useEndDate(event: Event): Date | undefined {
  const [date, setDate] = useState<Date | undefined>();

  useEffect(() => {
    setDate(new Date(event.start.getTime() + event.duration * 60 * 1000));
  }, [event.duration, event.start]);

  return date;
}

function useCurrentDate(event: Event) {
  const [date, setDate] = useState<Date | undefined>();

  useEffect(() => {
    function main() {
      setDate(event.state === "paused" ? event.paused : new Date());
    }

    main();

    const intervalId = setInterval(main, 100);

    return () => {
      clearInterval(intervalId);
    };
  }, [event.paused, event.state]);

  return date;
}

function beep() {
  const audioContext = new AudioContext();

  const osc = audioContext.createOscillator();
  const envelope = audioContext.createGain();

  osc.frequency.setValueAtTime(400, 0);

  osc.connect(envelope);

  osc.start();

  osc.stop(0.4);

  envelope.gain.value = 0;
  envelope.gain.linearRampToValueAtTime(1, 0.1);
  envelope.gain.linearRampToValueAtTime(0, 0.4);

  envelope.connect(audioContext.destination);
}

function Clock({
  currentEvent,
  queryKey,
  date,
}: {
  currentEvent: Event;
  queryKey: unknown[];
  date: Date;
}) {
  const client = useQueryClient();

  const currentDate = useCurrentDate(currentEvent);
  const endDate = useEndDate(currentEvent);

  useTitle({
    endDate,
    currentEvent,
    currentDate,
  });

  useEffect(() => {
    if (!endDate || !currentDate) {
      return;
    }

    if (
      currentDate.getTime() > endDate.getTime() &&
      currentEvent.state === "active"
    ) {
      if (currentEvent.name === "Promodoro") {
        client.invalidateQueries({
          queryKey: ["get-daily-progress", date],
        });
        client.invalidateQueries({ queryKey: ["get-yearly-progress"] });
      }
      client.invalidateQueries({ queryKey });
      sendNotification(`${currentEvent.name} is finished`);
      beep();
      currentEvent.state = "paused";
    }
  }, [
    client,
    currentDate,
    currentEvent,
    currentEvent.paused,
    currentEvent.state,
    date,
    endDate,
    queryKey,
  ]);

  const toggleResumePauseMutation = useMutation({
    mutationFn: toggleResumePauseAction,
    onSuccess: (r) => {
      if (r.success) {
        client.invalidateQueries({ queryKey });
      } else {
        toast.error(r.message);
      }
    },
  });

  function toggleResumePause() {
    if (!date || toggleResumePauseMutation.isPending) {
      return;
    }

    const newDate = new Date();

    switch (currentEvent.state) {
      case "active":
        {
          currentEvent.paused = newDate;
          currentEvent.state = "paused";
        }
        break;
      case "paused":
        {
          const timePassedInMs =
            currentEvent.paused.getTime() - currentEvent.start.getTime();
          currentEvent.start = new Date(newDate.getTime() - timePassedInMs);
          currentEvent.state = "active";
        }
        break;
      case "completed": {
        throw new Error("Event already completed.");
      }
      default: {
        throw new Error("Unknown Error.");
      }
    }

    toggleResumePauseMutation.mutate({
      id: currentEvent.id,
      date,
    });
  }

  return (
    <>
      <button onClick={toggleResumePause} className="aspect-1/1 w-full block">
        {!!currentDate && !!endDate && !!currentEvent && (
          <Canvas
            currentDate={currentDate}
            endDate={endDate}
            durationInMinutes={currentEvent.duration}
          />
        )}
      </button>
      {!!currentEvent && !!currentDate && (
        <Time
          left={
            currentEvent.start.getTime() +
            currentEvent.duration * 60 * 1000 -
            currentDate.getTime()
          }
        />
      )}
    </>
  );
}

function Time({ left }: { left: number }) {
  const { minute, second } = convertFromMilliseconds(left);

  return (
    <div className="text-center">
      {minute.toString().padStart(2, "0")}:{second.toString().padStart(2, "0")}
    </div>
  );
}

function convertFromMilliseconds(milliseconds: number): {
  minute: number;
  second: number;
} {
  const roundedSeconds = Math.round(milliseconds / 1000);

  const minute = Math.floor(roundedSeconds / 60);
  const second = Math.floor(roundedSeconds % 60);
  return { minute, second };
}

function sendNotification(message: string) {
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification("Promodoro", {
        body: message,
      });
    } else if (Notification.permission === "denied") {
      Notification.requestPermission().then(() => {
        sendNotification(message);
      });
    }
  } else {
    toast.error("Your browser does not support notifications.");
  }
}
