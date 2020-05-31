describe('world', () => {
  it('should find world', () => {
    cy.visit('http://localhost:3000');
    cy.contains('world');
  });
});
