import db from "./index";
import { logger } from "../logging/logger";

interface Migration {
  version: number;
  filename: string;
  sql: string;
}

interface MigrationRecord {
  version: number;
  filename: string;
  applied_at: Date;
  checksum: string;
}

export class MigrationManager {
  private migrationsPath: string;

  constructor(migrationsPath: string = "./migrations") {
    this.migrationsPath = migrationsPath;
  }

  private async ensureMigrationsTable(): Promise<void> {
    await db.exec`
      CREATE TABLE IF NOT EXISTS migrations (
        version BIGINT PRIMARY KEY,
        filename TEXT NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        checksum TEXT NOT NULL
      )
    `;
  }



  private loadMigrationFiles(): Migration[] {
    // For now, return the known migration file
    // In a real implementation, you would scan the filesystem
    return [
      {
        version: 1,
        filename: "001_create_tables.up.sql",
        sql: `-- This would be loaded from the migration file
        -- For now, this is a placeholder as we can't read files in Encore.ts runtime`
      }
    ];
  }

  private generateChecksum(sql: string): string {
    // Simple checksum using hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < sql.length; i++) {
      const char = sql.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = this.loadMigrationFiles();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    // Verify checksums for applied migrations
    for (const applied of appliedMigrations) {
      const migration = allMigrations.find(m => m.version === applied.version);
      if (migration) {
        const currentChecksum = this.generateChecksum(migration.sql);
        if (currentChecksum !== applied.checksum) {
          throw new Error(
            `Migration ${applied.filename} has been modified after being applied. ` +
            `Expected checksum: ${applied.checksum}, got: ${currentChecksum}`
          );
        }
      }
    }

    return allMigrations.filter(migration => !appliedVersions.has(migration.version));
  }

  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    await this.ensureMigrationsTable();
    return await db.queryAll<MigrationRecord>`
      SELECT version, filename, applied_at, checksum
      FROM migrations
      ORDER BY version
    `;
  }

  async runMigrations(): Promise<void> {
    logger.info("Starting database migrations", { service: "db", endpoint: "migrations" });

    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      logger.info("No pending migrations", { service: "db", endpoint: "migrations" });
      return;
    }

    logger.info("Found pending migrations", {
      service: "db",
      endpoint: "migrations",
      data: { count: pendingMigrations.length, versions: pendingMigrations.map(m => m.version) }
    });

    for (const migration of pendingMigrations) {
      const tx = await db.begin();
      
      try {
        logger.info("Applying migration", {
          service: "db",
          endpoint: "migrations",
          data: { version: migration.version, filename: migration.filename }
        });

        // Run the migration SQL
        await tx.rawExec(migration.sql);

        // Record the migration as applied
        const checksum = this.generateChecksum(migration.sql);
        await tx.exec`
          INSERT INTO migrations (version, filename, checksum)
          VALUES (${migration.version}, ${migration.filename}, ${checksum})
        `;

        await tx.commit();

        logger.info("Migration applied successfully", {
          service: "db",
          endpoint: "migrations",
          data: { version: migration.version, filename: migration.filename }
        });

      } catch (error) {
        await tx.rollback();
        
        logger.error("Migration failed", {
          service: "db",
          endpoint: "migrations",
          error: error instanceof Error ? error : new Error(String(error)),
          data: { version: migration.version, filename: migration.filename }
        });

        throw new Error(
          `Migration ${migration.filename} failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    logger.info("All migrations completed successfully", {
      service: "db",
      endpoint: "migrations",
      data: { appliedCount: pendingMigrations.length }
    });
  }

  async getLastMigrationVersion(): Promise<number | null> {
    const appliedMigrations = await this.getAppliedMigrations();
    if (appliedMigrations.length === 0) {
      return null;
    }
    return Math.max(...appliedMigrations.map(m => m.version));
  }

  async validateMigrations(): Promise<boolean> {
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const allMigrations = this.loadMigrationFiles();

      // Check for gaps in migration sequence
      const appliedVersions = appliedMigrations.map(m => m.version).sort((a, b) => a - b);
      for (let i = 1; i < appliedVersions.length; i++) {
        if (appliedVersions[i] !== appliedVersions[i - 1] + 1) {
          logger.warn("Gap in migration sequence detected", {
            service: "db",
            endpoint: "migrations",
            data: { 
              previous: appliedVersions[i - 1], 
              current: appliedVersions[i],
              gap: appliedVersions[i] - appliedVersions[i - 1] - 1
            }
          });
        }
      }

      // Verify all applied migrations still exist and haven't been modified
      for (const applied of appliedMigrations) {
        const migration = allMigrations.find(m => m.version === applied.version);
        if (!migration) {
          logger.error("Applied migration file missing", {
            service: "db",
            endpoint: "migrations",
            data: { version: applied.version, filename: applied.filename }
          });
          return false;
        }

        const currentChecksum = this.generateChecksum(migration.sql);
        if (currentChecksum !== applied.checksum) {
          logger.error("Migration file has been modified after application", {
            service: "db",
            endpoint: "migrations",
            data: { 
              version: applied.version, 
              filename: applied.filename,
              expectedChecksum: applied.checksum,
              currentChecksum
            }
          });
          return false;
        }
      }

      logger.info("Migration validation completed successfully", {
        service: "db",
        endpoint: "migrations",
        data: { appliedCount: appliedMigrations.length, totalCount: allMigrations.length }
      });

      return true;
    } catch (error) {
      logger.error("Migration validation failed", {
        service: "db",
        endpoint: "migrations",
        error: error instanceof Error ? error : new Error(String(error))
      });
      return false;
    }
  }
}

export const migrationManager = new MigrationManager("./migrations");