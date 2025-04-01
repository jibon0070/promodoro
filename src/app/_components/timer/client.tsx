"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import getCurrentEventAction, {
  Event,
} from "./actions/get-current-event.action";
import { toast } from "sonner";
import toggleResumePauseAction from "./actions/toggle-resume-pause.action";
import changeEventAction from "./actions/change-event.action";

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

      return getCurrentEventAction({ date });
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
    <div className="space-y-5">
      {!!date && (
        <Clock date={date} queryKey={queryKey} currentEvent={currentEvent} />
      )}
      <button onClick={changeEvent} className="block mx-auto">
        {currentEvent?.name}
      </button>
    </div>
  );
}

function Clock({
  currentEvent,
  queryKey,
  date,
}: {
  currentEvent: Event | undefined;
  queryKey: unknown[];
  date: Date;
}) {
  const client = useQueryClient();
  const [currentDate, setCurrentDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const canvasRef = useCallback(
    (canvas: HTMLCanvasElement | null | undefined) => {
      if (!canvas || !currentEvent || !endDate || !currentDate) {
        return;
      }

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      const size = 1000;

      canvas.width = size;
      canvas.height = size;

      const centerX = size / 2;
      const centerY = size / 2;

      const strokeSize = (2 / 100) * size;

      const clockTickRadious = size / 2;

      drawClockTicks({
        ctx,
        size: clockTickRadious,
        strokeSize: strokeSize,
        position: { x: centerX, y: centerY },
        ticks: currentEvent.duration,
      });

      const ringRadious = size / 2 - (3.5 / 100) * size;

      drawRing({
        ctx,
        size: ringRadious,
        position: { x: centerX, y: centerY },
        strokeSize,
      });

      const clockRadious = size / 2 - (7 / 100) * size;

      drawClock({
        ctx,
        position: { x: centerX, y: centerY },
        size: clockRadious,
        timeDeg: lerp(
          0,
          360,
          (endDate.getTime() - currentDate.getTime()) /
            (currentEvent.duration * 60 * 1000),
        ),
      });
    },
    [currentDate, currentEvent, endDate],
  );

  useEffect(() => {
    function initCurrentDate() {
      if (!currentEvent) {
        return;
      }
      const date = new Date();
      if (
        date.getTime() <=
          currentEvent.start.getTime() + currentEvent.duration * 60 * 1000 ||
        currentEvent.state === "paused"
      ) {
        setCurrentDate(
          currentEvent.state === "paused" ? currentEvent.paused : date,
        );
      } else {
        if (interval) {
          clearInterval(interval);
          client.invalidateQueries({ queryKey });
        }
      }
    }

    const interval = setInterval(() => {
      if (currentEvent?.state === "active") {
        initCurrentDate();
      }
    }, 100);

    initCurrentDate();
    return () => {
      clearInterval(interval);
    };
  }, [
    client,
    currentEvent,
    currentEvent?.paused,
    currentEvent?.state,
    queryKey,
  ]);

  useEffect(() => {
    if (!currentEvent) {
      return;
    }
    setEndDate(
      new Date(
        currentEvent.start.getTime() + currentEvent.duration * 60 * 1000,
      ),
    );
  }, [currentEvent]);

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

  function handleClick() {
    switch (currentEvent?.state) {
      case "active":
      case "paused":
        {
          if (!date || toggleResumePauseMutation.isPending) {
            return;
          }

          toggleResumePauseMutation.mutate({
            id: currentEvent.id,
            date,
          });
        }
        break;
      case "completed": {
        throw new Error("Event already completed.");
      }
      default: {
        throw new Error("Unknown Error.");
      }
    }
  }

  return (
    <>
      <button onClick={handleClick} className="aspect-1/1 w-full block">
        <canvas className="size-full" ref={canvasRef} />
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function drawClock({
  ctx,
  position: { x, y },
  size,
  timeDeg,
}: {
  ctx: CanvasRenderingContext2D;
  position: Vector;
  size: number;
  timeDeg: number;
}) {
  ctx.beginPath();
  ctx.arc(x, y, size, degToRadiant(-90), degToRadiant(-90 + timeDeg), false);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

function degToRadiant(deg: number) {
  return deg * (Math.PI / 180);
}

type Vector = {
  x: number;
  y: number;
};

function drawRing({
  ctx,
  position: { x, y },
  size,
  strokeSize,
}: {
  ctx: CanvasRenderingContext2D;
  position: Vector;
  size: number;
  strokeSize: number;
}) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, size, 0, degToRadiant(360));
  ctx.closePath();
  ctx.clip();
  ctx.lineWidth = strokeSize * 2;
  ctx.stroke();
  ctx.restore();
}

function drawClockTicks({
  ctx,
  strokeSize,
  size,
  ticks,
  position: { x, y },
}: {
  ctx: CanvasRenderingContext2D;
  position: Vector;
  size: number;
  strokeSize: number;
  ticks: number;
}) {
  size = size - strokeSize / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, size, degToRadiant(-90), degToRadiant(-90 + 360));
  ctx.closePath();
  ctx.lineWidth = strokeSize;
  ctx.setLineDash([1, (Math.PI * 2 * size) / ticks]);
  ctx.lineDashOffset = degToRadiant(90) * size + ticks;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

function Time({ left }: { left: number }) {
  const minute = Math.floor(left / 1000 / 60);
  const second = Math.floor((left / 1000) % 60);

  return (
    <div className="text-center">
      {minute.toString().padStart(2, "0")}:{second.toString().padStart(2, "0")}
    </div>
  );
}
