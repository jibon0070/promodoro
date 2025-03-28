"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import otherSettingsSchema from "./schemas/other-settings.schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import otherSettingsSaveAction from "./actions/other-settings-save.action";

export default function Client({
  defaultValues,
}: {
  defaultValues: {
    promodorosUntilLongBreak: number;
    dailyGoal: number;
  };
}) {
  const form = useForm<z.infer<typeof otherSettingsSchema>>({
    defaultValues,
    resolver: zodResolver(otherSettingsSchema),
  });

  const mutation = useMutation({
    mutationFn: otherSettingsSaveAction,
    onSuccess: (r) => {
      if (r.success) {
        toast.success("Other settings saved successfully!");
      } else {
        toast.error(r.message);
      }
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    if (mutation.isPending) {
      return;
    }

    mutation.mutate(data);
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <h4 className="text-center text-xl">Other Settings</h4>
      <div className="grid grid-cols-2 gap-5">
        <Form {...form}>
          <FormField
            control={form.control}
            name="promodorosUntilLongBreak"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-center block">
                  Promodoros Until Long Break
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dailyGoal"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-center block">Daily Goal</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </div>
      <Button className="block mx-auto">Save</Button>
    </form>
  );
}

function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "text-3xl",
        "md:text-9xl",
        "border",
        "w-full",
        "aspect-1/1",
        "text-center",
        "p-5",
        "rounded",
        className,
      )}
      type="number"
      {...props}
    />
  );
}
