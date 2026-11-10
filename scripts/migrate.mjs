import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

dotenv.config({ path: ".env.local" });

const client = postgres(process.env.DATABASE_URL);

await migrate(drizzle(client), { migrationsFolder: "drizzle" });
await client.end();

console.log("migrations applied");
