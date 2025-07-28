import { version as gqlVersion, versionInfo as graphqlVersion } from "graphql";
// Avoid '@/' due to 'scripts/version.ts'
import { UnmetGraphQLPeerDependencyError } from "../errors";

// This must be kept in sync with 'package.json'
export const graphQLPeerDependencyVersion = "^16.9.0";

export function ensureInstalledCorrectGraphQLPackage() {
  if (graphqlVersion.major < 16) {
    throw new UnmetGraphQLPeerDependencyError(gqlVersion, graphQLPeerDependencyVersion);
  }
  if (graphqlVersion.major > 16) {
    return; // No need to check for minor/patch versions if major is correct
  }
  if (graphqlVersion.minor < 9) {
    throw new UnmetGraphQLPeerDependencyError(gqlVersion, graphQLPeerDependencyVersion);
  }
  if (graphqlVersion.minor > 9) {
    return; // No need to check for patch versions if minor is correct
  }
  if (graphqlVersion.patch < 0) {
    throw new UnmetGraphQLPeerDependencyError(gqlVersion, graphQLPeerDependencyVersion);
  }
}
