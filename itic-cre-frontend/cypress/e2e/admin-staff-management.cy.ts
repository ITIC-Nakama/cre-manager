describe('Gestion des Staff (Administrateur)', () => {
  const staffEmail = `test.staff.${Date.now()}@itic.fr`
  let staffPassword = ''

  beforeEach(() => {
    // Connexion en tant qu'Admin
    cy.visit('/login')
    cy.get('input[type="email"]').type('test.admin@itic.fr')
    cy.get('input[type="password"]').type('Test123!')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
  })

  it('Création de compte Staff sans OTP', () => {
    // Naviguer vers la gestion des conseillers/staff
    cy.visit('/admin/conseillers') 

    // Ouvrir le formulaire de création
    cy.get('[data-cy="btn-create-advisor"]').click()

    // Remplir le formulaire
    cy.get('input[name="firstName"]').type('Jean')
    cy.get('input[name="lastName"]').type('Conseiller')
    cy.get('input[name="email"]').type(staffEmail)
    cy.get('input[name="jobTitle"]').type('Conseiller Pédagogique')
    
    // Récupérer le mot de passe généré
    cy.get('input[name="password"]').invoke('val').then((val) => {
      staffPassword = val as string
    })

    // Soumettre
    cy.get('[data-cy="btn-save-advisor"]').click({ force: true }) 

    // Vérifier le toast de succès (utilisation de contains pour plus de résilience)
    cy.contains('succès', { timeout: 10000 }).should('exist')

    // On vérifie qu'il apparaît dans le tableau (donc actif, emailVerified=true)
    cy.contains('td', staffEmail).should('exist')
  })

  it('Première connexion: redirection vers /change-password-required', () => {
    // On va sur la page parametres pour se deconnecter
    cy.visit('/dashboard/parametres')
    cy.get('#btn-logout').click({ force: true })

    // Connexion avec le nouveau compte
    cy.visit('/login')
    cy.get('input[type="email"]').type(staffEmail)
    // Utiliser le mot de passe récupéré précédemment
    cy.get('input[type="password"]').then(($input) => {
      cy.wrap($input).type(staffPassword)
    })
    cy.get('button[type="submit"]').click({ force: true })

    // Vérification de la redirection
    cy.url().should('include', '/change-password-required')

    // Tenter de contourner en allant sur le dashboard
    cy.visit('/dashboard')
    cy.url().should('include', '/change-password-required')

    // Remplir le formulaire de changement de mot de passe
    cy.get('input[placeholder="••••••••"]').eq(0).then(($input) => {
      cy.wrap($input).type(staffPassword)
    })
    cy.get('input[placeholder="••••••••"]').eq(1).type('NewSafePass456!')
    cy.get('input[placeholder="••••••••"]').eq(2).type('NewSafePass456!')
    cy.contains('button', 'Changer le mot de passe').click({ force: true }) 

    // Vérifier que c'est ok (redirection vers dashboard ou login)
    cy.url().should('not.include', '/change-password-required')
  })

  it('Désactiver puis réactiver un compte Staff', () => {
    cy.visit('/admin/conseillers')

    cy.contains('tr', staffEmail)
      .find('[data-cy="btn-delete-advisor"]') 
      .click()
    
    // Le test va confirmer la suppression (qui sera un hard delete vu qu'il n'a pas de data)
    // Mais on peut faire annuler et tester sur test.advisor@itic.fr !
    cy.get('[data-cy="btn-confirm-cancel"]').click({ force: true })
    
    // Test the seed user for disable/enable (use search to avoid pagination issues)
    cy.get('input[placeholder*="Rechercher"]').type('test.advisor@itic.fr')
    // Attendre un peu que le debounce et l'API fassent leur travail
    cy.wait(1000)

    cy.contains('tr', 'test.advisor@itic.fr')
      .find('[data-cy="btn-delete-advisor"]')
      .click()
    
    cy.get('[data-cy="btn-confirm-accept"]').click({ force: true })
    cy.contains('désactivé', { timeout: 10000 }).should('exist')

    cy.contains('tr', 'test.advisor@itic.fr').should('contain', 'Inactif')

    // Réactiver
    cy.contains('tr', 'test.advisor@itic.fr')
      .find('[data-cy="btn-reactivate-advisor"]')
      .click({ force: true })
    cy.contains('activé', { timeout: 10000 }).should('exist')
  })

  it('Suppression définitive vs Désactivation', () => {
    cy.visit('/admin/conseillers')

    // Rechercher l'email pour éviter les soucis de pagination
    cy.get('input[placeholder*="Rechercher"]').clear().type(staffEmail)
    cy.wait(1000)

    cy.contains('tr', staffEmail)
      .find('[data-cy="btn-delete-advisor"]')
      .click({ force: true })
    
    cy.get('[data-cy="btn-confirm-accept"]').click({ force: true })

    cy.contains('tr', staffEmail).should('not.exist')
  })
})
