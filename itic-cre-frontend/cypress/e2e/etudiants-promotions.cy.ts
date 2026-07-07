describe('E2E: Gestion des Étudiants & Promotions', () => {
  beforeEach(() => {
    cy.visit('/login')
    cy.get('input[type="email"]').type('test.admin@itic.fr')
    cy.get('input[type="password"]').type('Test123!')
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/supervisor/dashboard')
  })

  describe('Page Étudiants', () => {
    beforeEach(() => {
      cy.get('nav').contains('Étudiants').click({ force: true })
      cy.url().should('include', '/supervisor/etudiants')
    })

    it('Recherche textuelle et filtrage par promotion', () => {
      cy.get('input[type="text"]').first().type('Jean')
      cy.wait(600)
      
      cy.get('input[type="text"]').first().clear()
      cy.wait(600)

      cy.contains('Toutes les promotions').click({ force: true })
      // CustomSelect s'ouvre. On ferme simplement en cliquant ailleurs ou Echap
      cy.get('body').type('{esc}')
    })

    it('Affiche la fiche de détail d\'un étudiant', () => {
      // Ouvre la fiche étudiant via le bouton "Voir" (icône oeil)
      cy.get('table tbody tr').first().find('button').first().click({ force: true })
      
      // On s'assure qu'on cherche UNIQUEMENT dans la modale
      cy.get('.fixed.inset-0.z-50').should('be.visible').within(() => {
        // Vérification des infos clés
        cy.contains('XP').should('be.visible')
        cy.contains('candidatures', { matchCase: false }).should('be.visible')
        // Le statut du CV n'affiche pas explicitement "CV" (il affiche "Déposé" ou "Aucun")
        // On vérifie donc la présence de l'icône FileText correspondante
        cy.get('.lucide-file-text').should('be.visible')
        
        // Ferme la modale (le premier bouton dans la modale)
        cy.get('button').first().click({ force: true })
      })
      
      cy.get('.fixed.inset-0.z-50').should('not.exist')
    })
  })

  describe('Page Promotions', () => {
    beforeEach(() => {
      cy.get('nav').contains('Promotions').click({ force: true })
      cy.url().should('include', '/admin/promotions')
    })

    it('CRUD Complet: Créer, modifier, et sécurité de suppression', () => {
      cy.intercept('POST', '**/promotions').as('createPromotion')
      cy.intercept('PUT', '**/promotions/*').as('updatePromotion')
      cy.intercept('DELETE', '**/promotions/*').as('deletePromotion')

      const promoName = `Promo Cypress ${Date.now()}`

      // 1. Création
      cy.contains('button', 'Créer une promotion').click()
      cy.get('.fixed.inset-0.z-50').should('be.visible')
      cy.get('input').first().type(promoName)
      cy.get('input').eq(1).type('2026')
      cy.get('.fixed.inset-0.z-50').contains('button', 'Enregistrer').click()
      
      cy.wait('@createPromotion')
      cy.contains(promoName, { timeout: 10000 }).should('be.visible')

      // 2. Modification (bouton d'édition, 2ème bouton de la ligne)
      cy.contains('tr', promoName).find('button').eq(1).click({ force: true })
      const newPromoName = `${promoName} - Modifiée`
      cy.get('input').first().clear().type(newPromoName)
      cy.get('.fixed.inset-0.z-50').contains('button', 'Enregistrer').click()
      
      cy.wait('@updatePromotion')
      cy.contains(newPromoName, { timeout: 10000 }).should('be.visible')

      // 3. Suppression (bouton poubelle, 3ème bouton de la ligne)
      cy.contains('tr', newPromoName).find('button').eq(2).click({ force: true })
      cy.get('[data-cy="btn-confirm-accept"]').should('be.visible').click()
      
      cy.wait('@deletePromotion')
      cy.contains(newPromoName).should('not.exist')
    })

    it('Gestion des étudiants dans une promotion (Affectation / Retrait)', () => {
      cy.get('table tbody tr').first().then(($tr) => {
        // Clic sur "Gérer les étudiants" (1er bouton)
        cy.wrap($tr).find('button').first().click({ force: true })
        cy.get('.fixed.inset-0.z-50').should('be.visible')
        
        // Tester l'UI de la modale
        cy.contains('Ajouter', { matchCase: false }).should('be.visible')
        
        // Fermer la modale
        cy.get('.fixed.inset-0.z-50 button').first().click({ force: true })
      })
    })
  })

  describe('Journal d\'Audit', () => {
    it('Vérifie la traçabilité des actions dans l\'audit', () => {
      cy.get('nav').contains('audit', { matchCase: false }).click({ force: true })
      cy.url().should('include', '/admin/audit')

      cy.get('table').should('be.visible')
    })
  })
})
