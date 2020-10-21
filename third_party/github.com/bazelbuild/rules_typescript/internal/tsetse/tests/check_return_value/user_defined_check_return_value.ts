/**
 * @checkReturnValue The input string is unchanged.
 */
export function userDefinedCheckReturnValueFunction(str: string) {
  return `input ${str}`;
}

/**
 * @tag1
 * @checkReturnValue The input string is unchanged.
 * @tag2
 */
export function manyJsDocTags(str: string) {
  return `input ${str}`;
}

export class ClassContainingUserDefinedCheckReturnValueFunction {
  /**
   * @checkReturnValue The input string is unchanged.
   */
  checkReturnValue(str: string) {
    return `input ${str}`;
  }
  /** @checkReturnValue */ sameLineJsDoc(str: string) {
    return `input ${str}`;
  }
  noJsDoc(str: string) {
    return `input ${str}`;
  }
}
