"use server";

import db from "@/db";
import { EventModel } from "@/db/schema";
import getAuth from "@/lib/auth";

export default async function eventIdValidator(
  id: number,
  date: Date,
  acceptedState: (typeof EventModel.state.enumValues)[number][],
): Promise<string | void> {
  try {
    const auth = getAuth();

    await validateUser(auth);

    const payload = await auth.getPayload();

    await validateEventId(id, date, payload.id, acceptedState);
  } catch (e) {
    if (e instanceof ResponseError) {
      return e.message;
    } else if (e instanceof SkipError) {
      return "Internal server error.";
    }

    console.trace(e);
    return "Internal server error.";
  }
}

class SkipError extends Error {}
class ResponseError extends Error {}

async function validateUser(auth: ReturnType<typeof getAuth>) {
  if (!(await auth.verify([]))) {
    throw new SkipError();
  }
}

async function validateEventId(
  id: number,
  date: Date,
  userId: number,
  acceptedState: (typeof EventModel.state.enumValues)[number][],
) {
  const event = await db.query.EventModel.findFirst({
    where: (model, { eq, and, gte, lt, inArray }) =>
      and(
        eq(model.id, id),
        eq(model.userId, userId),
        gte(model.createdAt, new Date(date)),
        lt(
          model.createdAt,
          new Date(new Date(date).getTime() + 1000 * 60 * 60 * 24),
        ),
        inArray(model.state, acceptedState),
      ),
    columns: { id: true },
  });

  if (!event) {
    throw new ResponseError("Event not found.");
  }
}
