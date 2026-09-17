import { loadLocalEnv } from "./load-env";

loadLocalEnv();
// Point app code that calls getDb() at the test database.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
