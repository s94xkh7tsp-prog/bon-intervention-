
// DEFI JM — ajout isolé, conserver le code existant au-dessus.
(function(){
"use strict";
const original=worker_default;
if(original.__jmDefiInstalled)return;
const GAME_QUESTIONS = [
  {
    "id": 1,
    "phase": "route",
    "category": "plateau",
    "text": "Si ta voiture pouvait parler sur le plateau, elle dirait… (la citadine)",
    "answers": [
      "Enfin un taxi à ma taille !",
      "Je voyage en première classe.",
      "Je réclame la place fenêtre."
    ]
  },
  {
    "id": 2,
    "phase": "route",
    "category": "plateau",
    "text": "Si ta voiture pouvait parler sur le plateau, elle dirait… (le SUV)",
    "answers": [
      "Enfin un taxi à ma taille !",
      "Je voyage en première classe.",
      "Je réclame la place fenêtre."
    ]
  },
  {
    "id": 3,
    "phase": "route",
    "category": "plateau",
    "text": "Si ta voiture pouvait parler sur le plateau, elle dirait… (le cabriolet)",
    "answers": [
      "Enfin un taxi à ma taille !",
      "Je voyage en première classe.",
      "Je réclame la place fenêtre."
    ]
  },
  {
    "id": 4,
    "phase": "route",
    "category": "plateau",
    "text": "Si ta voiture pouvait parler sur le plateau, elle dirait… (la voiture familiale)",
    "answers": [
      "Enfin un taxi à ma taille !",
      "Je voyage en première classe.",
      "Je réclame la place fenêtre."
    ]
  },
  {
    "id": 5,
    "phase": "route",
    "category": "plateau",
    "text": "Si ta voiture pouvait parler sur le plateau, elle dirait… (la petite sportive)",
    "answers": [
      "Enfin un taxi à ma taille !",
      "Je voyage en première classe.",
      "Je réclame la place fenêtre."
    ]
  },
  {
    "id": 6,
    "phase": "route",
    "category": "plateau",
    "text": "Si ta voiture pouvait parler sur le plateau, elle dirait… (le break)",
    "answers": [
      "Enfin un taxi à ma taille !",
      "Je voyage en première classe.",
      "Je réclame la place fenêtre."
    ]
  },
  {
    "id": 7,
    "phase": "route",
    "category": "plateau",
    "text": "Si ta voiture pouvait parler sur le plateau, elle dirait… (la voiture de collection)",
    "answers": [
      "Enfin un taxi à ma taille !",
      "Je voyage en première classe.",
      "Je réclame la place fenêtre."
    ]
  },
  {
    "id": 8,
    "phase": "route",
    "category": "plateau",
    "text": "Si ta voiture pouvait parler sur le plateau, elle dirait… (la berline)",
    "answers": [
      "Enfin un taxi à ma taille !",
      "Je voyage en première classe.",
      "Je réclame la place fenêtre."
    ]
  },
  {
    "id": 9,
    "phase": "route",
    "category": "plateau",
    "text": "Si ta voiture pouvait parler sur le plateau, elle dirait… (la voiture électrique)",
    "answers": [
      "Enfin un taxi à ma taille !",
      "Je voyage en première classe.",
      "Je réclame la place fenêtre."
    ]
  },
  {
    "id": 10,
    "phase": "route",
    "category": "plateau",
    "text": "Si ta voiture pouvait parler sur le plateau, elle dirait… (la voiture du lundi)",
    "answers": [
      "Enfin un taxi à ma taille !",
      "Je voyage en première classe.",
      "Je réclame la place fenêtre."
    ]
  },
  {
    "id": 11,
    "phase": "route",
    "category": "panne",
    "text": "Ton véhicule fait une pause surprise. Son excuse du jour ? (au parking)",
    "answers": [
      "Je prends un jour de congé.",
      "Mon moteur fait grève.",
      "J’attendais juste JM."
    ]
  },
  {
    "id": 12,
    "phase": "route",
    "category": "panne",
    "text": "Ton véhicule fait une pause surprise. Son excuse du jour ? (devant le garage)",
    "answers": [
      "Je prends un jour de congé.",
      "Mon moteur fait grève.",
      "J’attendais juste JM."
    ]
  },
  {
    "id": 13,
    "phase": "route",
    "category": "panne",
    "text": "Ton véhicule fait une pause surprise. Son excuse du jour ? (sur le trajet du travail)",
    "answers": [
      "Je prends un jour de congé.",
      "Mon moteur fait grève.",
      "J’attendais juste JM."
    ]
  },
  {
    "id": 14,
    "phase": "route",
    "category": "panne",
    "text": "Ton véhicule fait une pause surprise. Son excuse du jour ? (à la station-service)",
    "answers": [
      "Je prends un jour de congé.",
      "Mon moteur fait grève.",
      "J’attendais juste JM."
    ]
  },
  {
    "id": 15,
    "phase": "route",
    "category": "panne",
    "text": "Ton véhicule fait une pause surprise. Son excuse du jour ? (près de chez toi)",
    "answers": [
      "Je prends un jour de congé.",
      "Mon moteur fait grève.",
      "J’attendais juste JM."
    ]
  },
  {
    "id": 16,
    "phase": "route",
    "category": "panne",
    "text": "Ton véhicule fait une pause surprise. Son excuse du jour ? (au retour des courses)",
    "answers": [
      "Je prends un jour de congé.",
      "Mon moteur fait grève.",
      "J’attendais juste JM."
    ]
  },
  {
    "id": 17,
    "phase": "route",
    "category": "panne",
    "text": "Ton véhicule fait une pause surprise. Son excuse du jour ? (avant les vacances)",
    "answers": [
      "Je prends un jour de congé.",
      "Mon moteur fait grève.",
      "J’attendais juste JM."
    ]
  },
  {
    "id": 18,
    "phase": "route",
    "category": "panne",
    "text": "Ton véhicule fait une pause surprise. Son excuse du jour ? (un lundi matin)",
    "answers": [
      "Je prends un jour de congé.",
      "Mon moteur fait grève.",
      "J’attendais juste JM."
    ]
  },
  {
    "id": 19,
    "phase": "route",
    "category": "panne",
    "text": "Ton véhicule fait une pause surprise. Son excuse du jour ? (sous la pluie)",
    "answers": [
      "Je prends un jour de congé.",
      "Mon moteur fait grève.",
      "J’attendais juste JM."
    ]
  },
  {
    "id": 20,
    "phase": "route",
    "category": "panne",
    "text": "Ton véhicule fait une pause surprise. Son excuse du jour ? (en fin de journée)",
    "answers": [
      "Je prends un jour de congé.",
      "Mon moteur fait grève.",
      "J’attendais juste JM."
    ]
  },
  {
    "id": 21,
    "phase": "route",
    "category": "arrimage",
    "text": "Les sangles du plateau : quel surnom leur donnerais-tu ? (orange)",
    "answers": [
      "Les ceintures de la voiture.",
      "Les gardes du corps du trajet.",
      "Le comité anti-balade."
    ]
  },
  {
    "id": 22,
    "phase": "route",
    "category": "arrimage",
    "text": "Les sangles du plateau : quel surnom leur donnerais-tu ? (bleues)",
    "answers": [
      "Les ceintures de la voiture.",
      "Les gardes du corps du trajet.",
      "Le comité anti-balade."
    ]
  },
  {
    "id": 23,
    "phase": "route",
    "category": "arrimage",
    "text": "Les sangles du plateau : quel surnom leur donnerais-tu ? (discrètes)",
    "answers": [
      "Les ceintures de la voiture.",
      "Les gardes du corps du trajet.",
      "Le comité anti-balade."
    ]
  },
  {
    "id": 24,
    "phase": "route",
    "category": "arrimage",
    "text": "Les sangles du plateau : quel surnom leur donnerais-tu ? (bien rangées)",
    "answers": [
      "Les ceintures de la voiture.",
      "Les gardes du corps du trajet.",
      "Le comité anti-balade."
    ]
  },
  {
    "id": 25,
    "phase": "route",
    "category": "arrimage",
    "text": "Les sangles du plateau : quel surnom leur donnerais-tu ? (prêtes au départ)",
    "answers": [
      "Les ceintures de la voiture.",
      "Les gardes du corps du trajet.",
      "Le comité anti-balade."
    ]
  },
  {
    "id": 26,
    "phase": "route",
    "category": "arrimage",
    "text": "Les sangles du plateau : quel surnom leur donnerais-tu ? (après le chargement)",
    "answers": [
      "Les ceintures de la voiture.",
      "Les gardes du corps du trajet.",
      "Le comité anti-balade."
    ]
  },
  {
    "id": 27,
    "phase": "route",
    "category": "arrimage",
    "text": "Les sangles du plateau : quel surnom leur donnerais-tu ? (avant le trajet)",
    "answers": [
      "Les ceintures de la voiture.",
      "Les gardes du corps du trajet.",
      "Le comité anti-balade."
    ]
  },
  {
    "id": 28,
    "phase": "route",
    "category": "arrimage",
    "text": "Les sangles du plateau : quel surnom leur donnerais-tu ? (à la pause)",
    "answers": [
      "Les ceintures de la voiture.",
      "Les gardes du corps du trajet.",
      "Le comité anti-balade."
    ]
  },
  {
    "id": 29,
    "phase": "route",
    "category": "arrimage",
    "text": "Les sangles du plateau : quel surnom leur donnerais-tu ? (à l’arrivée)",
    "answers": [
      "Les ceintures de la voiture.",
      "Les gardes du corps du trajet.",
      "Le comité anti-balade."
    ]
  },
  {
    "id": 30,
    "phase": "route",
    "category": "arrimage",
    "text": "Les sangles du plateau : quel surnom leur donnerais-tu ? (pendant la vérification)",
    "answers": [
      "Les ceintures de la voiture.",
      "Les gardes du corps du trajet.",
      "Le comité anti-balade."
    ]
  },
  {
    "id": 31,
    "phase": "route",
    "category": "accueil",
    "text": "Pour raconter cette aventure, tu choisirais quel titre ? (à tes collègues)",
    "answers": [
      "Ma voiture a appelé son chauffeur.",
      "Une panne, deux sourires.",
      "Le plateau des imprévus."
    ]
  },
  {
    "id": 32,
    "phase": "route",
    "category": "accueil",
    "text": "Pour raconter cette aventure, tu choisirais quel titre ? (à tes voisins)",
    "answers": [
      "Ma voiture a appelé son chauffeur.",
      "Une panne, deux sourires.",
      "Le plateau des imprévus."
    ]
  },
  {
    "id": 33,
    "phase": "route",
    "category": "accueil",
    "text": "Pour raconter cette aventure, tu choisirais quel titre ? (à tes amis)",
    "answers": [
      "Ma voiture a appelé son chauffeur.",
      "Une panne, deux sourires.",
      "Le plateau des imprévus."
    ]
  },
  {
    "id": 34,
    "phase": "route",
    "category": "accueil",
    "text": "Pour raconter cette aventure, tu choisirais quel titre ? (à ta famille)",
    "answers": [
      "Ma voiture a appelé son chauffeur.",
      "Une panne, deux sourires.",
      "Le plateau des imprévus."
    ]
  },
  {
    "id": 35,
    "phase": "route",
    "category": "accueil",
    "text": "Pour raconter cette aventure, tu choisirais quel titre ? (dans ton journal)",
    "answers": [
      "Ma voiture a appelé son chauffeur.",
      "Une panne, deux sourires.",
      "Le plateau des imprévus."
    ]
  },
  {
    "id": 36,
    "phase": "route",
    "category": "accueil",
    "text": "Pour raconter cette aventure, tu choisirais quel titre ? (dans un film)",
    "answers": [
      "Ma voiture a appelé son chauffeur.",
      "Une panne, deux sourires.",
      "Le plateau des imprévus."
    ]
  },
  {
    "id": 37,
    "phase": "route",
    "category": "accueil",
    "text": "Pour raconter cette aventure, tu choisirais quel titre ? (sur une carte postale)",
    "answers": [
      "Ma voiture a appelé son chauffeur.",
      "Une panne, deux sourires.",
      "Le plateau des imprévus."
    ]
  },
  {
    "id": 38,
    "phase": "route",
    "category": "accueil",
    "text": "Pour raconter cette aventure, tu choisirais quel titre ? (dans un message vocal)",
    "answers": [
      "Ma voiture a appelé son chauffeur.",
      "Une panne, deux sourires.",
      "Le plateau des imprévus."
    ]
  },
  {
    "id": 39,
    "phase": "route",
    "category": "accueil",
    "text": "Pour raconter cette aventure, tu choisirais quel titre ? (dans une BD)",
    "answers": [
      "Ma voiture a appelé son chauffeur.",
      "Une panne, deux sourires.",
      "Le plateau des imprévus."
    ]
  },
  {
    "id": 40,
    "phase": "route",
    "category": "accueil",
    "text": "Pour raconter cette aventure, tu choisirais quel titre ? (dans une chanson)",
    "answers": [
      "Ma voiture a appelé son chauffeur.",
      "Une panne, deux sourires.",
      "Le plateau des imprévus."
    ]
  },
  {
    "id": 41,
    "phase": "route",
    "category": "trajet",
    "text": "Quel serait le meilleur nom pour notre trajet ? (version cinéma)",
    "answers": [
      "Opération garage sans stress.",
      "Mission voiture au repos.",
      "L’escapade du moteur fatigué."
    ]
  },
  {
    "id": 42,
    "phase": "route",
    "category": "trajet",
    "text": "Quel serait le meilleur nom pour notre trajet ? (version bande dessinée)",
    "answers": [
      "Opération garage sans stress.",
      "Mission voiture au repos.",
      "L’escapade du moteur fatigué."
    ]
  },
  {
    "id": 43,
    "phase": "route",
    "category": "trajet",
    "text": "Quel serait le meilleur nom pour notre trajet ? (version vacances)",
    "answers": [
      "Opération garage sans stress.",
      "Mission voiture au repos.",
      "L’escapade du moteur fatigué."
    ]
  },
  {
    "id": 44,
    "phase": "route",
    "category": "trajet",
    "text": "Quel serait le meilleur nom pour notre trajet ? (version lundi)",
    "answers": [
      "Opération garage sans stress.",
      "Mission voiture au repos.",
      "L’escapade du moteur fatigué."
    ]
  },
  {
    "id": 45,
    "phase": "route",
    "category": "trajet",
    "text": "Quel serait le meilleur nom pour notre trajet ? (version soirée)",
    "answers": [
      "Opération garage sans stress.",
      "Mission voiture au repos.",
      "L’escapade du moteur fatigué."
    ]
  },
  {
    "id": 46,
    "phase": "route",
    "category": "trajet",
    "text": "Quel serait le meilleur nom pour notre trajet ? (version pluie)",
    "answers": [
      "Opération garage sans stress.",
      "Mission voiture au repos.",
      "L’escapade du moteur fatigué."
    ]
  },
  {
    "id": 47,
    "phase": "route",
    "category": "trajet",
    "text": "Quel serait le meilleur nom pour notre trajet ? (version soleil)",
    "answers": [
      "Opération garage sans stress.",
      "Mission voiture au repos.",
      "L’escapade du moteur fatigué."
    ]
  },
  {
    "id": 48,
    "phase": "route",
    "category": "trajet",
    "text": "Quel serait le meilleur nom pour notre trajet ? (version express)",
    "answers": [
      "Opération garage sans stress.",
      "Mission voiture au repos.",
      "L’escapade du moteur fatigué."
    ]
  },
  {
    "id": 49,
    "phase": "route",
    "category": "trajet",
    "text": "Quel serait le meilleur nom pour notre trajet ? (version grand sourire)",
    "answers": [
      "Opération garage sans stress.",
      "Mission voiture au repos.",
      "L’escapade du moteur fatigué."
    ]
  },
  {
    "id": 50,
    "phase": "route",
    "category": "trajet",
    "text": "Quel serait le meilleur nom pour notre trajet ? (version aventure)",
    "answers": [
      "Opération garage sans stress.",
      "Mission voiture au repos.",
      "L’escapade du moteur fatigué."
    ]
  },
  {
    "id": 51,
    "phase": "route",
    "category": "metier",
    "text": "Quelle partie du métier te paraît la plus surprenante ? (pour une roue bloquée)",
    "answers": [
      "Préparer le chargement.",
      "Organiser le trajet.",
      "Trouver une solution aux imprévus."
    ]
  },
  {
    "id": 52,
    "phase": "route",
    "category": "metier",
    "text": "Quelle partie du métier te paraît la plus surprenante ? (pour une voiture basse)",
    "answers": [
      "Préparer le chargement.",
      "Organiser le trajet.",
      "Trouver une solution aux imprévus."
    ]
  },
  {
    "id": 53,
    "phase": "route",
    "category": "metier",
    "text": "Quelle partie du métier te paraît la plus surprenante ? (pour un véhicule sans clé)",
    "answers": [
      "Préparer le chargement.",
      "Organiser le trajet.",
      "Trouver une solution aux imprévus."
    ]
  },
  {
    "id": 54,
    "phase": "route",
    "category": "metier",
    "text": "Quelle partie du métier te paraît la plus surprenante ? (pour un accès étroit)",
    "answers": [
      "Préparer le chargement.",
      "Organiser le trajet.",
      "Trouver une solution aux imprévus."
    ]
  },
  {
    "id": 55,
    "phase": "route",
    "category": "metier",
    "text": "Quelle partie du métier te paraît la plus surprenante ? (pour une batterie à plat)",
    "answers": [
      "Préparer le chargement.",
      "Organiser le trajet.",
      "Trouver une solution aux imprévus."
    ]
  },
  {
    "id": 56,
    "phase": "route",
    "category": "metier",
    "text": "Quelle partie du métier te paraît la plus surprenante ? (pour un parking compliqué)",
    "answers": [
      "Préparer le chargement.",
      "Organiser le trajet.",
      "Trouver une solution aux imprévus."
    ]
  },
  {
    "id": 57,
    "phase": "route",
    "category": "metier",
    "text": "Quelle partie du métier te paraît la plus surprenante ? (pour une voiture accidentée)",
    "answers": [
      "Préparer le chargement.",
      "Organiser le trajet.",
      "Trouver une solution aux imprévus."
    ]
  },
  {
    "id": 58,
    "phase": "route",
    "category": "metier",
    "text": "Quelle partie du métier te paraît la plus surprenante ? (pour une boîte bloquée)",
    "answers": [
      "Préparer le chargement.",
      "Organiser le trajet.",
      "Trouver une solution aux imprévus."
    ]
  },
  {
    "id": 59,
    "phase": "route",
    "category": "metier",
    "text": "Quelle partie du métier te paraît la plus surprenante ? (pour un moteur arrêté)",
    "answers": [
      "Préparer le chargement.",
      "Organiser le trajet.",
      "Trouver une solution aux imprévus."
    ]
  },
  {
    "id": 60,
    "phase": "route",
    "category": "metier",
    "text": "Quelle partie du métier te paraît la plus surprenante ? (pour une dépose au garage)",
    "answers": [
      "Préparer le chargement.",
      "Organiser le trajet.",
      "Trouver une solution aux imprévus."
    ]
  },
  {
    "id": 61,
    "phase": "route",
    "category": "souvenir",
    "text": "Pour garder un souvenir de ce dépannage, tu choisirais… (avec un titre de film)",
    "answers": [
      "Une photo du véhicule livré.",
      "Une anecdote à raconter.",
      "Le souvenir d’un souci réglé."
    ]
  },
  {
    "id": 62,
    "phase": "route",
    "category": "souvenir",
    "text": "Pour garder un souvenir de ce dépannage, tu choisirais… (avec une bulle de BD)",
    "answers": [
      "Une photo du véhicule livré.",
      "Une anecdote à raconter.",
      "Le souvenir d’un souci réglé."
    ]
  },
  {
    "id": 63,
    "phase": "route",
    "category": "souvenir",
    "text": "Pour garder un souvenir de ce dépannage, tu choisirais… (avec un emoji)",
    "answers": [
      "Une photo du véhicule livré.",
      "Une anecdote à raconter.",
      "Le souvenir d’un souci réglé."
    ]
  },
  {
    "id": 64,
    "phase": "route",
    "category": "souvenir",
    "text": "Pour garder un souvenir de ce dépannage, tu choisirais… (avec une légende drôle)",
    "answers": [
      "Une photo du véhicule livré.",
      "Une anecdote à raconter.",
      "Le souvenir d’un souci réglé."
    ]
  },
  {
    "id": 65,
    "phase": "route",
    "category": "souvenir",
    "text": "Pour garder un souvenir de ce dépannage, tu choisirais… (avec un grand sourire)",
    "answers": [
      "Une photo du véhicule livré.",
      "Une anecdote à raconter.",
      "Le souvenir d’un souci réglé."
    ]
  },
  {
    "id": 66,
    "phase": "route",
    "category": "souvenir",
    "text": "Pour garder un souvenir de ce dépannage, tu choisirais… (avec un clin d’œil)",
    "answers": [
      "Une photo du véhicule livré.",
      "Une anecdote à raconter.",
      "Le souvenir d’un souci réglé."
    ]
  },
  {
    "id": 67,
    "phase": "route",
    "category": "souvenir",
    "text": "Pour garder un souvenir de ce dépannage, tu choisirais… (avec un petit mot)",
    "answers": [
      "Une photo du véhicule livré.",
      "Une anecdote à raconter.",
      "Le souvenir d’un souci réglé."
    ]
  },
  {
    "id": 68,
    "phase": "route",
    "category": "souvenir",
    "text": "Pour garder un souvenir de ce dépannage, tu choisirais… (avec une mini-histoire)",
    "answers": [
      "Une photo du véhicule livré.",
      "Une anecdote à raconter.",
      "Le souvenir d’un souci réglé."
    ]
  },
  {
    "id": 69,
    "phase": "route",
    "category": "souvenir",
    "text": "Pour garder un souvenir de ce dépannage, tu choisirais… (avec une chanson imaginaire)",
    "answers": [
      "Une photo du véhicule livré.",
      "Une anecdote à raconter.",
      "Le souvenir d’un souci réglé."
    ]
  },
  {
    "id": 70,
    "phase": "route",
    "category": "souvenir",
    "text": "Pour garder un souvenir de ce dépannage, tu choisirais… (avec un trophée imaginaire)",
    "answers": [
      "Une photo du véhicule livré.",
      "Une anecdote à raconter.",
      "Le souvenir d’un souci réglé."
    ]
  },
  {
    "id": 71,
    "phase": "route",
    "category": "garage",
    "text": "Si le garage accueillait ta voiture comme un hôtel, il dirait… (à la réception)",
    "answers": [
      "Bienvenue, votre emplacement est prêt.",
      "On va prendre soin de votre moteur.",
      "Votre séjour mécanique commence."
    ]
  },
  {
    "id": 72,
    "phase": "route",
    "category": "garage",
    "text": "Si le garage accueillait ta voiture comme un hôtel, il dirait… (à l’entrée)",
    "answers": [
      "Bienvenue, votre emplacement est prêt.",
      "On va prendre soin de votre moteur.",
      "Votre séjour mécanique commence."
    ]
  },
  {
    "id": 73,
    "phase": "route",
    "category": "garage",
    "text": "Si le garage accueillait ta voiture comme un hôtel, il dirait… (au comptoir)",
    "answers": [
      "Bienvenue, votre emplacement est prêt.",
      "On va prendre soin de votre moteur.",
      "Votre séjour mécanique commence."
    ]
  },
  {
    "id": 74,
    "phase": "route",
    "category": "garage",
    "text": "Si le garage accueillait ta voiture comme un hôtel, il dirait… (sur une pancarte)",
    "answers": [
      "Bienvenue, votre emplacement est prêt.",
      "On va prendre soin de votre moteur.",
      "Votre séjour mécanique commence."
    ]
  },
  {
    "id": 75,
    "phase": "route",
    "category": "garage",
    "text": "Si le garage accueillait ta voiture comme un hôtel, il dirait… (dans un message)",
    "answers": [
      "Bienvenue, votre emplacement est prêt.",
      "On va prendre soin de votre moteur.",
      "Votre séjour mécanique commence."
    ]
  },
  {
    "id": 76,
    "phase": "route",
    "category": "garage",
    "text": "Si le garage accueillait ta voiture comme un hôtel, il dirait… (au téléphone)",
    "answers": [
      "Bienvenue, votre emplacement est prêt.",
      "On va prendre soin de votre moteur.",
      "Votre séjour mécanique commence."
    ]
  },
  {
    "id": 77,
    "phase": "route",
    "category": "garage",
    "text": "Si le garage accueillait ta voiture comme un hôtel, il dirait… (dans une brochure)",
    "answers": [
      "Bienvenue, votre emplacement est prêt.",
      "On va prendre soin de votre moteur.",
      "Votre séjour mécanique commence."
    ]
  },
  {
    "id": 78,
    "phase": "route",
    "category": "garage",
    "text": "Si le garage accueillait ta voiture comme un hôtel, il dirait… (dans une publicité)",
    "answers": [
      "Bienvenue, votre emplacement est prêt.",
      "On va prendre soin de votre moteur.",
      "Votre séjour mécanique commence."
    ]
  },
  {
    "id": 79,
    "phase": "route",
    "category": "garage",
    "text": "Si le garage accueillait ta voiture comme un hôtel, il dirait… (sur la porte)",
    "answers": [
      "Bienvenue, votre emplacement est prêt.",
      "On va prendre soin de votre moteur.",
      "Votre séjour mécanique commence."
    ]
  },
  {
    "id": 80,
    "phase": "route",
    "category": "garage",
    "text": "Si le garage accueillait ta voiture comme un hôtel, il dirait… (sur la clé)",
    "answers": [
      "Bienvenue, votre emplacement est prêt.",
      "On va prendre soin de votre moteur.",
      "Votre séjour mécanique commence."
    ]
  },
  {
    "id": 81,
    "phase": "route",
    "category": "imprevu",
    "text": "Un garage ne peut pas recevoir la voiture. Quel nom pour le plan suivant ? (version super-héros)",
    "answers": [
      "Plan B : on organise la suite.",
      "Mission nouveau point de dépôt.",
      "La voiture change de destination."
    ]
  },
  {
    "id": 82,
    "phase": "route",
    "category": "imprevu",
    "text": "Un garage ne peut pas recevoir la voiture. Quel nom pour le plan suivant ? (version détective)",
    "answers": [
      "Plan B : on organise la suite.",
      "Mission nouveau point de dépôt.",
      "La voiture change de destination."
    ]
  },
  {
    "id": 83,
    "phase": "route",
    "category": "imprevu",
    "text": "Un garage ne peut pas recevoir la voiture. Quel nom pour le plan suivant ? (version aventurier)",
    "answers": [
      "Plan B : on organise la suite.",
      "Mission nouveau point de dépôt.",
      "La voiture change de destination."
    ]
  },
  {
    "id": 84,
    "phase": "route",
    "category": "imprevu",
    "text": "Un garage ne peut pas recevoir la voiture. Quel nom pour le plan suivant ? (version navigateur)",
    "answers": [
      "Plan B : on organise la suite.",
      "Mission nouveau point de dépôt.",
      "La voiture change de destination."
    ]
  },
  {
    "id": 85,
    "phase": "route",
    "category": "imprevu",
    "text": "Un garage ne peut pas recevoir la voiture. Quel nom pour le plan suivant ? (version chef d’orchestre)",
    "answers": [
      "Plan B : on organise la suite.",
      "Mission nouveau point de dépôt.",
      "La voiture change de destination."
    ]
  },
  {
    "id": 86,
    "phase": "route",
    "category": "imprevu",
    "text": "Un garage ne peut pas recevoir la voiture. Quel nom pour le plan suivant ? (version pilote)",
    "answers": [
      "Plan B : on organise la suite.",
      "Mission nouveau point de dépôt.",
      "La voiture change de destination."
    ]
  },
  {
    "id": 87,
    "phase": "route",
    "category": "imprevu",
    "text": "Un garage ne peut pas recevoir la voiture. Quel nom pour le plan suivant ? (version magicien)",
    "answers": [
      "Plan B : on organise la suite.",
      "Mission nouveau point de dépôt.",
      "La voiture change de destination."
    ]
  },
  {
    "id": 88,
    "phase": "route",
    "category": "imprevu",
    "text": "Un garage ne peut pas recevoir la voiture. Quel nom pour le plan suivant ? (version capitaine)",
    "answers": [
      "Plan B : on organise la suite.",
      "Mission nouveau point de dépôt.",
      "La voiture change de destination."
    ]
  },
  {
    "id": 89,
    "phase": "route",
    "category": "imprevu",
    "text": "Un garage ne peut pas recevoir la voiture. Quel nom pour le plan suivant ? (version organisateur)",
    "answers": [
      "Plan B : on organise la suite.",
      "Mission nouveau point de dépôt.",
      "La voiture change de destination."
    ]
  },
  {
    "id": 90,
    "phase": "route",
    "category": "imprevu",
    "text": "Un garage ne peut pas recevoir la voiture. Quel nom pour le plan suivant ? (version diplomate)",
    "answers": [
      "Plan B : on organise la suite.",
      "Mission nouveau point de dépôt.",
      "La voiture change de destination."
    ]
  },
  {
    "id": 91,
    "phase": "route",
    "category": "humeur",
    "text": "Quelle mascotte accompagnerait le mieux ce trajet ? (pour la pause café)",
    "answers": [
      "Un écureuil avec un gilet orange.",
      "Une tortue sur un mini-plateau.",
      "Un chat avec une boîte à outils."
    ]
  },
  {
    "id": 92,
    "phase": "route",
    "category": "humeur",
    "text": "Quelle mascotte accompagnerait le mieux ce trajet ? (pour la photo souvenir)",
    "answers": [
      "Un écureuil avec un gilet orange.",
      "Une tortue sur un mini-plateau.",
      "Un chat avec une boîte à outils."
    ]
  },
  {
    "id": 93,
    "phase": "route",
    "category": "humeur",
    "text": "Quelle mascotte accompagnerait le mieux ce trajet ? (pour le départ)",
    "answers": [
      "Un écureuil avec un gilet orange.",
      "Une tortue sur un mini-plateau.",
      "Un chat avec une boîte à outils."
    ]
  },
  {
    "id": 94,
    "phase": "route",
    "category": "humeur",
    "text": "Quelle mascotte accompagnerait le mieux ce trajet ? (pour le trajet)",
    "answers": [
      "Un écureuil avec un gilet orange.",
      "Une tortue sur un mini-plateau.",
      "Un chat avec une boîte à outils."
    ]
  },
  {
    "id": 95,
    "phase": "route",
    "category": "humeur",
    "text": "Quelle mascotte accompagnerait le mieux ce trajet ? (pour le chargement)",
    "answers": [
      "Un écureuil avec un gilet orange.",
      "Une tortue sur un mini-plateau.",
      "Un chat avec une boîte à outils."
    ]
  },
  {
    "id": 96,
    "phase": "route",
    "category": "humeur",
    "text": "Quelle mascotte accompagnerait le mieux ce trajet ? (pour le déchargement)",
    "answers": [
      "Un écureuil avec un gilet orange.",
      "Une tortue sur un mini-plateau.",
      "Un chat avec une boîte à outils."
    ]
  },
  {
    "id": 97,
    "phase": "route",
    "category": "humeur",
    "text": "Quelle mascotte accompagnerait le mieux ce trajet ? (pour le garage)",
    "answers": [
      "Un écureuil avec un gilet orange.",
      "Une tortue sur un mini-plateau.",
      "Un chat avec une boîte à outils."
    ]
  },
  {
    "id": 98,
    "phase": "route",
    "category": "humeur",
    "text": "Quelle mascotte accompagnerait le mieux ce trajet ? (pour la journée)",
    "answers": [
      "Un écureuil avec un gilet orange.",
      "Une tortue sur un mini-plateau.",
      "Un chat avec une boîte à outils."
    ]
  },
  {
    "id": 99,
    "phase": "route",
    "category": "humeur",
    "text": "Quelle mascotte accompagnerait le mieux ce trajet ? (pour le prochain dépannage)",
    "answers": [
      "Un écureuil avec un gilet orange.",
      "Une tortue sur un mini-plateau.",
      "Un chat avec une boîte à outils."
    ]
  },
  {
    "id": 100,
    "phase": "route",
    "category": "humeur",
    "text": "Quelle mascotte accompagnerait le mieux ce trajet ? (pour la fin du jeu)",
    "answers": [
      "Un écureuil avec un gilet orange.",
      "Une tortue sur un mini-plateau.",
      "Un chat avec une boîte à outils."
    ]
  },
  {
    "id": 101,
    "phase": "delivery",
    "category": "arrivee",
    "text": "Ta voiture est arrivée. Quel serait son premier message ?",
    "answers": [
      "Merci pour le voyage !",
      "Je laisse maintenant le garage travailler.",
      "Je reprendrai la route bientôt."
    ]
  },
  {
    "id": 102,
    "phase": "delivery",
    "category": "arrivee",
    "text": "Le déchargement mérite quel générique de fin ?",
    "answers": [
      "Mission accomplie, véhicule livré.",
      "Un plateau, une arrivée, un sourire.",
      "La suite se passe au garage."
    ]
  },
  {
    "id": 103,
    "phase": "delivery",
    "category": "arrivee",
    "text": "Quel détail te rassure le plus à la livraison ?",
    "answers": [
      "La confirmation du lieu et de l’heure.",
      "Les photos du véhicule livré.",
      "L’échange avec le réceptionnaire."
    ]
  },
  {
    "id": 104,
    "phase": "delivery",
    "category": "arrivee",
    "text": "Pour remercier ton véhicule de sa patience, tu choisirais…",
    "answers": [
      "Un bon diagnostic.",
      "Une réparation adaptée.",
      "Un nettoyage quand tout ira mieux."
    ]
  },
  {
    "id": 105,
    "phase": "delivery",
    "category": "arrivee",
    "text": "Quel emoji résume cette arrivée au garage ?",
    "answers": [
      "🚗",
      "😌",
      "🔧"
    ]
  },
  {
    "id": 106,
    "phase": "delivery",
    "category": "arrivee",
    "text": "Si cette arrivée était un film, son titre serait…",
    "answers": [
      "Enfin au bon endroit.",
      "Le moteur attend son rendez-vous.",
      "Le plateau rend les clés."
    ]
  },
  {
    "id": 107,
    "phase": "delivery",
    "category": "arrivee",
    "text": "Quel surnom donner au plateau après ce voyage ?",
    "answers": [
      "Le taxi des voitures.",
      "Le transporteur des imprévus.",
      "Le partenaire du garage."
    ]
  },
  {
    "id": 108,
    "phase": "delivery",
    "category": "arrivee",
    "text": "Le véhicule est déposé. Ton prochain réflexe ?",
    "answers": [
      "Vérifier les informations de livraison.",
      "Échanger avec le garage.",
      "Prendre connaissance de la suite."
    ]
  },
  {
    "id": 109,
    "phase": "delivery",
    "category": "arrivee",
    "text": "Quelle médaille imaginaire remets-tu à ta voiture ?",
    "answers": [
      "Patience olympique.",
      "Voyage sur plateau réussi.",
      "Championne des rebondissements."
    ]
  },
  {
    "id": 110,
    "phase": "delivery",
    "category": "arrivee",
    "text": "Pour raconter la fin du trajet, tu dirais…",
    "answers": [
      "Elle est bien arrivée.",
      "Le garage prend le relais.",
      "Une étape de plus vers la réparation."
    ]
  }
];

const catalog = new Map(GAME_QUESTIONS.map(q=>[q.id,q]));
const response=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
function pick(phase,n){const a=GAME_QUESTIONS.filter(q=>q.phase===phase);const out=[];while(out.length<n){const v=new Uint32Array(1);crypto.getRandomValues(v);out.push(a.splice(v[0]%a.length,1)[0].id);}return out;}
function publicState(s){return {session_id:s.id,expires_at:s.expires_at,unlocked:s.unlocked,answers:s.answers.map(a=>({questionNum:a.num,answerIndex:a.index,skipped:a.skipped})),total_points:s.answers.reduce((n,a)=>n+a.points,0),questions:s.questions.slice(0,s.unlocked).map(id=>catalog.get(id)),completed:!!s.result,result:s.result||null,max_discount:s.max_discount};}
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
async function gameRoute(req,env,account,authenticate){
 const u=new URL(req.url), p=u.pathname;
 if(!p.startsWith('/api/game/'))return null;
 try{
  const action=p.slice('/api/game/'.length);const privateAction=['create','unlock','results'].includes(action);
  const dev=privateAction?await authenticate(req,env):null;
  if(privateAction&&!dev)fail('Téléphone non autorisé',401);
  if(!['create','session','answer','skip','unlock','complete','results'].includes(action))fail('Route inconnue',404);
  const isGet=['session','results'].includes(action);if(req.method!==(isGet?'GET':'POST'))fail('Méthode refusée',405);
  let b={};if(!isGet){if(Number(req.headers.get('Content-Length')||0)>8192)fail('Requête trop grande',413);const raw=await req.text();if(raw.length>8192)fail('Requête trop grande',413);try{b=JSON.parse(raw);}catch{fail('JSON invalide');}}
  if(action==='create'){
   const key=String(b.interventionKey||'').trim();if(!key||key.length>200)fail('Intervention manquante');
   const cap=Number(b.maxDiscount??0);if(!Number.isFinite(cap)||cap<0||cap>100)fail('Récompense invalide');
   // Une seule session active par intervention, même depuis le téléphone de secours.
   const old=await env.DB.prepare('SELECT data FROM jm_game_sessions WHERE account=? AND intervention_key=? AND expires>? ORDER BY expires DESC LIMIT 1').bind(account,key,Date.now()).first();
   if(old){const s=JSON.parse(old.data);return response({success:true,session:publicState(s)});}
   const bytes=crypto.getRandomValues(new Uint8Array(32));const id=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
   const expires=Date.now()+86400000;
   const s={id,intervention_key:key,expires_at:new Date(expires).toISOString(),unlocked:3,questions:[...pick('route',3),...pick('delivery',2)],answers:[],max_discount:cap,result:null};
   const inserted=await env.DB.prepare('INSERT INTO jm_game_sessions(account,id,intervention_key,expires,revision,data) SELECT ?,?,?,?,0,? WHERE NOT EXISTS(SELECT 1 FROM jm_game_sessions WHERE account=? AND intervention_key=? AND expires>?)').bind(account,id,key,expires,JSON.stringify(s),account,key,Date.now()).run();
   if(inserted.meta?.changes!==1){const active=await env.DB.prepare('SELECT data FROM jm_game_sessions WHERE account=? AND intervention_key=? AND expires>? ORDER BY expires DESC LIMIT 1').bind(account,key,Date.now()).first();if(!active)fail('Réessaie la création de partie',409);return response({success:true,session:publicState(JSON.parse(active.data))});}
   // Suppression des anciennes sessions uniquement (30 jours). Aucun autre dossier n'est touché.
   await env.DB.prepare('DELETE FROM jm_game_sessions WHERE account=? AND expires<?').bind(account,Date.now()-30*86400000).run();
   return response({success:true,session:publicState(s)});
  }
  let row;
  if(action==='results'){
   const key=u.searchParams.get('interventionKey')||'';
   row=await env.DB.prepare('SELECT * FROM jm_game_sessions WHERE account=? AND intervention_key=? ORDER BY expires DESC LIMIT 1').bind(account,key).first();
  }else{
   const id=String(isGet?u.searchParams.get('s')||'':b.sessionId||'');if(!/^[a-f0-9]{64}$/.test(id))fail('Session invalide',404);
   row=await env.DB.prepare('SELECT * FROM jm_game_sessions WHERE account=? AND id=?').bind(account,id).first();
  }
  if(!row)fail('Aucune session trouvée',404);
  const s=JSON.parse(row.data);
  if(action==='results')return response({success:true,session:publicState(s),expired:row.expires<=Date.now()});
  if(row.expires<=Date.now())fail('Cette session a expiré',410);
  if(action==='session')return response({success:true,session:publicState(s)});
  if(action==='unlock'){
   if(b.interventionKey!==s.intervention_key)fail('Intervention différente',403);
   if(b.delivered!==true)fail('Confirme le déchargement avant de continuer');
   if(s.unlocked===5)return response({success:true,session:publicState(s)});
   s.unlocked=5;
  }else if(action==='answer'||action==='skip'){
   if(s.result)fail('Jeu déjà terminé',409);
   const num=b.questionNum;if(!Number.isInteger(num)||num<0||num>4)fail('Question invalide');
   if(num>=s.unlocked)fail('Attends la confirmation du déchargement',403);
   const q=catalog.get(s.questions[num]);const skipped=action==='skip';const index=skipped?null:b.answerIndex;
   if(!skipped&&(!Number.isInteger(index)||index<0||index>=q.answers.length))fail('Réponse invalide');
   const existing=s.answers.find(a=>a.num===num);
   if(existing){if(existing.index===index&&existing.skipped===skipped)return response({success:true,session:publicState(s)});fail('Réponse déjà enregistrée',409);}
   if(num!==s.answers.length)fail('Réponds aux questions dans l’ordre',409);
   // Points attribués côté serveur pour participer, pas pour donner un avis positif.
   s.answers.push({num,index,skipped,points:skipped?0:20});
  }else if(action==='complete'){
   if(s.result)return response({success:true,session:publicState(s)});
   if(s.unlocked!==5||s.answers.length!==5)fail('Les cinq questions doivent être terminées',409);
   const gender=['male','female','other'].includes(b.genderChoice)?b.genderChoice:null;
   const reward=['discount','dedication','none'].includes(b.rewardType)?b.rewardType:'none';
   const filmed=b.filmConsent===true;
   const platforms={};for(const name of ['tiktok','facebook','snapchat'])platforms[name]=filmed&&b.publicationConsent===true&&b.platforms?.[name]===true;
   const score=s.answers.reduce((n,a)=>n+a.points,0);
   s.result={score,feedback:String(b.feedback||'').slice(0,500),gender,reward_type:reward,discount_eur:reward==='discount'?Math.round(s.max_discount*score)/100:0,film_consent:filmed,publication_consent:Object.values(platforms).some(Boolean),platforms,completed_at:new Date().toISOString(),valid_until:new Date(Date.now()+90*86400000).toISOString()};
  }
  // Mise à jour conditionnelle atomique : retries/doubles clics ne doublent pas les points.
  const result=await env.DB.prepare('UPDATE jm_game_sessions SET data=?, revision=revision+1 WHERE account=? AND id=? AND revision=?').bind(JSON.stringify(s),account,s.id,row.revision).run();
  if(result.meta?.changes!==1)fail('Une réponse arrive en même temps. Actualise puis réessaie.',409);
  return response({success:true,session:publicState(s)});
 }catch(e){return response({success:false,error:e.status?e.message:'Jeu indisponible. Vérifie l’installation du serveur.'},e.status||503);}
}

worker_default={...original,__jmDefiInstalled:true,async fetch(req,env,ctx){
 if(req.method!=="OPTIONS" && new URL(req.url).pathname.startsWith("/api/game/")){
  return await gameRoute(req,env,ACCOUNT,appareilDepuisJeton);
 }
 return original.fetch.call(original,req,env,ctx);
}};
})();
