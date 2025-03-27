"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import loginSchema from "./schemas/login.schema";
import { useRouter } from "next/navigation";
import loginAction from "./actions/login.action";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Client() {
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: loginAction,
    onSuccess: (r) => {
      if (r.success) {
        toast.success("Logged in successfully.");
        router.replace("/");
      } else {
        if (!!r.field) {
          form.setError(r.field, { message: r.message });
        } else {
          toast.error(r.message);
        }
      }
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    if (mutation.isPending) {
      return null;
    }

    mutation.mutate(data);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Form {...form}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input {...field} type="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Form>
      <div className="flex justify-end items-center gap-2">
        <Button type="button" variant={"outline"} asChild>
          <Link href="register">Register</Link>
        </Button>
        <Button>Login</Button>
      </div>
    </form>
  );
}
