import { ingredients as original } from "./recipes.mjs";
export const categories = [
  ["vegetables", "Légumes", "🥕"],
  ["fruits", "Fruits", "🍎"],
  ["herbs", "Herbes fraîches", "🌿"],
  ["grains", "Féculents & céréales", "🌾"],
  ["legumes", "Légumineuses", "🫘"],
  ["dairy", "Produits laitiers & œufs", "🥚"],
  ["meat", "Viandes", "🍗"],
  ["fish", "Poissons & fruits de mer", "🐟"],
  ["spices", "Épices", "🧂"],
  ["condiments", "Sauces & condiments", "🫒"],
  ["baking", "Pâtisserie", "🍫"],
  ["other", "Autres produits", "🧺"],
].map(([id, name, emoji], image) => ({ id, name, emoji, image }));
export const normalize = (name) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const groups = {
  vegetables:
    "Tomates|Courgettes|Carottes|Pommes de terre|Oignons|Ail|Épinards|Champignons|Aubergines|Poivrons rouges|Poivrons verts|Brocoli|Chou-fleur|Chou blanc|Chou rouge|Chou kale|Choux de Bruxelles|Concombre|Radis|Navets|Betteraves|Poireaux|Céleri branche|Céleri-rave|Fenouil|Asperges|Artichauts|Endives|Laitue|Roquette|Mâche|Potiron|Potimarron|Butternut|Patates douces|Petits pois|Haricots verts|Maïs|Échalotes|Panais|Rutabaga|Topinambours|Gingembre|Piments|Blette|Germes de soja|Cresson|Olives",
  fruits:
    "Pommes|Bananes|Citrons|Oranges|Clémentines|Mandarines|Poires|Fraises|Framboises|Myrtilles|Mûres|Cassis|Groseilles|Cerises|Pêches|Nectarines|Abricots|Prunes|Raisins|Kiwis|Ananas|Mangue|Papaye|Melon|Pastèque|Avocat|Pamplemousse|Citron vert|Fruit de la passion|Grenade|Figues|Dattes|Litchis|Noix de coco|Rhubarbe|Compote de pommes|Raisins secs|Abricots secs|Pruneaux",
  herbs:
    "Basilic|Persil|Coriandre|Ciboulette|Menthe|Aneth|Thym|Romarin|Origan|Sauge|Estragon|Laurier|Cerfeuil|Verveine|Citronnelle",
  grains:
    "Pâtes|Riz|Pain|Farine|Semoule|Boulgour|Quinoa|Flocons d’avoine|Sarrasin|Polenta|Nouilles de riz|Nouilles soba|Vermicelles|Couscous|Tortillas|Pain de mie|Chapelure|Gnocchis|Orge|Millet|Riz complet|Riz basmati|Riz arborio|Spaghetti|Lasagnes|Pâtes complètes",
  legumes:
    "Lentilles|Pois chiches|Haricots rouges|Haricots blancs|Haricots noirs|Lentilles corail|Pois cassés|Fèves|Edamame|Tofu|Tempeh|Protéines de soja",
  dairy:
    "Œufs|Feta|Crème|Lait|Yaourt|Beurre|Fromage râpé|Mozzarella|Parmesan|Chèvre frais|Ricotta|Mascarpone|Fromage blanc|Skyr|Emmental|Comté|Cheddar|Gorgonzola|Roquefort|Camembert|Brie|Halloumi|Crème végétale|Lait d’avoine|Lait de soja|Lait d’amande|Lait de coco|Yaourt végétal",
  meat: "Blanc de poulet|Cuisses de poulet|Dinde|Bœuf haché|Steak de bœuf|Porc|Lardons|Jambon blanc|Jambon cru|Bacon|Saucisses|Chorizo|Agneau|Veau|Canard|Lapin|Chair à saucisse",
  fish: "Thon|Saumon|Saumon fumé|Cabillaud|Colin|Lieu noir|Sardines|Maquereau|Truite|Dorade|Crevettes|Moules|Saint-Jacques|Calamars|Crabe|Anchois|Surimi",
  spices:
    "Sel|Poivre|Paprika|Cumin|Curcuma|Curry|Cannelle|Muscade|Piment en poudre|Garam masala|Ras el-hanout|Safran|Cardamome|Clous de girofle|Cinq épices|Herbes de Provence|Vanille|Sumac|Coriandre moulue",
  condiments:
    "Huile d’olive|Huile de tournesol|Huile de sésame|Vinaigre balsamique|Vinaigre de cidre|Vinaigre de riz|Sauce soja|Moutarde|Mayonnaise|Ketchup|Concentré de tomate|Tomates en conserve|Coulis de tomate|Pesto|Harissa|Sriracha|Sauce nuoc-mâm|Tahini|Beurre de cacahuète|Bouillon de légumes|Bouillon de volaille|Cornichons|Câpres|Sauce barbecue|Crème de coco|Miso|Pâte de curry",
  baking:
    "Chocolat|Sucre|Sucre roux|Sucre glace|Miel|Sirop d’érable|Cacao|Levure chimique|Levure boulangère|Bicarbonate alimentaire|Fécule de maïs|Poudre d’amande|Noisettes|Amandes|Noix|Noix de cajou|Pistaches|Cacahuètes|Graines de sésame|Graines de chia|Graines de courge|Noix de pécan|Pâte feuilletée|Pâte brisée|Pâte sablée|Confiture|Crème de marrons|Gélatine|Agar-agar|Fleur d’oranger",
  other:
    "Seitan|Algues nori|Levure nutritionnelle|Feuilles de brick|Galettes de riz|Kimchi|Choucroute|Champignons séchés|Cœurs de palmier|Pousses de bambou",
};
const byName = new Map(original.map((i) => [normalize(i.name), i]));
for (const [category, names] of Object.entries(groups))
  for (const name of names.split("|")) {
    const key = normalize(name),
      old = byName.get(key);
    byName.set(key, {
      ...(old || {
        id: key.replaceAll(" ", "-"),
        name,
        emoji: categories.find((c) => c.id === category).emoji,
      }),
      category,
    });
  }
// Keep all legacy IDs stable so existing fridges and recipes migrate without changes.
export const catalog = [...byName.values()];
