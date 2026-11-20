# FeedbackPO

Transforme des feedbacks bruts (utilisateurs, clients, stakeholders) en éléments de backlog structurés, grâce à un modèle de langage cadré par un prompt de Product Owner senior.

Démo : https://feedback-po.vercel.app

## Le problème

Les feedbacks arrivent en vrac, mal formulés, parfois contradictoires. Les transformer en epics, features et user stories exploitables prend du temps et dépend beaucoup de la personne qui les lit.

## Ce que fait le produit

- à partir d'un feedback, génère de 1 à 4 éléments de backlog (Epic, Feature ou User Story)
- chaque élément a un titre au format en tant que / je veux / afin de, un contexte, et de 2 à 4 critères d'acceptation
- propose une priorisation avec le framework adapté (MoSCoW, RICE ou Valeur-Effort) et une justification en une phrase
- suggère le module concerné
- pose toujours 2 questions de clarification à reprendre avec le stakeholder
- signale les feedbacks trop vagues au lieu de les interpréter
- permet de copier chaque élément pour le coller dans l'outil de backlog

## Décisions produit et garde-fous IA

- la sortie est un JSON strict, ce qui rend le résultat exploitable par l'interface et vérifiable
- le prompt interdit d'inventer des fonctionnalités non mentionnées dans le feedback
- un champ d'ambiguïté permet de ne pas forcer une réponse quand le feedback est insuffisant
- les questions de clarification sont systématiques : l'IA prépare la discussion, elle ne remplace pas le PO

## Limites actuelles

Prototype (MVP). La qualité dépend du prompt et du modèle, et chaque élément généré reste à relire et à arbitrer par un humain.

## Configuration de la clé API

La clé Anthropic reste **côté serveur** : le navigateur appelle `/api/claude` (fonction Vercel dans `api/claude.js`), qui ajoute la clé et relaie la requête. Ne jamais nommer cette variable avec le préfixe `VITE_` : elle serait incorporée au code public.

- En local : copier `.env.example` en `.env` et renseigner `ANTHROPIC_API_KEY`, puis `npm run dev` (Vite relaie `/api/claude`).
- En production : définir `ANTHROPIC_API_KEY` dans Vercel (Settings > Environment Variables).

Le proxy n'accepte que la même origine, deux modèles, `max_tokens` plafonné à 4096 et une taille d'entrée limitée. Il n'y a pas de limitation de débit : toute personne qui ouvre l'app peut consommer du crédit. À protéger par une authentification avant tout usage public.

## Technique

React, Vite, lucide-react.

```
npm install
npm run dev
```
