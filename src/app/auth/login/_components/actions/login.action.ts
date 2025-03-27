"use server";

import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";
import loginSchema from "../schemas/login.schema";
import { z } from "zod";
import Payload from "@/types/payload.type";
import db from "@/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";

type Field = keyof z.infer<typeof loginSchema>;

export default async function loginAction(
  uData: unknown,
): Promise<ResponseWraper<Record<string, unknown>, Field>> {
  try {
    await validateUser();
    const data = parseData(uData);
    const { password: hash, ...payload } = await getUser(data.username);
    validatePassword(hash, data.password);
    await grantAccess(payload);

    //TODO: refresh

    return { success: true };
  } catch (e) {
    const defaultError = { success: false, message: "Internal server error" };

    if (e instanceof AvoidTraceError) {
      return e.response();
    } else if (e instanceof FormError) {
      return e.response();
    }

    console.trace(e);
    return defaultError;
  }
}

async function validateUser() {
  const auth = getAuth();

  if (!(await auth.verify())) {
    throw new AvoidTraceError("Unauthorized.");
  }
}

class AvoidTraceError extends Error {
  response() {
    return { success: false, message: "Internal server error." };
  }
}

class FormError extends Error {
  constructor(
    message: string,
    public readonly field: Field,
  ) {
    super(message);
  }

  response() {
    const { field, message } = this;
    return { success: false, field, message };
  }
}

function parseData(uData: unknown) {
  try {
    return loginSchema.parse(uData);
  } catch {
    throw new AvoidTraceError();
  }
}

async function getUser(
  username: string,
): Promise<Payload & { password: string }> {
  const payload = await db.query.UserModel.findFirst({
    where: (model, { eq }) => eq(model.username, username),
    columns: { id: true, role: true, username: true, password: true },
  });

  if (!payload) {
    throw new FormError("Invalid username.", "username");
  }

  return { ...payload, isShadowAdmin: false };
}

function validatePassword(hash: string, password: string) {
  if (!bcrypt.compareSync(password, hash)) {
    throw new FormError("Invalid password.", "password");
  }
}

async function grantAccess(payload: Payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET!);
  const cookie = await cookies();

  const header = await headers();

  const proto = header.get("x-forwarded-proto");

  cookie.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    maxAge: 60 * 60 * 24 * 30,
  });
}
