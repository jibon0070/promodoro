"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import logoutAction from "./actions/logout.action";

export default function Logout() {
  const query = useQuery({
    queryKey: ["auth", "logout"],
    queryFn: logoutAction,
  });
  const router = useRouter();

  useEffect(() => {
    if (query.data) {
      if (query.data.success) {
        router.replace("login");
        toast.success("Logged out successfully.");
      } else {
        toast.error(query.data.message);
      }
    }
  }, [query.data, router]);

  return null;
}
