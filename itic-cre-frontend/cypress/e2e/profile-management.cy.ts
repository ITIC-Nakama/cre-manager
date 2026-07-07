describe('Gestion du Profil Personnel', () => {
  beforeEach(() => {
    // Connexion en tant qu'Admin ou Conseiller pour accéder au profil
    cy.visit('/login')
    cy.get('input[type="email"]').type('test.admin@itic.fr')
    cy.get('input[type="password"]').type('Test123!')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
  })

  it('Modifie le mot de passe depuis les paramètres', () => {
    cy.visit('/supervisor/parametres')

    // On attend que la page soit chargée
    cy.contains('Sécurité').should('be.visible')

    // Ouvrir le modal
    cy.get('[data-cy="btn-change-password"]').click()

    // Vérifier que la modale est bien ouverte
    cy.contains('Modifier le mot de passe').should('be.visible')

    // Remplir le formulaire en utilisant les labels pour être sûr à 100%
    cy.contains('label', 'Mot de passe actuel').parent().find('input').type('Test123!')
    cy.contains('label', 'Nouveau mot de passe').parent().find('input').type('NewPass123!')
    cy.contains('label', 'Confirmer le nouveau mot de passe').parent().find('input').type('NewPass123!')

    cy.intercept('POST', '**/auth/update-password').as('updatePassword')
    
    // On clique sur le bouton de la modale (et pas celui de la page derrière)
    cy.get('.fixed form').contains('button', 'Enregistrer').click()

    // On attend la réponse de l'API
    cy.wait('@updatePassword').its('response.statusCode').should('eq', 200)

    // Vérifier toast de succès
    cy.contains('succès', { matchCase: false, timeout: 10000 }).should('exist')

    // -- Clean up --
    cy.get('[data-cy="btn-change-password"]').click()
    cy.contains('Modifier le mot de passe').should('be.visible')
    
    cy.contains('label', 'Mot de passe actuel').parent().find('input').type('NewPass123!')
    cy.contains('label', 'Nouveau mot de passe').parent().find('input').type('Test123!')
    cy.contains('label', 'Confirmer le nouveau mot de passe').parent().find('input').type('Test123!')
    
    cy.intercept('POST', '**/auth/update-password').as('restorePassword')
    cy.get('.fixed form').contains('button', 'Enregistrer').click()
    cy.wait('@restorePassword').its('response.statusCode').should('eq', 200)
  })
})
