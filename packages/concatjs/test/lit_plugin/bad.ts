import './elements';
import {html} from 'lit-element';


const objValue = {
  field: 111,
};
console.log(html`
  <unknown-element></unknown-element>

  <div .id=${222}></div>

  <lit-element .strField=${333} .numField=${'aaa'}></lit-element>

  <lit-element numField="bbb"></lit-element>

  <vanilla-element .vanillaStr=${444}></vanilla-element>

  <declared-element
      .declaredNumberProp=${'ccc'}
      .declaredObjProp=${objValue}></declared-element>
`);
