import type { ArenaItem } from '@shared/content';

import { cite } from '../sources';

/** Second wave of Trade-off Arena calls, weighted toward the conversations
 *  that actually decide enterprise AI deals. */
export const ARENA_EXPANSION: ArenaItem[] = [
  {
    id: 'arena.x.rag_vs_finetune',
    mode: 'arena',
    nodeIds: ['ai.finetune', 'ai.chunking', 'del.tco'],
    difficulty: 'core',
    explanation:
      'The knowledge changes weekly, which settles it: fine-tuning freezes knowledge at training time, so the tuned model is stale by the second sprint. Retrieval keeps the knowledge in a store you can update in minutes. Fine-tuning earns its place for style and format, not for facts with a shelf life.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A retailer wants an assistant answering questions about products and policies. The catalog changes weekly; policies change monthly. They have heard fine-tuning "makes the model an expert".',
      optionA: 'RAG over the catalog and policy documents',
      optionB: 'Fine-tune the model on catalog and policy text',
      defensible: 'A',
      keyPoints: [
        'Weekly-changing knowledge in weights means retraining on every catalog update',
        'Retrieval updates in minutes: re-index the changed documents and the answers follow',
        'RAG cites its sources, which support teams need for trust and audits',
        'Fine-tuning remains right for tone and format, a separate, compatible decision',
      ],
      fieldTake:
        'The line that lands in the room: weights are for how the model talks, retrieval is for what it knows. Anything with a shelf life goes in the retrieval store, and the customer stops asking for fine-tuning once they hear what retraining cadence would cost.',
    },
  },
  {
    id: 'arena.x.buffer_vs_shed',
    mode: 'arena',
    nodeIds: ['scale.queueing', 'scale.degradation', 'scale.load_shape'],
    difficulty: 'deep',
    explanation:
      'A queue in front of a fixed-capacity model endpoint trades latency for completeness; shedding trades completeness for latency. For a support assistant, a queued answer that arrives in thirty seconds is still an answer, while a shed request is a support ticket. Under sustained overload, though, an unbounded queue is just an outage with extra steps, so the queue needs a depth bound and a shed path anyway.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Your support assistant’s model quota caps throughput at 50 requests/second. Marketing runs a campaign; traffic will briefly triple. Latency matters, but an unanswered customer usually becomes a phone call.',
      optionA: 'Queue excess requests and answer everyone, slower',
      optionB: 'Shed excess load fast with a clean "try again shortly"',
      defensible: 'either',
      keyPoints: [
        'A queued answer in tens of seconds beats a shed request that becomes a phone call',
        'Bursts drain; sustained overload does not, and an unbounded queue then hides an outage',
        'Bound the queue depth and shed beyond it: the real answer is both, sequenced',
        'Whichever you pick, tell the user what is happening; silent slowness reads as broken',
      ],
      fieldTake:
        'The senior answer is a bounded queue with load shedding past the bound, and honest UI during the wait. The junior answers are the two extremes: an infinite queue that melts under sustained load, or aggressive shedding that converts a survivable burst into a call-center spike.',
    },
  },
  {
    id: 'arena.x.regional_vs_global',
    mode: 'arena',
    nodeIds: ['sec.residency', 'scale.multiregion', 'gcp.ai_residency'],
    difficulty: 'deep',
    explanation:
      'The contract says EU processing, and inference is processing. The global endpoint’s latency and availability advantages are real, and irrelevant, because the alternative is explaining to the customer’s DPO why prompts transited another continent. Constraint first, optimization second.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'An EU insurer’s DPA commits all personal-data processing to the EU. Prompts contain policyholder data. The global model endpoint offers better availability and shared capacity; the regional EU endpoint occasionally queues at peak.',
      optionA: 'Regional EU endpoint, and engineer around peak-time capacity',
      optionB: 'Global endpoint for availability, since data is encrypted in transit',
      defensible: 'A',
      keyPoints: [
        'Inference is processing; a global endpoint may process outside the EU',
        'Encryption in transit protects against eavesdroppers, not against the contract',
        'Peak queuing is an engineering problem: provisioned throughput, retries, off-peak batching',
        'A residency breach is not an incident, it is a regulator conversation and a churned account',
      ],
      fieldTake:
        'When a constraint is contractual, the trade-off conversation is over before it starts; the only engineering question is how to live well inside the constraint. Say that early and you save the room an hour of optimizing the option that was never available.',
    },
  },
  {
    id: 'arena.x.human_review',
    mode: 'arena',
    nodeIds: ['ai.guardrails', 'del.pilot_to_prod', 'cust.expectations'],
    difficulty: 'core',
    explanation:
      'Full automation on day one bets the customer relationship on the model’s worst week. Confidence-routed review keeps humans on the cases where the model is unsure, builds the labeled dataset that later justifies raising the automation rate, and gives the customer a dial instead of a cliff.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A lender wants AI-drafted responses to customer complaints. Regulators read these responses. The team is confident in the model after a strong eval run.',
      optionA: 'Ship fully automated responses now; evals look strong',
      optionB: 'Ship with confidence-routed human review, and raise the automation rate with evidence',
      defensible: 'B',
      keyPoints: [
        'Regulated communications carry asymmetric downside: one bad letter outweighs a thousand good ones',
        'Confidence routing concentrates human attention where the model is least sure',
        'The review queue produces labeled data that justifies each step up in automation',
        'Offline evals sample yesterday’s distribution; production traffic will drift beyond it',
      ],
      fieldTake:
        'Frame review as a launch accelerant, not a brake: the customer says yes faster when there is a human dial, and the dial turns itself down as the evidence accumulates. "Automate the confidence, review the doubt" fits on the slide the sponsor shows their board.',
    },
  },
  {
    id: 'arena.x.build_vs_buy_evals',
    mode: 'arena',
    nodeIds: ['ai.evals', 'ai.observability', 'del.tco'],
    difficulty: 'deep',
    explanation:
      'Platforms are excellent at trace storage, dashboards and comparison UI, the undifferentiated plumbing. The golden sets, judge prompts and pass thresholds are the product’s judgment encoded, and outsourcing judgment is how teams end up green-dashboard-confident about a failing assistant.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Your team needs evaluation for a customer-facing agent. An observability vendor offers a polished eval suite; building bespoke evals would take two engineers about three weeks.',
      optionA: 'Adopt the vendor’s eval platform',
      optionB: 'Build bespoke evals for your critical paths',
      defensible: 'either',
      keyPoints: [
        'Vendor platforms solve storage, dashboards and diffing well; that plumbing is not your product',
        'Golden sets and judge criteria encode your domain judgment; those cannot be bought',
        'The pragmatic split: vendor rails, your test cases and judges on top',
        'Three weeks of bespoke work is cheap against one production regression in front of the customer',
      ],
      fieldTake:
        'The trap in "buy" is buying the defaults: generic helpfulness scores that stay green while your domain-specific failure modes climb. Buy the rails if you like, but the cases and the bar are yours to write, and that work is most of the three weeks anyway.',
    },
  },
  {
    id: 'arena.x.psc_vs_allowlist',
    mode: 'arena',
    nodeIds: ['gcp.psc', 'sec.zero_trust', 'gcp.vpc'],
    difficulty: 'core',
    explanation:
      'An IP allowlist on a public endpoint still means the customer’s data egresses to a public address, still breaks when NAT ranges shift, and still fails the security questionnaire’s "no public exposure" row. Private Service Connect keeps the traffic on private addressing and turns the security review into a short conversation.',
    citations: cite('psc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A bank must call your managed API from inside their VPC. Their security questionnaire has a hard "no public endpoints" requirement. Your API currently has a public endpoint with IP allowlisting.',
      optionA: 'Publish the service over Private Service Connect into their VPC',
      optionB: 'Keep the public endpoint and tighten the IP allowlist',
      defensible: 'A',
      keyPoints: [
        'The questionnaire requirement is binary: an allowlisted public endpoint is still public',
        'PSC keeps traffic on private addressing; nothing to allowlist, nothing to drift',
        'Allowlists rot: NAT ranges change and the 3am failure is an unreachable API',
        'PSC also scales to the next bank without renegotiating network posture each time',
      ],
      fieldTake:
        'Sell the operational story, not just the security one: PSC is the option where nobody maintains a list, nobody’s NAT migration causes an outage, and the next customer onboards with the same pattern. Security teams say yes to it because there is nothing to keep saying yes to.',
    },
  },
  {
    id: 'arena.x.stream_vs_batch',
    mode: 'arena',
    nodeIds: ['data.batch_stream', 'del.thin_slice', 'del.tco'],
    difficulty: 'core',
    explanation:
      'The dashboard drives a weekly operations meeting: the decision cadence is weekly, so daily batch already over-serves it. Streaming buys freshness nobody consumes, and its bill arrives in operational complexity, exactly-once bookkeeping, and on-call. Match the pipeline to the decision cadence, not the technology fashion.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A logistics customer wants a "real-time" analytics dashboard for warehouse throughput. Probing reveals it feeds a weekly operations review, and the warehouse systems export data hourly at best.',
      optionA: 'Streaming pipeline with sub-minute freshness',
      optionB: 'Scheduled batch aggregation, hourly or daily',
      defensible: 'B',
      keyPoints: [
        'Decision cadence is weekly; sub-minute freshness serves no decision anyone makes',
        'Source systems export hourly, capping true freshness regardless of pipeline',
        'Streaming’s cost is mostly operational: state, replays, exactly-once, on-call',
        '"Real-time" in a requirements doc usually means "not stale", which hourly satisfies',
      ],
      fieldTake:
        'Ask what decision the data feeds and how often that decision gets made, out loud, in the meeting. "Real-time" evaporates under that question more often than not, and the customer respects the person who saved them the streaming bill they were about to pay for a weekly meeting.',
    },
  },
  {
    id: 'arena.x.multi_agent',
    mode: 'arena',
    nodeIds: ['ai.agents', 'gcp.a2a', 'ai.observability'],
    difficulty: 'edge',
    explanation:
      'Multi-agent architectures buy specialization and parallelism at the price of the hardest debugging surface in software right now: non-deterministic components failing across handoffs. A single agent with well-designed tools covers most workloads, and the honest trigger for splitting is a measured bottleneck, context contention or genuinely parallel workstreams, not an architecture diagram’s aesthetics.',
    citations: cite('adk', 'mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A customer’s platform team proposes eight specialized agents (research, drafting, review, routing...) coordinating over A2A for a document workflow. Current volume: about 200 documents a day, one workflow.',
      optionA: 'One capable agent with well-scoped tools, split later if evidence demands',
      optionB: 'The eight-agent architecture from day one',
      defensible: 'A',
      keyPoints: [
        'Every agent boundary is a place where context is lost and failures hide',
        'A tool call is debuggable; an agent-to-agent negotiation is a distributed system of stochastic parts',
        '200 documents/day has no parallelism problem an orchestration layer would solve',
        'The split earns itself when one context genuinely cannot hold the task, measure first',
      ],
      fieldTake:
        'The diagram with eight boxes demos well and pages the on-call at 3am. Start with one agent whose tools are excellent; when a specific bottleneck shows up in traces, split that seam and only that seam. Architecture follows evidence, especially when the components are non-deterministic.',
    },
  },
];
