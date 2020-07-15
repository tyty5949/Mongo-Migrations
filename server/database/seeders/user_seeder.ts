import { ISeeder } from '../helpers/seeder';

/*
 * Creates a test user.
 * --------------------------
 * email: test@gmail.com
 * password: password
 * --------------------------
 */
const Seeder: ISeeder = {
  async run(db) {
    await db
      .db('datastore')
      .collection('users')
      .updateOne(
        { email: 'test@gmail.com' },
        {
          $set: {
            name: 'Mocky Mockery',
            email: 'test@gmail.com',
            passwordHash:
              '$2b$10$35LToL4h6zp6uHsjx48SaeexbeSNxOrmSyekYY6VK0rpJ/vKU3TJa',
          },
        },
        { upsert: true },
      );
  },
};

module.exports = Seeder;
