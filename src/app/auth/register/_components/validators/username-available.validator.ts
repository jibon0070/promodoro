"use server";

import db from "@/db";
import getAuth from "@/lib/auth";

type User = { id: number };

export default async function usernameAvailableValidator(
  username: string,
): Promise<string | void> {
  try {
    await validateUser();
    await usernameAvailable(username);
  } catch (e) {
    if (e instanceof UsernameAvailableError) {
      return e.message;
    }

    console.trace(e);
    return "Internal server error.";
  }
}

class UsernameAvailableError extends Error {}

async function validateUser() {
  const auth = getAuth();
  if (!(await auth.verify())) {
    throw new Error("User is not logged in.");
  }
}

async function usernameAvailable(username: string) {
  const user: User | undefined = await db.query.UserModel.findFirst({
    where: (model, { eq }) => eq(model.username, username),
    columns: { id: true },
  });

  if (!!user) {
    throw new UsernameAvailableError(`Username ${username} is already taken.`);
  }
}
