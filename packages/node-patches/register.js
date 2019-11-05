/**
 * @fileoverview Description of this file.
 */

// todo auto detect bazel env vars instead of adding a new one.
const {BAZEL_PATCH_ROOT,VERBOSE_LOGS} = process.env;

if(BAZEL_PATCH_ROOT){
  if(VERBOSE_LOGS) console.log(`bazel node patches enabled. root: ${BAZEL_PATCH_ROOT} symlinks in this directory will not escape`)
  const fs = require('fs')
  const patcher = require('./')
  patcher.fs(fs,BAZEL_PATCH_ROOT)
} else if(VERBOSE_LOGS){
  console.log(`bazel node patches disabled. set environment BAZEL_PATCH_ROOT`)
}