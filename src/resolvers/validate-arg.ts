// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore 'class-validator' might not be installed by user
import { type TypeValue } from "@/decorators/types";
import { type ValidateSettings } from "@/schema/build-context";
import { type ResolverData, type ValidatorFn } from "@/typings";

export async function validateArg(
  argValue: any | undefined,
  argType: TypeValue,
  resolverData: ResolverData,
  _globalValidateSettings: ValidateSettings,
  _argValidateSettings: ValidateSettings | undefined,
  globalValidateFn: ValidatorFn | undefined,
  argValidateFn: ValidatorFn | undefined,
): Promise<any | undefined> {
  const validateFn = argValidateFn ?? globalValidateFn;
  if (typeof validateFn === "function") {
    await validateFn(argValue, argType, resolverData);
  }
  return argValue;
}
