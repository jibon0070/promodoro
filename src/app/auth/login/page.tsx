import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metadata } from "next";
import CLient from "./_components/client";
import getAuth from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login | Auth | Promodoro",
  description: "Login to your account",
};

export default async function Login() {
  const auth = getAuth();

  if (!(await auth.verify())) {
    redirect("/");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-3xl">Login</CardTitle>
      </CardHeader>
      <CardContent>
        <CLient />
      </CardContent>
    </Card>
  );
}
