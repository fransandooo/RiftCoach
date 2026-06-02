import { checkDatabaseConnection } from "./client";

const ok = await checkDatabaseConnection();

if (!ok) {
  console.error("Database connection check failed");
  process.exit(1);
}

console.log("Database connection OK");
