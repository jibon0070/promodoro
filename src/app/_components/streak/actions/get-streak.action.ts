"use server";

import { EventModel } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import db from "@/db";
import ResponseWraper from "@/types/response-wraper.type";
import getAuth from "@/lib/auth";

export type TStreak = {
  startAt: Date;
  endAt: Date;
  count: number;
};

export default async function getStreakAction(minuteOffset: number): Promise<
  ResponseWraper<{
    currentStreak: TStreak | null;
    longestStreak: TStreak | null;
  }>
> {
  try {
    const auth = getAuth();
    await validateUser(auth);

    const { currentStreak, longestStreak } = await getStreak(
      auth,
      minuteOffset,
    );

    return { success: true, currentStreak, longestStreak };
  } catch (error) {
    console.trace(error);
    return { success: false, message: "Internal Server Error." };
  }
}
async function validateUser(auth: ReturnType<typeof getAuth>): Promise<void> {
  if (!(await auth.verify([]))) {
    throw new Error("Unauthorized");
  }
}

async function getStreak(
  auth: ReturnType<typeof getAuth>,
  minuteOffset: number,
) {
  const payload = await auth.getPayload();

  const dateQuery =
    sql<Date>`(${EventModel.createdAt} + ${minuteOffset + " minutes"}::interval)::date`.as(
      "date",
    );
  const distinctQuery = db
    .selectDistinct({
      date: dateQuery,
    })
    .from(EventModel)
    .where(
      and(
        eq(EventModel.name, "Promodoro"),
        eq(EventModel.userId, payload.id),
        eq(EventModel.state, "completed"),
      ),
    )
    .orderBy(dateQuery)
    .as("diatinctQuery");

  const groupQuery = db
    .select({
      date: distinctQuery.date,
      group:
        sql<Date>`${distinctQuery.date} - row_number() over (order by ${distinctQuery.date})::integer`.as(
          "group",
        ),
    })
    .from(distinctQuery)
    .as("groupQuery");

  const streakQuery = db
    .select({
      startAt: sql<Date>`min(${groupQuery.date})`.as("startAt"),
      endAt: sql<Date>`max(${groupQuery.date})`.as("endAt"),
      count: sql<number>`count(${groupQuery.date})::integer`.as("count"),
    })
    .from(groupQuery)
    .groupBy(groupQuery.group)
    .as("streakQuery");

  const date = new Date();
  date.setMinutes(date.getMinutes() + minuteOffset);
  date.setHours(0, 0, 0, 0);

  const [currentStreak, longestStreak] = await Promise.all([
    db
      .select()
      .from(streakQuery)
      .where(eq(streakQuery.endAt, date))
      .then((row) => row.at(0) || null),
    db
      .select()
      .from(streakQuery)
      .orderBy(desc(streakQuery.count))
      .limit(1)
      .then((row) => row.at(0) || null),
  ]);

  return { currentStreak, longestStreak };
}
