describe('E2E: CRM - Suivi des Candidatures', () => {
  beforeEach(() => {
    // Les requêtes interceptées pour éviter les flaky tests
    cy.intercept('GET', '**/dashboard/applications*').as('getApplications')
    cy.intercept('GET', '**/application-statuses').as('getStatuses')
    cy.intercept('GET', '**/jobboard/contract-types/active/list').as('getContractTypes')
    cy.intercept('GET', '**/promotions/active').as('getPromotions')

    // Connexion en tant qu'Admin pour accéder au dashboard CRM (Conseiller/Admin)
    cy.visit('/login')
    cy.get('input[type="email"]').type('test.admin@itic.fr')
    cy.get('input[type="password"]').type('Test123!')
    cy.intercept('POST', '**/auth/login').as('loginReqAdmin')
    cy.get('button[type="submit"]').click()
    cy.wait('@loginReqAdmin')
    cy.url().should('include', '/supervisor/dashboard')

    // Navigation vers la page Candidatures du CRM
    cy.get('nav').contains('Candidatures').click({ force: true })
    cy.url().should('include', '/supervisor/candidatures')
    cy.wait('@getApplications')
    cy.wait('@getStatuses')
  })

  it('Filtres et Recherche : Vérifie les filtres par statut, promotion, type de contrat et recherche textuelle', () => {
    // On suppose qu'il y a des données de test issues des seeders
    cy.get('table').should('exist')

    // Filtre de recherche textuelle
    const searchTerm = 'Dev'
    cy.get('input[placeholder*="Rechercher"]').clear().type(searchTerm)
    cy.wait('@getApplications')
    
    // Filtre par statut (on sélectionne le 2ème élément de la liste déroulante)
    // On cible le premier CustomSelect (Statuts)
    cy.get('.flex-wrap > div').eq(1).click() // Ouvre le select Statut
    cy.get('.flex-wrap > div').eq(1).find('.absolute button').eq(1).click({ force: true })
    cy.wait('@getApplications')

    // Filtre par promotion (2ème CustomSelect)
    cy.get('.flex-wrap > div').eq(2).click()
    cy.get('.flex-wrap > div').eq(2).find('.absolute button').eq(1).click({ force: true })
    cy.wait('@getApplications')

    // Filtre par type de contrat (3ème CustomSelect)
    cy.get('.flex-wrap > div').eq(3).click()
    cy.get('.flex-wrap > div').eq(3).find('.absolute button').eq(1).click({ force: true })
    cy.wait('@getApplications')

    cy.get('table').should('exist')
  })

  it('Candidatures stagnantes (stale) : Vérifie le badge et le filtre', () => {
    // Activer le toggle "Candidatures stagnantes uniquement"
    cy.contains('button', 'En retard', { matchCase: false }).click()
    cy.wait('@getApplications')

    // S'il y a des résultats, vérifier l'affichage visuel des alertes stagnantes (badge ⚠️ = AlertCircle de lucide-react)
    // On vérifie que la ligne a la bordure amber (border-l-amber-400) ou contient l'icone
    cy.get('tbody').then($tbody => {
      if ($tbody.find('tr').length > 0 && !$tbody.text().includes('Aucune')) {
        // Chaque ligne visible doit avoir la classe indiquant qu'elle est stale
        cy.get('tbody tr').each(($tr) => {
          cy.wrap($tr).should('have.class', 'border-l-amber-400')
          // Vérifie la présence de l'icône dans la colonne date
          cy.wrap($tr).find('.text-amber-500').should('exist')
        })
      }
    })
  })
})

describe('E2E: Espace Étudiant - Édition d\'une candidature', () => {
  const entrepriseTest = 'Entreprise Cypress ' + Date.now()
  const notesTest = 'Notes de test Cypress ' + Date.now()

  beforeEach(() => {
    cy.intercept('GET', '**/applications*').as('getMyApplications')
    cy.intercept('POST', '**/applications').as('createApplication')
    cy.intercept('PUT', '**/applications/*').as('updateApplication')
    cy.intercept('PATCH', '**/applications/*/status').as('changeStatus')
    
    // Connexion en tant qu'Étudiant
    cy.visit('/login')
    cy.get('input[type="email"]').type('test.student@itic.fr')
    cy.get('input[type="password"]').type('Test123!')
    cy.intercept('POST', '**/auth/login').as('loginReqStudent')
    cy.get('button[type="submit"]').click()
    cy.wait('@loginReqStudent')
    cy.url().should('include', '/student/dashboard')

    // Navigation vers Mes Candidatures
    cy.get('nav').contains('Candidatures').click({ force: true })
    cy.url().should('include', '/student/candidatures')
    cy.wait('@getMyApplications')
  })

  it('Création, Édition de notes et changement de statut', () => {
    // 1. Création d'une candidature
    cy.contains('button', 'Nouvelle candidature').click()
    cy.get('.fixed.z-50').should('be.visible')
    
    cy.get('.fixed.z-50 input[name="entreprise"]').type(entrepriseTest)
    cy.get('.fixed.z-50 input[name="poste"]').type('Développeur Fullstack')
    
    cy.get('.fixed.z-50').contains('button', 'Créer').click()
    cy.wait('@createApplication').its('response.statusCode').should('eq', 201)
    cy.wait('@getMyApplications')
    
    cy.contains('tr', entrepriseTest).should('be.visible')

    // 2. Édition de la candidature (Notes/Commentaires)
    // Cliquer sur le bouton "Éditer" de la ligne correspondante (Pencil)
    cy.contains('tr', entrepriseTest)
      .find('button[title="Éditer"]')
      .click({ force: true })
    
    cy.get('.fixed.z-50').should('be.visible')
    cy.get('.fixed.z-50 textarea[name="notes"]').clear().type(notesTest)
    
    cy.get('.fixed.z-50').contains('button', 'Enregistrer').click()
    cy.wait('@updateApplication').its('response.statusCode').should('eq', 200)
    cy.wait('@getMyApplications')
    cy.wait(500) // Laisse le temps à React de mettre à jour la ligne du tableau avec la nouvelle donnée

    // Vérification de la persistance des notes : on ouvre "Consulter"
    cy.contains('tr', entrepriseTest)
      .find('button[title="Consulter"]')
      .click({ force: true })
    
    cy.get('.fixed.z-50').contains(notesTest).should('be.visible')
    
    // Fermer la modale
    cy.get('.fixed.z-50 button').first().click({ force: true })

    // 3. Changement de statut de la candidature
    cy.contains('tr', entrepriseTest)
      .find('button[title="Changer statut"]')
      .click({ force: true })
    
    cy.get('.fixed.z-50').should('be.visible')
    // Sélectionner le 3ème statut dans la liste (index 2) pour s'assurer qu'il est différent du statut par défaut
    cy.get('.fixed.z-50 select').select(2)
    
    cy.get('.fixed.z-50').contains('button', 'Enregistrer').click()
    cy.wait('@changeStatus').its('response.statusCode').should('eq', 200)
    cy.wait('@getMyApplications')

    // Valider la mise à jour de l'XP de l'étudiant (vérifiable indirectement via le toast ou sur le dashboard)
    cy.contains('Statut modifié avec succès').should('be.visible')
  })
})
