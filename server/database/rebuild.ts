/* eslint-disable no-console */
import * as Dotenv from 'dotenv';
import * as DB from '../util/db';
import * as Logger from '../util/log';

Dotenv.config();
Logger.initialize();

/*
 * Connects to the database, then if successful runs the rebuild
 */
DB.connect(async (err, clientInstance) => {
  if (!err && clientInstance) {
    const collections = await clientInstance.db('datastore').collections();

    await Promise.all(
      collections.map((collection) =>
        collection.drop().then((success) => {
          if (success) {
            Logger.info('Successfully dropped collection!', {
              collection: collection.collectionName,
            });
          } else {
            Logger.warn('Failed to drop collection!', {
              collection: collection.collectionName,
            });
          }
        }),
      ),
    );

    Logger.info(`Attempted to drop ${collections.length} collections!`);
    process.exit(0);
  } else {
    process.exit(-1);
    console.log(err);
  }
});
