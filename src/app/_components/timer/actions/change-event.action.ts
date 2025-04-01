"use server";

import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import { z } from "zod";
import eventIdValidator from "../validators/event-id.validator";
import db from "@/db";
import { EventModel } from "@/db/schema";
import { eq } from "drizzle-orm";

const defaultError = { success: false, message: "Internal server error." };

export default async function changeEventAction(
  uData: unknown,
): Promise<ResponseWraper> {
  try {
    await validateUser();
    const data = await parseData(uData);

    await changeEvent(data.id);

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

async function parseData(data: unknown) {
  try {
    return await z
      .object({ id: z.coerce.number().int().min(1), date: z.coerce.date() })
      .superRefine(async ({ id, date }, ctx) => {
        const message = await eventIdValidator(id, date, ["paused"]);

        if (!!message) {
          ctx.addIssue({ message, code: "custom", path: ["id"] });
        }
      })
      .parseAsync(data);
  } catch {
    throw new SkipError();
  }
}

async function changeEvent(id: number) {
  const event = await db.query.EventModel.findFirst({
    where: (model, { eq }) => eq(model.id, id),
    columns: { name: true },
  });

  if (!event) {
    throw new SkipError();
  }

  let name: (typeof EventModel.name.enumValues)[number];

  switch (event.name) {
    case "Promodoro":
      name = "Short Break";
      break;
    case "Short Break":
      name = "Long Break";
      break;
    case "Long Break":
      name = "Promodoro";
      break;
    default:
      throw new SkipError();
  }

  const date = new Date();

  await db
    .update(EventModel)
    .set({
      start: date,
      paused: date,
      state: "paused",
      name,
    })
    .where(eq(EventModel.id, id));
}
