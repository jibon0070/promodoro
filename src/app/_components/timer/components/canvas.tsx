import { useCallback } from "react";

type Vector = {
  x: number;
  y: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const drawClock = ({
  ctx,
  position: { x, y },
  size,
  timeDeg,
}: {
  ctx: CanvasRenderingContext2D;
  position: Vector;
  size: number;
  timeDeg: number;
}) => {
  ctx.beginPath();
  ctx.arc(x, y, size, degToRadiant(-90), degToRadiant(-90 + timeDeg), false);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
};

function degToRadiant(deg: number) {
  return deg * (Math.PI / 180);
}

const drawRing = ({
  ctx,
  position: { x, y },
  size,
  strokeSize,
}: {
  ctx: CanvasRenderingContext2D;
  position: Vector;
  size: number;
  strokeSize: number;
}) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, size, 0, degToRadiant(360));
  ctx.closePath();
  ctx.clip();
  ctx.lineWidth = strokeSize * 2;
  ctx.stroke();
  ctx.restore();
};

const drawClockTicks = ({
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
}) => {
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
};

export default function Canvas({
  durationInMinutes,
  endDate,
  currentDate,
}: {
  durationInMinutes: number;
  endDate: Date;
  currentDate: Date;
}) {
  const canvasRef = useCallback(
    (canvas: HTMLCanvasElement | null | undefined) => {
      if (!canvas || !endDate || !currentDate) {
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
        ticks: durationInMinutes,
      });

      const ringRadious = size / 2 - (3.5 / 100) * size;

      drawRing({
        ctx,
        size: ringRadious,
        position: { x: centerX, y: centerY },
        strokeSize,
      });

      const clockRadious = size / 2 - (7 / 100) * size;

      const timeDeg = lerp(
        0,
        360,
        (endDate.getTime() - currentDate.getTime()) /
          (durationInMinutes * 60 * 1000),
      );

      drawClock({
        ctx,
        position: { x: centerX, y: centerY },
        size: clockRadious,
        timeDeg: timeDeg,
      });
    },
    [currentDate, durationInMinutes, endDate],
  );

  return <canvas className="size-full" ref={canvasRef} />;
}
