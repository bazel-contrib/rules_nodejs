// @ts-nocheck

describe('hello', () => {
  it('should find hello', () => {
    cy.visit('http://localhost:3000');

    cy.contains('hello');
  });
});
