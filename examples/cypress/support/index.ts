declare namespace Cypress {
  interface cy {
    containsHello: typeof containsHello;
  }
}

const containsHello = () => cy.contains('hello');