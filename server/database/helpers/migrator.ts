/* eslint-disable no-await-in-loop */
import { Collection, MongoClient } from 'mongodb';
import * as path from 'path';
import * as fs from 'fs';
import * as Logger from '../../util/log';
import * as DB from '../../util/db';

Logger.initialize();

interface IMigrationItem {
  file: string;
  path: string;
  migration: IMigration;
}

export interface IMigration {
  /**
   * Function to apply the necessary changes for this migration.
   * @param db
   */
  up(db: MongoClient): void;

  /**
   * Function to effectively undo the changes made by this migration.
   * @param db
   */
  down(db: MongoClient): void;
}

/**
 * Loads all the migrations which are located on the disk.
 */
export const getMigrations = async (
  migrationPath = './database/migrations',
): Promise<IMigrationItem[]> => {
  const basePath = path.join(__dirname, '..', migrationPath);
  Logger.verbose(`Searching for migrations in "${basePath}"...`);

  if (!fs.existsSync(basePath)) {
    Logger.warn('Unable to find migration directory!', { basePath });
  }

  const migrations: IMigrationItem[] = [];
  const files = fs.readdirSync(basePath);

  for (let i = 0; i < files.length; i += 1) {
    // We only want to run the generated .js files
    if (!files[i].endsWith('.js')) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const filepath = `${basePath}${basePath.endsWith('/') ? '' : '/'}${
      files[i]
    }`;
    const stat = fs.lstatSync(filepath);

    if (stat.isFile()) {
      Logger.verbose(`-- found: "${filepath}"`);

      const a = await import(filepath);

      migrations.push({
        file: files[i],
        path: basePath,
        migration: a,
      });
    }
  }

  return migrations;
};

/**
 * Ensures that a migration collection exists on the database.
 * If one does not, it is created here.
 */
export const ensureMigrationCollection = async (
  databaseName?: string,
  collection?: string,
): Promise<Collection> => {
  const database = DB.getConnection().db(databaseName || 'datastore');

  let collections = await database
    .listCollections({}, { nameOnly: true })
    .toArray();
  collections = collections.map((value) => value.name);

  Logger.verbose(`-- found ${collections.length} collections`, { collections });

  let migrationCollection: Collection;
  const migrationCollectionName = collection || 'config.migrations';

  if (!collections.includes(migrationCollectionName)) {
    migrationCollection = await database.createCollection(
      migrationCollectionName,
    );
    await migrationCollection.createIndex('filename', { unique: true });
  } else {
    migrationCollection = database.collection(migrationCollectionName);
  }

  return migrationCollection;
};

/**
 * Checks to see if a migration is applied by querying
 * it's status from the migration collection.
 */
export const isMigrationApplied = async (
  filename: string,
  databaseName = 'datastore',
  collection = 'config.migrations',
): Promise<boolean> => {
  const result = await DB.getConnection()
    .db(databaseName || 'datastore')
    .collection(collection)
    .findOne({ filename });
  return result !== null;
};

/**
 * Marks a migration as applied within the migrations collection.
 */
export const markMigrationAsApplied = async (
  filename: string,
  databaseName = 'datastore',
  collection = 'config.migrations',
): Promise<void> => {
  await DB.getConnection()
    .db(databaseName || 'datastore')
    .collection(collection)
    .insertOne({ filename, ranAt: Date.now() });
};

/**
 * Marks a migration as not applied within the migrations collection.
 */
export const markMigrationAsRemoved = async (
  filename: string,
  databaseName?: string,
  collection?: string,
): Promise<void> => {
  await DB.getConnection()
    .db(databaseName || 'datastore')
    .collection(collection || 'config.migrations')
    .deleteOne({ filename });
};
