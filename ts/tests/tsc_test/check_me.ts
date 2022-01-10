export const a: string = 'a'

// Uncomment this last line to observe the typecheck_only test fails:
// FAIL: //packages/typescript/test/tsc_test:typecheck_only
// INFO: From Testing //packages/typescript/test/tsc_test:typecheck_only:
// ==================== Test output for //packages/typescript/test/tsc_test:typecheck_only:
// packages/typescript/test/tsc_test/check_me.ts(10,14): error TS2322: Type 'string' is not assignable to type 'number'.
// ================================================================================

// export const b: number = 'b'