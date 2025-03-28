"use server";

import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import otherSettingsSchema from "../schemas/other-settings.schema";
import db from "@/db";
import { OtherSettingModel } from "@/db/schema";
import { eq } from "drizzle-orm";

const defaultErrorResponse = {
  success: false,
  message: "Internal server error.",
};

export default async function otherSettingsSaveAction(
  uData: unknown,
): Promise<ResponseWraper> {
  try {
    const auth = getAuth();

    await validateUser(auth);
    const data = parseData(uData);

    const payload = await auth.getPayload();

    await saveData(data, payload.id);

    //TODO: refresh

    return { success: true };
  } catch (e) {
    if (e instanceof SkipError) {
      return e.response();
    }

    console.trace(e);
    return defaultErrorResponse;
  }
}

class SkipError extends Error {
  response() {
    return defaultErrorResponse;
  }
}
async function validateUser(auth: ReturnType<typeof getAuth>) {
  if (!(await auth.verify([]))) {
    throw new SkipError();
  }
}

function parseData(data: unknown) {
  try {
    return otherSettingsSchema.parse(data);
  } catch {
    throw new SkipError();
  }
}

async function saveData(data: ReturnType<typeof parseData>, userId: number) {
  const otherSettings = await db.query.OtherSettingModel.findFirst({
    where: (model, { eq }) => eq(model.userId, userId),
    columns: { id: true },
  });

  if (!otherSettings) {
    await insert(data, userId);
  } else {
    await update(data, userId);
  }
}

async function insert(
  data: { promodorosUntilLongBreak: number; dailyGoal: number },
  userId: number,
) {
  await db.insert(OtherSettingModel).values({ ...data, userId });
}

async function update(data: ReturnType<typeof parseData>, userId: number) {
  await db
    .update(OtherSettingModel)
    .set({ ...data })
    .where(eq(OtherSettingModel.userId, userId));
}
