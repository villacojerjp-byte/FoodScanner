/**
 * The "holistic" layer. Open Food Facts gives us ingredients, additives and
 * nutrition; these tables turn that raw data into the concern categories a
 * holistic scanner surfaces — seed oils, additives, parabens, phthalates,
 * fragrance, sweeteners and so on.
 *
 * Every rule is deliberately transparent: `why` is shown verbatim in the UI so a
 * score is never a black box.
 */

export type Severity = 'high' | 'medium' | 'low' | 'positive';

export interface IngredientRule {
  id: string;
  /** Human label for the concern group, e.g. "Seed oils". */
  group: string;
  severity: Severity;
  /** Points removed (or added, for `positive`) when matched. */
  weight: number;
  /** Matched case-insensitively against the ingredient text. */
  patterns: RegExp;
  why: string;
  appliesTo: ('food' | 'cosmetic')[];
  /** Only count once even if several ingredients match. */
  once?: boolean;
}

const f: ('food' | 'cosmetic')[] = ['food'];
const c: ('food' | 'cosmetic')[] = ['cosmetic'];
const both: ('food' | 'cosmetic')[] = ['food', 'cosmetic'];

export const INGREDIENT_RULES: IngredientRule[] = [
  // ---------------------------------------------------------------- food
  {
    id: 'seed-oils',
    group: 'Seed oils',
    severity: 'medium',
    weight: 12,
    once: true,
    patterns:
      /\b(canola|rapeseed|soybean|soya bean|sunflower|safflower|corn|cottonseed|grapeseed|rice bran)\s+oil\b|\bvegetable oil\b|\bhuile de (colza|tournesol|soja|ma[ïi]s)\b/i,
    why:
      'Industrial seed oils are high in omega-6 linoleic acid and are usually solvent-extracted and deodorised.',
    appliesTo: f,
  },
  {
    id: 'partially-hydrogenated',
    group: 'Trans fats',
    severity: 'high',
    weight: 25,
    once: true,
    patterns: /partially hydrogenated|shortening, partially|trans fat/i,
    why: 'Partially hydrogenated oils are the main dietary source of artificial trans fat.',
    appliesTo: f,
  },
  {
    id: 'hfcs',
    group: 'Added sugars',
    severity: 'high',
    weight: 15,
    once: true,
    patterns: /high[- ]fructose corn syrup|glucose[- ]fructose syrup|corn syrup solids/i,
    why: 'High-fructose corn syrup is a cheap liquid sugar linked to metabolic load when consumed often.',
    appliesTo: f,
  },
  {
    id: 'added-sugar',
    group: 'Added sugars',
    severity: 'low',
    weight: 5,
    once: true,
    patterns: /\b(sugar|sucre|dextrose|maltodextrin|invert syrup|cane juice|glucose syrup)\b/i,
    why: 'Contains added sugar rather than sugar that occurs naturally in the food.',
    appliesTo: f,
  },
  {
    id: 'artificial-sweetener',
    group: 'Artificial sweeteners',
    severity: 'medium',
    weight: 10,
    once: true,
    patterns: /aspartame|acesulfame|sucralose|saccharin|neotame|e95[01234]/i,
    why: 'Synthetic high-intensity sweetener — evidence on long-term gut and metabolic effects is unsettled.',
    appliesTo: f,
  },
  {
    id: 'artificial-colour',
    group: 'Artificial colours',
    severity: 'high',
    weight: 14,
    patterns:
      /\b(red 40|red 3|yellow 5|yellow 6|blue 1|blue 2|green 3|allura red|tartrazine|sunset yellow|carmoisine|ponceau|quinoline yellow|brilliant blue|titanium dioxide)\b/i,
    why: 'Synthetic dye. Several are linked to hyperactivity in children and are restricted in the EU.',
    appliesTo: f,
  },
  {
    id: 'nitrites',
    group: 'Preservatives',
    severity: 'high',
    weight: 15,
    once: true,
    patterns: /sodium nitrite|sodium nitrate|potassium nitrite|e25[012]/i,
    why: 'Nitrites in cured meat can form nitrosamines, classified as probable carcinogens.',
    appliesTo: f,
  },
  {
    id: 'bha-bht',
    group: 'Preservatives',
    severity: 'high',
    weight: 15,
    patterns: /\bBHA\b|\bBHT\b|butylated hydroxy|tbhq|tert-butylhydroquinone|e3(19|20|21)/i,
    why: 'Synthetic antioxidant preservative flagged by several regulators for possible endocrine effects.',
    appliesTo: both,
  },
  {
    id: 'msg',
    group: 'Flavour enhancers',
    severity: 'low',
    weight: 5,
    once: true,
    patterns: /monosodium glutamate|\bmsg\b|e62[1-5]|yeast extract|hydrolyzed .*protein/i,
    why: 'Added glutamate used to boost savoury flavour; a marker of heavy formulation.',
    appliesTo: f,
  },
  {
    id: 'natural-flavors',
    group: 'Undisclosed flavourings',
    severity: 'low',
    weight: 4,
    once: true,
    patterns: /natural flavou?r|artificial flavou?r|ar[oô]me/i,
    why: '"Flavouring" is a legal catch-all that can hide dozens of undisclosed compounds.',
    appliesTo: f,
  },
  {
    id: 'carrageenan',
    group: 'Emulsifiers & gums',
    severity: 'medium',
    weight: 8,
    patterns: /carrageenan|e407|polysorbate|carboxymethyl ?cellulose|e46[06]/i,
    why: 'Emulsifier associated in animal studies with gut-lining irritation.',
    appliesTo: f,
  },
  {
    id: 'palm-oil',
    group: 'Palm oil',
    severity: 'low',
    weight: 6,
    once: true,
    patterns: /\bpalm oil\b|palm kernel|huile de palme/i,
    why: 'High in saturated fat and a major driver of deforestation.',
    appliesTo: f,
  },

  // ------------------------------------------------------------ cosmetic
  {
    id: 'parabens',
    group: 'Parabens',
    severity: 'high',
    weight: 16,
    patterns: /\b\w*paraben\b/i,
    why: 'Preservative that can weakly mimic oestrogen; restricted in the EU at higher concentrations.',
    appliesTo: c,
  },
  {
    id: 'phthalates',
    group: 'Phthalates',
    severity: 'high',
    weight: 22,
    patterns: /phthalate|\bdbp\b|\bdehp\b|\bdep\b(?!\w)/i,
    why: 'Plasticiser group classified as an endocrine disruptor and banned from EU cosmetics.',
    appliesTo: c,
  },
  {
    id: 'formaldehyde',
    group: 'Formaldehyde releasers',
    severity: 'high',
    weight: 22,
    patterns:
      /formaldehyde|dmdm hydantoin|imidazolidinyl urea|diazolidinyl urea|quaternium-15|bronopol/i,
    why: 'Slowly releases formaldehyde, a known human carcinogen, into the product.',
    appliesTo: c,
  },
  {
    id: 'sulfates',
    group: 'Harsh sulfates',
    severity: 'medium',
    weight: 9,
    once: true,
    patterns: /sodium (laureth|lauryl) sulfate|ammonium (laureth|lauryl) sulfate|\bsls\b|\bsles\b/i,
    why: 'Strong detergent that strips the skin barrier; SLES can carry 1,4-dioxane residue.',
    appliesTo: c,
  },
  {
    id: 'fragrance',
    group: 'Fragrance',
    severity: 'medium',
    weight: 11,
    once: true,
    patterns: /\bparfum\b|\bfragrance\b|\baroma\b/i,
    why: '"Parfum" is a trade-secret blend that may contain dozens of undisclosed compounds.',
    appliesTo: c,
  },
  {
    id: 'eu-allergens',
    group: 'Fragrance allergens',
    severity: 'low',
    weight: 3,
    patterns:
      /\b(limonene|linalool|citronellol|geraniol|eugenol|coumarin|benzyl salicylate|hexyl cinnamal|butylphenyl methylpropional)\b/i,
    why: 'One of the 26 fragrance compounds the EU requires to be declared as a contact allergen.',
    appliesTo: c,
  },
  {
    id: 'peg',
    group: 'PEG compounds',
    severity: 'low',
    weight: 5,
    once: true,
    patterns: /\bpeg-\d+|polyethylene glycol|-eth-\d+/i,
    why: 'Ethoxylated ingredient; processing can leave traces of 1,4-dioxane.',
    appliesTo: c,
  },
  {
    id: 'silicones',
    group: 'Silicones',
    severity: 'low',
    weight: 4,
    once: true,
    patterns: /dimethicone|siloxane|cyclopentasiloxane|cyclohexasiloxane/i,
    why: 'Occlusive film-former; D4/D5 siloxanes are restricted in the EU as persistent.',
    appliesTo: c,
  },
  {
    id: 'drying-alcohol',
    group: 'Drying alcohol',
    severity: 'low',
    weight: 5,
    once: true,
    patterns: /alcohol denat|\bsd alcohol\b|denatured alcohol/i,
    why: 'Volatile alcohol high in the ingredient list can dehydrate and irritate skin.',
    appliesTo: c,
  },
  {
    id: 'chemical-uv',
    group: 'Chemical UV filters',
    severity: 'medium',
    weight: 10,
    patterns: /oxybenzone|octinoxate|homosalate|octocrylene|benzophenone-3/i,
    why: 'UV filter absorbed through skin; flagged for endocrine activity and reef toxicity.',
    appliesTo: c,
  },
  {
    id: 'triclosan',
    group: 'Antibacterials',
    severity: 'high',
    weight: 18,
    patterns: /triclosan|triclocarban/i,
    why: 'Antibacterial linked to hormone disruption and antimicrobial resistance; banned in US soaps.',
    appliesTo: c,
  },

  // ------------------------------------------------------------- positives
  {
    id: 'whole-food',
    group: 'Whole ingredients',
    severity: 'positive',
    weight: 4,
    once: true,
    patterns: /\b(olive oil|extra virgin|avocado oil|coconut oil|grass[- ]fed|whole grain|sea salt)\b/i,
    why: 'Built on a recognisable whole-food fat or grain rather than a refined substitute.',
    appliesTo: f,
  },
  {
    id: 'gentle-surfactant',
    group: 'Gentle formulation',
    severity: 'positive',
    weight: 4,
    once: true,
    patterns: /coco[- ]?glucoside|decyl glucoside|lauryl glucoside|sodium cocoyl isethionate/i,
    why: 'Uses a mild sugar-derived surfactant instead of a harsh sulfate.',
    appliesTo: c,
  },
];

/**
 * Additive E-numbers considered high concern by the "avoid" lists these apps
 * publish. Anything else in `additives_tags` counts as a minor penalty.
 */
export const HIGH_RISK_ADDITIVES: Record<string, string> = {
  'en:e102': 'Tartrazine — azo dye linked to hyperactivity in children',
  'en:e104': 'Quinoline Yellow — azo dye restricted in several markets',
  'en:e110': 'Sunset Yellow — azo dye linked to hyperactivity',
  'en:e122': 'Carmoisine — azo dye linked to hyperactivity',
  'en:e124': 'Ponceau 4R — azo dye linked to hyperactivity',
  'en:e129': 'Allura Red — azo dye linked to hyperactivity',
  'en:e131': 'Patent Blue V — synthetic dye, allergenic',
  'en:e133': 'Brilliant Blue — synthetic dye',
  'en:e150d': 'Sulphite ammonia caramel — can contain 4-MEI',
  'en:e171': 'Titanium dioxide — banned as a food additive in the EU',
  'en:e173': 'Aluminium — heavy metal colouring',
  'en:e211': 'Sodium benzoate — forms benzene with vitamin C',
  'en:e220': 'Sulphur dioxide — common asthma trigger',
  'en:e221': 'Sodium sulphite — sulphite preservative',
  'en:e222': 'Sodium bisulphite — sulphite preservative',
  'en:e223': 'Sodium metabisulphite — sulphite preservative',
  'en:e249': 'Potassium nitrite — nitrosamine precursor',
  'en:e250': 'Sodium nitrite — nitrosamine precursor',
  'en:e251': 'Sodium nitrate — nitrosamine precursor',
  'en:e252': 'Potassium nitrate — nitrosamine precursor',
  'en:e319': 'TBHQ — synthetic antioxidant',
  'en:e320': 'BHA — possible endocrine disruptor',
  'en:e321': 'BHT — possible endocrine disruptor',
  'en:e407': 'Carrageenan — gut irritation in animal studies',
  'en:e621': 'MSG — flavour enhancer',
  'en:e900': 'Dimethylpolysiloxane — anti-foaming silicone',
  'en:e951': 'Aspartame — IARC "possibly carcinogenic" (2023)',
  'en:e950': 'Acesulfame K — synthetic sweetener',
  'en:e955': 'Sucralose — synthetic sweetener',
};

export const ADDITIVE_NAMES: Record<string, string> = {
  'en:e322': 'Lecithins',
  'en:e330': 'Citric acid',
  'en:e300': 'Ascorbic acid (vitamin C)',
  'en:e440': 'Pectin',
  'en:e412': 'Guar gum',
  'en:e415': 'Xanthan gum',
  'en:e471': 'Mono- and diglycerides',
  'en:e500': 'Sodium carbonates',
  'en:e503': 'Ammonium carbonates',
  'en:e160a': 'Carotenes',
};

/** Dietary preferences the user can switch on during onboarding. */
export interface DietFlag {
  id: string;
  label: string;
  emoji: string;
  /** Open Food Facts allergen / analysis tags that violate this preference. */
  violationTags: string[];
  /** Extra ingredient patterns that violate it. */
  pattern?: RegExp;
  description: string;
}

export const DIET_FLAGS: DietFlag[] = [
  {
    id: 'gluten-free',
    label: 'Gluten free',
    emoji: '🌾',
    violationTags: ['en:gluten'],
    pattern: /\b(wheat|barley|rye|malt|spelt|semolina|farro)\b/i,
    description: 'Flag gluten and gluten-containing grains',
  },
  {
    id: 'dairy-free',
    label: 'Dairy free',
    emoji: '🥛',
    violationTags: ['en:milk'],
    pattern: /\b(milk|lactose|whey|casein|butter|cream|cheese)\b/i,
    description: 'Flag milk proteins, whey and casein',
  },
  {
    id: 'nut-free',
    label: 'Nut free',
    emoji: '🥜',
    violationTags: ['en:nuts', 'en:peanuts'],
    pattern: /\b(peanut|almond|cashew|hazelnut|walnut|pecan|pistachio|macadamia)\b/i,
    description: 'Flag tree nuts and peanuts',
  },
  {
    id: 'soy-free',
    label: 'Soy free',
    emoji: '🫘',
    violationTags: ['en:soybeans'],
    pattern: /\bsoy(a|bean)?\b|lecithin de soja/i,
    description: 'Flag soy protein, lecithin and oil',
  },
  {
    id: 'egg-free',
    label: 'Egg free',
    emoji: '🥚',
    violationTags: ['en:eggs'],
    pattern: /\begg\b|albumen/i,
    description: 'Flag eggs and egg derivatives',
  },
  {
    id: 'vegan',
    label: 'Vegan',
    emoji: '🌱',
    violationTags: ['en:non-vegan'],
    description: 'Flag any animal-derived ingredient',
  },
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    emoji: '🥬',
    violationTags: ['en:non-vegetarian'],
    description: 'Flag meat, fish and gelatine',
  },
  {
    id: 'shellfish-free',
    label: 'Shellfish free',
    emoji: '🦐',
    violationTags: ['en:crustaceans', 'en:molluscs'],
    pattern: /\b(shrimp|prawn|crab|lobster|oyster|mussel|clam)\b/i,
    description: 'Flag crustaceans and molluscs',
  },
];

/** Extra concern groups the user can opt into avoiding. */
export interface AvoidPreference {
  id: string;
  label: string;
  emoji: string;
  /** Rule ids escalated to a hard flag when this preference is on. */
  ruleIds: string[];
  description: string;
}

export const AVOID_PREFERENCES: AvoidPreference[] = [
  {
    id: 'seed-oils',
    label: 'Seed oils',
    emoji: '🫗',
    ruleIds: ['seed-oils'],
    description: 'Canola, soybean, sunflower, corn, cottonseed',
  },
  {
    id: 'added-sugar',
    label: 'Added sugar',
    emoji: '🍬',
    ruleIds: ['added-sugar', 'hfcs'],
    description: 'Cane sugar, syrups, maltodextrin',
  },
  {
    id: 'sweeteners',
    label: 'Artificial sweeteners',
    emoji: '🧪',
    ruleIds: ['artificial-sweetener'],
    description: 'Aspartame, sucralose, acesulfame K',
  },
  {
    id: 'dyes',
    label: 'Artificial dyes',
    emoji: '🎨',
    ruleIds: ['artificial-colour'],
    description: 'Red 40, Yellow 5, titanium dioxide',
  },
  {
    id: 'preservatives',
    label: 'Synthetic preservatives',
    emoji: '🧴',
    ruleIds: ['nitrites', 'bha-bht'],
    description: 'Nitrites, BHA, BHT, TBHQ',
  },
  {
    id: 'fragrance',
    label: 'Fragrance & parfum',
    emoji: '🌸',
    ruleIds: ['fragrance', 'eu-allergens'],
    description: 'Undisclosed scent blends and allergens',
  },
  {
    id: 'endocrine',
    label: 'Endocrine disruptors',
    emoji: '⚠️',
    ruleIds: ['parabens', 'phthalates', 'chemical-uv', 'triclosan'],
    description: 'Parabens, phthalates, oxybenzone',
  },
  {
    id: 'sulfates',
    label: 'Sulfates',
    emoji: '🫧',
    ruleIds: ['sulfates'],
    description: 'SLS and SLES in cleansers',
  },
];
