"use server";

import db from "@/db";
import { DurationsModel, EventModel, OtherSettingModel } from "@/db/schema";
import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import { and, count, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { z } from "zod";

type Name = (typeof EventModel.name.enumValues)[number];

export type Event = {
  id: number;
  name: (typeof EventModel.name.enumValues)[number];
  duration: number;
  state: (typeof EventModel.state.enumValues)[number];
  start: Date;
  paused: Date;
};

const defaultError: { success: false; message: string } = {
  success: false,
  message: "Internal server error.",
};

export default async function getCurrentEventAction(
  uData: unknown,
): Promise<ResponseWraper<{ event: Event }>> {
  try {
    const auth = getAuth();

    await validateUser(auth);

    const payload = await auth.getPayload();

    const timezoneOffset = parseData(uData);

    const event = await getEvent(payload.id, timezoneOffset);

    return { success: true, event };
  } catch (e) {
    if (e instanceof SkipError) {
      return e.response();
    }

    console.trace(e);
    return defaultError;
  }
}

class SkipError extends Error {
  response() {
    return defaultError;
  }
}

async function validateUser(auth: ReturnType<typeof getAuth>) {
  if (!(await auth.verify([]))) {
    throw new SkipError();
  }
}

async function getEvent(
  userId: number,
  timezoneOffset: number,
): Promise<Event> {
  await closeEvents(userId, timezoneOffset);

  const today = new Date();
  today.setHours(24, 0, 0, 0);
  today.setMinutes(timezoneOffset);

  const event: Event | null = await db
    .select({
      date: EventModel.createdAt,
      duration: sql<number>`
        CASE
          WHEN ${EventModel.name} = 'Promodoro' THEN
            CASE
              WHEN ${DurationsModel.promodoro} IS NULL THEN 25
              ELSE ${DurationsModel.promodoro}
            END
          WHEN ${EventModel.name} = 'Short Break' THEN
            CASE
              WHEN ${DurationsModel.shortBreak} IS NULL THEN 5
              ELSE ${DurationsModel.shortBreak}
            END
          ELSE 
            CASE
              WHEN ${DurationsModel.longBreak} IS NULL THEN 15
              ELSE ${DurationsModel.longBreak}
            END
        END
`,
      id: EventModel.id,
      name: EventModel.name,
      state: EventModel.state,
      start: EventModel.start,
      paused: EventModel.paused,
    })
    .from(EventModel)
    .where(and(eq(EventModel.userId, userId), gte(EventModel.createdAt, today)))
    .leftJoin(DurationsModel, eq(DurationsModel.userId, userId))
    .orderBy(desc(EventModel.id))
    .then((row) => row.at(0) || null);

  if (!event) {
    await createEvent(userId, "Promodoro");
    return await getEvent(userId, timezoneOffset);
  }

  if (event.state !== "completed") {
    return event;
  }

  const name = await getNextEventName({
    previousName: event.name,
    userId,
    timezoneOffset,
  });

  await createEvent(userId, name);

  return await getEvent(userId, timezoneOffset);
}

async function getNextEventName({
  previousName,
  timezoneOffset,
  userId,
}: {
  previousName: Name;
  userId: number;
  timezoneOffset: number;
}): Promise<Name> {
  const today = new Date();
  today.setHours(24, 0, 0, 0);
  today.setMinutes(timezoneOffset);

  const completedPromodoroCount: number = await db
    .select({
      total: count(EventModel.id),
    })
    .from(EventModel)
    .where(
      and(
        eq(EventModel.userId, userId),
        gte(EventModel.createdAt, today),
        eq(EventModel.name, "Promodoro"),
      ),
    )
    .then((row) => row.at(0)?.total || 0);

  const until: number = await db
    .select({
      until: OtherSettingModel.promodorosUntilLongBreak,
    })
    .from(OtherSettingModel)
    .where(eq(OtherSettingModel.userId, userId))
    .then((row) => row.at(0)?.until || 4);

  return ["Short Break", "Long Break"].includes(previousName)
    ? "Promodoro"
    : completedPromodoroCount % until === 0
      ? "Long Break"
      : "Short Break";
}

async function createEvent(userId: number, name: Name) {
  await db.insert(EventModel).values({
    name,
    state: "paused",
    userId,
  });
}

async function closeEvents(userId: number, timezoneOffset: number) {
  const today = new Date();
  today.setHours(24, 0, 0, 0);
  today.setMinutes(timezoneOffset);

  // delete previous day events
  await db
    .delete(EventModel)
    .where(
      and(
        lt(EventModel.createdAt, today),
        ne(EventModel.state, "completed"),
        eq(EventModel.userId, userId),
      ),
    );

  const durations: {
    promodoro: number;
    shortBreak: number;
    longBreak: number;
  } = await db
    .select({
      promodoro: DurationsModel.promodoro,
      shortBreak: DurationsModel.shortBreak,
      longBreak: DurationsModel.longBreak,
    })
    .from(DurationsModel)
    .where(eq(DurationsModel.userId, userId))
    .then(
      (row) => row.at(0) || { promodoro: 25, shortBreak: 5, longBreak: 15 },
    );

  const currentDate = new Date();

  // close completed events
  for (const name of EventModel.name.enumValues) {
    let duration = 0;

    switch (name) {
      case "Promodoro":
        duration = durations.promodoro;
        break;
      case "Short Break":
        duration = durations.shortBreak;
        break;
      default:
        duration = durations.longBreak;
        break;
    }

    await db
      .update(EventModel)
      .set({
        state: "completed",
        end: sql`${EventModel.start} + ${duration + " minutes"}::interval`,
      })
      .where(
        and(
          eq(EventModel.name, name),
          lt(
            EventModel.start,
            new Date(currentDate.getTime() - duration * 60 * 1000),
          ),
          eq(EventModel.state, "active"),
          eq(EventModel.userId, userId),
        ),
      );
  }
}

function parseData(uData: unknown) {
  try {
    return z.coerce.number().parse(uData);
  } catch {
    throw new SkipError();
  }
}
