describe('E2E: Gestion des Offres d\'Emploi (Jobboard)', () => {
  const offerTitle = 'Offre Cypress ' + Date.now()
  const companyName = 'Cypress Corp'
  let offreToDeactivate = ''
  let offreToDelete = ''

  describe('Côté Conseiller', () => {
    beforeEach(() => {
      // Intercepts avec RegExp pour ignorer les query params et correspondre parfaitement
      cy.intercept({ method: 'GET', url: /\/jobboard\/offers\/all/ }).as('getOffers')
      cy.intercept({ method: 'POST', url: /\/jobboard\/offers/ }).as('createOffer')
      cy.intercept({ method: 'PUT', url: /\/jobboard\/offers\/[a-zA-Z0-9-]+$/ }).as('updateOffer')
      cy.intercept({ method: 'PUT', url: /\/jobboard\/offers\/[a-zA-Z0-9-]+\/activate/ }).as('activateOffer')
      cy.intercept({ method: 'PUT', url: /\/jobboard\/offers\/[a-zA-Z0-9-]+\/deactivate/ }).as('deactivateOffer')
      cy.intercept({ method: 'DELETE', url: /\/jobboard\/offers\/[a-zA-Z0-9-]+$/ }).as('deleteOffer')

      // Login
      cy.visit('/login')
      cy.get('input[type="email"]').type('test.admin@itic.fr')
      cy.get('input[type="password"]').type('Test123!')
      cy.get('button[type="submit"]').click()
      cy.url().should('include', '/supervisor/dashboard')

      // Navigation vers Offres
      cy.get('nav').contains('Offres').click({ force: true })
      cy.url().should('include', '/supervisor/offres')
      cy.wait('@getOffers')
    })

    it('Création : Créer une offre d\'emploi', () => {
      // Cliquer sur le bouton "Nouvelle offre" (contenant un svg Plus)
      cy.get('button svg.lucide-plus').parent().click({ force: true })
      cy.get('.fixed.z-50').should('be.visible')

      // Remplir le formulaire
      cy.contains('.fixed.z-50 label', 'Intitulé', { matchCase: false }).parent().parent().find('input').type(offerTitle)
      cy.contains('.fixed.z-50 label', 'Entreprise', { matchCase: false }).parent().parent().find('input').type(companyName)
      cy.contains('.fixed.z-50 label', 'Lieu', { matchCase: false }).parent().parent().find('input').type('Paris')
      cy.contains('.fixed.z-50 label', 'Description', { matchCase: false }).parent().parent().find('textarea').type('Description de l\'offre Cypress pour test E2E.')
      
      // Sélectionner un type de contrat (CustomSelect)
      cy.contains('.fixed.z-50 label', 'contrat', { matchCase: false }).parent().find('button').click()
      cy.get('.fixed.z-50 .absolute button').first().click()

      // Enregistrer
      cy.get('body').contains('button', 'Enregistrer', { matchCase: false }).click()
      cy.wait('@createOffer').its('response.statusCode').should('be.oneOf', [200, 201])
      
      // L'offre doit apparaître dans le tableau
      cy.contains('td', offerTitle).should('be.visible')
    })

    it('Modification : Modifier l\'offre d\'emploi', () => {
      // Rechercher l'offre pour s'assurer qu'elle est sur la première page
      cy.get('input[placeholder*="Rechercher"]').clear().type(offerTitle)
      cy.wait(500)

      // Modifier
      cy.contains('tr', offerTitle).find('button[title*="Modifier"]').click({ force: true })
      cy.get('.fixed.z-50').should('be.visible')

      cy.contains('.fixed.z-50 label', 'Intitulé', { matchCase: false }).parent().parent().find('input').clear().type(offerTitle + ' Modifiée')
      cy.get('body').contains('button', 'Enregistrer', { matchCase: false }).click()
      
      cy.wait('@updateOffer').its('response.statusCode').should('eq', 200)
      cy.contains('td', offerTitle + ' Modifiée').should('be.visible')
    })

    it('Statut : Désactiver et Réactiver l\'offre', () => {
      // Rechercher l'offre pour la trouver même si elle est sur la page 2
      cy.get('input[placeholder*="Rechercher"]').clear().type(offerTitle + ' Modifiée')
      cy.wait(500)

      // Désactiver
      cy.contains('tr', offerTitle + ' Modifiée').find('button[title*="Désactiver"]').click({ force: true })
      cy.wait('@deactivateOffer').its('response.statusCode').should('be.oneOf', [200, 204])
      
      // Vérifier visuellement qu'elle est inactive (badge)
      cy.contains('tr', offerTitle + ' Modifiée').contains('Inactive', { matchCase: false }).should('be.visible')

      // Réactiver
      cy.contains('tr', offerTitle + ' Modifiée').find('button[title*="Activer"]').click({ force: true })
      cy.wait('@activateOffer').its('response.statusCode').should('be.oneOf', [200, 204])
      
      cy.contains('tr', offerTitle + ' Modifiée').contains('Active', { matchCase: false }).should('be.visible')
    })

    it('Suppression et Désactivation définitive pour test étudiant', () => {
      // Pour valider la disparition lors de la désactivation côté étudiant, 
      // on crée une offre qu'on laisse désactivée.
      offreToDeactivate = 'Offre A Desactiver ' + Date.now()
      cy.get('button svg.lucide-plus').parent().click({ force: true })
      cy.contains('.fixed.z-50 label', 'Intitulé', { matchCase: false }).parent().parent().find('input').type(offreToDeactivate)
      cy.contains('.fixed.z-50 label', 'Entreprise', { matchCase: false }).parent().parent().find('input').type('To Deactivate')
      cy.contains('.fixed.z-50 label', 'Description', { matchCase: false }).parent().parent().find('textarea').type('A desactiver')
      cy.contains('.fixed.z-50 label', 'contrat', { matchCase: false }).parent().find('button').click()
      cy.get('.fixed.z-50 .absolute button').first().click()
      cy.get('body').contains('button', 'Enregistrer', { matchCase: false }).click()
      cy.wait('@createOffer')

      // Rechercher l'offre pour s'assurer qu'elle est sur la première page
      cy.get('input[placeholder*="Rechercher"]').clear().type(offreToDeactivate)
      cy.wait(500)
      
      // On la désactive
      cy.contains('tr', offreToDeactivate).find('button[title*="Désactiver"]').click({ force: true })
      cy.wait('@deactivateOffer')

      // Pour la suppression
      offreToDelete = 'Offre A Supprimer ' + Date.now()
      
      cy.get('button svg.lucide-plus').parent().click({ force: true })
      cy.contains('.fixed.z-50 label', 'Intitulé', { matchCase: false }).parent().parent().find('input').type(offreToDelete)
      cy.contains('.fixed.z-50 label', 'Entreprise', { matchCase: false }).parent().parent().find('input').type('To Delete')
      cy.contains('.fixed.z-50 label', 'Description', { matchCase: false }).parent().parent().find('textarea').type('A supprimer')
      cy.contains('.fixed.z-50 label', 'contrat', { matchCase: false }).parent().find('button').click()
      cy.get('.fixed.z-50 .absolute button').first().click()
      cy.get('body').contains('button', 'Enregistrer', { matchCase: false }).click()
      cy.wait('@createOffer')

      // Rechercher l'offre pour la trouver même si elle est sur la page 2
      cy.get('input[placeholder*="Rechercher"]').clear().type(offreToDelete)
      cy.wait(500) // Attendre le debounce
      
      // Supprimer cette offre
      cy.contains('tr', offreToDelete).find('button[title*="Supprimer"]').click({ force: true })
      // Modale de confirmation
      cy.get('[data-cy="btn-confirm-accept"]').click({ force: true })
      cy.wait('@deleteOffer').its('response.statusCode').should('be.oneOf', [200, 204])

      cy.contains('tr', offreToDelete).should('not.exist')
    })
  })

  describe('Côté Étudiant : Visibilité du Jobboard', () => {
    beforeEach(() => {
      // Regex pour matcher /jobboard/offers (avec ou sans query params), mais rejeter /jobboard/offers/all
      cy.intercept({ method: 'GET', url: /\/jobboard\/offers(\?.*)?$/ }).as('getActiveOffers')

      // Login Student
      cy.visit('/login')
      cy.get('input[type="email"]').type('test.student@itic.fr')
      cy.get('input[type="password"]').type('Test123!')
      cy.get('button[type="submit"]').click()
      cy.url().should('include', '/student/dashboard')

      // Navigation vers Offres
      cy.get('nav').contains('Offres').click({ force: true })
      cy.url().should('include', '/student/offres')
      cy.wait('@getActiveOffers')
    })

    it('L\'offre active modifiée doit être visible et les offres désactivées/supprimées non visibles', () => {
      // L'offre modifiée précédemment est toujours active, elle doit être là
      cy.contains(offerTitle + ' Modifiée').should('be.visible')
      
      // L'offre désactivée ne doit pas exister
      cy.contains(offreToDeactivate).should('not.exist')

      // L'offre supprimée ne doit pas exister
      cy.get('input[placeholder*="Rechercher"]').clear().type(offreToDelete)
      cy.wait(500)
      cy.contains(offreToDelete).should('not.exist')
    })
  })
})
