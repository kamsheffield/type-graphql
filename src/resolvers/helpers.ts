import "reflect-metadata";
import { AuthMiddleware } from "@/helpers/auth-middleware";
import { convertToType } from "@/helpers/types";
import { type BaseResolverMetadata, type ParamMetadata } from "@/metadata/definitions";
import { type ValidateSettings } from "@/schema/build-context";
import { type AuthChecker, type AuthMode, type ResolverData, type ValidatorFn } from "@/typings";
import { type Middleware, type MiddlewareClass, type MiddlewareFn } from "@/typings/middleware";
import { type IOCContainer } from "@/utils/container";
import { isPromiseLike } from "@/utils/isPromiseLike";
import { convertArgToInstance, convertArgsToInstance } from "./convert-args";
import { validateArg } from "./validate-arg";

export function getParams(
  params: ParamMetadata[],
  resolverData: ResolverData<any>,
  globalValidate: ValidateSettings,
  globalValidateFn: ValidatorFn | undefined,
  resolverMetadata?: BaseResolverMetadata,
): Promise<any[]> | any[] {
  // Assign by each param's declared method-slot index, not by the order
  // type-graphql registered them. `.map()` would produce a dense array
  // of length `params.length` whose positions only coincidentally match
  // method slots — so any later write at `paramValues[methodSlot]` (for
  // `@InjectRequestContext`) could collide with a type-graphql value
  // sitting at the same position when the indices don't line up.
  const paramValues: any[] = [];
  for (const paramInfo of params) {
    let value: any;
    switch (paramInfo.kind) {
      case "args":
        value = validateArg(
          convertArgsToInstance(paramInfo, resolverData.args),
          paramInfo.getType(),
          resolverData,
          globalValidate,
          paramInfo.validateSettings,
          globalValidateFn,
          paramInfo.validateFn,
        );
        break;

      case "arg":
        value = validateArg(
          convertArgToInstance(paramInfo, resolverData.args),
          paramInfo.getType(),
          resolverData,
          globalValidate,
          paramInfo.validateSettings,
          globalValidateFn,
          paramInfo.validateFn,
        );
        break;

      case "context":
        if (paramInfo.propertyName) {
          value = resolverData.context[paramInfo.propertyName];
        } else {
          value = resolverData.context;
        }
        break;

      case "root": {
        const rootValue = paramInfo.propertyName
          ? resolverData.root[paramInfo.propertyName]
          : resolverData.root;
        if (!paramInfo.getType) {
          value = rootValue;
        } else {
          value = convertToType(paramInfo.getType(), rootValue);
        }
        break;
      }

      case "info":
        value = resolverData.info;
        break;

      case "custom":
        if (paramInfo.options.arg) {
          const arg = paramInfo.options.arg!;
          value = validateArg(
            convertArgToInstance(arg, resolverData.args),
            arg.getType(),
            resolverData,
            globalValidate,
            arg.validateSettings,
            globalValidateFn,
            arg.validateFn,
          ).then(() => paramInfo.resolver(resolverData));
        } else {
          value = paramInfo.resolver(resolverData);
        }
        break;

      // no default
    }
    paramValues[paramInfo.index] = value;
  }

  // resolve any @InjectRequestContext() decorated parameters
  if (resolverData.context?.request && resolverMetadata) {
    const requestContext = resolverData.context.request.context;

    // whole context injection — write the RC into every registered index
    const requestContextIndices: number[] | undefined = Reflect.getMetadata(
      'base:requestContextIndex',
      resolverMetadata.target.prototype,
      resolverMetadata.methodName,
    );
    if (requestContextIndices) {
      for (const index of requestContextIndices) {
        paramValues[index] = requestContext;
      }
    }

    // key-based extractions
    const extractions: Map<number, { name: string }> | undefined = Reflect.getMetadata(
      'base:requestContextExtractions',
      resolverMetadata.target.prototype,
      resolverMetadata.methodName,
    );
    if (extractions) {
      for (const [index, key] of extractions) {
        paramValues[index] = requestContext.get(key);
      }
    }
  }
  // `some` on a sparse array skips holes; any remaining holes are method
  // slots that neither type-graphql nor the RC decorators owned, and
  // `.apply(this, paramValues)` will pass `undefined` for them, matching
  // normal JS function-call semantics.
  if (paramValues.some(isPromiseLike)) {
    return Promise.all(paramValues);
  }
  return paramValues;
}

export function applyAuthChecker(
  middlewares: Array<Middleware<any>>,
  authChecker: AuthChecker<any, any> | undefined,
  container: IOCContainer,
  authMode: AuthMode,
  roles: any[] | undefined,
) {
  if (authChecker && roles) {
    middlewares.unshift(AuthMiddleware(authChecker, container, authMode, roles));
  }
}

export function applyMiddlewares(
  container: IOCContainer,
  resolverData: ResolverData<any>,
  middlewares: Array<Middleware<any>>,
  resolverHandlerFunction: () => any,
): Promise<any> {
  if (middlewares.length === 0) {
    return resolverHandlerFunction();
  }
  let middlewaresIndex = -1;
  async function dispatchHandler(currentIndex: number): Promise<void> {
    if (currentIndex <= middlewaresIndex) {
      throw new Error("next() called multiple times");
    }
    middlewaresIndex = currentIndex;
    let handlerFn: MiddlewareFn<any>;
    if (currentIndex === middlewares.length) {
      handlerFn = resolverHandlerFunction;
    } else {
      const currentMiddleware = middlewares[currentIndex];
      // Arrow function or class
      if (currentMiddleware.prototype !== undefined) {
        const middlewareClassInstance = await container.getInstance(
          currentMiddleware as MiddlewareClass<any>,
          resolverData,
        );
        handlerFn = middlewareClassInstance.use.bind(middlewareClassInstance);
      } else {
        handlerFn = currentMiddleware as MiddlewareFn<any>;
      }
    }
    let nextResult: any;
    const result = await handlerFn(resolverData, async () => {
      nextResult = await dispatchHandler(currentIndex + 1);
      return nextResult;
    });
    return result !== undefined ? result : nextResult;
  }

  return dispatchHandler(0);
}
