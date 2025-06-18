"use server";

import db from "@/db";
import { EventModel } from "@/db/schema";
import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

export type Event = {
  date: string;
  minutes: number;
};

export default async function getYearlyProgress(
  uData: unknown,
): Promise<ResponseWraper<{ events: Event[]; min: number; max: number }>> {
  try {
    const auth = getAuth();

    await validateUser(auth);
    const timeZoneOffset = parseData(uData);
    const startDate = getStartDate(timeZoneOffset);

    const payload = await auth.getPayload();

    const { events, min, max } = await getEventsInfo(
      startDate,
      timeZoneOffset,
      payload.id,
    );

    return { success: true, events, min, max };
  } catch (e) {
    const defaultError: { success: false; message: string } = {
      success: false,
      message: "Internal server error.",
    };

    if (e instanceof SkipError) {
      return defaultError;
    }

    console.trace(e);
    return defaultError;
  }
}

class SkipError extends Error {}

async function validateUser(auth: ReturnType<typeof getAuth>) {
  if (!(await auth.verify([]))) {
    throw new SkipError();
  }
}

function parseData(data: unknown): number {
  return z.coerce.number().parse(data);
}

function getStartDate(timezoneOffset: number): Date {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 365);
  startDate.setMinutes(startDate.getMinutes() - timezoneOffset);
  startDate.setHours(0, 0, 0, 0);

  return startDate;
}

async function getEventsInfo(
  startDate: Date,
  timezoneOffset: number,
  userId: number,
): Promise<{
  events: Event[];
  min: number;
  max: number;
}> {
  const query = db
    .select({
      date: sql<Date>`(${EventModel.createdAt} - ${timezoneOffset + " minutes"}::interval)::date`.as(
        "dateQuery",
      ),
      minutes:
        sql<number>`extract(epoch from ${EventModel.end} - ${EventModel.start})::int / 60`.as(
          "minutesQuery",
        ),
    })
    .from(EventModel)
    .where(
      and(
        eq(EventModel.userId, userId),
        eq(EventModel.state, "completed"),
        eq(EventModel.state, "completed"),
      ),
    )
    .as(`query`);

  const eventsQuery = db
    .select({
      date: sql<string>`${query.date}`.as("dateQuery2"),
      minutes: sql<number>`sum(${query.minutes})::int`.as("minutesQuery2"),
    })
    .from(query)
    .where(gte(query.date, startDate))
    .groupBy(query.date)
    .as("eventsQuery");

  const [events, min, max] = await Promise.all([
    db.select().from(eventsQuery),
    db
      .select({ min: sql<number>`min(${eventsQuery.minutes})` })
      .from(eventsQuery)
      .then((r) => r.at(0)?.min || 0),
    db
      .select({ max: sql<number>`max(${eventsQuery.minutes})` })
      .from(eventsQuery)
      .then((r) => r.at(0)?.max || 0),
  ]);

  return { events, min, max };
}
