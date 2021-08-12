declare const BUILD_SCM_VERSION: string;
declare const SOME_TEST_ENV: string;

export const nodeEnv = process.env.NODE_ENV;
export const version = BUILD_SCM_VERSION;
export const env = SOME_TEST_ENV;

console.log(process.cwd());