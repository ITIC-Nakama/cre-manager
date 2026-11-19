package com.itic.paris.platform.alerts;

import org.springframework.test.context.TestPropertySource;

/**
 * Lot 10 (C) : toute la suite des alertes et du rattachement des offres aux formations (lot 8), rejouée avec
 * l'Espace entreprise masqué. La configuration des formations sert en coulisses : rien ne doit changer.
 */
@TestPropertySource(properties = "app.company-space.enabled=false")
class OfferAlertWithCompanySpaceHiddenIntegrationTest extends OfferAlertIntegrationTest {
}
