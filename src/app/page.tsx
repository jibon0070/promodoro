import getAuth from "@/lib/auth";
import { redirect } from "next/navigation";
import Timer from "./_components/timer/client";

export default async function Home() {
  const auth = getAuth();

  if (!(await auth.verify([]))) {
    redirect("/auth/logout");
  }

  return (
    <main className="container mx-auto p-5 space-y-5">
      <Timer />
    </main>
  );
}
