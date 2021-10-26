
export {};

/** An element that's only declared in a definition. */
declare class DeclaredElement extends HTMLElement {
  declaredNumberProp: number;
  declaredObjProp: {field: string};
}

declare global {
  interface HTMLElementTagNameMap {
    'declared-element': DeclaredElement;
  }
}
