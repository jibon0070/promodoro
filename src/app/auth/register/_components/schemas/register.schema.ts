import { z } from "zod";
import usernameAvailableValidator from "../validators/username-available.validator";

const schema = z
  .object({
    username: z
      .string()
      .min(1, "Username is required.")
      .min(4, "Username is too short.")
      .max(50, "Username is too long.")
      .regex(
        /^[a-z0-9]+$/,
        "Username must be lowercase and contain only numbers and letters.",
      )
      .superRefine(async (value, ctx) => {
        const message = await usernameAvailableValidator(value);

        if (!!message) {
          ctx.addIssue({ message, code: "custom" });
        }
      }),
    password: z
      .string()
      .min(1, "Password is required.")
      .max(50, "Password must be less than 50 characters.")
      .refine((value) => /[a-z]/.test(value), {
        message: "Password must contain lowercase letter.",
      })
      //must contain uppercase letter
      .refine((value) => /[A-Z]/.test(value), {
        message: "Password must contain uppercase letter.",
      })
      //must contain number
      .refine((value) => /[0-9]/.test(value), {
        message: "Password must contain number.",
      })
      //must contain special character
      .refine((value) => /[^a-zA-Z0-9]/.test(value), {
        message: "Password must contain special character.",
      })
      //must be at least 8 characters
      .refine((value) => value.length >= 8, {
        message: "Password must be at least 8 characters.",
      }),
    confirmPassword: z.string().min(8, "Confirm password does not match."),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Confirm password does not match.",
  });

export default schema;
