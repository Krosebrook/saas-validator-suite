import { api } from "encore.dev/api";
import { migrationManager } from "./migrations";
import { logger } from "../logging/logger";
import { handleError } from "../logging/errors";

interface MigrationStatus {
  lastAppliedVersion: number | null;
  pendingMigrations: number;
  isValid: boolean;
}

interface MigrationInfo {
  version: number;
  filename: string;
  appliedAt?: Date;
  status: "applied" | "pending";
}

interface MigrationsListResponse {
  migrations: MigrationInfo[];
  status: MigrationStatus;
}

interface RunMigrationsResponse {
  success: boolean;
  appliedCount: number;
  message: string;
}

// Get migration status and list all migrations
export const status = api<void, MigrationsListResponse>(
  { expose: true, method: "GET", path: "/db/migrations/status" },
  async () => {
    try {
      logger.info("Getting migration status", {
        service: "db",
        endpoint: "migrations/status"
      });

      const [lastVersion, pendingMigrations, isValid] = await Promise.all([
        migrationManager.getLastMigrationVersion(),
        migrationManager.getPendingMigrations(),
        migrationManager.validateMigrations()
      ]);

      // Get all applied migrations for detailed info
      const appliedMigrations = await migrationManager.getAppliedMigrations();
      
      // Combine applied and pending migrations
      const allMigrations: MigrationInfo[] = [
        ...appliedMigrations.map(m => ({
          version: m.version,
          filename: m.filename,
          appliedAt: m.applied_at,
          status: "applied" as const
        })),
        ...pendingMigrations.map(m => ({
          version: m.version,
          filename: m.filename,
          status: "pending" as const
        }))
      ].sort((a, b) => a.version - b.version);

      const status: MigrationStatus = {
        lastAppliedVersion: lastVersion,
        pendingMigrations: pendingMigrations.length,
        isValid
      };

      return {
        migrations: allMigrations,
        status
      };
    } catch (error) {
      handleError(error, { service: "db", endpoint: "migrations/status" });
    }
  }
);

// Run pending migrations
export const migrate = api<void, RunMigrationsResponse>(
  { expose: true, method: "POST", path: "/db/migrations/run" },
  async () => {
    try {
      logger.info("Running migrations", {
        service: "db",
        endpoint: "migrations/run"
      });

      const pendingMigrations = await migrationManager.getPendingMigrations();
      const pendingCount = pendingMigrations.length;

      if (pendingCount === 0) {
        return {
          success: true,
          appliedCount: 0,
          message: "No pending migrations to run"
        };
      }

      await migrationManager.runMigrations();

      logger.info("Migrations completed successfully", {
        service: "db",
        endpoint: "migrations/run",
        data: { appliedCount: pendingCount }
      });

      return {
        success: true,
        appliedCount: pendingCount,
        message: `Successfully applied ${pendingCount} migration(s)`
      };
    } catch (error) {
      handleError(error, { service: "db", endpoint: "migrations/run" });
    }
  }
);

// Validate migrations integrity
export const validate = api<void, { isValid: boolean; message: string }>(
  { expose: true, method: "GET", path: "/db/migrations/validate" },
  async () => {
    try {
      logger.info("Validating migrations", {
        service: "db",
        endpoint: "migrations/validate"
      });

      const isValid = await migrationManager.validateMigrations();

      return {
        isValid,
        message: isValid 
          ? "All migrations are valid and consistent"
          : "Migration validation failed - check logs for details"
      };
    } catch (error) {
      handleError(error, { service: "db", endpoint: "migrations/validate" });
    }
  }
);