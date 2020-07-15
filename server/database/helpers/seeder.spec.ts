/* eslint-disable no-await-in-loop */
import * as fs from 'fs';
import * as path from 'path';
import * as Logger from '../../util/log';
import * as Seeder from './seeder';

jest.mock('fs');
jest.mock('../../util/log');

const mockDefaultFile = (value?: string) => {
  const text = value || '{"seeders": ["test-1", "test-2"]}"';

  (fs.existsSync as jest.Mock).mockReturnValue(true);
  (fs.lstatSync as jest.Mock).mockReturnValue({
    isFile: () => true,
  });
  (fs.readFileSync as jest.Mock).mockReturnValue(text);
};

const generateRandomMockDefaultFile = (size?: number): string => {
  const numSeeders = Number.isInteger(size)
    ? size
    : Math.trunc(Math.random() * 100);

  let text = '{"seeders": [';
  if (numSeeders > 0) {
    text += '"hello1"';
  }
  for (let i = 1; i < numSeeders; i += 1) {
    text += `, "hello-${i}"`;
  }
  text += ']}';
  return text;
};

const mockSeederFile = () => {
  (fs.existsSync as jest.Mock).mockReturnValue(true);
  (fs.lstatSync as jest.Mock).mockReturnValue({
    isFile: () => true,
  });
  jest.spyOn(Seeder, 'runSeeder').mockResolvedValue(null);
};

describe('seeder.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('#runDefault()', () => {
    test('should not apply any default seeders if default file is empty', async () => {
      mockDefaultFile('{"seeders":[]}');
      jest.spyOn(Seeder, 'applySeeder').mockReturnValue(Promise.resolve());

      await Seeder.runDefault(null, 'mock/path/');

      expect(Logger.warn).toHaveBeenCalledTimes(0);
      expect(Logger.info).toHaveBeenCalledTimes(1);
      expect(Seeder.applySeeder).toHaveBeenCalledTimes(0);
    });

    test('should apply correct number of default seeders', async () => {
      const applySeederSpy = jest
        .spyOn(Seeder, 'applySeeder')
        .mockReturnValue(Promise.resolve());

      // Fuzz random number of seeders in default file
      for (let i = 0; i < 100; i += 1) {
        // Clear mocks so call counts don't carry over to next iteration
        (Logger.warn as jest.Mock).mockClear();
        (Logger.info as jest.Mock).mockClear();
        applySeederSpy.mockClear();

        const size = Math.trunc(Math.random() * 100);
        mockDefaultFile(generateRandomMockDefaultFile(size));

        await Seeder.runDefault(null, 'mock/path/');

        expect(Logger.warn).toHaveBeenCalledTimes(0);
        expect(Logger.info).toHaveBeenCalledTimes(1);
        expect(applySeederSpy).toHaveBeenCalledTimes(size);
      }
    });

    test('should apply correct default seeders in supplied order', async () => {
      let applySeederCalls: Array<string> = [];
      jest
        .spyOn(Seeder, 'applySeeder')
        .mockImplementation(async (seeder: string) => {
          applySeederCalls.push(seeder);
        });

      // Fuzz random number of seeders in default file
      for (let i = 0; i < 100; i += 1) {
        // Clear mocks so call counts don't carry over to next iteration
        (Logger.warn as jest.Mock).mockClear();
        (Logger.info as jest.Mock).mockClear();

        // Clear applySeederCalls so that call values don't carry over to next iteration
        applySeederCalls = [];

        const randomDefaultFile = generateRandomMockDefaultFile();
        mockDefaultFile(randomDefaultFile);

        await Seeder.runDefault(null, 'mock/path/');

        expect(Logger.warn).toHaveBeenCalledTimes(0);
        expect(Logger.info).toHaveBeenCalledTimes(1);
        const mockedRandomDefaultSeeders = JSON.parse(randomDefaultFile)
          .seeders;
        expect(applySeederCalls).toEqual(mockedRandomDefaultSeeders);
      }
    });

    test('should exit if specified default file doesnt exist', async () => {
      mockDefaultFile();
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const applySeederSpy = jest.spyOn(Seeder, 'applySeeder').mockClear();

      await Seeder.runDefault(null, 'mock/path/');

      expect(Logger.warn).toHaveBeenCalledTimes(1);
      expect(applySeederSpy).toHaveBeenCalledTimes(0);
    });

    test('should exit if specified default file is directory', async () => {
      mockDefaultFile();
      (fs.lstatSync as jest.Mock).mockReturnValue({
        isFile: () => false,
      });
      const applySeederSpy = jest.spyOn(Seeder, 'applySeeder');

      await Seeder.runDefault(null, 'mock/path/');

      expect(Logger.warn).toHaveBeenCalledTimes(1);
      expect(applySeederSpy).toHaveBeenCalledTimes(0);
    });

    test('should exit default file is malformed as non-json', async () => {
      mockDefaultFile('test...');
      const applySeederSpy = jest.spyOn(Seeder, 'applySeeder');

      await Seeder.runDefault(null, 'mock/path/');

      expect(Logger.warn).toHaveBeenCalledTimes(1);
      expect(applySeederSpy).toHaveBeenCalledTimes(0);
    });

    test('should exit default file is malformed as missing required fields', async () => {
      mockDefaultFile('{"test": {}}');
      const applySeederSpy = jest.spyOn(Seeder, 'applySeeder');

      await Seeder.runDefault(null, 'mock/path/');

      expect(Logger.warn).toHaveBeenCalledTimes(1);
      expect(applySeederSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('#applySeeder()', () => {
    beforeAll(() => {
      // Need to restore since applySeeder was mocked previously
      jest.spyOn(Seeder, 'applySeeder').mockRestore();
    });

    test('should run seeder file when specified with extension', async () => {
      mockSeederFile();
      const mockMongo = jest.fn();
      const runSeederSpy = jest.spyOn(Seeder, 'runSeeder');
      const mockSeeder = 'mock-seeder.ts';
      const mockSeederDir = 'seeder/dir';

      // @ts-ignore
      await Seeder.applySeeder(mockSeeder, mockMongo, mockSeederDir);

      const mockSeederFilepath = path.join(
        __dirname,
        mockSeederDir,
        mockSeeder,
      );
      expect(runSeederSpy).toHaveBeenCalledTimes(1);
      expect(runSeederSpy).toHaveBeenCalledWith(mockSeederFilepath, mockMongo);
    });

    test('should assume .ts when seeder specified with no extension', async () => {
      mockSeederFile();
      const mockMongo = jest.fn();
      const runSeederSpy = jest.spyOn(Seeder, 'runSeeder');
      const mockSeeder = 'mock-seeder';
      const mockSeederDir = 'seeder/dir';

      // @ts-ignore
      await Seeder.applySeeder(mockSeeder, mockMongo, mockSeederDir);

      // should assume .ts
      const mockSeederFilepath = `${path.join(
        __dirname,
        mockSeederDir,
        mockSeeder,
      )}.ts`;
      expect(runSeederSpy).toHaveBeenCalledTimes(1);
      expect(runSeederSpy).toHaveBeenCalledWith(mockSeederFilepath, mockMongo);
    });

    test('should log error if seeder fails to run', async () => {
      mockSeederFile();
      const mockMongo = jest.fn();
      const runSeederSpy = jest
        .spyOn(Seeder, 'runSeeder')
        .mockRejectedValue('Mock error');
      const mockSeeder = 'mock-seeder.ts';
      const mockSeederDir = 'seeder/dir';

      // @ts-ignore
      await Seeder.applySeeder(mockSeeder, mockMongo, mockSeederDir);

      expect(runSeederSpy).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalledTimes(1);
    });

    test('should log warning if seeder doesnt exist', async () => {
      mockSeederFile();
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const mockMongo = jest.fn();
      const runSeederSpy = jest.spyOn(Seeder, 'runSeeder');
      const mockSeeder = 'mock-seeder.ts';
      const mockSeederDir = 'seeder/dir';

      // @ts-ignore
      await Seeder.applySeeder(mockSeeder, mockMongo, mockSeederDir);

      expect(runSeederSpy).toHaveBeenCalledTimes(0);
      expect(Logger.warn).toHaveBeenCalledTimes(1);
    });

    test('should log warning if seeder isnt file', async () => {
      mockSeederFile();
      (fs.lstatSync as jest.Mock).mockReturnValue({
        isFile: () => false,
      });
      const mockMongo = jest.fn();
      const runSeederSpy = jest.spyOn(Seeder, 'runSeeder');
      const mockSeeder = 'mock-seeder.ts';
      const mockSeederDir = 'seeder/dir';

      // @ts-ignore
      await Seeder.applySeeder(mockSeeder, mockMongo, mockSeederDir);

      expect(runSeederSpy).toHaveBeenCalledTimes(0);
      expect(Logger.warn).toHaveBeenCalledTimes(1);
    });
  });
});
