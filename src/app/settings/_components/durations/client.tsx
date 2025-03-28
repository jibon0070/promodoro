"use client";

import { z } from "zod";
import durationsSchema from "./schemas/durations.schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import durationsSaveAction from "./actions/durations.save.action";

export default function Durations({
  defaultValues,
}: {
  defaultValues: z.infer<typeof durationsSchema>;
}) {
  const form = useForm<z.infer<typeof durationsSchema>>({
    defaultValues,
    resolver: zodResolver(durationsSchema),
  });

  const mutation = useMutation({
    mutationFn: durationsSaveAction,
    onSuccess: (r) => {
      if (r.success) {
        toast.success("Durations saved successfully!");
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
      <h4 className="text-center text-xl">Durations</h4>
      <div className="grid grid-cols-3 gap-2 md:gap-5">
        <Form {...form}>
          <FormField
            control={form.control}
            name="promodoro"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-center block">Promodoro</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="shortBreak"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-center block">Short Break</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="longBreak"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-center block">Long Break</FormLabel>
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
      {...props}
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
      step={1}
    />
  );
}
