declare const BUILD_SCM_VERSION: string;
declare const SOME_TEST_ENV: string;
declare const SOME_BOOL_FLAG_VALUE: boolean;
declare const SOME_STRING_FLAG_VALUE: string;

export const nodeEnv = process.env.NODE_ENV;
export const version = BUILD_SCM_VERSION;
export const env = SOME_TEST_ENV;
export const someBoolFlag = SOME_BOOL_FLAG_VALUE;
export const someStringFlag = SOME_STRING_FLAG_VALUE;

console.log(process.cwd());
