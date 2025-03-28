import { Metadata } from "next";
import Durations from "./_components/durations/client";
import getAuth from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/db";

export const metadata: Metadata = {
  title: "Settings | Promodoro",
  description: "Settings for your account",
};

export default async function Settings() {
  const auth = getAuth();

  if (!(await auth.verify([]))) {
    redirect("/");
  }

  const payload = await auth.getPayload();

  const durationsDefaultValues = await db.query.DurationsModel.findFirst({
    where: (model, { eq }) => eq(model.userId, payload.id),
    columns: { promodoro: true, shortBreak: true, longBreak: true },
  }).then((row) => row || { promodoro: 25, shortBreak: 5, longBreak: 15 });

  return (
    <main className="container mx-auto space-y-5 p-5">
      <Durations defaultValues={durationsDefaultValues} />
    </main>
  );
}
