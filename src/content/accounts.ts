/**
 * The Account Board.
 *
 * You are a forward deployed engineer at Meridian AI, a GCP-native AI platform
 * company. Four accounts run in parallel, each stuck on a different hard part of
 * the job. Sessions advance an account; bad calls damage it.
 *
 * Health and expectations are deliberately separate bars. Health is whether the
 * engagement is going well. Expectations is how much you have promised, it only
 * ever rises when you overpromise, and a high expectations bar makes every later
 * session harder to pass, which is the honest simulation of what overpromising
 * actually costs you.
 */

export const ACCOUNT_PHASES = [
  'discovery',
  'scoping',
  'pilot',
  'hardening',
  'production',
  'handover',
] as const;
export type AccountPhase = (typeof ACCOUNT_PHASES)[number];

export const PHASE_META: Record<AccountPhase, { label: string; blurb: string }> = {
  discovery: { label: 'Discovery', blurb: 'Understand the problem before anyone writes code.' },
  scoping: { label: 'Scoping', blurb: 'Turn the ask into a defensible boundary and a plan.' },
  pilot: { label: 'Pilot', blurb: 'Prove the risky part end to end on real data.' },
  hardening: { label: 'Hardening', blurb: 'Security review, SLOs, and everything a demo skipped.' },
  production: { label: 'Production', blurb: 'Live, with real users and real consequences.' },
  handover: { label: 'Handover', blurb: 'Leave without the thing rotting behind you.' },
};

export type AccountStatus = 'active' | 'churned' | 'recovered' | 'complete';

export interface AccountDef {
  id: string;
  name: string;
  industry: string;
  /** One line on the board card. */
  hook: string;
  /** The genuinely hard part: shown when you open the account. */
  hardPart: string;
  /** Constraints that color every scenario for this account. */
  constraints: string[];
  /** Taxonomy branches this account leans on, used to route sessions. */
  emphasis: string[];
  /** Two-letter monogram for the board card. */
  monogram: string;
  accent: string;
}

export const ACCOUNTS: AccountDef[] = [
  {
    id: 'stbrigid',
    name: 'St. Brigid Health Network',
    industry: 'Healthcare',
    monogram: 'SB',
    accent: '#3FDDB2',
    hook: 'Clinical documentation assistant across three hospitals.',
    hardPart:
      'PHI cannot leave their environment, Epic is the only path into the record, and no clinician adopts anything until counsel answers who is accountable for an AI-drafted note.',
    constraints: [
      'No PHI egress',
      'HIPAA / BAA scope',
      'Epic integration queue: 6 months',
      'Clinician trust is the real gate',
    ],
    emphasis: ['security_compliance', 'customer_craft', 'delivery_economics'],
  },
  {
    id: 'kestrel',
    name: 'Kestrel Bank',
    industry: 'Financial services',
    monogram: 'KB',
    accent: '#5AA2FF',
    hook: 'Unify fraud detection across three acquired banks in 90 days.',
    hardPart:
      'Three systems that each defined "fraud" differently, so there is no ground truth to model against, and everything must stay in the EU.',
    constraints: [
      'EU residency, processing included',
      '90-day board checkpoint',
      'Three incompatible label sets',
      'One source system is batch-only',
    ],
    emphasis: ['data_integration', 'security_compliance', 'delivery_economics'],
  },
  {
    id: 'arbor',
    name: 'Arbor Pharma',
    industry: 'Life sciences',
    monogram: 'AP',
    accent: '#BC93FF',
    hook: 'Research assistant over internal and published literature.',
    hardPart:
      'The moment it ranks anything rather than retrieving it, the EU AI Act classification changes, and their compliance function has not been in a single meeting.',
    constraints: [
      'EU AI Act exposure',
      'IP and confidentiality on internal research',
      'Compliance function not yet engaged',
      'Human must remain the decision-maker',
    ],
    emphasis: ['ai_engineering', 'security_compliance', 'customer_craft'],
  },
  {
    id: 'northwind',
    name: 'Northwind Logistics',
    industry: 'Transport & logistics',
    monogram: 'NW',
    accent: '#FF9563',
    hook: 'Predicted delivery ETAs from the telematics fleet feed.',
    hardPart:
      'A previous vendor failed here, the CTO is openly skeptical, and "real-time" was asserted by someone who never checked what actually consumes an ETA.',
    constraints: [
      'Prior failed vendor attempt',
      'Skeptical technical buyer',
      'Telematics dropouts in rural areas',
      'No agreed accuracy baseline',
    ],
    emphasis: ['data_integration', 'ai_engineering', 'customer_craft'],
  },
];

export const ACCOUNTS_BY_ID: Record<string, AccountDef> = Object.fromEntries(
  ACCOUNTS.map((account) => [account.id, account])
);

/** Health thresholds that change how an account reads on the board. */
export function healthBand(health: number): { label: string; tone: 'good' | 'warn' | 'bad' } {
  if (health >= 70) return { label: 'Healthy', tone: 'good' };
  if (health >= 40) return { label: 'At risk', tone: 'warn' };
  return { label: 'Critical', tone: 'bad' };
}

export function expectationsBand(expectations: number): {
  label: string;
  tone: 'good' | 'warn' | 'bad';
} {
  if (expectations <= 45) return { label: 'Grounded', tone: 'good' };
  if (expectations <= 70) return { label: 'Running hot', tone: 'warn' };
  return { label: 'Overpromised', tone: 'bad' };
}
