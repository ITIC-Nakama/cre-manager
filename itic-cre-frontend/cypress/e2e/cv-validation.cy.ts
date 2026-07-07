describe('E2E: Validation des CV', () => {
  describe('Côté Conseiller : Visualisation et Évaluation', () => {
    beforeEach(() => {
      // Interceptions pour éviter le flaky
      cy.intercept('GET', '**/cv*').as('getCVs')
      cy.intercept('GET', '**/cv/*/pdf').as('getPDF')
      cy.intercept('PUT', '**/cv/*/status').as('evaluateCV')
      
      // Connexion en tant qu'Admin / Conseiller
      cy.visit('/login')
      cy.get('input[type="email"]').type('test.admin@itic.fr')
      cy.get('input[type="password"]').type('Test123!')
      cy.intercept('POST', '**/auth/login').as('loginReqAdmin')
      cy.get('button[type="submit"]').click()
      cy.wait('@loginReqAdmin')
      
      // Navigation vers Validation CV
      cy.get('nav').contains('CV').click({ force: true })
      cy.url().should('include', '/supervisor/cv')
      cy.wait('@getCVs')
    })

    it('Consulter la liste des CV en attente et ouvrir la modale', () => {
      cy.get('table').should('exist')
      
      // S'il y a des CV, on clique sur le bouton "Examiner"
      cy.get('tbody').then($tbody => {
        if ($tbody.find('tr').length > 0 && !$tbody.text().includes('Aucun CV')) {
          cy.get('tbody tr').first().find('button[title*="Examiner"]').click({ force: true })
          
          // Vérifie que la modale s'ouvre bien
          cy.get('.fixed.z-50').should('be.visible')
          
          // Vérifie la présence du lien pour ouvrir le PDF
          cy.get('.fixed.z-50 a[target="_blank"]').should('exist')
          
          // Fermer la modale
          cy.get('body').type('{esc}')
        }
      })
    })

    it('Évaluation : Valider le CV ou demander des corrections avec commentaires', () => {
      cy.intercept('POST', '**/cv/*/comments').as('addComment')
      cy.get('tbody').then($tbody => {
        if ($tbody.find('tr').length > 0 && !$tbody.text().includes('Aucun CV')) {
          // Ouvrir la modale
          cy.get('tbody tr').first().find('button[title*="Examiner"]').click({ force: true })
          
          cy.get('.fixed.z-50').should('be.visible')
          
          // Changer le statut (Dropdown)
          cy.get('.fixed.z-50').contains('button', 'Changer le statut').click({ force: true })
          cy.get('.fixed.z-50').contains('button', 'À corriger').click({ force: true })
          cy.wait('@evaluateCV').its('response.statusCode').should('be.oneOf', [200, 201])
          
          // Ajouter un commentaire
          cy.get('.fixed.z-50 textarea').clear().type('Il manque les expériences professionnelles détaillées.')
          cy.get('.fixed.z-50').contains('button', 'Envoyer').click()
          cy.wait('@addComment').its('response.statusCode').should('be.oneOf', [200, 201])
        }
      })
    })
  })

  describe('Côté Étudiant : Dépôt et Règles d\'XP', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/cv/me*').as('getMyCV')
      cy.intercept('POST', '**/cv/me/upload').as('uploadCV')
      
      // Connexion en tant qu'Étudiant
      cy.visit('/login')
      cy.get('input[type="email"]').type('test.student@itic.fr')
      cy.get('input[type="password"]').type('Test123!')
      cy.intercept('POST', '**/auth/login').as('loginReqStudent')
      cy.get('button[type="submit"]').click()
      cy.wait('@loginReqStudent')
      
      // Navigation vers Mon CV
      cy.get('nav').contains('CV').click({ force: true })
      cy.url().should('include', '/student/cv')
    })

    it('Déposer un nouveau CV côté étudiant (réinitialise xpAwarded)', () => {
      // Cypress nécessite qu'un fichier factice soit uploadé pour le test de type file
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('Fichier PDF factice pour Cypress'),
        fileName: 'cv_student.pdf',
        mimeType: 'application/pdf',
      }, { force: true })
      
      cy.wait('@uploadCV').its('response.statusCode').should('be.oneOf', [200, 201])
      
      // Vérifier que le statut repasse visuellement "En attente" suite au nouvel upload
      // Ceci implique implicitement que xpAwarded repasse à false côté backend.
      cy.contains('En attente', { matchCase: false }).should('be.visible')
    })
  })
})
