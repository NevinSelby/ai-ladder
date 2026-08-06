import type { ArenaItem } from '@shared/content';

import { cite } from '../sources';

/**
 * Trade-off Arena seed bank.
 *
 * Every item states a constraint that makes the choice non-obvious, and several
 * are deliberately `defensible: 'either'`, because a real architecture review
 * is often won by the quality of the justification rather than by the option.
 * `keyPoints` are the reasoning beats the grader looks for in the player's
 * one-line defense.
 */
export const ARENA_SEED: ArenaItem[] = [
  {
    id: 'arena.vertex.vs.selfhost',
    mode: 'arena',
    nodeIds: ['gcp.geap', 'gcp.gke', 'del.tco'],
    difficulty: 'core',
    explanation:
      'The self-hosted path only pays for itself at sustained high utilisation, and it buys an operational burden the customer inherits. At pilot volumes the managed endpoint almost always wins on total cost once you price the engineer-hours.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A retailer wants a support assistant. Expected load is 200k requests/month, they have no ML platform team, and the pilot must be live in six weeks.',
      optionA: 'Managed Gemini endpoint on the Agent Platform',
      optionB: 'Self-hosted open-weights model on GKE with GPU node pools',
      defensible: 'A',
      keyPoints: [
        'At 200k/month the GPU floor cost dominates; utilisation is far too low to amortise it',
        'No ML platform team means self-hosting adds a permanent operational liability',
        'Six weeks does not accommodate capacity planning, quota requests and load testing',
        'Self-hosting becomes arguable at sustained high volume or a hard no-third-party-model rule',
      ],
      fieldTake:
        'Say the quiet part out loud in the room: self-hosting is not cheaper, it is differently expensive, and the difference is paid in headcount the customer does not have. Revisit the decision when sustained utilisation would keep a GPU busy, not before.',
    },
  },
  {
    id: 'arena.rag.vs.finetune',
    mode: 'arena',
    nodeIds: ['ai.finetune', 'ai.rag_failure'],
    difficulty: 'core',
    explanation:
      'Knowledge that changes weekly is a retrieval problem. Tuning bakes a snapshot into weights and then needs re-tuning every time the policy changes, an operational treadmill for a problem retrieval solves natively.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The assistant must answer from an internal policy handbook that the compliance team revises most weeks.',
      optionA: 'Fine-tune the model on the handbook',
      optionB: 'Retrieval over the handbook with citations',
      defensible: 'B',
      keyPoints: [
        'Weekly change makes tuning an endless re-training loop',
        'Retrieval gives citations, which a compliance audience will demand',
        'Corrections are a document edit rather than a training run',
        'Tuning remains the right tool for tone and output format, not for facts',
      ],
      fieldTake:
        'Customers ask for fine-tuning because it sounds more serious. Reframe on the axis they care about: how fast can a wrong answer be corrected? Retrieval answers in minutes; tuning answers next sprint.',
    },
  },
  {
    id: 'arena.psc.vs.vpcsc',
    mode: 'arena',
    nodeIds: ['gcp.psc', 'gcp.vpcsc'],
    difficulty: 'deep',
    explanation:
      'The stated worry is exfiltration by an authorised principal, which is a perimeter problem. Private connectivity is worth having and does not address it. Naming which control maps to which fear is the whole skill here.',
    diagramId: 'vpcsc-vs-psc',
    citations: cite('vpcsc', 'psc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A bank’s security architect says the risk that keeps them up is "an authorised engineer copying a dataset into a personal project". You have budget for one control this quarter.',
      optionA: 'Private Service Connect for all Google API access',
      optionB: 'A VPC Service Controls perimeter around the data projects',
      defensible: 'B',
      keyPoints: [
        'The stated threat is an authorised principal, so network path controls do not apply',
        'A perimeter blocks API-level copies to projects outside it, which is exactly the threat',
        'PSC is complementary and addresses a different (reachability) concern',
        'Matching the control to the stated fear is what earns architectural credibility',
      ],
      fieldTake:
        'Both belong in the end state. Sequencing by the threat the customer actually named, rather than by what is easier to deploy, is what makes a security architect trust the rest of your design.',
    },
  },
  {
    id: 'arena.agent.vs.workflow',
    mode: 'arena',
    nodeIds: ['ai.agents', 'ai.tool_calling', 'del.risk_sequencing'],
    difficulty: 'deep',
    explanation:
      'A deterministic path with a fixed number of steps is a workflow. Wrapping it in an agent loop adds non-determinism, latency and cost to buy flexibility the process does not need, and makes auditing far harder in a regulated setting.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'An insurer wants to automate a five-step claim intake. The steps are fixed and the order never varies, but two of them need judgment about free-text notes.',
      optionA: 'An autonomous agent with tools for all five steps',
      optionB: 'A deterministic workflow that calls the model only at the two judgment steps',
      defensible: 'B',
      keyPoints: [
        'Fixed order means the planning an agent buys you has no value here',
        'Each model call is a failure and cost surface; two beats five',
        'A workflow is auditable step by step, which an insurer will require',
        'Agentic orchestration earns its place when the path genuinely varies per case',
      ],
      fieldTake:
        'The field default is inverted from the conference default: use the model for the parts that need judgment and ordinary code for everything else. "Agent" is an architecture, not a goal.',
    },
  },
  {
    id: 'arena.pilot.region',
    mode: 'arena',
    nodeIds: ['sec.residency', 'del.pilot_to_prod'],
    difficulty: 'deep',
    explanation:
      'This one is genuinely arguable and the justification carries the signal. Piloting in an unconstrained region is faster but builds a migration and a residency conversation into the critical path just as the security review begins.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'An EU customer needs a pilot in four weeks. The model configuration you want is generally available in us-central1 today and in europe-west4 "soon". Their production commitment is EU-only.',
      optionA: 'Pilot in us-central1 with synthetic data, migrate before production',
      optionB: 'Pilot in europe-west4 with the configuration available there today',
      defensible: 'either',
      keyPoints: [
        'Option A is only safe if genuinely no customer data touches the region, synthetic must mean synthetic',
        'Option B keeps the residency story clean, which matters when the security review lands',
        'Either way the migration risk and the "soon" dependency must be named to the customer now',
        'The wrong answer is picking one and not telling them which risk they just accepted',
      ],
      fieldTake:
        'Both are defensible; neither is defensible silently. What loses trust is a customer discovering in week seven that their pilot ran outside the EU because nobody raised it.',
    },
  },
  {
    id: 'arena.eval.humans',
    mode: 'arena',
    nodeIds: ['ai.evals', 'ai.llm_judge', 'del.poc_exit'],
    difficulty: 'core',
    explanation:
      'A judge you have not calibrated against human labels is a number generator. The usual sequence is a small human-labeled set first, then a judge validated against it, then scale. The human set is what makes the judge’s output mean anything.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'You need an eval for a support assistant by Friday. You can get four hours of a domain expert’s time, or none.',
      optionA: 'Spend the four hours having the expert label 50 cases, then build an LLM judge against them',
      optionB: 'Skip the expert and build an LLM judge from the product documentation',
      defensible: 'A',
      keyPoints: [
        'Without human labels the judge is unvalidated and its agreement rate is unknown',
        'Fifty expert-labeled cases is enough to measure judge agreement and catch gross miscalibration',
        'The labeled set doubles as the regression suite for every later change',
        'Expert time is the scarce input; spend it on judgment, not on volume',
      ],
      fieldTake:
        'Ask for the expert hours early and specifically, "four hours, fifty cases, this week" gets a yes far more often than "we will need some SME time at some point".',
    },
  },
  {
    id: 'arena.demo.scope',
    mode: 'arena',
    nodeIds: ['cust.expectations', 'del.thin_slice'],
    difficulty: 'core',
    explanation:
      'A polished demo on curated data sets an expectation you then spend the engagement walking back. A rougher demo on the customer’s own messy data is less impressive on the day and dramatically better for the project.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'You have three days before an executive demo. You can polish the interface, or wire the pipeline to the customer’s actual (messy) data.',
      optionA: 'Polish the interface, demo on curated examples',
      optionB: 'Wire real data, demo something rougher that fails on some records',
      defensible: 'B',
      keyPoints: [
        'A curated demo sets an expectation the real data cannot meet',
        'Failing records on stage start the data-quality conversation you need to have anyway',
        'Executives discount polish; they remember that you showed them their own data',
        'It surfaces integration risk while there is still time to act on it',
      ],
      fieldTake:
        'Say it explicitly on the day: "this is your data, unfiltered, and here is where it breaks." You convert a demo into a working session, and you never have to un-promise anything later.',
    },
  },
  {
    id: 'arena.chunk.size',
    mode: 'arena',
    nodeIds: ['ai.chunking', 'ai.rerank'],
    difficulty: 'deep',
    explanation:
      'Large chunks preserve context and dilute the embedding; small chunks retrieve precisely and lose surrounding meaning. Parent-document retrieval sidesteps the trade, embed small, return the enclosing section, which is why the framing as a binary is itself the trap.',
    diagramId: 'rag-pipeline',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Retrieval over dense technical manuals is returning chunks that are individually correct but missing the surrounding context the answer needs.',
      optionA: 'Increase chunk size to 2000 tokens',
      optionB: 'Keep small chunks for embedding but return the enclosing parent section',
      defensible: 'B',
      keyPoints: [
        'Bigger chunks dilute the embedding and reduce retrieval precision',
        'Parent-document retrieval separates the matching unit from the returned unit',
        'It keeps top-k meaningful while giving the model surrounding context',
        'Reranking over parents costs more tokens, a real trade to name, not to hide',
      ],
      fieldTake:
        'When a customer frames a problem as one slider, the useful move is usually to point out there are two: what you match on and what you return.',
    },
  },
];
