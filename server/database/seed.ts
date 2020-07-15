/*
 * The seed program which runs seeder files to seed data within a configured
 * MongoDB database.
 *
 * To specify a custom seeder directory, add a "SEEDER_DIR" entry to the applications
 * '.env' file. Make sure that the supplied directory is relative to this 'seed.ts' file.
 *
 * Seeders should be given as a filename as the path will be built within
 * this function. If no file extension is supplied, .ts is inferred.
 *
 * A list of seeders can also be configured to be run by "default"
 * (when the --default flag is supplied to this script). See the schema below...
 *
 * Seeder files should export a single object which is of the ISeeder type given below.
 *
 * Command structure
 * ----------------------
 * node dist/seed.js [--default] [<seeder-a> <seeder-b> <seeder-c> ...]
 *    [--default] (optional)
 *        Runs the seeders specified by the default.json file.
 *        @see runDefault()
 *    [<seeder-a> <seeder-b> <seeder-c> ...]
 *        Runs the given seeders in the order which they are supplied. Seeders are specified
 *        by file names. If no extension is given, .ts is inferred.
 *
 *
 * default.json schema
 * ----------------------
 *   {
 *      // The seeders to run. Will be run in the order specified
 *     "seeders": []
 *   }
 *
 * Example seeder
 * ----------------------
 *    import { ISeeder } from '../seed';
 *
 *    const Seeder: ISeeder = {
 *      async run(db) {
 *        await db.db('datastore').collection('users').insertOne({
 *          name: 'Mocky Mockery',
 *          email: 'test@gmail.com',
 *        });
 *      },
 *    };
 *    module.exports = Seeder;
 */
/* eslint-disable no-await-in-loop,no-console */
import * as Dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as Logger from '../util/log';
import { applySeeder, runDefault } from './helpers/seeder';
import * as DB from '../util/db';

Dotenv.config();
Logger.initialize();

const bootstrap = (): void => {
  const seederDir = path.join(__dirname, process.env.SEEDER_DIR || 'seeders');

  /*
   * Verify that the seeder directory. By default './seeders' is assumed.
   */
  if (!fs.existsSync(seederDir)) {
    Logger.error('Failed to find seeder directory!', { target: seederDir });
    process.exit(-1);
  }

  const dirStat = fs.lstatSync(seederDir);
  if (!dirStat.isDirectory()) {
    Logger.error('Failed to find seeder directory!', { target: seederDir });
    process.exit(-1);
  }

  /*
   * Connects to the database, then if successful runs the seed program.
   */
  DB.connect(async (err, clientInstance) => {
    let seeders: string[];
    if (!err && clientInstance) {
      seeders = process.argv.slice(2);

      // Apply default seeders is --default flag is supplied
      const defaultFlagIndex = seeders.indexOf('--default');
      if (defaultFlagIndex > -1) {
        await runDefault(clientInstance, seederDir);
        seeders.splice(defaultFlagIndex, 1);
      }

      // Apply all specified seeders
      // eslint-disable-next-line no-restricted-syntax
      for (const seeder of seeders) {
        await applySeeder(seeder, clientInstance, seederDir);
      }
    } else {
      console.log(err);
      process.exit(-1);
    }

    Logger.info(`Finished running ${seeders?.length} seeders!`);
    process.exit(0);
  });
};

bootstrap();
