import { defineConfig } from "prisma/config";
import path from "path";

const dbUrl =
  process.env.DATABASE_URL ||
  `file:${path.join(process.cwd(), "prisma", "dev.db")}`;

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
  migrate: {
    adapter: async () => {
      const { PrismaLibSql } = await import("@prisma/adapter-libsql");
      return new PrismaLibSql({ url: dbUrl });
    },
  },
});


