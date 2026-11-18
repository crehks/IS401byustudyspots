import type { Verdict } from './llm.ts';

// Backup used only when Gemini keeps failing. Hard-coded spam checks, no AI.
const SPAM_TERMS = [
  'free money', 'giveaway', 'crypto', 'bitcoin', 'casino', 'viagra', 'click here', 'buy now',
  'whatsapp', 'telegram', 'promo code', 'discount code', 'payday loan', 'forex', 'onlyfans', 'cheap watches',
];

const CHECKS: [RegExp | ((t: string) => boolean), string][] = [
  [/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|biz|info|xyz|ru|co|io|me|ly)\b)/i, 'contains a link'],
  [/\S+@\S+\.\S+/, 'contains an email address'],
  [/\+?\d[\d\s().-]{8,}\d/, 'contains a phone number'],
  [/(.)\1{5,}/, 'has repeated-character junk'],
  [/[bcdfghjklmnpqrstvwxz]{7,}/i, 'looks like gibberish'],
  [(t) => (t.match(/[a-z]/gi)?.length ?? 0) < 2, 'has no readable text'],
  [(t) => { const l = t.match(/[a-z]/gi) ?? []; return l.length >= 25 && l.filter((c) => c === c.toUpperCase()).length / l.length > 0.8; }, 'is all capitals'],
  [(t) => SPAM_TERMS.some((s) => t.toLowerCase().includes(s)), 'contains spam wording'],
];

export function ruleCheck(body: string, selfNoise: string | null, selfCrowd: string | null): Verdict | null {
  for (const [test, why] of CHECKS) {
    const hit = typeof test === 'function' ? test(body) : test.test(body);
    if (hit) return { noise: 'low', crowd: 'low', valid: false, reason: `Rejected by backup rules: ${why}.` };
  }
  if (!['low', 'medium', 'high'].includes(selfNoise ?? '') || !['low', 'medium', 'high'].includes(selfCrowd ?? '')) return null;
  return {
    noise: selfNoise as Verdict['noise'],
    crowd: selfCrowd as Verdict['crowd'],
    valid: true,
    reason: 'Approved by backup rules while the AI was busy; levels as chosen by the student.',
  };
}
