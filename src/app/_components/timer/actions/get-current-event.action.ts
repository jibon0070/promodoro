"use server";

import db from "@/db";
import { DurationsModel, EventModel } from "@/db/schema";
import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import { and, count, desc, eq, gte, lt, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";

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

    const date = new Date();
    date.setHours(0, timezoneOffset, 0, 0);

    const event = await getEvent(payload.id, date);

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

async function getEvent(userId: number, date: Date): Promise<Event> {
  await closeOldEvents(userId, date);

  const event: Event | undefined = await db
    .select({
      id: EventModel.id,
      name: EventModel.name,
      duration: sql<number>`
case
  when ${EventModel.name} = 'Promodoro'
  then
    case
      when ${DurationsModel.promodoro} = null
      then 25
      else ${DurationsModel.promodoro}
    end
  when ${EventModel.name} = 'Short Break'
  then
    case
      when ${DurationsModel.shortBreak} = null
      then 5
      else ${DurationsModel.shortBreak}
    end
  else
    case
      when ${DurationsModel.longBreak} = null
      then 15
      else ${DurationsModel.longBreak}
    end
end
`,
      state: EventModel.state,
      start: EventModel.start,
      paused: EventModel.paused,
    })
    .from(EventModel)
    .leftJoin(DurationsModel, eq(DurationsModel.userId, userId))
    .where(
      and(
        eq(EventModel.userId, userId),
        gte(EventModel.createdAt, new Date(date)),
        lt(
          EventModel.createdAt,
          new Date(new Date(date).getTime() + 1000 * 60 * 60 * 24),
        ),
      ),
    )
    .orderBy(desc(EventModel.id))
    .then((row) => row.at(0));

  if (!event) {
    await createEvent({ userId, name: "Promodoro" });

    return await getEvent(userId, date);
  }

  if (event.state !== "completed") {
    return event;
  }

  return getNextEvent({
    previousEventName: event.name,
    userId,
    date,
  });
}

async function getNextEvent({
  previousEventName,
  userId,
  date,
}: {
  previousEventName: Event["name"];
  userId: number;
  date: Date;
}): Promise<Event> {
  const until: number = await db.query.OtherSettingModel.findFirst({
    where: (model, { eq }) => eq(model.userId, userId),
    columns: { promodorosUntilLongBreak: true },
  }).then((row) => row?.promodorosUntilLongBreak || 4);

  const totalCompletedPromodoro: number = await db
    .select({ total: count(EventModel.id) })
    .from(EventModel)
    .where(
      and(
        eq(EventModel.userId, userId),
        eq(EventModel.name, "Promodoro"),
        eq(EventModel.state, "completed"),
        gte(EventModel.createdAt, date),
        lt(
          EventModel.createdAt,
          new Date(date.getTime() + 1000 * 60 * 60 * 24),
        ),
      ),
    )
    .then((row) => row.at(0)?.total || 0);

  const name =
    previousEventName !== "Promodoro"
      ? "Promodoro"
      : !(totalCompletedPromodoro % until)
        ? "Long Break"
        : "Short Break";

  await createEvent({ name, userId });

  return await getEvent(userId, date);
}

function parseData(uData: unknown) {
  try {
    return z.coerce.number().parse(uData);
  } catch {
    throw new SkipError();
  }
}

async function createEvent({
  name,
  userId,
}: {
  name: Event["name"];
  userId: number;
}) {
  const duration: { promodoro: number; shortBreak: number; longBreak: number } =
    await db.query.DurationsModel.findFirst({
      where: (model, { eq }) => eq(model.userId, userId),
      columns: { promodoro: true, shortBreak: true, longBreak: true },
    }).then((row) => row || { promodoro: 25, shortBreak: 5, longBreak: 15 });

  let addedTimeInMiliSeconds = 0;

  switch (name) {
    case "Promodoro":
      addedTimeInMiliSeconds = duration.promodoro * 60 * 1000;
      break;
    case "Short Break":
      addedTimeInMiliSeconds = duration.shortBreak * 60 * 1000;
      break;
    default:
      addedTimeInMiliSeconds = duration.longBreak * 60 * 1000;
  }

  const date = new Date();

  await db.insert(EventModel).values({
    name,
    userId,
    state: "paused",
    start: date,
    end: new Date(date.getTime() + addedTimeInMiliSeconds),
  });
}

async function closeOldEvents(userId: number, date: Date) {
  // delete not completed events
  await db
    .delete(EventModel)
    .where(
      and(ne(EventModel.state, "completed"), lt(EventModel.createdAt, date)),
    );

  const durations: {
    promodoro: number;
    shortBreak: number;
    longBreak: number;
  } = await db.query.DurationsModel.findFirst({
    where: (model, { eq }) => eq(model.userId, userId),
    columns: { promodoro: true, shortBreak: true, longBreak: true },
  }).then((row) => row || { promodoro: 25, shortBreak: 5, longBreak: 15 });

  // complete active events
  for (const name of EventModel.name.enumValues) {
    let duration: number;

    switch (name) {
      case "Promodoro":
        duration = durations.promodoro;
        break;
      case "Short Break":
        duration = durations.shortBreak;
        break;
      default:
        duration = durations.longBreak;
    }

    await db
      .update(EventModel)
      .set({
        state: "completed",
        end: sql`${EventModel.start}::timestamp + ${duration + " minutes"}::interval`,
      })
      .where(
        and(
          eq(EventModel.state, "active"),
          eq(EventModel.name, name),
          lte(
            EventModel.start,
            new Date(new Date().getTime() - duration * 60 * 1000),
          ),
        ),
      );
  }
}
