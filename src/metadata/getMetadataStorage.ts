import { MetadataStorage } from "./metadata-storage";

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var TypeGraphQLMetadataStorage: MetadataStorage;
}

function getGlobalVariable(): any {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  return global;
}

export function getMetadataStorage(): MetadataStorage {
  const globalVariable = getGlobalVariable();

  if (!globalVariable.TypeGraphQLMetadataStorage) {
    globalVariable.TypeGraphQLMetadataStorage = new MetadataStorage();
  }

  return globalVariable.TypeGraphQLMetadataStorage;
}
