import { z } from "zod";

const schema = z.object({
  promodoro: z.coerce.number().min(1),
  shortBreak: z.coerce.number().min(1),
  longBreak: z.coerce.number().min(1),
});

export default schema;
