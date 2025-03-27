import { z } from "zod";

const usernameMessage = "Invalid username.";
const passwordMessage = "Invalid password.";

const schema = z.object({
  username: z
    .string()
    .min(1, "Username is required.")
    .min(4, usernameMessage)
    .max(50, usernameMessage)
    .regex(/^[a-z0-9]+$/, usernameMessage),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(50, passwordMessage)
    .refine((value) => /[a-z]/.test(value), {
      message: passwordMessage,
    })
    //must contain uppercase letter
    .refine((value) => /[A-Z]/.test(value), {
      message: passwordMessage,
    })
    //must contain number
    .refine((value) => /[0-9]/.test(value), {
      message: passwordMessage,
    })
    //must contain special character
    .refine((value) => /[^a-zA-Z0-9]/.test(value), {
      message: passwordMessage,
    })
    //must be at least 8 characters
    .refine((value) => value.length >= 8, {
      message: passwordMessage,
    }),
});

export default schema;
