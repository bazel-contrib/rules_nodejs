/**
 * Error codes for tsetse checks.
 *
 * Start with 21222 and increase linearly.
 * The intent is for these codes to be fixed, so that tsetse users can
 * search for them in user forums and other media.
 */
export enum ErrorCode {
  CHECK_RETURN_VALUE = 21222,
  EQUALS_NAN = 21223,
  BAN_EXPECT_TRUTHY_PROMISE = 21224,
  MUST_USE_PROMISES = 21225,
  BAN_PROMISE_AS_CONDITION = 21226,
  PROPERTY_RENAMING_SAFE = 21227,
  CONFORMANCE_PATTERN = 21228,
  BAN_MUTABLE_EXPORTS = 21229,
  BAN_STRING_INITIALIZED_SETS = 21230,
  MUST_TYPE_ASSERT_JSON_PARSE = 21231,
}
