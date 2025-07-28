import "reflect-metadata";
import path from "node:path";
import { type GraphQLSchema } from "graphql";
import shelljs from "shelljs";
import {
  Field,
  ObjectType,
  type PrintSchemaOptions,
  Query,
  Resolver,
  buildSchema,
  buildSchemaSync,
  defaultPrintSchemaOptions,
} from "type-graphql";
import {
  emitSchemaDefinitionFile,
  emitSchemaDefinitionFileSync,
} from "@/utils/logSchemaDefinitionFile";

const TEST_DIR = path.resolve(process.cwd(), "tests", "test-output-dir");

describe("Emitting schema definition file", () => {
  let schema: GraphQLSchema;
  let MyResolverClass: any;

  beforeAll(async () => {
    @ObjectType()
    class MyObject {
      @Field()
      normalProperty!: string;

      @Field({ description: "Description test" })
      descriptionProperty!: boolean;
    }

    @Resolver()
    class MyResolver {
      @Query()
      myQuery(): MyObject {
        return {} as MyObject;
      }
    }

    MyResolverClass = MyResolver;

    schema = await buildSchema({
      resolvers: [MyResolver],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    shelljs.rm("-rf", TEST_DIR);
  });

  function checkSchemaSDL(
    SDL: string,
    { sortedSchema }: PrintSchemaOptions = defaultPrintSchemaOptions,
  ) {
    expect(SDL).toContain("THIS FILE WAS GENERATED");
    expect(SDL).toContain("MyObject");
    if (sortedSchema) {
      expect(SDL.indexOf("descriptionProperty")).toBeLessThan(SDL.indexOf("normalProperty"));
    } else {
      expect(SDL.indexOf("descriptionProperty")).toBeGreaterThan(SDL.indexOf("normalProperty"));
    }
    expect(SDL).toContain(`"""Description test"""`);
  }

  describe("emitSchemaDefinitionFile", () => {
    it("should write file with schema SDL successfully", async () => {
      const targetPath = path.join(TEST_DIR, "schemas", "test1", "schema.graphql");
      let logOutput = "";
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(data => {
        logOutput = data;
      });
      await emitSchemaDefinitionFile(targetPath, schema);
      expect(logSpy).toHaveBeenCalledTimes(1);
      checkSchemaSDL(logOutput);
    });

    it("should use provided options to write file with schema SDL", async () => {
      const targetPath = path.join(TEST_DIR, "schemas", "test1", "schema.graphql");
      let logOutput = "";
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(data => {
        logOutput = data;
      });
      const options: PrintSchemaOptions = {
        sortedSchema: false,
      };
      await emitSchemaDefinitionFile(targetPath, schema, options);
      expect(logSpy).toHaveBeenCalledTimes(1);
      checkSchemaSDL(logOutput, options);
    });
  });

  describe("emitSchemaDefinitionFileSync", () => {
    it("should write file with schema SDL successfully", async () => {
      const targetPath = path.join(TEST_DIR, "schemas", "test2", "schema.graphql");
      let logOutput = "";
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(data => {
        logOutput = data;
      });
      emitSchemaDefinitionFileSync(targetPath, schema);
      expect(logSpy).toHaveBeenCalledTimes(1);
      checkSchemaSDL(logOutput);
    });

    it("should use provided options to write file with schema SDL", async () => {
      const targetPath = path.join(TEST_DIR, "schemas", "test1", "schema.graphql");
      let logOutput = "";
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(data => {
        logOutput = data;
      });
      const options: PrintSchemaOptions = {
        sortedSchema: false,
      };
      emitSchemaDefinitionFileSync(targetPath, schema, options);
      expect(logSpy).toHaveBeenCalledTimes(1);
      checkSchemaSDL(logOutput, options);
    });
  });

  describe("buildSchema", () => {
    it("should log to console ignoring selected file path", async () => {
      const targetPath = path.join(TEST_DIR, "schemas", "test3", "schema.graphql");
      let logOutput = "";
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(data => {
        logOutput = data;
      });
      await buildSchema({
        resolvers: [MyResolverClass],
        emitSchemaFile: targetPath,
      });
      expect(logSpy).toHaveBeenCalledTimes(1);
      checkSchemaSDL(logOutput);
    });

    it("should log to console", async () => {
      jest.spyOn(process, "cwd").mockImplementation(() => TEST_DIR);
      let logOutput = "";
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(data => {
        logOutput = data;
      });
      await buildSchema({
        resolvers: [MyResolverClass],
        emitSchemaFile: true,
      });
      expect(logSpy).toHaveBeenCalledTimes(1);
      checkSchemaSDL(logOutput);
    });

    it("should not log to console", async () => {
      jest.spyOn(process, "cwd").mockImplementation(() => TEST_DIR);
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(() => {});
      await buildSchema({
        resolvers: [MyResolverClass],
        emitSchemaFile: false,
      });
      expect(logSpy).toHaveBeenCalledTimes(0);
    });

    it("should read EmitSchemaFileOptions and apply them in emit", async () => {
      const targetPath = path.join(TEST_DIR, "schemas", "test4", "schema.graphql");
      let logOutput = "";
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(data => {
        logOutput = data;
      });
      await buildSchema({
        resolvers: [MyResolverClass],
        emitSchemaFile: {
          path: targetPath,
          sortedSchema: false,
        },
      });
      expect(logSpy).toHaveBeenCalledTimes(1);
      checkSchemaSDL(logOutput, {
        sortedSchema: false,
      });
    });
  });

  describe("buildSchemaSync", () => {
    it("should log to console ignoring selected file path", async () => {
      const targetPath = path.join(TEST_DIR, "schemas", "test3", "schema.graphql");
      let logOutput = "";
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(data => {
        logOutput = data;
      });
      buildSchemaSync({
        resolvers: [MyResolverClass],
        emitSchemaFile: targetPath,
      });
      expect(logSpy).toHaveBeenCalledTimes(1);
      checkSchemaSDL(logOutput);
    });

    it("should log to console", async () => {
      jest.spyOn(process, "cwd").mockImplementation(() => TEST_DIR);
      let logOutput = "";
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(data => {
        logOutput = data;
      });
      buildSchemaSync({
        resolvers: [MyResolverClass],
        emitSchemaFile: true,
      });
      expect(logSpy).toHaveBeenCalledTimes(1);
      checkSchemaSDL(logOutput);
    });

    it("should not log to console", async () => {
      jest.spyOn(process, "cwd").mockImplementation(() => TEST_DIR);
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(() => {});
      buildSchemaSync({
        resolvers: [MyResolverClass],
        emitSchemaFile: false,
      });
      expect(logSpy).toHaveBeenCalledTimes(0);
    });

    it("should read EmitSchemaFileOptions and apply them in emit", async () => {
      const targetPath = path.join(TEST_DIR, "schemas", "test4", "schema.graphql");
      let logOutput = "";
      const logSpy = jest.spyOn(global.console, "log").mockImplementation(data => {
        logOutput = data;
      });
      buildSchemaSync({
        resolvers: [MyResolverClass],
        emitSchemaFile: {
          path: targetPath,
          sortedSchema: false,
        },
      });
      expect(logSpy).toHaveBeenCalledTimes(1);
      checkSchemaSDL(logOutput, {
        sortedSchema: false,
      });
    });
  });
});
