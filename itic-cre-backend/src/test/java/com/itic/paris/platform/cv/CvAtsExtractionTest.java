package com.itic.paris.platform.cv;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.cv.model.CvTemplate;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import com.itic.paris.platform.cv.service.CvRenderService;
import com.itic.paris.platform.cv.service.CvRenderService.CvRenderOptions;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Lisibilite des CV generes par les logiciels de tri des recruteurs (ATS), pour CHAQUE modele, avec et sans photo :
 * le PDF est genere avec des donnees d'exemple, puis son texte est extrait avec PDFBox de deux facons (ordre du flux
 * du PDF, et ordre de position sur la page, celui de la plupart des ATS). On verifie :
 * <ul>
 *   <li>que toutes les informations sortent en vrai texte (accents, €, apostrophes typographiques, sans les ** du gras) ;</li>
 *   <li>l'ordre de lecture : nom en premier, puis les coordonnees, le profil, puis les sections dans l'ordre choisi ;
 *       chaque entree reste groupee (la date ne s'echappe pas en haut de page) ;</li>
 *   <li>les titres de section standards ;</li>
 *   <li>les polices embarquees avec une table de correspondance Unicode (ToUnicode) ;</li>
 *   <li>aucun texte dans les marges (pas d'en-tete ni de pied de page : coordonnees dans le corps) ;</li>
 *   <li>que la photo ne change rien au texte extrait.</li>
 * </ul>
 */
class CvAtsExtractionTest {

    /** Marges de page (@page margin: 15mm) en points PDF : aucun texte ne doit s'y trouver. */
    private static final float MARGIN_PT = 15f / 25.4f * 72f;
    private static final float A4_HEIGHT_PT = 842f;

    private final ICloudStorage storage = mock(ICloudStorage.class);
    private final CvRenderService renderService = new CvRenderService(storage);

    static Stream<Arguments> templatesWithAndWithoutPhoto() {
        return Stream.of(CvTemplate.values()).flatMap(t -> Stream.of(Arguments.of(t, false), Arguments.of(t, true)));
    }

    @ParameterizedTest(name = "{0}, photo = {1}")
    @MethodSource("templatesWithAndWithoutPhoto")
    @DisplayName("Toutes les informations sortent en texte, dans l'ordre de lecture")
    void everythingIsExtractedInReadingOrder(CvTemplate template, boolean photo) throws Exception {
        CvDraftData cv = sample(photo);
        byte[] pdf = render(template, cv, photo);

        for (boolean byPosition : new boolean[]{false, true}) {
            String text = extract(pdf, byPosition);
            String mode = byPosition ? "ordre de position" : "ordre du flux";

            // 1. Le nom vient avant tout le reste.
            int name = indexOf(text, "Inès Lefèvre-Ndiaye", mode);
            assertThat(name).as("%s : le nom doit être le premier texte du document", mode)
                    .isLessThanOrEqualTo(firstWordIndex(text));

            // 2. Coordonnees : toutes presentes, apres le nom et avant le profil (dans le corps).
            int profile = indexOf(text, "Profil", mode);
            for (String contact : List.of("ines.lefevre@example.com", "06 12 34 56 78", "Saint-Denis (93)",
                    "Île-de-France", "linkedin.com/in/ines-lefevre-ndiaye-0094961a1")) {
                int at = indexOf(text, contact, mode);
                assertThat(at).as("%s : « %s » entre le nom et le profil", mode, contact).isGreaterThan(name).isLessThan(profile);
            }
            assertThat(indexOf(text, "Chargée de développement commercial en alternance", mode)).isGreaterThan(name);

            // 3. Profil, puis les sections dans l'ordre choisi, chacune avec ses entrees groupees.
            int cursor = indexOf(text, "Je cherche une alternance de 24 mois", mode);
            assertThat(cursor).isGreaterThan(profile);
            for (String section : cv.getOrdreSections()) {
                cursor = assertSection(text, section, cursor, mode);
            }

            // 4. Gras rendu sans marqueurs, caracteres speciaux intacts.
            assertThat(text).as(mode).doesNotContain("**");
            assertThat(normalize(text)).as(mode).contains(normalize("+15 % de chiffre d’affaires"));
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("templates")
    @DisplayName("Polices embarquées avec correspondance Unicode, aucun texte dans les marges")
    void fontsAndMargins(CvTemplate template) throws Exception {
        byte[] pdf = render(template, sample(true), true);
        try (PDDocument document = Loader.loadPDF(pdf)) {
            for (PDPage page : document.getPages()) {
                PDResources resources = page.getResources();
                for (COSName fontName : resources.getFontNames()) {
                    PDFont font = resources.getFont(fontName);
                    assertThat(font.isEmbedded()).as("police %s embarquée", font.getName()).isTrue();
                    assertThat(font.getCOSObject().containsKey(COSName.TO_UNICODE))
                            .as("police %s : table ToUnicode", font.getName()).isTrue();
                }
            }

            List<Float> baselines = new ArrayList<>();
            PDFTextStripper positions = new PDFTextStripper() {
                @Override
                protected void writeString(String string, List<TextPosition> textPositions) throws IOException {
                    textPositions.forEach(p -> baselines.add(p.getYDirAdj()));
                    super.writeString(string, textPositions);
                }
            };
            positions.getText(document);
            assertThat(baselines).isNotEmpty();
            assertThat(baselines).as("aucun texte dans la marge haute (pas d'en-tête de page)")
                    .allMatch(y -> y >= MARGIN_PT - 1);
            assertThat(baselines).as("aucun texte dans la marge basse (pas de pied de page)")
                    .allMatch(y -> y <= A4_HEIGHT_PT - MARGIN_PT + 1);
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("templates")
    @DisplayName("La photo ne change pas le texte extrait et n'est qu'une image")
    void photoDoesNotChangeExtractedText(CvTemplate template) throws Exception {
        byte[] withPhoto = render(template, sample(true), true);
        byte[] withoutPhoto = render(template, sample(false), false);

        assertThat(normalize(extract(withPhoto, false))).isEqualTo(normalize(extract(withoutPhoto, false)));
        assertThat(normalize(extract(withPhoto, true))).isEqualTo(normalize(extract(withoutPhoto, true)));
        assertThat(imageCount(withPhoto)).isEqualTo(imageCount(withoutPhoto) + 1);
    }

    @Test
    @DisplayName("L'ordre des sections suit le choix de l'étudiant (formation avant expériences)")
    void sectionOrderFollowsTheStudentChoice() throws Exception {
        for (CvTemplate template : CvTemplate.values()) {
            CvDraftData cv = sample(false);
            cv.setOrdreSections(new ArrayList<>(List.of("formations", "experiences", "projets", "competences",
                    "langues", "certifications", "centresInteret")));
            String text = extract(render(template, cv, false), true);
            assertThat(indexOf(text, "Formation", template.name()))
                    .as("%s : Formation avant Expériences", template)
                    .isLessThan(indexOf(text, "Expériences professionnelles", template.name()));
        }
    }

    static Stream<CvTemplate> templates() {
        return Stream.of(CvTemplate.values());
    }

    // ─── Verification d'une section ───────────────────────────────────────────

    /** Verifie le titre puis les entrees de la section, dans l'ordre ; renvoie la position atteinte. */
    private int assertSection(String text, String section, int after, String mode) {
        List<List<String>> entries = switch (section) {
            case "experiences" -> List.of(
                    List.of("Chargée de développement commercial", "sept. 2024", "ITIC Paris", "CA 3 M€ – effectif 35 collaborateurs (Enseignement supérieur)",
                            "Prospection B2B : +15 % de chiffre d’affaires en un an", "Animation d’ateliers « CV et entretiens » pour 120 étudiants"),
                    List.of("Commerciale terrain", "2023", "Europroh Hospitality", "CA 2 M€ – effectif 6 collaborateurs (Équipement hôtelier)",
                            "Ouverture de 2 nouveaux marchés (hôtellerie, santé)"));
            case "formations" -> List.of(
                    List.of("Bachelor Business Developer", "2024", "ITIC Paris", "Négociation commerciale et gestion de projet"),
                    List.of("BTS Négociation et digitalisation de la relation client", "2022", "Lycée Le Rebours"));
            case "projets" -> List.of(List.of("Salon de l’alternance ITIC", "itic-salon.example.org/2025", "Organisation d’un salon de 40 exposants"));
            case "competences" -> List.of(List.of("Prospection B2B", "HubSpot", "Écoute active"));
            case "langues" -> List.of(List.of("Français", "Anglais", "B2"));
            case "certifications" -> List.of(List.of("TOEIC 850", "ETS Global"));
            case "centresInteret" -> List.of(List.of("Mission humanitaire au Bénin"));
            default -> List.of();
        };
        String title = switch (section) {
            case "experiences" -> "Expériences professionnelles";
            case "formations" -> "Formation";
            case "projets" -> "Projets";
            case "competences" -> "Compétences";
            case "langues" -> "Langues";
            case "certifications" -> "Certifications";
            case "centresInteret" -> "Centres d’intérêt";
            default -> throw new IllegalArgumentException(section);
        };
        int titleAt = indexOfAfter(text, title, after, mode + " — titre « " + title + " »");
        int end = titleAt;
        for (List<String> entry : entries) {
            int entryStart = Integer.MAX_VALUE;
            int entryEnd = -1;
            int previous = -1;
            for (String field : entry) {
                int at = indexOfAfter(text, field, end, mode + " — " + section + " « " + field + " »");
                entryStart = Math.min(entryStart, at);
                entryEnd = Math.max(entryEnd, at);
                previous = at;
            }
            assertThat(entryStart).as("%s — %s : l'entrée commence après la précédente", mode, section).isGreaterThan(end);
            end = entryEnd;
            assertThat(previous).isGreaterThanOrEqualTo(0);
        }
        return end;
    }

    // ─── Donnees d'exemple ────────────────────────────────────────────────────

    private static CvDraftData sample(boolean photo) {
        CvDraftData cv = new CvDraftData();
        CvDraftData.Identite id = cv.getIdentite();
        id.setPrenom("Inès");
        id.setNom("Lefèvre-Ndiaye");
        id.setTitre("Chargée de développement commercial en alternance");
        id.setEmail("ines.lefevre@example.com");
        id.setTelephone("06 12 34 56 78");
        id.setVille("Saint-Denis (93)");
        id.setMobilite("Île-de-France, permis B");
        id.setAfficherPhoto(photo);
        CvDraftData.Lien linkedin = new CvDraftData.Lien();
        linkedin.setType("LINKEDIN");
        linkedin.setUrl("https://www.linkedin.com/in/ines-lefevre-ndiaye-0094961a1");
        id.getLiens().add(linkedin);

        cv.setAccroche("Je cherche une alternance de 24 mois en développement commercial, rythme 3 semaines / 1 semaine, dès septembre.");

        CvDraftData.Experience e1 = new CvDraftData.Experience();
        e1.setPoste("Chargée de développement commercial");
        e1.setTypeContrat("Alternance");
        e1.setEntreprise("ITIC Paris");
        e1.setVille("Paris");
        e1.setDebut("2024-09");
        e1.setEnCours(true);
        e1.setChiffreAffaires("3 M€");
        e1.setEffectif("35 collaborateurs");
        e1.setSecteur("Enseignement supérieur");
        e1.getPoints().add("Prospection B2B : **+15 % de chiffre d’affaires** en un an");
        e1.getPoints().add("Animation d’ateliers « CV et entretiens » pour **120 étudiants**");
        CvDraftData.Experience e2 = new CvDraftData.Experience();
        e2.setPoste("Commerciale terrain");
        e2.setEntreprise("Europroh Hospitality");
        e2.setDebut("2023-01");
        e2.setFin("2024-06");
        e2.setChiffreAffaires("2 M€");
        e2.setEffectif("6 collaborateurs");
        e2.setSecteur("Équipement hôtelier");
        e2.getPoints().add("Ouverture de **2 nouveaux marchés** (hôtellerie, santé)");
        cv.getExperiences().addAll(List.of(e1, e2));

        CvDraftData.Formation f1 = new CvDraftData.Formation();
        f1.setDiplome("Bachelor Business Developer");
        f1.setEtablissement("ITIC Paris");
        f1.setDebut("2024-09");
        f1.setEnCours(true);
        f1.getPoints().add("Négociation commerciale et gestion de projet");
        CvDraftData.Formation f2 = new CvDraftData.Formation();
        f2.setDiplome("BTS Négociation et digitalisation de la relation client");
        f2.setEtablissement("Lycée Le Rebours");
        f2.setDebut("2022-09");
        f2.setFin("2024-06");
        cv.getFormations().addAll(List.of(f1, f2));

        CvDraftData.Projet p = new CvDraftData.Projet();
        p.setNom("Salon de l’alternance ITIC");
        p.setLien("https://itic-salon.example.org/2025");
        p.setDescription("Organisation d’un salon de 40 exposants");
        cv.getProjets().add(p);

        cv.getCompetences().getTechniques().add("Prospection B2B");
        cv.getCompetences().getOutils().add("HubSpot");
        cv.getCompetences().getSavoirEtre().add("Écoute active");

        CvDraftData.Langue fr = new CvDraftData.Langue();
        fr.setLangue("Français");
        fr.setNiveau("NATIF");
        CvDraftData.Langue en = new CvDraftData.Langue();
        en.setLangue("Anglais");
        en.setNiveau("B2");
        cv.getLangues().addAll(List.of(fr, en));

        CvDraftData.Certification toeic = new CvDraftData.Certification();
        toeic.setNom("TOEIC 850");
        toeic.setOrganisme("ETS Global");
        toeic.setDate("2024-03");
        cv.getCertifications().add(toeic);

        cv.getCentresInteret().add("Mission humanitaire au Bénin");
        cv.setOrdreSections(new ArrayList<>(List.of("experiences", "formations", "projets", "competences",
                "langues", "certifications", "centresInteret")));
        return cv;
    }

    // ─── Outils ───────────────────────────────────────────────────────────────

    private byte[] render(CvTemplate template, CvDraftData cv, boolean photo) throws IOException {
        Student student = new Student();
        student.setId(UUID.randomUUID());
        if (photo) {
            student.setProfilePicture("profiles/photo.png");
            byte[] png = samplePhoto();
            when(storage.downloadFile(anyString())).thenAnswer(inv -> new ByteArrayInputStream(png));
        }
        return renderService.renderPdf(student, cv, new CvRenderOptions(template, "#3B71FF", "fr")).bytes();
    }

    private static byte[] samplePhoto() throws IOException {
        BufferedImage image = new BufferedImage(120, 140, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(new Color(0x3B71FF));
        g.fillRect(0, 0, 120, 140);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    private static String extract(byte[] pdf, boolean byPosition) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(byPosition);
            return stripper.getText(document);
        }
    }

    private static int imageCount(byte[] pdf) throws IOException {
        int count = 0;
        try (PDDocument document = Loader.loadPDF(pdf)) {
            for (PDPage page : document.getPages()) {
                PDResources resources = page.getResources();
                for (COSName name : resources.getXObjectNames()) {
                    if (resources.getXObject(name) instanceof PDImageXObject) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    /** Insensible a la casse (titres en capitales) et aux retours a la ligne. */
    private static String normalize(String text) {
        return text.replace(' ', ' ').replace(' ', ' ').replaceAll("\\s+", " ").trim().toLowerCase(Locale.FRENCH);
    }

    private static int indexOf(String text, String needle, String mode) {
        return indexOfAfter(text, needle, -1, mode + " — « " + needle + " »");
    }

    private static int indexOfAfter(String text, String needle, int after, String what) {
        String haystack = normalize(text);
        int at = haystack.indexOf(normalize(needle), after + 1);
        assertThat(at).as("%s : introuvable (après la position %d) dans le texte extrait :%n%s", what, after, haystack).isGreaterThanOrEqualTo(0);
        return at;
    }

    /** Position du premier mot du document (le nom doit s'y trouver). */
    private static int firstWordIndex(String text) {
        return 0;
    }
}
