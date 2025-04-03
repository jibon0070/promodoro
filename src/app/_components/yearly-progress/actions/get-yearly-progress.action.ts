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
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - startDate.getDay() - 1);
  startDate.setMinutes(timezoneOffset);

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
  const offsetWithMinutes = `${timezoneOffset} minutes`;

  const dateQuery =
    sql<string>`(${EventModel.createdAt} - ${offsetWithMinutes}::interval)::date`.as(
      "date",
    );

  const eventQuery = db
    .select({
      date: dateQuery,
      minutes:
        sql<number>`sum((extract(epoch from (${EventModel.end} - ${EventModel.start})::interval)/60)::integer)::integer`.as(
          "minutes",
        ),
    })
    .from(EventModel)
    .where(
      and(
        eq(EventModel.name, "Promodoro"),
        eq(EventModel.state, "completed"),
        gte(EventModel.createdAt, startDate),
        eq(EventModel.userId, userId),
      ),
    )
    .groupBy(dateQuery)
    .as("eventQuery");

  const events = await db.select().from(eventQuery);

  const maxQuery = sql<number>`max(${eventQuery.minutes})`;
  const minQuery = sql<number>`min(${eventQuery.minutes})`;

  const { min, max } = await db
    .select({
      min: sql<number>`
        case
          when ${minQuery} = ${maxQuery}
          then 0
          else ${minQuery}
        end`,
      max: maxQuery,
    })
    .from(eventQuery)
    .then((row) => row.at(0) || { min: 0, max: 0 });
  return {
    events,
    min,
    max,
  };
}
