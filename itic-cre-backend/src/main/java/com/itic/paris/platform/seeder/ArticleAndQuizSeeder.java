package com.itic.paris.platform.seeder;

import com.itic.paris.platform.skill.model.*;
import com.itic.paris.platform.skill.repository.ArticleRepository;
import com.itic.paris.platform.skill.repository.QuizRepository;
import com.itic.paris.platform.skill.repository.SkillCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@Order(5)
@RequiredArgsConstructor
public class ArticleAndQuizSeeder implements ApplicationRunner {

    private final SkillCategoryRepository categoryRepository;
    private final ArticleRepository articleRepository;
    private final QuizRepository quizRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (articleRepository.count() > 0) return;

        categoryRepository.findByActifTrueOrderByOrdreAsc().forEach(cat -> {
            switch (cat.getNom()) {
                case "CV & Candidature"      -> seedCVCandidature(cat);
                case "Lettre de motivation"  -> seedLettreMot(cat);
                case "Entretien & Pitch"     -> seedEntretien(cat);
                case "Recherche & Réseau"    -> seedReseau(cat);
                case "Posture & Soft Skills" -> seedSoftSkills(cat);
                case "Évolution de carrière" -> seedEvolutionCarriere(cat);
                case "Communication pro"     -> seedCommunicationPro(cat);
                case "Bien-être & équilibre" -> seedBienEtre(cat);
                case "Culture d'entreprise"  -> seedCultureEntreprise(cat);
            }
        });

        log.info("Seeded articles and quizzes");
    }

    // ─── CV & Candidature ────────────────────────────────────────────────────

    private void seedCVCandidature(SkillCategory cat) {
        Article a1 = saveArticle(cat, "Les fondamentaux d'un bon CV",
            "<h1>Les fondamentaux d'un bon CV</h1>" +
            "<p>Un CV efficace doit transmettre en moins de 30 secondes qui vous êtes et ce que vous apportez. " +
            "Il doit être <strong>clair, concis et adapté au poste visé</strong>.</p>" +
            "<h2>Les sections indispensables</h2>" +
            "<ul><li><strong>En-tête</strong> : nom, prénom, titre professionnel, coordonnées</li>" +
            "<li><strong>Expériences</strong> : ordre chronologique inversé, résultats chiffrés</li>" +
            "<li><strong>Formation</strong> : diplômes, établissements, années</li>" +
            "<li><strong>Compétences</strong> : techniques et transversales</li></ul>" +
            "<h2>Les erreurs à éviter</h2>" +
            "<ul><li>Photo floue ou non professionnelle</li>" +
            "<li>Fautes d'orthographe</li>" +
            "<li>Longueur excessive (max 1 page pour moins de 5 ans d'expérience)</li>" +
            "<li>Informations sans rapport avec le poste</li></ul>"
        );
        saveQuiz(a1, 80, List.of(
            question(1, "Quel est l'ordre chronologique recommandé pour les expériences sur un CV ?",
                List.of(
                    answer("Du plus récent au plus ancien", true),
                    answer("Du plus ancien au plus récent", false),
                    answer("Par ordre alphabétique de l'entreprise", false),
                    answer("Par durée de mission décroissante", false)
                )
            ),
            question(2, "Quelle est la longueur maximale recommandée pour un CV avec moins de 5 ans d'expérience ?",
                List.of(
                    answer("1 page", true),
                    answer("2 pages", false),
                    answer("3 pages", false),
                    answer("Il n'y a pas de limite", false)
                )
            ),
            question(3, "Parmi ces éléments, lesquels sont indispensables dans un CV ?",
                List.of(
                    answer("Coordonnées et titre professionnel", true),
                    answer("Expériences professionnelles", true),
                    answer("Formation", true),
                    answer("Photo de famille", false)
                )
            )
        ));

        Article a2 = saveArticle(cat, "Adapter son CV à chaque offre",
            "<h1>Adapter son CV à chaque offre</h1>" +
            "<p>Envoyer le même CV à toutes les entreprises est l'une des erreurs les plus fréquentes. " +
            "<strong>Personnaliser son CV augmente significativement son taux de réponse.</strong></p>" +
            "<h2>Comment analyser une offre</h2>" +
            "<ul><li>Identifier les <strong>mots-clés</strong> de l'annonce</li>" +
            "<li>Repérer les compétences prioritaires demandées</li>" +
            "<li>Comprendre la culture d'entreprise via son site web</li></ul>" +
            "<h2>Ce qu'il faut adapter</h2>" +
            "<ul><li>Le <strong>titre professionnel</strong> en haut du CV</li>" +
            "<li>L'ordre de présentation des compétences</li>" +
            "<li>La mise en avant de certaines expériences</li></ul>"
        );
        saveQuiz(a2, 80, List.of(
            question(1, "Pourquoi est-il conseillé d'adapter son CV à chaque offre ?",
                List.of(
                    answer("Pour augmenter le taux de réponse en correspondant mieux aux attentes du recruteur", true),
                    answer("Pour que le CV soit plus long et donc plus impressionnant", false),
                    answer("Pour éviter d'être détecté par les logiciels anti-plagiat", false)
                )
            ),
            question(2, "Que faut-il analyser en priorité dans une offre d'emploi ?",
                List.of(
                    answer("Les mots-clés et compétences prioritaires mentionnés", true),
                    answer("La taille de l'entreprise uniquement", false),
                    answer("La couleur du logo de l'entreprise", false),
                    answer("La localisation du bureau", false)
                )
            )
        ));

        saveArticle(cat, "Les outils pour créer un CV professionnel",
            "<h1>Les outils pour créer un CV professionnel</h1>" +
            "<p>De nombreux outils en ligne permettent de créer des CV soignés sans compétence en design.</p>" +
            "<h2>Outils recommandés</h2>" +
            "<ul><li><strong>Canva</strong> — templates modernes, gratuit</li>" +
            "<li><strong>Europass</strong> — format standardisé, reconnu en Europe</li>" +
            "<li><strong>LinkedIn</strong> — export PDF depuis votre profil</li>" +
            "<li><strong>Word / Google Docs</strong> — contrôle total sur le contenu</li></ul>" +
            "<h2>Format de fichier</h2>" +
            "<p>Toujours envoyer en <strong>PDF</strong> pour préserver la mise en forme, " +
            "sauf si le recruteur demande explicitement un autre format.</p>"
        );
    }

    // ─── Lettre de motivation ─────────────────────────────────────────────────

    private void seedLettreMot(SkillCategory cat) {
        Article a1 = saveArticle(cat, "Structure d'une lettre de motivation efficace",
            "<h1>Structure d'une lettre de motivation efficace</h1>" +
            "<p>Une lettre de motivation doit répondre à trois questions fondamentales : " +
            "<strong>Qui suis-je ? Pourquoi cette entreprise ? Pourquoi ce poste ?</strong></p>" +
            "<h2>Structure en 3 paragraphes</h2>" +
            "<ul><li><strong>Accroche</strong> : montrez que vous connaissez l'entreprise et le poste</li>" +
            "<li><strong>Corps</strong> : liez vos expériences aux besoins exprimés dans l'offre</li>" +
            "<li><strong>Clôture</strong> : exprimez votre motivation et proposez un entretien</li></ul>" +
            "<h2>Longueur recommandée</h2>" +
            "<p>Maximum <strong>une page</strong>, entre 250 et 350 mots.</p>"
        );
        saveQuiz(a1, 80, List.of(
            question(1, "Quelles sont les trois questions auxquelles doit répondre une lettre de motivation ?",
                List.of(
                    answer("Qui suis-je ? Pourquoi cette entreprise ? Pourquoi ce poste ?", true),
                    answer("Quel est mon salaire attendu ? Quand suis-je disponible ? Où j'habite ?", false),
                    answer("Quelle est mon expérience ? Quels sont mes hobbies ? Qui sont mes références ?", false)
                )
            ),
            question(2, "Quelle est la longueur recommandée pour une lettre de motivation ?",
                List.of(
                    answer("Une page, entre 250 et 350 mots", true),
                    answer("Deux pages minimum pour être exhaustif", false),
                    answer("Un simple paragraphe de 5 lignes", false),
                    answer("Il n'y a pas de limite, plus c'est long mieux c'est", false)
                )
            )
        ));

        saveArticle(cat, "Les erreurs qui tuent une lettre de motivation",
            "<h1>Les erreurs qui tuent une lettre de motivation</h1>" +
            "<p>Certaines erreurs sont rédhibitoires pour les recruteurs. Voici les plus fréquentes à éviter.</p>" +
            "<h2>Erreurs de fond</h2>" +
            "<ul><li>Copier-coller une lettre générique sans adaptation</li>" +
            "<li>Paraphraser son CV sans apporter de valeur ajoutée</li>" +
            "<li>Se concentrer sur ce que l'entreprise peut vous apporter plutôt que l'inverse</li></ul>" +
            "<h2>Erreurs de forme</h2>" +
            "<ul><li>Fautes d'orthographe (rédhibitoire pour 80% des recruteurs)</li>" +
            "<li>Police illisible ou mise en forme surchargée</li>" +
            "<li>Oublier de changer le nom de l'entreprise d'une candidature à l'autre</li></ul>"
        );
    }

    // ─── Entretien & Pitch ────────────────────────────────────────────────────

    private void seedEntretien(SkillCategory cat) {
        Article a1 = saveArticle(cat, "Préparer son entretien : les étapes clés",
            "<h1>Préparer son entretien : les étapes clés</h1>" +
            "<p>Un entretien bien préparé est un entretien à moitié réussi. " +
            "La préparation doit commencer <strong>au moins 48h à l'avance</strong>.</p>" +
            "<h2>Avant l'entretien</h2>" +
            "<ul><li>Rechercher l'entreprise : secteur, actualités récentes, valeurs</li>" +
            "<li>Relire l'offre d'emploi et anticiper les questions</li>" +
            "<li>Préparer des exemples concrets avec la méthode <strong>STAR</strong> " +
            "(Situation, Tâche, Action, Résultat)</li>" +
            "<li>Préparer ses propres questions pour le recruteur</li></ul>" +
            "<h2>Le jour J</h2>" +
            "<ul><li>Arriver 5 à 10 minutes en avance</li>" +
            "<li>Apporter plusieurs exemplaires de son CV</li>" +
            "<li>Éteindre son téléphone</li></ul>"
        );
        saveQuiz(a1, 80, List.of(
            question(1, "Que signifie la méthode STAR utilisée pour structurer ses exemples en entretien ?",
                List.of(
                    answer("Situation, Tâche, Action, Résultat", true),
                    answer("Savoir-faire, Talent, Aptitude, Réactivité", false),
                    answer("Secteur, Taille, Activité, Recruteur", false),
                    answer("Stratégie, Technique, Ambition, Rendement", false)
                )
            ),
            question(2, "Combien de temps à l'avance faut-il idéalement arriver à un entretien ?",
                List.of(
                    answer("5 à 10 minutes", true),
                    answer("30 minutes ou plus pour montrer sa motivation", false),
                    answer("Exactement à l'heure, ni avant ni après", false),
                    answer("2 à 3 minutes, le temps de souffler", false)
                )
            )
        ));

        saveArticle(cat, "Les questions pièges les plus fréquentes",
            "<h1>Les questions pièges les plus fréquentes</h1>" +
            "<p>Certaines questions reviennent systématiquement en entretien et peuvent déstabiliser si on n'y est pas préparé.</p>" +
            "<h2>\"Parlez-moi de vous\"</h2>" +
            "<p>Cette question ouvre l'entretien. Préparez un pitch de <strong>2 minutes maximum</strong> : " +
            "formation → expériences clés → motivations pour ce poste.</p>" +
            "<h2>\"Quelles sont vos faiblesses ?\"</h2>" +
            "<p>Choisissez une vraie faiblesse sur laquelle vous travaillez activement. " +
            "Évitez les réponses bateau comme \"je suis trop perfectionniste\".</p>" +
            "<h2>\"Où vous voyez-vous dans 5 ans ?\"</h2>" +
            "<p>Montrez de l'ambition tout en restant réaliste et en liant votre réponse au poste visé.</p>"
        );

        saveArticle(cat, "Réussir son pitch de présentation",
            "<h1>Réussir son pitch de présentation</h1>" +
            "<p>Le pitch est votre carte de visite orale. Il doit être <strong>mémorable, clair et personnel</strong>.</p>" +
            "<h2>Structure du pitch en 60 secondes</h2>" +
            "<ul><li><strong>Qui vous êtes</strong> : formation et spécialisation</li>" +
            "<li><strong>Ce que vous faites bien</strong> : 2-3 compétences clés avec preuve</li>" +
            "<li><strong>Ce que vous cherchez</strong> : valeur ajoutée que vous apportez</li></ul>" +
            "<h2>Conseils de delivery</h2>" +
            "<ul><li>Contact visuel maintenu</li><li>Débit modéré, pas de précipitation</li>" +
            "<li>Sourire naturel, posture ouverte</li></ul>"
        );
    }

    // ─── Recherche & Réseau ───────────────────────────────────────────────────

    private void seedReseau(SkillCategory cat) {
        Article a1 = saveArticle(cat, "Construire et activer son réseau professionnel",
            "<h1>Construire et activer son réseau professionnel</h1>" +
            "<p>Plus de <strong>70% des offres d'emploi ne sont jamais publiées</strong>. " +
            "Elles sont pourvues par le réseau. Construire le sien est donc une priorité.</p>" +
            "<h2>Où trouver des contacts</h2>" +
            "<ul><li><strong>LinkedIn</strong> : profil optimisé + prises de contact personnalisées</li>" +
            "<li><strong>Anciens étudiants</strong> de votre école</li>" +
            "<li><strong>Événements professionnels</strong> : salons, conférences, meetups</li>" +
            "<li><strong>Stages et alternances</strong> : chaque entreprise est une opportunité réseau</li></ul>" +
            "<h2>Comment prendre contact</h2>" +
            "<p>Message court, personnalisé, avec une demande claire. " +
            "Ne demandez pas de travail directement — demandez des <strong>conseils</strong>.</p>"
        );
        saveQuiz(a1, 80, List.of(
            question(1, "Quelle proportion des offres d'emploi n'est jamais publiée et est pourvue par le réseau ?",
                List.of(
                    answer("Plus de 70%", true),
                    answer("Environ 20%", false),
                    answer("Moins de 10%", false),
                    answer("Exactement 50%", false)
                )
            ),
            question(2, "Quelle est la meilleure approche pour prendre contact avec un professionnel inconnu ?",
                List.of(
                    answer("Demander des conseils avec un message court et personnalisé", true),
                    answer("Demander directement un emploi ou un stage", false),
                    answer("Envoyer son CV en pièce jointe sans message d'introduction", false),
                    answer("Appeler sans prévenir pour se présenter", false)
                )
            )
        ));

        saveArticle(cat, "Optimiser son profil LinkedIn",
            "<h1>Optimiser son profil LinkedIn</h1>" +
            "<p>LinkedIn est le <strong>réseau social professionnel de référence</strong>. " +
            "Un profil complet et optimisé multiplie par 5 les chances d'être contacté par un recruteur.</p>" +
            "<h2>Les éléments clés</h2>" +
            "<ul><li><strong>Photo</strong> : professionnelle, souriante, fond neutre</li>" +
            "<li><strong>Titre</strong> : accrocheur et orienté métier cible</li>" +
            "<li><strong>Résumé</strong> : votre pitch en 3 paragraphes</li>" +
            "<li><strong>Expériences</strong> : avec résultats chiffrés</li>" +
            "<li><strong>Compétences</strong> : demandez des recommandations</li></ul>"
        );
    }

    // ─── Posture & Soft Skills ────────────────────────────────────────────────

    private void seedSoftSkills(SkillCategory cat) {
        Article a1 = saveArticle(cat, "Les soft skills les plus recherchés par les recruteurs",
            "<h1>Les soft skills les plus recherchés par les recruteurs</h1>" +
            "<p>Les <strong>compétences comportementales</strong> sont désormais aussi importantes que les compétences techniques. " +
            "Selon de nombreuses études, elles représentent jusqu'à <strong>80% du succès professionnel</strong>.</p>" +
            "<h2>Top 5 des soft skills recherchés</h2>" +
            "<ul><li><strong>Adaptabilité</strong> : s'ajuster rapidement aux changements</li>" +
            "<li><strong>Communication</strong> : savoir écouter et s'exprimer clairement</li>" +
            "<li><strong>Esprit d'équipe</strong> : collaborer efficacement</li>" +
            "<li><strong>Autonomie</strong> : prendre des initiatives et gérer son travail</li>" +
            "<li><strong>Résolution de problèmes</strong> : trouver des solutions créatives</li></ul>"
        );
        saveQuiz(a1, 80, List.of(
            question(1, "Selon les études citées, quelle part du succès professionnel représentent les soft skills ?",
                List.of(
                    answer("Jusqu'à 80%", true),
                    answer("Environ 20%", false),
                    answer("Exactement 50%", false),
                    answer("Moins de 10%", false)
                )
            ),
            question(2, "Parmi ces compétences, lesquelles sont considérées comme des soft skills ?",
                List.of(
                    answer("Adaptabilité", true),
                    answer("Esprit d'équipe", true),
                    answer("Maîtrise de Python", false),
                    answer("Communication", true)
                )
            )
        ));

        saveArticle(cat, "Développer son intelligence émotionnelle",
            "<h1>Développer son intelligence émotionnelle</h1>" +
            "<p>L'intelligence émotionnelle (IE) est la capacité à <strong>reconnaître, comprendre et gérer</strong> " +
            "ses propres émotions et celles des autres.</p>" +
            "<h2>Les 4 composantes de l'IE</h2>" +
            "<ul><li><strong>Conscience de soi</strong> : identifier ses émotions en temps réel</li>" +
            "<li><strong>Maîtrise de soi</strong> : réguler ses réactions émotionnelles</li>" +
            "<li><strong>Empathie</strong> : comprendre les émotions d'autrui</li>" +
            "<li><strong>Compétences sociales</strong> : gérer les relations efficacement</li></ul>" +
            "<h2>Comment la développer</h2>" +
            "<ul><li>Pratiquer la pleine conscience (mindfulness)</li>" +
            "<li>Solliciter du feedback régulier</li>" +
            "<li>Tenir un journal émotionnel</li></ul>"
        );
    }

    // ─── Évolution de carrière ────────────────────────────────────────────────

    private void seedEvolutionCarriere(SkillCategory cat) {
        Article a1 = saveArticle(cat, "Définir son projet professionnel",
            "<h1>Définir son projet professionnel</h1>" +
            "<p>Un projet professionnel clair est le <strong>fil conducteur</strong> de toutes vos démarches de recherche d'emploi. " +
            "Sans lui, vos candidatures manquent de cohérence et de conviction.</p>" +
            "<h2>Les 3 questions fondamentales</h2>" +
            "<ul><li><strong>Qui suis-je ?</strong> — Mes valeurs, mes forces, mes contraintes</li>" +
            "<li><strong>Qu'est-ce que je veux faire ?</strong> — Métier, secteur, type de structure</li>" +
            "<li><strong>Comment y arriver ?</strong> — Formations, expériences, réseau à activer</li></ul>" +
            "<h2>Outils d'aide à la réflexion</h2>" +
            "<ul><li>Bilan de compétences</li><li>Tests de personnalité (MBTI, DISC)</li>" +
            "<li>Entretiens informationnels avec des professionnels du secteur visé</li></ul>"
        );
        saveQuiz(a1, 80, List.of(
            question(1, "Quelles sont les trois questions fondamentales pour définir son projet professionnel ?",
                List.of(
                    answer("Qui suis-je ? Qu'est-ce que je veux faire ? Comment y arriver ?", true),
                    answer("Quel salaire ? Quel poste ? Quelle ville ?", false),
                    answer("Quelle formation ? Quel diplôme ? Quelle entreprise ?", false)
                )
            ),
            question(2, "Parmi ces outils, lesquels peuvent aider à définir son projet professionnel ?",
                List.of(
                    answer("Bilan de compétences", true),
                    answer("Tests de personnalité (MBTI, DISC)", true),
                    answer("Entretiens informationnels", true),
                    answer("Regarder des films de motivation", false)
                )
            )
        ));

        Article a2 = saveArticle(cat, "Comprendre les étapes d'une carrière",
            "<h1>Comprendre les étapes d'une carrière</h1>" +
            "<p>Une carrière se construit sur le long terme. Comprendre ses grandes phases permet de mieux " +
            "<strong>anticiper et saisir les opportunités</strong>.</p>" +
            "<h2>Les phases typiques</h2>" +
            "<ul><li><strong>Exploration (0-5 ans)</strong> : découverte des métiers, premières expériences, ajustements</li>" +
            "<li><strong>Établissement (5-15 ans)</strong> : montée en expertise, premières responsabilités</li>" +
            "<li><strong>Consolidation (15+ ans)</strong> : management, transmission, reconversion éventuelle</li></ul>" +
            "<h2>Les signaux d'une transition nécessaire</h2>" +
            "<ul><li>Ennui ou désengagement chronique</li><li>Absence de progression</li>" +
            "<li>Valeurs incompatibles avec celles de l'entreprise</li></ul>"
        );
        saveQuiz(a2, 80, List.of(
            question(1, "Quelle phase correspond aux 5 premières années de carrière ?",
                List.of(
                    answer("La phase d'exploration", true),
                    answer("La phase de consolidation", false),
                    answer("La phase d'établissement", false),
                    answer("La phase de management", false)
                )
            ),
            question(2, "Quel signal peut indiquer qu'une transition de carrière est nécessaire ?",
                List.of(
                    answer("Un ennui ou désengagement chronique", true),
                    answer("Une promotion récente", false),
                    answer("Une augmentation de salaire", false),
                    answer("Un nouveau collègue dans l'équipe", false)
                )
            )
        ));

        saveArticle(cat, "Négocier sa rémunération",
            "<h1>Négocier sa rémunération</h1>" +
            "<p>La négociation salariale est une compétence qui s'apprend. " +
            "La plupart des candidats laissent de l'argent sur la table faute de s'y être préparés.</p>" +
            "<h2>Se préparer</h2>" +
            "<ul><li>Connaître les <strong>fourchettes du marché</strong> pour le poste et le secteur</li>" +
            "<li>Calculer son salaire net cible</li>" +
            "<li>Identifier tous les éléments de rémunération : fixe, variable, avantages</li></ul>" +
            "<h2>Pendant la négociation</h2>" +
            "<ul><li>Laisser l'employeur donner une fourchette en premier si possible</li>" +
            "<li>Annoncer le haut de sa fourchette pour avoir de la marge</li>" +
            "<li>Ne jamais accepter sur le champ — demander un délai de réflexion</li></ul>"
        );
    }

    // ─── Communication pro ────────────────────────────────────────────────────

    private void seedCommunicationPro(SkillCategory cat) {
        Article a1 = saveArticle(cat, "Maîtriser la communication écrite professionnelle",
            "<h1>Maîtriser la communication écrite professionnelle</h1>" +
            "<p>En entreprise, la majorité des échanges se font par écrit (emails, messages, rapports). " +
            "Une communication écrite <strong>claire et professionnelle</strong> est un atout majeur.</p>" +
            "<h2>Les règles de l'email professionnel</h2>" +
            "<ul><li><strong>Objet</strong> : court, précis, informatif</li>" +
            "<li><strong>Formule d'appel</strong> : adaptée au destinataire</li>" +
            "<li><strong>Corps</strong> : une idée par paragraphe, phrases courtes</li>" +
            "<li><strong>Formule de politesse</strong> : appropriée au contexte</li>" +
            "<li><strong>Signature</strong> : complète avec coordonnées</li></ul>" +
            "<h2>Ce qu'il faut éviter</h2>" +
            "<ul><li>Les emails trop longs sans structure</li>" +
            "<li>Le ton familier avec des inconnus</li>" +
            "<li>Les fautes d'orthographe (relire avant d'envoyer)</li></ul>"
        );
        saveQuiz(a1, 80, List.of(
            question(1, "Que doit contenir l'objet d'un email professionnel ?",
                List.of(
                    answer("Il doit être court, précis et informatif", true),
                    answer("Il doit contenir tous les détails pour que le destinataire comprenne sans lire le corps", false),
                    answer("Il peut être vide si le corps est bien rédigé", false),
                    answer("Il doit toujours commencer par 'URGENT'", false)
                )
            ),
            question(2, "Parmi ces pratiques, lesquelles sont à éviter dans un email professionnel ?",
                List.of(
                    answer("Le ton familier avec des inconnus", true),
                    answer("Les fautes d'orthographe", true),
                    answer("Les emails trop longs sans structure", true),
                    answer("Relire avant d'envoyer", false)
                )
            )
        ));

        Article a2 = saveArticle(cat, "Prise de parole en public : les bases",
            "<h1>Prise de parole en public : les bases</h1>" +
            "<p>La prise de parole en public est l'une des compétences les plus redoutées, " +
            "mais aussi l'une des plus valorisées en entreprise.</p>" +
            "<h2>Préparer son intervention</h2>" +
            "<ul><li>Définir un <strong>message principal</strong> à retenir</li>" +
            "<li>Structurer : introduction → développement (3 points max) → conclusion avec call to action</li>" +
            "<li>Répéter à voix haute, chronomètre en main</li></ul>" +
            "<h2>Le langage non-verbal</h2>" +
            "<ul><li><strong>Posture</strong> : droite, ouverte, pieds ancrés au sol</li>" +
            "<li><strong>Contact visuel</strong> : balayer l'audience, ne pas fixer ses notes</li>" +
            "<li><strong>Voix</strong> : débit lent, varier l'intonation, faire des pauses</li></ul>"
        );
        saveQuiz(a2, 80, List.of(
            question(1, "Combien de points de développement maximum recommande-t-on pour une prise de parole efficace ?",
                List.of(
                    answer("3 points maximum", true),
                    answer("7 points pour être exhaustif", false),
                    answer("1 seul point suffit toujours", false),
                    answer("Il n'y a pas de limite", false)
                )
            ),
            question(2, "Quel élément du langage non-verbal est essentiel lors d'une prise de parole en public ?",
                List.of(
                    answer("Le contact visuel avec l'audience", true),
                    answer("Lire ses notes sans lever les yeux", false),
                    answer("Croiser les bras pour paraître sérieux", false),
                    answer("Parler le plus vite possible pour garder l'attention", false)
                )
            )
        ));

        saveArticle(cat, "Gérer les conflits en milieu professionnel",
            "<h1>Gérer les conflits en milieu professionnel</h1>" +
            "<p>Les conflits au travail sont inévitables. Savoir les gérer de façon constructive " +
            "est une compétence clé qui distingue les professionnels accomplis.</p>" +
            "<h2>Types de conflits courants</h2>" +
            "<ul><li>Conflits de méthode (comment faire les choses)</li>" +
            "<li>Conflits de ressources (qui fait quoi, qui a quoi)</li>" +
            "<li>Conflits interpersonnels (personnalités incompatibles)</li></ul>" +
            "<h2>Stratégie de résolution</h2>" +
            "<ul><li><strong>Écoute active</strong> : laisser l'autre s'exprimer sans interrompre</li>" +
            "<li><strong>Communication non-violente (CNV)</strong> : exprimer ses besoins sans accuser</li>" +
            "<li><strong>Recherche de solution commune</strong> : se concentrer sur les intérêts, pas les positions</li></ul>"
        );
    }

    // ─── Bien-être & équilibre ────────────────────────────────────────────────

    private void seedBienEtre(SkillCategory cat) {
        Article a1 = saveArticle(cat, "Gérer son stress en période de recherche d'emploi",
            "<h1>Gérer son stress en période de recherche d'emploi</h1>" +
            "<p>La recherche d'emploi est une période stressante. " +
            "Apprendre à gérer ce stress est essentiel pour rester <strong>performant et serein</strong>.</p>" +
            "<h2>Comprendre le stress de la recherche d'emploi</h2>" +
            "<ul><li>Incertitude sur l'avenir</li><li>Sentiment de rejet face aux refus</li>" +
            "<li>Pression financière et sociale</li></ul>" +
            "<h2>Techniques efficaces</h2>" +
            "<ul><li><strong>Routine quotidienne</strong> : traiter la recherche comme un emploi (horaires fixes)</li>" +
            "<li><strong>Objectifs hebdomadaires</strong> : nombre de candidatures, contacts réseau</li>" +
            "<li><strong>Activité physique</strong> : libère des endorphines, améliore la concentration</li>" +
            "<li><strong>Déconnexion</strong> : s'accorder des plages sans recherche d'emploi</li></ul>"
        );
        saveQuiz(a1, 80, List.of(
            question(1, "Quelle approche est recommandée pour traiter la recherche d'emploi au quotidien ?",
                List.of(
                    answer("La traiter comme un emploi avec des horaires fixes", true),
                    answer("Y consacrer uniquement le week-end", false),
                    answer("Envoyer un maximum de candidatures sans organisation", false),
                    answer("Attendre que les opportunités viennent à soi", false)
                )
            ),
            question(2, "Parmi ces techniques, lesquelles aident à gérer le stress de la recherche d'emploi ?",
                List.of(
                    answer("Activité physique régulière", true),
                    answer("Se fixer des objectifs hebdomadaires", true),
                    answer("S'accorder des plages de déconnexion", true),
                    answer("Envoyer 100 candidatures par jour sans relâche", false)
                )
            )
        ));

        Article a2 = saveArticle(cat, "Instaurer un équilibre vie pro / vie perso",
            "<h1>Instaurer un équilibre vie pro / vie perso</h1>" +
            "<p>Le <strong>burn-out</strong> touche de plus en plus de professionnels. " +
            "Apprendre à poser des limites dès le début de sa carrière est fondamental.</p>" +
            "<h2>Signaux d'alarme à reconnaître</h2>" +
            "<ul><li>Fatigue persistante malgré le repos</li>" +
            "<li>Perte de motivation et de plaisir au travail</li>" +
            "<li>Irritabilité ou anxiété croissante</li>" +
            "<li>Difficultés de concentration</li></ul>" +
            "<h2>Bonnes pratiques</h2>" +
            "<ul><li>Définir des <strong>horaires de déconnexion</strong> et les respecter</li>" +
            "<li>Communiquer clairement ses limites à son manager</li>" +
            "<li>Préserver du temps pour ses activités et relations personnelles</li></ul>"
        );
        saveQuiz(a2, 80, List.of(
            question(1, "Parmi ces symptômes, lesquels peuvent signaler un burn-out imminent ?",
                List.of(
                    answer("Fatigue persistante malgré le repos", true),
                    answer("Perte de motivation au travail", true),
                    answer("Irritabilité ou anxiété croissante", true),
                    answer("Envie de prendre de nouvelles responsabilités", false)
                )
            ),
            question(2, "Quelle bonne pratique aide à maintenir l'équilibre vie pro / vie perso ?",
                List.of(
                    answer("Définir des horaires de déconnexion et les respecter", true),
                    answer("Répondre aux emails professionnels à toute heure", false),
                    answer("Ne jamais parler de ses limites à son manager", false),
                    answer("Sacrifier ses loisirs pour prouver son investissement", false)
                )
            )
        ));

        saveArticle(cat, "Techniques de concentration et productivité",
            "<h1>Techniques de concentration et productivité</h1>" +
            "<p>Être productif ne signifie pas travailler plus, mais travailler <strong>mieux</strong>. " +
            "Des techniques éprouvées permettent d'améliorer sa concentration et son efficacité.</p>" +
            "<h2>La technique Pomodoro</h2>" +
            "<p>25 minutes de travail intense + 5 minutes de pause = 1 Pomodoro. " +
            "Après 4 Pomodoros, prendre une pause longue de 15-30 minutes.</p>" +
            "<h2>La matrice d'Eisenhower</h2>" +
            "<p>Classer ses tâches selon deux axes : <strong>urgent / non urgent</strong> et " +
            "<strong>important / non important</strong>. Traiter en priorité ce qui est important mais pas urgent.</p>" +
            "<h2>Éliminer les distracteurs</h2>" +
            "<ul><li>Couper les notifications pendant les plages de travail intense</li>" +
            "<li>Utiliser des écouteurs antibruit si nécessaire</li>" +
            "<li>Regrouper les tâches similaires (mails, appels) par blocs</li></ul>"
        );
    }

    // ─── Culture d'entreprise ─────────────────────────────────────────────────

    private void seedCultureEntreprise(SkillCategory cat) {
        Article a1 = saveArticle(cat, "Comprendre les différents types d'organisations",
            "<h1>Comprendre les différents types d'organisations</h1>" +
            "<p>Le monde professionnel se compose d'une grande variété de structures. " +
            "Connaître leurs différences vous aidera à choisir l'environnement qui vous correspond.</p>" +
            "<h2>Les grandes catégories</h2>" +
            "<ul><li><strong>Grands groupes (ETI/GE)</strong> : processus structurés, mobilité interne, stabilité</li>" +
            "<li><strong>PME/TPE</strong> : polyvalence, responsabilités rapides, impact visible</li>" +
            "<li><strong>Start-ups</strong> : agilité, innovation, risque plus élevé</li>" +
            "<li><strong>Secteur public</strong> : mission de service, concours, stabilité de l'emploi</li>" +
            "<li><strong>Associations / ESS</strong> : sens et impact social au cœur du projet</li></ul>"
        );
        saveQuiz(a1, 80, List.of(
            question(1, "Quel type de structure offre généralement le plus de polyvalence et des responsabilités rapides ?",
                List.of(
                    answer("Les PME/TPE", true),
                    answer("Les grands groupes internationaux", false),
                    answer("Le secteur public", false),
                    answer("Les multinationales cotées en bourse", false)
                )
            ),
            question(2, "Quelles caractéristiques sont associées aux start-ups ?",
                List.of(
                    answer("Agilité et innovation", true),
                    answer("Risque plus élevé", true),
                    answer("Processus très formalisés et hiérarchie stricte", false),
                    answer("Stabilité maximale de l'emploi", false)
                )
            )
        ));

        Article a2 = saveArticle(cat, "Les codes et usages du monde professionnel",
            "<h1>Les codes et usages du monde professionnel</h1>" +
            "<p>Chaque entreprise a sa propre culture, mais il existe des <strong>codes universels</strong> " +
            "que tout professionnel doit maîtriser pour s'intégrer rapidement.</p>" +
            "<h2>Le savoir-être en entreprise</h2>" +
            "<ul><li><strong>Ponctualité</strong> : être à l'heure est un signe de respect</li>" +
            "<li><strong>Discrétion</strong> : respecter la confidentialité des informations internes</li>" +
            "<li><strong>Proactivité</strong> : ne pas attendre qu'on vous dise quoi faire</li>" +
            "<li><strong>Adaptabilité</strong> : ajuster son comportement selon le contexte</li></ul>" +
            "<h2>La période d'intégration (onboarding)</h2>" +
            "<p>Les 3 premiers mois sont cruciaux. Privilégiez l'<strong>observation et l'écoute</strong> " +
            "avant de proposer des changements.</p>"
        );
        saveQuiz(a2, 80, List.of(
            question(1, "Quelle attitude est recommandée pendant les 3 premiers mois dans une nouvelle entreprise ?",
                List.of(
                    answer("Observer et écouter avant de proposer des changements", true),
                    answer("Immédiatement réorganiser les processus pour les améliorer", false),
                    answer("Critiquer ouvertement les pratiques existantes", false),
                    answer("Éviter tout contact avec les collègues pour rester concentré", false)
                )
            ),
            question(2, "Parmi ces comportements, lesquels font partie des codes universels en entreprise ?",
                List.of(
                    answer("Ponctualité", true),
                    answer("Discrétion sur les informations internes", true),
                    answer("Proactivité", true),
                    answer("Partager les secrets de l'entreprise sur les réseaux sociaux", false)
                )
            )
        ));

        saveArticle(cat, "Comprendre et décrypter une culture d'entreprise",
            "<h1>Comprendre et décrypter une culture d'entreprise</h1>" +
            "<p>La culture d'entreprise, c'est l'ensemble des <strong>valeurs, croyances et comportements</strong> " +
            "partagés par les membres d'une organisation. Elle est souvent invisible mais détermine tout.</p>" +
            "<h2>Comment la décrypter avant de rejoindre une entreprise</h2>" +
            "<ul><li>Lire les avis sur <strong>Glassdoor, Indeed</strong></li>" +
            "<li>Observer le <strong>langage et le ton</strong> du site web et des réseaux sociaux</li>" +
            "<li>Poser des questions en entretien : 'Comment se passe une journée type ?', " +
            "'Comment les succès sont-ils célébrés ?'</li>" +
            "<li>Échanger avec des anciens employés via LinkedIn</li></ul>" +
            "<h2>Les indicateurs d'une culture saine</h2>" +
            "<ul><li>Feedback régulier et constructif</li>" +
            "<li>Reconnaissance des contributions individuelles</li>" +
            "<li>Droit à l'erreur et culture d'apprentissage</li></ul>"
        );
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Article saveArticle(SkillCategory cat, String titre, String contenu) {
        Article article = new Article();
        article.setTitre(titre);
        article.setContenu(contenu);
        article.setCategorie(cat);
        article.setActif(true);
        return articleRepository.save(article);
    }

    private void saveQuiz(Article article, int scoreMinimum, List<Question> questions) {
        Quiz quiz = new Quiz();
        quiz.setArticle(article);
        quiz.setScoreMinimum(scoreMinimum);
        quiz.setActif(true);
        questions.forEach(q -> q.setQuiz(quiz));
        quiz.setQuestions(questions);
        quizRepository.save(quiz);
    }

    private Question question(int ordre, String texte, List<Answer> answers) {
        Question q = new Question();
        q.setTexte(texte);
        q.setOrdre(ordre);
        answers.forEach(a -> a.setQuestion(q));
        q.setReponses(answers);
        return q;
    }

    private Answer answer(String texte, boolean correct) {
        Answer a = new Answer();
        a.setTexte(texte);
        a.setEstCorrecte(correct);
        return a;
    }
}
