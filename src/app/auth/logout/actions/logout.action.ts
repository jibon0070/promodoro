"use server";

import getAuth from "@/lib/auth";
import ResponseWraper from "@/types/response-wraper.type";

export default async function logoutAction(): Promise<ResponseWraper> {
  try {
    const auth = getAuth();
    await auth.logout();

    return { success: true };
  } catch (e) {
    console.trace(e);
    return { success: false, message: "Internal server error." };
  }
}
