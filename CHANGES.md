# Type-GraphQL with support for Cloudflare Workers

## About

`Type-GraphQL` does not work out of the box on Cloudflare Workers and requires a few small changes in order to get it working.

### Global Metadata

`getMetadataStorage.ts` relies on `global` to be the global variable to hold all metadata. However in Cloudflare this does not exist. So a check for `globalThis` was added and if its not found then we fallback to `global`.

### Node fs Module

Cloudflare Workers are not a Node environment. Some Node packages have been polyfilled by the Cloudflare team but `fs` is not one of them. `emitSchemaDefinitionFile.ts` relies on `@/helpers/filesystem` which uses the Node `fs` module in order to interact with the file system. I have created a new version of this file for use with Cloudflare called `logSchemaDefinitionFile.ts`. This does a simple `console.log` of the GraphQL schema if the emit flag is turned on.

### Other Node Compatability issues

There are some other instances of Node modules being used however they have all been polyfilled by the Cloudflare team. You need to add `compatibility_flags = ["nodejs_compat"]` to your `wrangler.toml` file.

### One more thing, GraphQL Subscriptions

GraphQL Subscriptions are currently not supported by Cloudflare Workers due to a technical limitation in Workers, see the following error:

`✘ [ERROR] Uncaught (in promise) Error: Cannot perform I/O on behalf of a different request. I/O objects (such as streams, request/response bodies, and others) created in the context of one request handler cannot be accessed from a different request's handler. This is a limitation of Cloudflare Workers which allows us to improve overall performance.`

`TypeGraphQL` relies on Apollo's `graphql-subscriptions` library in order to power its subscriptions feature, which also does not work on Cloudflare without modification. At first I considered removing this dependency altogether, however, the types from this library are used throughout `TypeGraphQL` and it would be a nontrivial change to remove it.

Instead I opted to patch the issue using `patch-package`. You can copy the patch from the patches folder and install it into your project using the following procedure.

- Create a patches folder in the root of your project
- Copy the patch from this lib into your patches folder
- Install patch-package dependency: `npm i patch-package`
- Run the patches: `npx patch-package`

This will modify `pubsub.js` in the `graphql-subscriptions` lib to use the node events module as Cloudflare wants it.

If you have made it this far, that is it! You should now be able to use `TypeGraphQL` in your Cloudflare Worker.

## Developing

### Branching

- **master**: Tracks the master branch from upstream: `git@github.com:MichalLytek/type-graphql.git`
- **cloudflare**: Contains the changes to `TypeGraphQL` for compatibility with Cloudflare Workers.

### Integration

- Checkout `master` and pull the latest upstream `master`.
- Create a new `integration` branch off of `cloudflare` and merge the changes from `master`.
- Fix any conflicts as needed.
- Run the build. (`npm run build`).
- Run the tests and make sure everything is passing (`npm test`).
- Merge the changes into `cloudflare`.

### Distribution

- Create release tag and push to github
- `npm run build`
- `npm pack`
- Upload output zip to github
