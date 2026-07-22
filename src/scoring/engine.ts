/**
 * Turns a normalised product plus the user's preferences into a 0–100 score,
 * a verdict tier and an itemised list of flags.
 *
 * Design rule: every point lost must be attributable to a visible flag. The UI
 * renders `flags` directly, so there is no hidden arithmetic.
 */
import { Product } from '@/src/api/types';
import { VerdictTier, tierForScore } from '@/src/theme';

import {
  ADDITIVE_NAMES,
  AVOID_PREFERENCES,
  DIET_FLAGS,
  HIGH_RISK_ADDITIVES,
  INGREDIENT_RULES,
  Severity,
} from './rules';

export interface Flag {
  id: string;
  group: string;
  title: string;
  detail: string;
  severity: Severity;
  points: number;
  /** True when it violates something the user explicitly chose to avoid. */
  personal?: boolean;
  /** Ingredient text that triggered it, when applicable. */
  match?: string;
}

export interface Preferences {
  diets: string[];
  avoid: string[];
}

export interface Assessment {
  score: number;
  tier: VerdictTier;
  flags: Flag[];
  positives: Flag[];
  concerns: Flag[];
  /** Hard conflicts with the user's diet — shown as a banner, not just a flag. */
  personalAlerts: Flag[];
  breakdown: { label: string; value: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }[];
  dataCompleteness: number;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function prettyAdditive(tag: string): string {
  const known = HIGH_RISK_ADDITIVES[tag] ?? ADDITIVE_NAMES[tag];
  if (known) return known;
  return tag.replace(/^en:/, '').toUpperCase();
}

export function prettyTag(tag: string): string {
  return tag
    .replace(/^[a-z]{2}:/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function nutrientFlags(p: Product): Flag[] {
  const flags: Flag[] = [];
  const n = p.nutriments;

  const add = (id: string, title: string, detail: string, severity: Severity, points: number) =>
    flags.push({ id, group: 'Nutrition', title, detail, severity, points });

  if (n.sugars !== undefined) {
    if (n.sugars > 22.5) add('sugar-high', 'High in sugar', `${n.sugars.toFixed(1)} g per 100 g — above the 22.5 g high threshold.`, 'high', 12);
    else if (n.sugars > 10) add('sugar-mid', 'Moderate sugar', `${n.sugars.toFixed(1)} g per 100 g.`, 'low', 5);
  }
  if (n.saturatedFat !== undefined) {
    if (n.saturatedFat > 5) add('satfat-high', 'High in saturated fat', `${n.saturatedFat.toFixed(1)} g per 100 g — above the 5 g high threshold.`, 'medium', 9);
    else if (n.saturatedFat > 1.5) add('satfat-mid', 'Moderate saturated fat', `${n.saturatedFat.toFixed(1)} g per 100 g.`, 'low', 3);
  }
  if (n.salt !== undefined) {
    if (n.salt > 1.5) add('salt-high', 'High in salt', `${n.salt.toFixed(2)} g per 100 g — above the 1.5 g high threshold.`, 'medium', 9);
    else if (n.salt > 0.3) add('salt-mid', 'Moderate salt', `${n.salt.toFixed(2)} g per 100 g.`, 'low', 3);
  }
  if (n.fiber !== undefined && n.fiber >= 6) {
    add('fiber-good', 'Good source of fibre', `${n.fiber.toFixed(1)} g per 100 g.`, 'positive', 4);
  }
  if (n.proteins !== undefined && n.proteins >= 12) {
    add('protein-good', 'High in protein', `${n.proteins.toFixed(1)} g per 100 g.`, 'positive', 3);
  }
  return flags;
}

function processingFlags(p: Product): Flag[] {
  const flags: Flag[] = [];

  if (p.novaGroup === 4) {
    flags.push({
      id: 'nova-4',
      group: 'Processing',
      title: 'Ultra-processed food',
      detail: 'NOVA group 4 — industrially formulated from refined substances and additives.',
      severity: 'high',
      points: 22,
    });
  } else if (p.novaGroup === 3) {
    flags.push({
      id: 'nova-3',
      group: 'Processing',
      title: 'Processed food',
      detail: 'NOVA group 3 — a whole food with sugar, salt or oil added.',
      severity: 'low',
      points: 8,
    });
  } else if (p.novaGroup === 1) {
    flags.push({
      id: 'nova-1',
      group: 'Processing',
      title: 'Unprocessed',
      detail: 'NOVA group 1 — whole or minimally processed food.',
      severity: 'positive',
      points: 6,
    });
  }

  const grade = p.nutriScore?.toLowerCase();
  const nutriPenalty: Record<string, number> = { a: 0, b: 4, c: 10, d: 16, e: 22 };
  if (grade && grade in nutriPenalty && nutriPenalty[grade] > 0) {
    flags.push({
      id: `nutriscore-${grade}`,
      group: 'Nutrition',
      title: `Nutri-Score ${grade.toUpperCase()}`,
      detail: 'The EU front-of-pack nutritional grade for this product.',
      severity: nutriPenalty[grade] >= 16 ? 'high' : nutriPenalty[grade] >= 10 ? 'medium' : 'low',
      points: nutriPenalty[grade],
    });
  } else if (grade === 'a') {
    flags.push({
      id: 'nutriscore-a',
      group: 'Nutrition',
      title: 'Nutri-Score A',
      detail: 'Best nutritional grade on the EU scale.',
      severity: 'positive',
      points: 5,
    });
  }

  if (p.labels.some((l) => /organic|bio\b/i.test(l))) {
    flags.push({
      id: 'organic',
      group: 'Sourcing',
      title: 'Certified organic',
      detail: 'Grown without most synthetic pesticides and fertilisers.',
      severity: 'positive',
      points: 5,
    });
  }
  if (p.analysisTags.includes('en:palm-oil')) {
    flags.push({
      id: 'palm-tag',
      group: 'Palm oil',
      title: 'Contains palm oil',
      detail: 'Detected by ingredient analysis.',
      severity: 'low',
      points: 5,
    });
  }
  return flags;
}

function additiveFlags(p: Product): Flag[] {
  const risky = p.additives.filter((t) => t in HIGH_RISK_ADDITIVES);
  const benign = p.additives.filter((t) => !(t in HIGH_RISK_ADDITIVES));
  const flags: Flag[] = risky.map((tag) => ({
    id: `additive-${tag}`,
    group: 'Additives',
    title: prettyTag(tag).toUpperCase(),
    detail: HIGH_RISK_ADDITIVES[tag],
    severity: 'high' as Severity,
    points: 9,
  }));

  if (benign.length >= 3) {
    flags.push({
      id: 'additive-count',
      group: 'Additives',
      title: `${benign.length} other additives`,
      detail: benign.slice(0, 6).map(prettyAdditive).join(', ') + (benign.length > 6 ? '…' : ''),
      severity: 'low',
      points: Math.min(8, benign.length),
    });
  }
  return flags;
}

function ingredientFlags(p: Product, avoid: string[]): Flag[] {
  const haystack = [p.ingredientsText, ...p.ingredientList].join(' | ');
  if (!haystack.trim()) return [];

  const avoidedRuleIds = new Set(
    AVOID_PREFERENCES.filter((a) => avoid.includes(a.id)).flatMap((a) => a.ruleIds),
  );

  const flags: Flag[] = [];
  for (const rule of INGREDIENT_RULES) {
    if (!rule.appliesTo.includes(p.kind)) continue;

    const matches = rule.once
      ? haystack.match(rule.patterns)
        ? [haystack.match(rule.patterns)![0]]
        : []
      : Array.from(new Set(p.ingredientList.filter((i) => rule.patterns.test(i))));

    if (!matches.length) continue;

    const personal = avoidedRuleIds.has(rule.id);
    const hits = rule.once ? 1 : Math.min(matches.length, 3);
    flags.push({
      id: `rule-${rule.id}`,
      group: rule.group,
      title: rule.once
        ? rule.group
        : `${rule.group}: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '…' : ''}`,
      detail: rule.why,
      severity: rule.severity,
      points: rule.severity === 'positive' ? rule.weight : rule.weight * hits * (personal ? 1.6 : 1),
      personal: personal || undefined,
      match: matches[0],
    });
  }
  return flags;
}

function dietFlags(p: Product, diets: string[]): Flag[] {
  if (!diets.length) return [];
  const haystack = [p.ingredientsText, ...p.ingredientList].join(' | ');
  const tags = new Set([...p.allergens, ...p.traces, ...p.analysisTags]);

  return DIET_FLAGS.filter((d) => diets.includes(d.id)).flatMap((d) => {
    const tagHit = d.violationTags.find((t) => tags.has(t));
    const patternHit = !tagHit && d.pattern ? haystack.match(d.pattern)?.[0] : undefined;
    if (!tagHit && !patternHit) return [];
    return [
      {
        id: `diet-${d.id}`,
        group: 'Your preferences',
        title: `Not ${d.label.toLowerCase()}`,
        detail: tagHit
          ? `Declared ${prettyTag(tagHit).toLowerCase()} on the label.`
          : `Ingredient list mentions "${patternHit}".`,
        severity: 'high' as Severity,
        points: 30,
        personal: true,
        match: patternHit,
      },
    ];
  });
}

function completeness(p: Product): number {
  const checks = [
    !!p.name && p.name !== 'Unnamed product',
    !!p.ingredientsText,
    !!p.imageUrl,
    p.kind === 'cosmetic' ? true : p.novaGroup !== undefined,
    p.kind === 'cosmetic' ? true : Object.values(p.nutriments).some((v) => v !== undefined),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function breakdownFor(p: Product): Assessment['breakdown'] {
  if (p.kind === 'cosmetic') {
    return [
      { label: 'Ingredients', value: p.ingredientList.length ? `${p.ingredientList.length} listed` : 'Unknown', tone: p.ingredientList.length ? 'neutral' : 'warn' },
    ];
  }
  const n = p.nutriments;
  const row = (label: string, v: number | undefined, unit: string, warn: number, bad: number) => ({
    label,
    value: v === undefined ? '—' : `${v.toFixed(v < 10 ? 1 : 0)}${unit}`,
    tone: v === undefined ? ('neutral' as const) : v > bad ? ('bad' as const) : v > warn ? ('warn' as const) : ('good' as const),
  });
  return [
    { label: 'Energy', value: n.energyKcal === undefined ? '—' : `${Math.round(n.energyKcal)} kcal`, tone: 'neutral' },
    row('Sugar', n.sugars, ' g', 10, 22.5),
    row('Sat. fat', n.saturatedFat, ' g', 1.5, 5),
    row('Salt', n.salt, ' g', 0.3, 1.5),
    { label: 'Protein', value: n.proteins === undefined ? '—' : `${n.proteins.toFixed(1)} g`, tone: 'neutral' },
  ];
}

export function assess(product: Product, prefs: Preferences): Assessment {
  const all: Flag[] = [
    ...dietFlags(product, prefs.diets),
    ...ingredientFlags(product, prefs.avoid),
    ...(product.kind === 'food'
      ? [...processingFlags(product), ...additiveFlags(product), ...nutrientFlags(product)]
      : []),
  ];

  // De-dupe: keep the harshest instance of any group/id collision.
  const byId = new Map<string, Flag>();
  for (const flag of all) {
    const prev = byId.get(flag.id);
    if (!prev || flag.points > prev.points) byId.set(flag.id, flag);
  }

  // The ingredient rule and the palm-oil analysis tag describe the same finding.
  if (byId.has('rule-palm-oil')) byId.delete('palm-tag');

  const flags = Array.from(byId.values());

  const penalties = flags.filter((f) => f.severity !== 'positive');
  const positives = flags.filter((f) => f.severity === 'positive');

  const penalty = penalties.reduce((sum, f) => sum + f.points, 0);
  const bonus = Math.min(
    12,
    positives.reduce((sum, f) => sum + f.points, 0),
  );

  // A short, clean ingredient list is itself a signal.
  const listLength = product.ingredientList.length;
  const simplicityBonus = listLength > 0 && listLength <= 5 ? 6 : listLength <= 8 ? 3 : 0;

  let score = clamp(100 - penalty + bonus + simplicityBonus);

  // Anything the user personally chose to avoid caps the score — a "clean" score
  // must never appear on a product that breaks their own rules.
  const personalAlerts = flags.filter((f) => f.personal);
  if (personalAlerts.length) score = Math.min(score, 38);

  // No ingredient data at all means we cannot honestly call it clean.
  if (!product.ingredientsText) score = Math.min(score, 55);

  const severityRank: Record<Severity, number> = { high: 0, medium: 1, low: 2, positive: 3 };
  const sorted = [...flags].sort(
    (a, b) =>
      Number(!!b.personal) - Number(!!a.personal) ||
      severityRank[a.severity] - severityRank[b.severity] ||
      b.points - a.points,
  );

  return {
    score: Math.round(score),
    tier: tierForScore(score),
    flags: sorted,
    concerns: sorted.filter((f) => f.severity !== 'positive'),
    positives: sorted.filter((f) => f.severity === 'positive'),
    personalAlerts,
    breakdown: breakdownFor(product),
    dataCompleteness: completeness(product),
  };
}

/** Lightweight score used for ranking swap candidates without a full record. */
export function quickScore(nutriScore?: string, novaGroup?: number): number {
  const nutri: Record<string, number> = { a: 92, b: 78, c: 60, d: 42, e: 26 };
  const nova: Record<number, number> = { 1: 92, 2: 78, 3: 58, 4: 32 };
  const parts = [
    nutriScore ? nutri[nutriScore.toLowerCase()] : undefined,
    novaGroup ? nova[novaGroup] : undefined,
  ].filter((v): v is number => v !== undefined);
  if (!parts.length) return 50;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}
