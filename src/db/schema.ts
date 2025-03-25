import { roles } from "@/types/role.type";
import {
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

const timeStamps = {
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
};

export const UserRoleEnum = pgEnum("role", roles);

export const UserModel = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username").notNull().unique(),
  role: UserRoleEnum("role").notNull().default("general"),
  ...timeStamps,
});

export const UserDeviceModel = pgTable("user_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => UserModel.id),
  token: varchar("token").notNull().unique(),
  ...timeStamps,
});
