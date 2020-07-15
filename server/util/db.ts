import { MongoClient, Collection } from 'mongodb';
import * as Logger from './log';

/**
 * The shared db connection.
 */
let db: MongoClient;

interface IConnectCallback {
  (err: Error | null, db: MongoClient | null): void;
}

/**
 * Connects to a MongoDB database and stores the returned database
 * within the db singleton in this file. The supplied callback
 * function is called on both connection success or failure.
 *
 * @param callback
 */
export function connect(callback: IConnectCallback): void {
  if (db) {
    Logger.warn('Trying to init DB again!');
  }

  MongoClient.connect(
    process.env.MONGO_URL || '',
    { useUnifiedTopology: true },
    (err: Error, initialized: MongoClient) => {
      if (err) {
        Logger.error('Error connecting to MongoDB database', { err });
        return callback(err, null);
      }
      db = initialized;
      Logger.info('Successfully connected to MongoDB database!');
      return callback(null, db);
    },
  );
}

/**
 * Gets the active connection to the database. The connection must be
 * created first by calling the connect function in this file.
 *
 * @returns {MongoClient}
 */
export function getConnection(): MongoClient {
  return db;
}

/**
 * Access function which wraps getting a specific collection from
 * a specific database. To add further helpfulness, the 'database'
 * parameter is optional and the default can be set.
 *
 * @param {string} collection               - The collection to get
 * @param {string} [database=datastore]     - The database to use to get the collection
 *
 * @returns {Collection}
 */
export function get(collection: string, database = 'datastore'): Collection {
  return db.db(database).collection(collection);
}
