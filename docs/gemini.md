# Recettes personnalisées et ingrédients

## Activer dans Coolify

Dans les variables d’environnement du service backend, définir :

```dotenv
GEMINI_API_KEY=la_cle_a_saisir_uniquement_dans_coolify
GEMINI_MODEL=gemini-2.5-flash-lite
AI_DAILY_LIMIT=10
```

Marquer la clé comme secrète dans Coolify, puis redéployer. Ne pas placer la clé dans le code, GitHub, le navigateur, une capture ou un message. La configuration Compose transmet ces variables uniquement au backend.

Localement, copier `.env.example` vers `.env`, y saisir la clé et lancer `npm start`. Ce fichier est ignoré par Git et exclu des images Docker. La génération reste désactivée sans clé ; le catalogue et les recettes intégrées fonctionnent quand même.

Le modèle par défaut est le plus économique des Flash-Lite comparés pour cette intégration : Gemini 2.5 Flash-Lite. Le modèle est configurable sans modification du code. Les tarifs et quotas effectifs sont à vérifier sur le compte Google : <https://ai.google.dev/gemini-api/docs/pricing> et <https://ai.google.dev/gemini-api/docs/rate-limits>. Aucun basculement automatique vers un modèle plus cher n’est effectué.

## Parcours

1. Ajouter les ingrédients disponibles, leur quantité si connue et une date facultative.
2. Choisir la durée et le filtre végétarien.
3. Cliquer sur « Créer une recette ». Les noms, catégories et quantités des ingrédients non périmés sont envoyés à Google, sans nom de compte, e-mail ni autre donnée du profil.
4. La recette validée apparaît dans une fiche, avec ingrédients pour deux personnes et étapes de préparation. Elle peut être ajoutée aux favoris et suivie dans le mode cuisson.
5. « Essayer une autre idée » demande volontairement un nouveau résultat et consomme un nouvel appel.

La génération produit du texte uniquement. Les nouvelles recettes utilisent une carte neutre, sans photo de plat inventée. Le catalogue existant conserve ses photographies d’ambiance.

## Quota et sauvegarde

- Plafond global de dix **tentatives d’appel externe** par jour UTC pour le site, tous comptes confondus. Il peut être abaissé par `AI_DAILY_LIMIT`, pas augmenté au-delà de dix dans cette version.
- Le compteur est sauvegardé dans SQLite avant l’appel : une panne, un refus ou une réponse invalide peuvent aussi consommer le quota du fournisseur. Aucune relance automatique.
- Une seule génération à la fois dans le processus, pour éviter les doubles appels.
- Même frigo, mêmes quantités, même modèle et mêmes critères : la recette précédente est réutilisée sans nouvel appel, sauf demande explicite d’une autre idée.
- Chaque recette est privée à son utilisateur ; les favoris et les recettes survivent aux redéploiements grâce au volume SQLite.
- Le plafond du site s’ajoute aux limites Google ; il ne garantit pas qu’un compte Google autorise dix requêtes.

## Validation

La réponse est demandée en JSON selon un schéma. Le backend vérifie titre, durée, ingrédients autorisés, quantités présentes et étapes. Un ingrédient absent, une réponse tronquée ou une durée hors limite ne sont pas enregistrés. Un produit classé viande ou poisson est refusé dans une recette déclarée végétarienne. Les erreurs Google ne sont jamais renvoyées telles quelles au navigateur.

Il s’agit d’une validation de structure, pas d’une certification culinaire. Les quantités, la cuisson et les allergènes doivent être vérifiés par l’utilisateur. Les produits personnels doivent être correctement nommés et classés ; le logiciel ne peut pas déduire automatiquement tous leurs composants.

## Catalogue ouvert

Le catalogue de départ contient 288 ingrédients et 12 familles. Un produit absent peut être ajouté en texte libre avec sa famille ; il reste personnel à son compte et bénéficie du visuel de cette famille. Le moteur ne télécharge pas une base exhaustive de produits commerciaux et ne crée pas d’image individuelle par ingrédient. Les anciens identifiants d’ingrédients restent stables pour conserver les frigos déjà enregistrés.

La génération accepte jusqu’à 100 ingrédients présents à la fois pour limiter la taille du contexte. Ce plafond ne limite pas le nombre de produits personnels dans le catalogue.

## Visuels

`public/images/ingredients.webp` est un atlas de 12 vignettes généré avec l’outil image intégré, affiché par positions CSS : légumes, fruits, herbes, céréales, légumineuses, produits laitiers et œufs, viandes, poissons, épices, condiments, pâtisserie, autres.

Brief de génération : photographie culinaire réaliste, grille régulière de quatre colonnes et trois lignes, un groupe d’ingrédients crus centré dans chaque case, fond ivoire uniforme, lumière naturelle, sans texte ni marque. L’image d’origine est conservée dans les livrables locaux, la copie WebP est optimisée pour le site.

## Vérifications

`npm test` vérifie le catalogue, l’isolation des produits et recettes entre comptes, le cache, les favoris, le quota global, l’exclusion des produits périmés, les réponses malformées et la non-divulgation des erreurs du fournisseur. Les réponses de Gemini sont simulées pour ces tests : une vraie génération nécessite une clé configurée.
