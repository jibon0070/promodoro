"use server";

import db from "@/db";
import { EventModel } from "@/db/schema";
import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

const env = process.env.NODE_ENV;

export default async function getLongestSessionAction(
  uData: unknown,
): Promise<ResponseWraper<{ time: number; date: Date | null }>> {
  try {
    const auth = getAuth();

    await validateUser(auth);

    const timezoneOffset = parseData(uData);

    const payload = await auth.getPayload();
    const session = await getLongestSession(payload.id, timezoneOffset);

    return {
      success: true,
      time: session.time,
      date: session.date,
    };
  } catch (e) {
    if (e instanceof KnownError) {
      return {
        success: false,
        message: e.message,
      };
    }

    console.trace(e);
    return {
      success: false,
      message: "Unknown Error",
    };
  }
}

class KnownError extends Error {}

async function validateUser(auth: ReturnType<typeof getAuth>) {
  if (!(await auth.verify([]))) throw new KnownError("Unauthorized");
}

function parseData(data: unknown) {
  try {
    return z.coerce.number().parse(data);
  } catch (e) {
    if (!(e instanceof Error)) {
      throw new Error("Unknown Error");
    }
    if (env === "development") {
      throw new Error(e.message);
    } else {
      throw new KnownError("Invalid request.");
    }
  }
}

async function getLongestSession(
  userId: number,
  timezoneOffset: number,
): Promise<{ time: number; date: Date | null }> {
  const dateQuery =
    sql<Date>`(${EventModel.createdAt} + ${timezoneOffset + " minutes"}::interval)::date`.as(
      "date",
    );
  const timeQuery = sql<number>`sum((extract(epoch from ${EventModel.end} - ${EventModel.start}) / 60)::int)::int`;
  return await db
    .select({
      date: dateQuery,
      time: timeQuery,
    })
    .from(EventModel)
    .where(
      and(
        eq(EventModel.userId, userId),
        eq(EventModel.state, "completed"),
        eq(EventModel.name, "Promodoro"),
      ),
    )
    .groupBy(dateQuery)
    .orderBy(desc(timeQuery))
    .then((r) => {
      const entry = r.at(0);
      if (!entry) return { time: 0, date: null };
      entry.time = Number(entry.time);
      entry.date = new Date(entry.date);
      return entry;
    });
}
