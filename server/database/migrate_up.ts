/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import * as Dotenv from 'dotenv';
import * as Migrator from './helpers/migrator';
import * as DB from '../util/db';
import * as Logger from '../util/log';

Dotenv.config();
Logger.initialize();

/**
 * Migrates the database up by applying all un-applied migrations. Migrations are applied
 * in the order which they are presented in the migrations folder. In general, this
 * is accomplished by prefixing each migration file with a unix timestamp.
 */
DB.connect(async (err, clientInstance) => {
  if (!err && clientInstance) {
    let migrations = [];
    try {
      migrations = await Migrator.getMigrations('./migrations');
    } catch (e) {
      Logger.error('Unable to get list of migrations!');
      console.error(e);
      process.exit(-1);
    }

    try {
      await Migrator.ensureMigrationCollection();
    } catch (e) {
      Logger.error('Failed to create migrations collection!');
      console.log(e);
      process.exit(-1);
    }

    for (let i = 0; i < migrations.length; i += 1) {
      try {
        const hasMigration = await Migrator.isMigrationApplied(
          migrations[i].file,
        );
        if (!hasMigration) {
          await migrations[i].migration.up(clientInstance);
          await Migrator.markMigrationAsApplied(migrations[i].file);
          Logger.info('-- successfully applied migration', {
            file: migrations[i].file,
            path: migrations[i].path,
          });
        }
      } catch (e) {
        Logger.error('Unable to apply migration!', {
          file: migrations[i].file,
          path: migrations[i].path,
        });
        console.log(e);
      }
    }
  } else {
    Logger.error('Failed to get MongoDB instance!');
    console.log(err);
    process.exit(-1);
  }

  Logger.info('All migrations applied!');
  process.exit(0);
});
