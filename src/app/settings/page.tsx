import { Metadata } from "next";
import getAuth from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings | Promodoro",
  description: "Settings for your account",
};
export default async function Settings() {
  const auth = getAuth();

  if (!(await auth.verify([]))) {
    redirect("/");
  }

  return (
    <main className="container mx-auto space-y-5 p-5">
      <Durations defaultValues={durationsDefaultValues} />
    </main>
  );
}
