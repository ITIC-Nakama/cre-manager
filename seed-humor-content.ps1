# ============================================================
# Script de seed : 5 categories + articles + quiz humoristiques
# Theme : un etre asocial qui observe les humains et tente
#         (en vain) de comprendre leurs coutumes.
#
# Usage :
#   1. Remplir $AdminPassword ci-dessous.
#   2. Executer depuis une machine qui a acces au reseau de
#      cre.tech.iticparis.com :
#         powershell -ExecutionPolicy Bypass -File .\seed-humor-content.ps1
# ============================================================

$BaseUrl       = "http://cre.tech.iticparis.com/api/v1"   # <-- ajuster si besoin
$AdminEmail    = "test.admin@itic.fr"                       # compte de test (TestAdminSeeder)
$AdminPassword = "Test123!"                                 # compte de test (TestAdminSeeder)

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [hashtable]$Body = $null
    )
    $uri = "$BaseUrl$Path"
    $params = @{
        Uri         = $uri
        Method      = $Method
        WebSession  = $Session
        ContentType = "application/json; charset=utf-8"
    }
    if ($Body) {
        $json = $Body | ConvertTo-Json -Depth 10
        $params["Body"] = [System.Text.Encoding]::UTF8.GetBytes($json)
    }
    return Invoke-RestMethod @params
}

# ----------------------------------------------------------------
# Connexion admin
# ----------------------------------------------------------------
Write-Host "Connexion en tant que $AdminEmail..." -ForegroundColor Yellow
$loginJson  = (@{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json)
$loginBytes = [System.Text.Encoding]::UTF8.GetBytes($loginJson)
try {
    Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBytes `
        -ContentType "application/json; charset=utf-8" -SessionVariable Session | Out-Null
} catch {
    Write-Host "Echec de connexion : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Si le compte admin doit changer son mot de passe (mustChangePassword), connecte-toi d'abord via l'interface web." -ForegroundColor Yellow
    exit 1
}
Write-Host "Connecte avec succes." -ForegroundColor Green

# ----------------------------------------------------------------
# Contenu : 5 categories, chacune avec 1 article + 1 quiz
# ----------------------------------------------------------------
$Categories = @(

    @{
        nom         = "Pourquoi les humains sont stupides (rapport d'observation)"
        description = "Note de terrain, cycle 47 : le sujet humain continue de me surprendre par sa capacite a se nuire a lui-meme tout en s'en emerveillant ensuite sur les reseaux sociaux."
        ordre       = 1
        icone       = "🧠"
        article     = @{
            titre   = "Le grand mystere des decisions humaines"
            contenu = @'
<h2>Journal de bord d'un observateur non-humain</h2>
<p>Cycle 47, jour 12. J'observe le sujet depuis plusieurs rotations planetaires et je dois consigner ce qui suit : l'humain <strong>sait</strong> ce qui est mauvais pour lui, et le fait quand meme. Avec enthousiasme.</p>
<p>Exemple typique : le rituel du « bouton snooze ». Le sujet programme une alarme a une heure precise, calculee avec soin. L'alarme sonne. Le sujet, dans un geste d'une confiance absolue en lui-meme, decide qu'il connait mieux la situation que son moi du soir precedent, et reporte l'alarme de neuf minutes exactement. Il repete cette operation entre trois et sept fois.</p>
<p>Il sera en retard. Il le sait. Il le fait quand meme.</p>
<h2>Le paradoxe des conditions d'utilisation</h2>
<p>Autre comportement fascinant : avant d'utiliser un service numerique, l'humain doit theoriquement lire et accepter un contrat de plusieurs milliers de mots. Mon enquete a etabli que 99,7% des sujets cliquent sur « J'accepte » apres un temps de lecture moyen de 0,4 seconde — un temps insuffisant pour lire meme le titre du document.</p>
<blockquote>Hypothese de travail : l'humain n'a pas peur de l'inconnu. Il a peur de devoir lire.</blockquote>
<p>Conclusion provisoire : la betise humaine n'est pas un manque d'intelligence. C'est un choix actif, renouvele quotidiennement, et celebre comme une vertu sous le nom de « vivre sa vie ».</p>
'@
        }
        quiz        = @{
            scoreMinimum = 80
            questions    = @(
                @{
                    texte   = "Pourquoi l'humain appuie-t-il sur « snooze » alors qu'il sait qu'il sera en retard ?"
                    ordre   = 1
                    answers = @(
                        @{ texte = "Parce qu'il optimise scientifiquement son sommeil"; estCorrecte = $false }
                        @{ texte = "Parce qu'il vit dans le deni le plus total"; estCorrecte = $true }
                        @{ texte = "Parce que son alarme est defectueuse"; estCorrecte = $false }
                        @{ texte = "Parce qu'il n'a pas d'alarme"; estCorrecte = $false }
                    )
                }
                @{
                    texte   = "Quel pourcentage d'humains lisent reellement les conditions d'utilisation avant de cliquer sur « J'accepte » ?"
                    ordre   = 2
                    answers = @(
                        @{ texte = "Environ 0,3%"; estCorrecte = $true }
                        @{ texte = "Environ 50%"; estCorrecte = $false }
                        @{ texte = "100%, ils sont tres rigoureux"; estCorrecte = $false }
                        @{ texte = "Cela depend du jour de la semaine"; estCorrecte = $false }
                    )
                }
            )
        }
    }

    @{
        nom         = "Les humains : ces etranges animaux sociaux"
        description = "Pourquoi se regroupent-ils ? Pourquoi se touchent-ils la main en se rencontrant ? Mon enquete continue, non sans un certain malaise."
        ordre       = 2
        icone       = "👥"
        article     = @{
            titre   = "Rituels de salutation : une etude de cas"
            contenu = @'
<h2>Premier contact</h2>
<p>Lorsque deux humains se rencontrent, ils executent une choregraphie complexe que j'ai mis plusieurs cycles a comprendre. L'un d'eux tend une main. L'autre doit, dans un delai socialement acceptable d'environ 0,8 seconde, tendre la sienne en retour, sous peine de creer un « moment genant » dont la gravite semble equivalente a un incident diplomatique.</p>
<p>Ils secouent ensuite ces mains jointes, verticalement, entre une et trois fois, avant de les relacher. Aucun humain n'a su m'expliquer l'origine ni l'utilite de ce geste. Plusieurs m'ont simplement repondu : « ca se fait, c'est tout ».</p>
<h2>La question piege : « Comment ca va ? »</h2>
<p>Ceci est, a ce jour, le comportement humain le plus deroutant que j'aie observe. Le sujet A demande au sujet B comment il va. Le sujet B repond systematiquement « ca va, et toi ? » — quel que soit son etat reel, y compris s'il est en train de pleurer.</p>
<ul>
<li>Si le sujet B repond honnetement a cette question, il est percu comme « bizarre ».</li>
<li>Si le sujet B ne pose pas la question en retour, il est percu comme « impoli ».</li>
<li>La question n'attend donc, structurellement, aucune reponse sincere.</li>
</ul>
<blockquote>Hypothese : ce rituel ne sert pas a echanger de l'information, mais a confirmer que les deux sujets sont toujours d'accord pour coexister pacifiquement. Une sorte de ping reseau social.</blockquote>
'@
        }
        quiz        = @{
            scoreMinimum = 80
            questions    = @(
                @{
                    texte   = "Que doit repondre un humain a qui l'on demande « Comment ca va ? », quel que soit son etat reel ?"
                    ordre   = 1
                    answers = @(
                        @{ texte = "« Ca va, et toi ? »"; estCorrecte = $true }
                        @{ texte = "Une description detaillee et honnete de son etat emotionnel"; estCorrecte = $false }
                        @{ texte = "Rien, il ignore la question"; estCorrecte = $false }
                        @{ texte = "« Pourquoi tu me demandes ca ? »"; estCorrecte = $false }
                    )
                }
                @{
                    texte   = "Que se passe-t-il si un humain ne tend pas la main en retour lors d'une poignee de main ?"
                    ordre   = 2
                    answers = @(
                        @{ texte = "Un grave malaise social s'installe"; estCorrecte = $true }
                        @{ texte = "Rien du tout, personne ne le remarque"; estCorrecte = $false }
                        @{ texte = "L'autre humain part immediatement"; estCorrecte = $false }
                        @{ texte = "C'est en fait la norme dans toutes les cultures"; estCorrecte = $false }
                    )
                }
            )
        }
    }

    @{
        nom         = "Le rituel sacre de la reunion d'entreprise"
        description = "Un rassemblement periodique ou les humains se reunissent pour parler de travailler, plutot que de travailler."
        ordre       = 3
        icone       = "📅"
        article     = @{
            titre   = "Anatomie d'une reunion qui aurait pu etre un e-mail"
            contenu = @'
<h2>Convocation</h2>
<p>Le rituel commence par l'envoi d'une invitation a un nombre de sujets largement superieur a celui qui sera reellement necessaire. J'ai recense des reunions convoquant jusqu'a quatorze humains pour une decision qui, in fine, sera prise par deux d'entre eux dans le couloir, juste apres.</p>
<h2>Phase d'ouverture : le small talk obligatoire</h2>
<p>Aucune reunion humaine ne peut commencer directement par son objet. Une phase preliminaire de cinq a dix minutes est consacree a des sujets non lies : la meteo, le week-end de chacun, ou la qualite du cafe fourni par l'etablissement. Interrompre cette phase pour « entrer dans le vif du sujet » est considere comme un manquement grave a l'etiquette.</p>
<h2>Le point culminant : « On se cale un point »</h2>
<p>Lorsqu'un sujet est trop complexe pour etre resolu en reunion, les humains ne le resolvent pas. Ils programment une seconde reunion pour en reparler. J'ai observe des chaines de sept reunions successives sur le meme sujet, sans qu'aucune decision ne soit jamais actee.</p>
<blockquote>Conclusion de terrain : la reunion d'entreprise humaine n'est pas un outil de decision. C'est un rituel social rassurant qui donne l'illusion du travail collectif.</blockquote>
'@
        }
        quiz        = @{
            scoreMinimum = 80
            questions    = @(
                @{
                    texte   = "Que se passe-t-il generalement lorsqu'un sujet est trop complexe pour etre regle en reunion ?"
                    ordre   = 1
                    answers = @(
                        @{ texte = "On programme une nouvelle reunion pour en reparler"; estCorrecte = $true }
                        @{ texte = "On le resout immediatement par e-mail"; estCorrecte = $false }
                        @{ texte = "On annule definitivement le projet"; estCorrecte = $false }
                        @{ texte = "On delegue la decision a une intelligence artificielle"; estCorrecte = $false }
                    )
                }
                @{
                    texte   = "Combien de temps dure en moyenne la phase de small talk avant le debut reel d'une reunion ?"
                    ordre   = 2
                    answers = @(
                        @{ texte = "Cinq a dix minutes"; estCorrecte = $true }
                        @{ texte = "Zero seconde, les humains sont tres efficaces"; estCorrecte = $false }
                        @{ texte = "Une heure complete"; estCorrecte = $false }
                        @{ texte = "Cela n'arrive jamais"; estCorrecte = $false }
                    )
                }
            )
        }
    }

    @{
        nom         = "Pourquoi sourient-ils autant ?"
        description = "Le sourire humain : arme sociale, masque poli ou reflexe incontrolable ? Mes capteurs n'arrivent toujours pas a trancher."
        ordre       = 4
        icone       = "😊"
        article     = @{
            titre   = "Le sourire : une arme de diplomatie massive"
            contenu = @'
<h2>Observation initiale</h2>
<p>L'humain sourit dans des circonstances qui, d'un point de vue purement logique, ne justifient aucune reaction faciale positive. Il sourit lorsqu'il croise un inconnu dans un couloir. Il sourit lorsqu'on lui marche sur le pied et qu'il s'excuse, lui, a la place de l'agresseur. Il sourit meme lorsqu'on lui annonce une mauvaise nouvelle, par pure politesse envers celui qui l'annonce.</p>
<h2>Deux especes de sourire</h2>
<p>Apres analyse approfondie, j'ai identifie deux variantes distinctes du sourire humain :</p>
<ul>
<li>Le <strong>sourire social</strong>, bref, symetrique, qui sert uniquement a signaler « je ne suis pas une menace ».</li>
<li>Le <strong>sourire authentique</strong>, plus rare, qui mobilise les muscles autour des yeux et que les humains eux-memes ont du mal a differencier du premier sans entrainement.</li>
</ul>
<p>Un humain entraine en ressources humaines m'a confie pouvoir reperer un faux sourire « instantanement ». Il s'est ensuite trompe sept fois sur dix lors d'un test que j'ai organise.</p>
<blockquote>Hypothese finale : le sourire n'est pas une expression de joie. C'est un protocole de securite sociale, active par defaut, dont la fonction premiere est d'eviter les conflits inutiles.</blockquote>
'@
        }
        quiz        = @{
            scoreMinimum = 80
            questions    = @(
                @{
                    texte   = "Quelle est la fonction principale du sourire social selon le rapport ?"
                    ordre   = 1
                    answers = @(
                        @{ texte = "Signaler qu'on n'est pas une menace"; estCorrecte = $true }
                        @{ texte = "Montrer qu'on est extremement heureux"; estCorrecte = $false }
                        @{ texte = "Faire fuir les autres humains"; estCorrecte = $false }
                        @{ texte = "Aucune, c'est un reflexe purement aleatoire"; estCorrecte = $false }
                    )
                }
                @{
                    texte   = "Quel element du visage permet, en theorie, de distinguer un vrai sourire d'un faux ?"
                    ordre   = 2
                    answers = @(
                        @{ texte = "Les muscles autour des yeux"; estCorrecte = $true }
                        @{ texte = "La couleur des dents"; estCorrecte = $false }
                        @{ texte = "La vitesse a laquelle on cligne des yeux"; estCorrecte = $false }
                        @{ texte = "Le volume de la voix"; estCorrecte = $false }
                    )
                }
            )
        }
    }

    @{
        nom         = "L'art ancestral de faire la queue"
        description = "Une file. Immobile. Silencieuse. Et pourtant, une tension sourde y regne en permanence. Bienvenue dans l'univers de la queue humaine."
        ordre       = 5
        icone       = "🚶"
        article     = @{
            titre   = "La file d'attente : code social non ecrit, respecte a 100%"
            contenu = @'
<h2>Une institution invisible</h2>
<p>Aucune loi n'impose a l'humain de respecter l'ordre d'arrivee dans une file d'attente. Aucun panneau ne le precise. Et pourtant, ce principe est respecte avec une rigueur que je n'ai observee nulle part ailleurs dans le comportement de cette espece.</p>
<h2>Le crime ultime : la resquille</h2>
<p>Lorsqu'un humain tente de s'inserer dans une file sans respecter son tour, l'effet est immediat et disproportionne. Des sujets qui, trente secondes plus tot, echangeaient poliment sur la meteo, se transforment en un front uni de reprobation silencieuse — compose presque exclusivement de regards appuyes, jamais de mots.</p>
<p>Personne n'intervient verbalement. Tout le monde a vu. Le malaise est collectif et durera plusieurs minutes.</p>
<h2>La distance de securite</h2>
<p>Une distance minimale d'environ 70 centimetres est maintenue entre chaque sujet dans la file, ajustee a la baisse uniquement en cas de forte densite de population locale. Reduire cette distance sans raison est interprete comme une agression.</p>
<blockquote>Conclusion : la file d'attente est peut-etre la seule structure sociale humaine totalement auto-regulee, sans autorite, sans regle ecrite, et pourtant absolument incontestee. Les humains devraient s'en inspirer pour le reste de leur civilisation.</blockquote>
'@
        }
        quiz        = @{
            scoreMinimum = 80
            questions    = @(
                @{
                    texte   = "Que se passe-t-il quand un humain resquille dans une file d'attente ?"
                    ordre   = 1
                    answers = @(
                        @{ texte = "Un malaise collectif silencieux s'installe"; estCorrecte = $true }
                        @{ texte = "Tout le monde applaudit"; estCorrecte = $false }
                        @{ texte = "La file entiere l'exclut physiquement"; estCorrecte = $false }
                        @{ texte = "Rien, c'est totalement tolere"; estCorrecte = $false }
                    )
                }
                @{
                    texte   = "Quelle distance moyenne les humains maintiennent-ils entre eux dans une file ?"
                    ordre   = 2
                    answers = @(
                        @{ texte = "Environ 70 centimetres"; estCorrecte = $true }
                        @{ texte = "Environ 10 metres"; estCorrecte = $false }
                        @{ texte = "Aucune distance, ils se collent"; estCorrecte = $false }
                        @{ texte = "Cela varie selon la couleur des vetements"; estCorrecte = $false }
                    )
                }
            )
        }
    }
)

# ----------------------------------------------------------------
# Creation sequentielle
# ----------------------------------------------------------------
$created = 0
foreach ($cat in $Categories) {
    Write-Host "`n=== Categorie : $($cat.nom) ===" -ForegroundColor Cyan
    try {
        $catResult = Invoke-Api -Method Post -Path "/api/admin/skill-tree/categories" -Body @{
            nom         = $cat.nom
            description = $cat.description
            ordre       = $cat.ordre
            icone       = $cat.icone
        }
        $catId = $catResult.data.id
        Write-Host "  Categorie creee ($catId)" -ForegroundColor Green

        $artResult = Invoke-Api -Method Post -Path "/api/admin/skill-tree/articles" -Body @{
            titre       = $cat.article.titre
            contenu     = $cat.article.contenu
            categorieId = $catId
            actif       = $true
        }
        $artId = $artResult.data.id
        Write-Host "  Article cree ($artId)" -ForegroundColor Green

        Invoke-Api -Method Post -Path "/api/admin/skill-tree/articles/$artId/quiz" -Body $cat.quiz | Out-Null
        Write-Host "  Quiz cree." -ForegroundColor Green

        $created++
    } catch {
        Write-Host "  ECHEC sur cette categorie : $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nTermine : $created / $($Categories.Count) categories creees avec succes." -ForegroundColor Yellow
