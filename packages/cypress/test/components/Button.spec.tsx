import { mount } from '@cypress/react'
import Button from './Button'

it('Button', () => {
    mount(<Button>Test button</Button>)
    cy.get('button').contains('Test button').click()
})