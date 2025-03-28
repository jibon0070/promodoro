import { z } from "zod";

const schema = z.object({
  promodorosUntilLongBreak: z.coerce.number().min(1),
  dailyGoal: z.coerce.number().min(1),
});

export default schema;
