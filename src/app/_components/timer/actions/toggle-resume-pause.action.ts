"use server";

import db from "@/db";
import { EventModel } from "@/db/schema";
import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import { eq } from "drizzle-orm";
import { z } from "zod";
import eventIdValidator from "../validators/event-id.validator";

const defaultError = { success: false, message: "Internal server error." };

export default async function toggleResumePauseAction(
  uData: unknown,
): Promise<ResponseWraper> {
  try {
    await validateUser();

    const { id } = await parseId(uData);

    await toggleResumePause(id);

    return { success: true };
  } catch (e) {
    if (e instanceof SkipError) {
      return defaultError;
    }

    console.trace(e);
    return defaultError;
  }
}

class SkipError extends Error {}

async function validateUser() {
  const auth = getAuth();

  if (!(await auth.verify([]))) {
    throw new SkipError();
  }
}

async function parseId(data: unknown) {
  try {
    return await z
      .object({
        id: z.coerce.number().int().min(1),
        date: z.coerce.date(),
      })
      .superRefine(async ({ id, date }, ctx) => {
        const message = await eventIdValidator(id, date, ["active", "paused"]);

        if (!!message) {
          ctx.addIssue({ message, code: "custom", path: ["id"] });
        }
      })
      .parseAsync(data);
  } catch {
    throw new SkipError();
  }
}

async function toggleResumePause(id: number) {
  const event = await db.query.EventModel.findFirst({
    where: (model, { eq }) => eq(model.id, id),
    columns: { start: true, paused: true, state: true },
  });

  if (!event) {
    throw new SkipError();
  }

  const diff = event.paused.getTime() - event.start.getTime();

  const start = new Date(new Date().getTime() - diff);

  await db
    .update(EventModel)
    .set({
      state: event.state === "paused" ? "active" : "paused",
      start: event.state === "paused" ? start : undefined,
      paused: new Date(),
    })
    .where(eq(EventModel.id, id));
}
