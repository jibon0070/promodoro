import { roles } from "@/types/role.type";
import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
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
  password: text("password").notNull(),
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

export const DurationsModel = pgTable("durations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => UserModel.id),
  promodoro: integer("promodoro").notNull(),
  shortBreak: integer("short_break").notNull(),
  longBreak: integer("long_break").notNull(),
  ...timeStamps,
});

export const OtherSettingModel = pgTable("other_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => UserModel.id),
  promodorosUntilLongBreak: integer("promodoros_until_long_break").notNull(),
  dailyGoal: integer("daily_goal").notNull(),
  ...timeStamps,
});
