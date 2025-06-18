"use server";

import db from "@/db";
import { EventModel } from "@/db/schema";
import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";

export default async function getdailyProgress(uData: unknown): Promise<
  ResponseWraper<{
    dailyGoal: number;
    promodorosUntilLongBreak: number;
    currentPromodoros: number;
  }>
> {
  try {
    const auth = getAuth();

    await validateUser(auth);
    const timezoneOffset = parseData(uData);

    const payload = await auth.getPayload();

    const { dailyGoal, promodorosUntilLongBreak } = await getOtherSettings(
      payload.id,
    );

    const currentPromodoros = await getCurrentPromodoros(
      payload.id,
      timezoneOffset,
    );

    return {
      success: true,
      dailyGoal,
      promodorosUntilLongBreak,
      currentPromodoros,
    };
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

function parseData(data: unknown) {
  try {
    return z.coerce.number().parse(data);
  } catch {
    throw new SkipError();
  }
}

async function getOtherSettings(userId: number) {
  return await db.query.OtherSettingModel.findFirst({
    where: (model, { eq }) => eq(model.userId, userId),
    columns: { promodorosUntilLongBreak: true, dailyGoal: true },
  }).then((row) => row || { promodorosUntilLongBreak: 4, dailyGoal: 8 });
}

async function getCurrentPromodoros(
  userId: number,
  timezoneOffset: number,
): Promise<number> {
  const date = new Date();
  date.setMinutes(date.getMinutes() - timezoneOffset);
  console.log(date, timezoneOffset);
  date.setHours(0, 0, 0, 0);

  const createdAtQuery = sql`${EventModel.createdAt} - ${timezoneOffset + " minutes"}::interval`;

  return await db
    .select(
      { total: count(EventModel.id) } /*{
        date: createdAtQuery,
        start: EventModel.createdAt,
        end: EventModel.end,
        time: sql`${EventModel.end} - ${EventModel.createdAt}`,
      }*/,
    )
    .from(EventModel)
    .where(
      and(
        eq(EventModel.state, "completed"),
        eq(EventModel.name, "Promodoro"),
        eq(EventModel.userId, userId),
        gte(createdAtQuery, date),
        lt(createdAtQuery, new Date(date.getTime() + 1000 * 60 * 60 * 24)),
      ),
    )
    .then((row) => row.at(0)?.total || 0);
}
