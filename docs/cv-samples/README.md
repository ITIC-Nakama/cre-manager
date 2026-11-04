# Exemples de CV générés par l'assistant

PDF produits par le vrai moteur de rendu de l'assistant (`CvRenderService`, celui qu'utilisent
`POST /cv/builder/me/pdf` et l'envoi au conseiller), pour relire les deux modèles.

| Fichier | Modèle | CV | Pages |
|---|---|---|---|
| `classique-1-page.pdf` | Classique | Amina Diallo, Bachelor en alternance | 1 |
| `classique-2-pages.pdf` | Classique | Sarah Lemoine, reconversion, 5 expériences | 2 |
| `moderne-1-page.pdf` | Moderne | Amina Diallo | 1 |
| `moderne-2-pages.pdf` | Moderne | Sarah Lemoine | 2 |

- **Données entièrement fictives** (`CvSampleFixtures.fullCv()` et `longCv()`), e-mails en `example.com`.
- Paramètres : langue du CV `fr`, couleur d'accent par défaut `#3B71FF`, sans photo.
- Chaque brouillon passe la validation de l'assistant ; le nombre de pages est vérifié à la génération.

## Régénérer

Depuis `itic-cre-backend/` (le test est ignoré lors d'un `mvn test` normal) :

```bash
./mvnw test -Dtest=CvSamplesExportTest -Dcv.samples.dir=../docs/cv-samples
```
