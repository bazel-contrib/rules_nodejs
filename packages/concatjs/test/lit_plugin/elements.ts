/**
 * @fileoverview Elements used in multiple build tests.
 */

import {customElement, LitElement} from 'lit-element';


@customElement('lit-element')
class LitElementElement extends LitElement {
  strField!: string;
  numField!: number;
}

class VanillaElement extends HTMLElement {
  vanillaStr = 'hi';
  str!: string;
}
customElements.define('vanilla-element', VanillaElement);

declare global {
  interface HTMLElementTagNameMap {
    'lit-element': LitElementElement;
    'vanilla-element': VanillaElement;
  }
}
