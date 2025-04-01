import getAuth from "@/lib/auth";
import { redirect } from "next/navigation";
import Timer from "./_components/timer/client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Promodoro",
  description: "Pomodoro timer",
};

export default async function Home() {
  const auth = getAuth();

  if (!(await auth.verify([]))) {
    redirect("/auth/logout");
  }

  return (
    <main className="max-w-md mx-auto p-5 space-y-5">
      <Timer />
    </main>
  );
}
