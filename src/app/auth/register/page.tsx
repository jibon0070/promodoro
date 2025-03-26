import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Client from "./_components/client";
import getAuth from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register | Auth | Promodoro",
  description: "Register for an account",
};

export default async function Register() {
  const auth = getAuth();

  if (!(await auth.verify())) {
    redirect("/");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-3xl">Register</CardTitle>
      </CardHeader>
      <CardContent>
        <Client />
      </CardContent>
    </Card>
  );
}
