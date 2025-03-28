"use server";

import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import durationsSchema from "../schemas/durations.schema";
import db from "@/db";
import { DurationsModel } from "@/db/schema";
import { eq } from "drizzle-orm";

const errorMessage = "Internal server error.";

export default async function durationsSaveAction(
  uData: unknown,
): Promise<ResponseWraper> {
  try {
    const auth = getAuth();

    await validateUser(auth);

    const payload = await auth.getPayload();

    const data = parseData(uData);
    await saveData(data, payload.id);

    return { success: true };
  } catch (e) {
    if (e instanceof SkipError) {
      return e.response();
    }

    console.trace(e);
    return { success: false, message: errorMessage };
  }
}

class SkipError extends Error {
  response() {
    return { success: false, message: errorMessage };
  }
}

async function validateUser(auth: ReturnType<typeof getAuth>) {
  if (!(await auth.verify([]))) {
    throw new SkipError();
  }
}

function parseData(data: unknown) {
  try {
    return durationsSchema.parse(data);
  } catch {
    throw new SkipError();
  }
}

async function saveData(data: ReturnType<typeof parseData>, userId: number) {
  const durations = await db.query.DurationsModel.findFirst({
    where: (model, { eq }) => eq(model.userId, userId),
    columns: { id: true },
  });

  if (!durations) {
    await insert(data, userId);
  } else {
    await update(data, userId);
  }
}

async function insert(data: ReturnType<typeof parseData>, userId: number) {
  await db.insert(DurationsModel).values({ ...data, userId });
}

async function update(data: ReturnType<typeof parseData>, userId: number) {
  await db
    .update(DurationsModel)
    .set({ ...data })
    .where(eq(DurationsModel.userId, userId));
}
