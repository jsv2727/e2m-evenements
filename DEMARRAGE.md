# E2M — Guide de démarrage rapide

## 1. Configuration de la clé API Anthropic

Ouvrez le fichier `.env` et ajoutez votre clé:
```
ANTHROPIC_API_KEY="sk-ant-votre-cle-ici"
```

Obtenez votre clé sur: https://console.anthropic.com

## 2. Démarrer l'application

```bash
npm run dev
```

Ouvrez votre navigateur sur: http://localhost:3000

## 3. Fonctionnalités disponibles

| Module | URL | Description |
|--------|-----|-------------|
| Tableau de bord | / | Vue d'ensemble, KPIs, alertes |
| Événements | /events | Gestion complète des événements |
| Fournisseurs | /suppliers | Base de fournisseurs |
| Invités | /guests | Gestion des invités |
| Juridique | /legal | Contrats + IA juridique |
| Comptabilité | /accounting | Budget, dépenses, factures |
| Assistant IA | /ai | Chat IA spécialisé par module |

## 4. IA — Auto-mise à jour des modèles

L'application détecte automatiquement le meilleur modèle Anthropic disponible.
Elle se met à jour toutes les heures. Aucune configuration supplémentaire requise.

## 5. Base de données

Données de démonstration déjà chargées. Pour réinitialiser:
```bash
npm run db:push
npm run db:seed
```
