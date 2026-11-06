# E2M — Guide de démarrage rapide

## 1. Configuration de la clé API Anthropic

Ouvrez le fichier `.env` et ajoutez votre clé:
```
ANTHROPIC_API_KEY="sk-ant-votre-cle-ici"
```

Obtenez votre clé sur: https://console.anthropic.com

## 2. Accès réservé à l'équipe 2M

Toute l'application est protégée par un mot de passe d'équipe. Définir dans `.env` (et dans Railway → Variables) :
```
TEAM_PASSWORD="le-mot-de-passe-de-l-equipe"
AUTH_SECRET="chaine-aleatoire-d-au-moins-32-caracteres"
```
Sans ces deux variables, personne ne peut se connecter (accès fermé par défaut).
Changer `TEAM_PASSWORD` déconnecte immédiatement tout le monde (à faire quand quelqu'un quitte l'équipe).

## 2 bis. Démarrer l'application

```bash
npm run dev
```

Ouvrez votre navigateur sur: http://localhost:3000

## 3. Fonctionnalités disponibles

| Module | URL | Description |
|--------|-----|-------------|
| Tableau de bord | / | Vue d'ensemble, KPIs, alertes |
| Calendrier | /calendar | Calendrier des activités : vues Mois / Semaine / Agenda / Rétroplanning, échéances, retards, export iCal |
| Modèles de rétroplanning | /calendar/templates | Listes de tâches types (J-x / J+x) appliquées automatiquement aux activités |
| Événements | /events | Gestion complète des événements |
| Fournisseurs | /suppliers | Base de fournisseurs |
| Invités | /guests | Gestion des invités |
| Juridique | /legal | Contrats + IA juridique |
| Comptabilité | /accounting | Budget, dépenses, factures |
| Assistant IA | /ai | Chat IA spécialisé par module |

## 4. Calendrier et rétroplannings

- À la création d'une activité, choisir un **rétroplanning** : toutes les tâches sont générées et datées par rapport à la date de début (ex. « Envoyer les invitations Bateaux dragon » à J-75).
- Pour une activité existante : bouton **Rétroplanning** (onglet Tâches) ou **Appliquer un rétroplanning** dans le calendrier. Réappliquer ne crée pas de doublons.
- Modèles fournis : Bateaux dragon, Gala, Conférence, Activité standard — modifiables dans `/calendar/templates`.
- Glisser-déposer une tâche pour la replanifier. Raccourcis : ← → (période), T (aujourd'hui), M / S / A / R (vues), N (nouvelle tâche).
- Abonnement Google Agenda / Outlook : bouton **Abonnement iCal** du calendrier (copie un lien privé à garder interne).

## 5. IA — Auto-mise à jour des modèles

L'application détecte automatiquement le meilleur modèle Anthropic disponible.
Elle se met à jour toutes les heures. Aucune configuration supplémentaire requise.

## 6. Base de données

Données de démonstration déjà chargées. Pour réinitialiser:
```bash
npm run db:push
npm run db:seed
```

Tests unitaires : `npm test`
