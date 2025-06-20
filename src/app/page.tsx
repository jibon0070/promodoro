import getAuth from "@/lib/auth";
import { redirect } from "next/navigation";
import Timer from "./_components/timer/client";
import { Metadata } from "next";
import DailyProgress from "./_components/daily-progress/client";
import YearlyProgress from "./_components/yearly-progress/client";
import KeepScreenWake from "./_components/keep-screen-wake/client";
import Streak from "./_components/streak/client";
import Session from "./_components/session/client";

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
    <main className="container mx-auto p-5 space-y-5">
      <Timer />
      <DailyProgress />
      <Session />
      <Streak />
      <YearlyProgress />
      <KeepScreenWake />
    </main>
  );
}
