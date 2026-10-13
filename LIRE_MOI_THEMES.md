# Défi JM — choix des thèmes

L’interface du client propose quatre thèmes et un mélange. La taille du texte reste réglable et mémorisée. 48 nouvelles questions : 8 questions de trajet et 4 de livraison dans chacun des quatre thèmes. Une partie en tire 3 + 2, sans doublon dans la phase. Le mélange garde les 110 questions existantes. Chaque réponse vaut 20 points, une question passée vaut 0. Aucun diagnostic, aucun classement des ressentis ; les points ne dépendent jamais d’un avis positif, du thème ou des autorisations vidéo.

Le thème est choisi avant la première réponse ; il reste attaché à la partie. Le serveur conserve les textes et les trois choix réellement présentés pour que les réponses affichées à JM soient cohérentes. Le résultat conducteur permet d’ouvrir « Voir les 5 réponses du client ». Seules les métadonnées du jeu sont ajoutées au bon, pas les montants de facture.

## Activation sur le serveur existant

Ouvrir installation-themes.html sur GitHub Pages, copier l’ajout des thèmes et le coller sur une nouvelle ligne **à la fin du worker.js actuel de jm-sync**, après le premier ajout du jeu. Ne rien remplacer. Déployer. Aucune migration D1 supplémentaire : la table jm_game_sessions existante est utilisée.

Avant l’activation serveur, l’interface permet toujours le mélange actuel ; les autres boutons restent désactivés avec une explication. Une actualisation après déploiement les active. Les anciennes parties continuent avec leurs questions d’origine.

Pour un déploiement complet depuis les sources, worker.js importe game-themes.js : garder ce fichier avec lui. L’ajout autonome pour le collage se trouve dans publication-mobile/ajout-themes-jm-sync.js.

## Validation

Tests avec SQLite réel : sélection et répétition idempotente, unicité et phase des questions, blocage après la première réponse, expiration, authentification inchangée des opérations conducteur, score serveur, remise et résultats cohérents. Parcours client DOM simulé avec choix de thème et reprise après erreur réseau. Pas de nouveau test visuel sur iPhone dans l’environnement de développement.
