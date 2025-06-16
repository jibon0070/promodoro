"use server";

import db from "@/db";
import { EventModel } from "@/db/schema";
import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import { and, eq, gte, sql, sum } from "drizzle-orm";
import { z } from "zod";

const env = process.env.NODE_ENV;

export default async function getCurrentSessionAction(
  uData: unknown,
): Promise<ResponseWraper<{ time: number }>> {
  try {
    const auth = getAuth();

    await validateUser(auth);

    const timezoneOffset = parseData(uData);

    const date = new Date();
    date.setHours(24, timezoneOffset, 0, 0);

    const payload = await auth.getPayload();

    const workingTime = await getWorkingTime(payload.id, date);

    return {
      success: true,
      time: workingTime,
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
      message: "Internal server error.",
    };
  }
}

async function getWorkingTime(userId: number, date: Date): Promise<number> {
  return await db
    .select({
      time: sum(
        sql<number>`(extract(epoch from ${EventModel.end} - ${EventModel.start}) / 60)::int`,
      ),
    })
    .from(EventModel)
    .where(
      and(
        gte(EventModel.createdAt, date),
        eq(EventModel.userId, userId),
        eq(EventModel.name, "Promodoro"),
        eq(EventModel.state, "completed"),
      ),
    )
    .then((r) => Number(r.at(0)?.time));
}

class KnownError extends Error {}

async function validateUser(auth: ReturnType<typeof getAuth>) {
  if (!(await auth.verify([]))) {
    throw new KnownError("Unauthorized");
  }
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
