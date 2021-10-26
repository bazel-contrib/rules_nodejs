/**
 * @fileoverview Examples for the mutable exports rule.
 * We expect every 'bad' to be an error, and every 'ok' to pass.
 * These are checked as expected diagnostics in the BUILD file.
 */

export let bad1 = 3;
export var bad2 = 3;
export var bad3 = 3, bad4 = 3;
var bad5 = 3;
export {bad5};
let bad6 = 3;
export {bad6};
export {bad6 as bad6alias};
var bad7 = 3;
export {bad7 as default};
export let {bad8} = {
  bad8: 3
};
export let bad9: unknown;

let ok1 = 3;
var ok2 = 3;
export const ok3 = 3;
const ok4 = 3;
const ok5 = 3;
export {ok5};
export type ok6 = string;
export function ok7() {}
export class ok8 {}
