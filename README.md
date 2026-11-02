# Solitaire 3D

Jeu de solitaire à billes en 3D, inspiré d'un plateau traditionnel en bois, jouable directement dans le navigateur.

**[Jouer en ligne](https://rmdevdesign.github.io/orbital/)**

## Le jeu

- Plateau de 36 billes : sautez une bille par-dessus une voisine pour la retirer, jusqu'à n'en garder qu'une.
- Coups valides mis en évidence, annulation du dernier coup et remise à zéro.
- Score, progression et note sur trois étoiles en fin de partie.
- Effets sonores générés dans le navigateur, avec coupure du son.

## Stack

- React 19 et TypeScript
- Three.js via React Three Fiber et Drei pour la scène 3D
- Zustand pour l'état de la partie
- Vite pour le build, Vitest pour les tests de la logique de jeu
- Déploiement automatique sur GitHub Pages

## Lancer en local

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
```

## Auteur

Romain Maunier, [RM Dev Design](https://rmdev.design) : designer et développeur Unity XR et 3D temps réel freelance.
