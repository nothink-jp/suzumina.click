import type { Config } from "drizzle-kit";

export default {
  schema: "./apps/web/src/db/schema.ts",
  out: "./apps/web/drizzle",
  dialect: "sqlite",
} satisfies Config;
