import { SQLDatabase } from "encore.dev/storage/sqldb";

export default new SQLDatabase("validator_db", {
  migrations: "./migrations",
});
