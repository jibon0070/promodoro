"use server";

import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import { z } from "zod";
import registerSchema from "../schemas/register.schema";
import Payload from "@/types/payload.type";
import db from "@/db";
import { UserDeviceModel, UserModel } from "@/db/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export default async function registerAction(
  uData: unknown,
): Promise<ResponseWraper> {
  try {
    await validateUser();
    const data = await parseData(uData);
    const payload = await register(data);
    await grantAccess(payload);

    // TODO: refresh

    return { success: true };
  } catch (e) {
    console.trace(e);
    return { success: false, message: "Internal server error." };
  }
}

async function validateUser() {
  const auth = getAuth();

  if (!(await auth.verify())) {
    throw new Error("Unauthorized");
  }
}

async function parseData(
  uData: unknown,
): Promise<z.infer<typeof registerSchema>> {
  return await registerSchema.parseAsync(uData);
}

async function register(
  data: Awaited<ReturnType<typeof parseData>>,
): Promise<Payload> {
  const previousUser: boolean = await db.query.UserModel.findFirst({
    columns: { id: true },
  }).then((r) => !!r);

  const payload: Payload | undefined = await db
    .insert(UserModel)
    .values({
      username: data.username,
      password: bcrypt.hashSync(data.password, bcrypt.genSaltSync()),
      role: !previousUser ? "super admin" : "general",
    })
    .returning({
      id: UserModel.id,
      role: UserModel.role,
      username: UserModel.username,
    })
    .then((r) => r.at(0))
    .then((r) => (!r ? undefined : { ...r, isShadowAdmin: false }));

  if (!payload) {
    throw new Error("User creation error.");
  }

  return payload;
}
async function grantAccess(payload: Payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET!);

  await db.insert(UserDeviceModel).values({
    token,
    userId: payload.id,
  });

  const cookie = await cookies();

  cookie.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
