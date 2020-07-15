/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import * as Dotenv from 'dotenv';
import * as Migrator from './helpers/migrator';
import * as DB from '../util/db';
import * as Logger from '../util/log';

Dotenv.config();
Logger.initialize();

/**
 * Migrates the database down by the most recent applied migration.
 */
DB.connect(async (err, clientInstance) => {
  if (!err && clientInstance) {
    let migrationFiles;
    try {
      migrationFiles = await Migrator.getMigrations('./migrations');
    } catch (e) {
      Logger.error('Unable to get list of migrations!');
      console.log(e);
      process.exit(-1);
    }

    try {
      await Migrator.ensureMigrationCollection();
    } catch (e) {
      Logger.error('Failed to create migrations collection!');
      console.log(e);
      process.exit(-1);
    }

    while (migrationFiles.length > 0) {
      const item = migrationFiles.pop();
      if (!item) return;

      const hasMigration = await Migrator.isMigrationApplied(item.file);
      if (hasMigration) {
        try {
          await item.migration.down(clientInstance);
          await Migrator.markMigrationAsRemoved(item.file);
          Logger.info('-- successfully migrated down', {
            file: item.file,
            path: item.path,
          });
        } catch (e) {
          Logger.error('Failed to migrate down!', {
            message: e.message,
            file: item.file,
            path: item.path,
          });
          console.log(e);
          process.exit(-1);
        }
        break;
      }
    }
  } else {
    Logger.error('Failed to get MongoDB instance!');
    console.log(err);
    process.exit(-1);
  }

  Logger.info('Finished migrating down!');
  process.exit(0);
});
