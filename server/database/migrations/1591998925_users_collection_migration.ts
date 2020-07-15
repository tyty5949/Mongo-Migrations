import { MongoClient } from 'mongodb';
import { IMigration } from '../helpers/migrator';

const UsersMigration: IMigration = {
  up: async (db: MongoClient): Promise<boolean> => {
    const collection = await db.db('datastore').createCollection('users', {
      validator: {
        $jsonSchema: {
          required: ['email', 'passwordHash'],
          properties: {
            email: { bsonType: 'string' },
            passwordHash: { bsonType: 'string' },
          },
        },
      },
    });
    await collection.createIndex('email', { unique: true });
    return true;
  },

  down: async (db: MongoClient): Promise<boolean> => {
    await db.db('datastore').dropCollection('users');
    return true;
  },
};

module.exports = UsersMigration;
