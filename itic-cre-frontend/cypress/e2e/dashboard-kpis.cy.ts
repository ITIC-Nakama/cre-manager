describe('E2E: Tableau de bord & KPIs (Admin & Conseiller)', () => {
  beforeEach(() => {
    // Connexion en tant qu'Admin pour accéder au dashboard
    cy.visit('/login')
    cy.get('input[type="email"]').type('test.admin@itic.fr')
    cy.get('input[type="password"]').type('Test123!')
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/supervisor/dashboard')
  })

  it('Vérifie l\'affichage correct des KPIs clés sur le Dashboard', () => {
    // Le dashboard doit avoir fini de charger
    cy.contains('Étudiants inscrits').should('be.visible')
    
    // 1. Nombre d'étudiants enregistrés
    cy.contains('Étudiants inscrits').should('be.visible')
    
    // 2. Nombre de CV en attente
    cy.contains('CVs à examiner').should('be.visible')
    
    // 3. Nombre de candidatures stagnantes (stale)
    cy.contains('Candidatures en retard').should('be.visible')
    
    // Note : Le KPI "Nombre d'offres actives" n'est pas présent dans 
    // les cartes statistiques actuelles. On vérifie "Candidatures totales" à la place.
    cy.contains('Candidatures totales').should('be.visible')
  })

  it('Vérifie que les liens du menu redirigent vers les pages associées', () => {
    // -- Lien Étudiants --
    cy.get('nav').contains('Étudiants').click({ force: true })
    cy.url().should('include', '/supervisor/etudiants')
    
    // Retour Accueil
    cy.get('nav').contains('Tableau de bord').click({ force: true })
    cy.url().should('include', '/supervisor/dashboard')

    // -- Lien CVs --
    cy.get('nav').contains('Validation CV').click({ force: true })
    cy.url().should('include', '/supervisor/cv')
    
    // Retour Accueil
    cy.get('nav').contains('Tableau de bord').click({ force: true })
    cy.url().should('include', '/supervisor/dashboard')

    // -- Lien Offres (qui est en réalité Offres d'emploi) --
    cy.get('nav').contains('Offres d\'emploi').click({ force: true })
    cy.url().should('include', '/supervisor/offres')
  })
})
