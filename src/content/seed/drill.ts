import type { DrillItem } from '@shared/content';

import { cite } from '../sources';

/**
 * Hand-authored drill seed bank.
 *
 * House rules, enforced later by the critic pass on generated items too:
 *   - every distractor carries a `whyWrong`. An option nobody can justify is an
 *     option that teaches nothing,
 *   - stems describe a situation a forward deployed engineer is actually in,
 *     not a definition lookup,
 *   - the explanation teaches the distinction, it does not restate the answer.
 */
export const DRILL_SEED: DrillItem[] = [
  // ── GCP Foundations: identity ────────────────────────────────────────────
  {
    id: 'drill.wif.keys',
    mode: 'drill',
    nodeIds: ['gcp.wif', 'gcp.iam'],
    difficulty: 'core',
    explanation:
      'Workload Identity Federation lets an external identity provider mint short-lived Google credentials, so nothing long-lived ever leaves your customer’s environment. Exporting a service account key solves the same problem for about a week and then becomes the finding that stalls the security review.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your customer runs their CI on GitHub Actions and needs it to deploy into their GCP project. Their security team has a standing policy against long-lived credentials. What do you propose?',
      choices: [
        {
          id: 'a',
          text: 'A service account JSON key stored as an encrypted repo secret',
          whyWrong:
            'Still a long-lived credential. Encryption at rest inside the CI vendor does not stop it being copied out and replayed for as long as the key exists.',
        },
        {
          id: 'b',
          text: 'Workload Identity Federation trusting GitHub’s OIDC issuer',
        },
        {
          id: 'c',
          text: 'A self-hosted runner in the VPC using its attached service account',
          whyWrong:
            'Defensible when egress rules genuinely forbid federation, but it makes the customer run and patch runner VMs to solve an authentication problem federation already solves.',
        },
        {
          id: 'd',
          text: 'A key rotated nightly by a Cloud Build job into Secret Manager',
          whyWrong:
            'Rotation shortens the exposure window without removing the artifact the policy bans, and you now own a rotation job whose silent failure looks exactly like success.',
        },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'drill.vpcsc.vs.psc',
    mode: 'drill',
    nodeIds: ['gcp.vpcsc', 'gcp.psc'],
    difficulty: 'core',
    explanation:
      'These two get conflated in almost every security review. Private Service Connect is about the *path*: reach the API over private addressing. VPC Service Controls is about the *boundary*: even with valid credentials, data cannot be copied to a project outside the perimeter. A customer worried about a rogue insider exfiltrating a BigQuery dataset needs the perimeter, not the private path.',
    diagramId: 'vpcsc-vs-psc',
    citations: cite('vpcsc', 'psc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A bank’s CISO says: "I am not worried about the network. I am worried that someone with valid credentials copies our data into a personal project." Which control addresses that specific fear?',
      choices: [
        {
          id: 'a',
          text: 'Private Service Connect endpoints for the Google APIs in use',
          whyWrong:
            'Solves how traffic reaches the API. A credentialed principal already inside the network copies the data over that same private path.',
        },
        {
          id: 'b',
          text: 'CMEK on the datasets, with a key only the bank can disable',
          whyWrong:
            'Controls the key, not the copy. Anyone holding read access decrypts transparently, and the export lands in the destination project as plaintext.',
        },
        { id: 'c', text: 'A VPC Service Controls perimeter around the data projects' },
        {
          id: 'd',
          text: 'Domain restricted sharing on the organization’s IAM policy',
          whyWrong:
            'Limits which identities can hold roles inside the org. The insider is already an in-domain identity, and the destination project is not governed by that constraint.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'drill.cmek.claim',
    mode: 'drill',
    nodeIds: ['gcp.kms', 'sec.audit'],
    difficulty: 'deep',
    explanation:
      'CMEK gives the customer key custody: they can rotate and, critically, disable the key to render data unreadable. What it does not do is prove nobody at the provider ever accessed plaintext. That argument needs Access Transparency logs and, where offered, Key Access Justifications. Overclaiming CMEK is a fast way to lose credibility in front of a security team that knows the difference.',
    citations: cite('cmek'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer asks whether CMEK means Google "cannot see" their data. What is the honest answer?',
      choices: [
        {
          id: 'a',
          text: 'Yes: with CMEK there is no provider path to the plaintext',
          whyWrong:
            'Overclaim. Services must decrypt in order to operate on the data, so CMEK controls the key rather than every runtime path to plaintext.',
        },
        {
          id: 'b',
          text: 'No: CMEK is a procurement checkbox with no real enforcement',
          whyWrong:
            'Understates it. Disabling the key genuinely renders the data unreadable, which is a control the customer can test rather than take on trust.',
        },
        {
          id: 'c',
          text: 'Only with Assured Workloads restricting who may operate on it',
          whyWrong:
            'Assured Workloads constrains residency and support personnel, which is a separate guarantee. CMEK is meaningful without it, and it is not what backs the custody claim.',
        },
        {
          id: 'd',
          text: 'They get key custody and a kill switch, not proof of no access',
        },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'drill.assured.what',
    mode: 'drill',
    nodeIds: ['gcp.assured', 'sec.residency'],
    difficulty: 'deep',
    explanation:
      'Assured Workloads is policy enforcement, not a product feature you bolt on afterwards: it constrains which regions resources may be created in, who may access them, and how keys are managed, at the folder level. It is the difference between telling an auditor "we intend to keep data in the EU" and "the platform refuses to create a resource outside it".',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which guarantees does an Assured Workloads folder actually enforce for the resources inside it? Pick all that apply.',
      choices: [
        { id: 'a', text: 'Resources can only be created in an approved set of regions' },
        { id: 'b', text: 'Support personnel access is constrained by residency and screening rules' },
        { id: 'c', text: 'Encryption key management follows the compliance regime’s requirements' },
        {
          id: 'd',
          text: 'All customer data is automatically de-identified before storage',
          whyWrong:
            'No. De-identification is your application’s job, nothing about a compliance folder inspects payloads.',
        },
        {
          id: 'e',
          text: 'The workload is automatically certified against the regime',
          whyWrong:
            'It supports your certification. It does not grant one; the audit is still yours to pass.',
        },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'drill.pubsub.ordering',
    mode: 'drill',
    nodeIds: ['gcp.pubsub', 'data.idempotency'],
    difficulty: 'core',
    explanation:
      'Pub/Sub delivers at least once by default, and ordering keys give you ordering only within a key. The practical consequence for an integration is that your subscriber must be idempotent regardless, designing as though "exactly once, in order" is free is how you end up double-posting a customer’s ledger entries during a redelivery storm.',
    citations: cite('pubsubOrdering'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are wiring a customer’s order events through Pub/Sub into their ledger. What must your subscriber assume?',
      choices: [
        {
          id: 'a',
          text: 'Delivery is exactly once, so a plain ledger insert is safe',
          whyWrong:
            'At-least-once is the default. Even with exactly-once delivery enabled on a pull subscription, a retry after a partial downstream failure still needs a dedupe key to be safe.',
        },
        {
          id: 'b',
          text: 'Ordering keys guarantee global ordering across the topic',
          whyWrong:
            'Ordering keys order the messages that share a key. Ordering the whole topic would mean one serialized stream, which is not what the subscription gives you.',
        },
        {
          id: 'c',
          text: 'Redelivery happens, so writes must be idempotent per order id',
        },
        {
          id: 'd',
          text: 'Messages past the ack deadline are dropped, so re-poll the source',
          whyWrong:
            'They are redelivered, and dead-lettered only if you configured a dead-letter topic. The failure mode to design against is duplication, not silence.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'drill.bq.cost',
    mode: 'drill',
    nodeIds: ['gcp.bigquery', 'del.tco'],
    difficulty: 'core',
    explanation:
      'On-demand BigQuery bills on bytes scanned. Partitioning prunes whole partitions before the scan starts, which is why a date filter on a partitioned column is the single largest cost lever. Clustering then sorts within the partition and helps selective filters further. `SELECT *` defeats both by forcing every column to be read.',
    citations: cite('bqPartition'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'A customer’s on-demand BigQuery bill tripled after a new dashboard shipped. Order these interventions from largest to smallest expected saving.',
      steps: [
        'Partition the fact table by event date and make the dashboard filter on it',
        'Stop selecting every column; project only the fields the dashboard renders',
        'Cluster the table on the two highest-cardinality filter columns',
        'Materialise the dashboard’s aggregate into a small summary table',
      ],
    },
  },
  {
    id: 'drill.compute.choice',
    mode: 'drill',
    nodeIds: ['gcp.compute_choice', 'del.handover'],
    difficulty: 'intro',
    explanation:
      'The deciding question is rarely technical capability, all four options can run the container. It is who operates it after you leave. A team with no platform engineers inherits a GKE cluster as a liability; Cloud Run hands back something they can actually keep alive.',
    citations: cite('cloudRun'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your pilot is a single containerised HTTP service with spiky traffic. The customer has four backend engineers and no platform team. What do you deploy on?',
      choices: [
        { id: 'a', text: 'Cloud Run, which scales to zero between traffic spikes' },
        {
          id: 'b',
          text: 'GKE Standard with a dedicated node pool and cluster autoscaler',
          whyWrong:
            'Hands four backend engineers an upgrade cadence, node pool sizing and a networking model that none of them asked for and none of them can staff.',
        },
        {
          id: 'c',
          text: 'Compute Engine in a managed instance group with autohealing',
          whyWrong:
            'Adds OS patching, image baking and boot-time configuration for no capability a managed container runtime is missing.',
        },
        {
          id: 'd',
          text: 'GKE Autopilot, since Google manages the nodes for them',
          whyWrong:
            'Node management goes away; the cluster, its upgrade cadence and the Kubernetes API do not. Defensible only if they already run Kubernetes elsewhere.',
        },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'drill.orgpolicy.keys',
    mode: 'drill',
    nodeIds: ['gcp.hierarchy', 'sec.zero_trust'],
    difficulty: 'deep',
    explanation:
      'Detective controls tell you a key was created; preventive controls stop it. Org policy constraints apply at org, folder or project level and are evaluated at resource-creation time, which is what "we cannot create one even by accident" actually requires. Offering the preventive control unprompted is the kind of thing that shortens a security review by two weeks.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer wants a guarantee that no service account keys can be created anywhere in their AI platform folder. What do you reach for?',
      choices: [
        {
          id: 'a',
          text: 'An IAM deny policy on key creation for the known principals',
          whyWrong:
            'Enumerating principals means the next service account somebody adds is unconstrained. The guarantee has to attach to the folder, not to a list you maintain by hand.',
        },
        {
          id: 'b',
          text: 'A Security Command Center detector alerting on new keys',
          whyWrong:
            'Detective, not preventive. The key exists, and may already have been copied out, by the time anyone reads the finding.',
        },
        {
          id: 'c',
          text: 'A scheduled Cloud Run job that finds and deletes any key it sees',
          whyWrong:
            'Leaves a window of exposure on every key, and eventually deletes one that something load-bearing depends on at three in the morning.',
        },
        {
          id: 'd',
          text: 'An org policy constraint disabling key creation on the folder',
        },
      ],
      correctId: 'd',
    },
  },

  // ── GCP AI Platform ──────────────────────────────────────────────────────
  {
    id: 'drill.geap.rebrand',
    mode: 'drill',
    nodeIds: ['gcp.geap'],
    difficulty: 'intro',
    explanation:
      'At Cloud Next ’26 Vertex AI was rebranded to the Gemini Enterprise Agent Platform, and Google stated that Vertex services and roadmap now ship through the agent platform rather than as a standalone product. Knowing the current name matters more than it sounds: turning up to a customer conversation using last year’s product names is the fastest way to look like you have not deployed recently.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    verifiedAt: '2026-07-31',
    payload: {
      kind: 'mcq',
      stem: 'A customer’s architecture doc from last year references "Vertex AI Agent Builder". What is the current framing you should use?',
      choices: [
        {
          id: 'a',
          text: 'Nothing changed; Vertex AI Agent Builder is still the name',
          whyWrong:
            'It was renamed at Cloud Next ’26. Using last year’s product names in front of a customer is the fastest way to signal you have not deployed recently.',
        },
        {
          id: 'b',
          text: 'Gemini Enterprise Agent Platform; Vertex ships through it',
        },
        {
          id: 'c',
          text: 'It was discontinued, so they must adopt a third-party framework',
          whyWrong:
            'A rename and a consolidation, not a deprecation. Telling a customer their platform was killed is the kind of error they repeat to their CIO.',
        },
        {
          id: 'd',
          text: 'It moved into Google Workspace as an end-user Gemini add-on',
          whyWrong:
            'Different product line. Gemini in Workspace is an end-user surface, not the platform you build and deploy agents on.',
        },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'drill.agent_engine.memory',
    mode: 'drill',
    nodeIds: ['gcp.agent_engine', 'ai.memory'],
    difficulty: 'core',
    explanation:
      'Agent Engine provides Sessions for conversational state and Memory Bank for context that must survive across sessions. The design question a customer will actually ask is which facts deserve to persist, persisting everything is both a privacy liability and a retrieval problem, since a memory store full of noise degrades every future turn.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each piece of agent state to where it belongs.',
      pairs: [
        { left: 'The last six turns of the current conversation', right: 'Session state' },
        { left: 'The user’s standing preference for metric units', right: 'Memory Bank' },
        { left: 'The company’s expense policy document', right: 'Retrieval corpus' },
        { left: 'A one-time OAuth token for this request', right: 'Never persisted' },
      ],
    },
  },
  {
    id: 'drill.model_armor.role',
    mode: 'drill',
    nodeIds: ['gcp.model_armor', 'ai.guardrails'],
    difficulty: 'core',
    explanation:
      'Model Armor screens prompts, responses and tool calls at runtime for injection, sensitive data and harmful content. The subtle point for an FDE: the dangerous injection usually arrives inside *retrieved* content, not in what the user typed, so screening only the user turn leaves the actual hole open.',
    citations: cite('modelArmor', 'genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your agent retrieves documents from the customer’s SharePoint and can call a "send email" tool. Where is the highest-risk injection surface?',
      choices: [
        {
          id: 'a',
          text: 'The end user’s typed question, which is unsanitized free text',
          whyWrong:
            'Real, and the user is authenticated and rarely the attacker. Indirect injection arriving inside content they never wrote is the harder surface to defend.',
        },
        {
          id: 'b',
          text: 'The system prompt, which the model trusts above every other input',
          whyWrong:
            'You author it and ship it with the app. It is where an injected instruction lands and takes effect, not where it originates.',
        },
        {
          id: 'c',
          text: 'Text inside the retrieved SharePoint documents, read as context',
        },
        {
          id: 'd',
          text: 'The model weights, which may carry a poisoned instruction',
          whyWrong:
            'Not an injection surface in a hosted-model deployment: you are not training the weights and no request can write to them.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'drill.vector.choice',
    mode: 'drill',
    nodeIds: ['gcp.vector_search', 'gcp.alloydb'],
    difficulty: 'deep',
    explanation:
      'When retrieval needs to be filtered by the same relational predicates that already live in Postgres, tenant, ACL, effective date, keeping vectors next to that data in AlloyDB avoids the distributed-join-by-hand problem. A dedicated vector service earns its place when the index is large enough or the query volume high enough that a database is the wrong shape.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Retrieval must respect per-row ACLs that already live in the customer’s Postgres, and the corpus is about two million chunks. What is the pragmatic first choice?',
      choices: [
        { id: 'a', text: 'pgvector in AlloyDB, indexed beside the existing ACL tables' },
        {
          id: 'b',
          text: 'A dedicated vector index, applying the ACL filter after retrieval',
          whyWrong:
            'Post-filtering breaks top-k. A user with narrow access gets a near-empty result set, because the search ranked across the whole corpus before anything was filtered.',
        },
        {
          id: 'c',
          text: 'Write each chunk’s ACL into its text so the model respects it',
          whyWrong:
            'Delegates authorization to a language model that can be argued out of it. This is the security finding that ends the pilot.',
        },
        {
          id: 'd',
          text: 'One vector index per user, rebuilt whenever their access changes',
          whyWrong:
            'Index count and rebuild cost scale with headcount. It does not survive contact with a customer who has 40,000 employees.',
        },
      ],
      correctId: 'a',
    },
  },

  // ── AI Engineering ───────────────────────────────────────────────────────
  {
    id: 'drill.rag.hybrid',
    mode: 'drill',
    nodeIds: ['ai.hybrid_search', 'ai.rag_failure'],
    difficulty: 'core',
    explanation:
      'Dense embeddings capture meaning and are consistently bad at rare exact tokens, part numbers, error codes, policy identifiers, because those carry almost no semantic signal. A lexical channel alongside the vector channel is the standard fix, and it is usually a one-afternoon change that visibly improves a demo.',
    diagramId: 'rag-pipeline',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Users complain that searching for the exact error code "ERR-4471" returns unrelated documents, while conceptual questions work fine. What is the fix?',
      choices: [
        {
          id: 'a',
          text: 'Raise top-k from 5 to 50 so the right chunk is in the window',
          whyWrong:
            'Buries the model in near-duplicates and raises cost per call without moving the matching chunk any higher up the ranking.',
        },
        {
          id: 'b',
          text: 'Move to a larger embedding model with more dimensions',
          whyWrong:
            'Rare literal tokens carry almost no semantic signal, so a bigger dense encoder represents them no better. This is structural, not a capacity limit.',
        },
        {
          id: 'c',
          text: 'Chunk smaller so the code dominates its chunk’s embedding',
          whyWrong:
            'Shifts the ratio slightly and strips out the surrounding context the answer needs. The token still means nothing to the encoder.',
        },
        { id: 'd', text: 'Add a BM25 lexical channel and fuse its ranks with the vectors' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'drill.evals.first',
    mode: 'drill',
    nodeIds: ['ai.evals', 'del.poc_exit'],
    difficulty: 'core',
    explanation:
      'Evaluation is the most requested and most skipped senior AI skill. The move that separates a pilot that converts from one that stalls is agreeing the golden set and the pass bar *with the customer* before building, so "is it good enough?" has an answer that is not a vibe.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'You are two days into a RAG pilot. Order these by what you should do first.',
      steps: [
        'Collect 40 real questions from the customer’s own support tickets',
        'Agree with the customer what a correct answer looks like for each',
        'Build the retrieval pipeline and measure against that set',
        'Tune chunking and reranking against the measured gaps',
      ],
    },
  },
  {
    id: 'drill.judge.bias',
    mode: 'drill',
    nodeIds: ['ai.llm_judge'],
    difficulty: 'deep',
    explanation:
      'Pairwise LLM judges show a measurable preference for whichever response appears first. Randomising order and scoring both orderings is the cheap mitigation; if the two disagree, that item needs a human. Skipping this is how a team convinces itself a change helped when it only moved position.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your pairwise LLM judge says the new prompt wins 63% of comparisons. Before you report that, what do you check?',
      choices: [
        {
          id: 'a',
          text: 'Whether the judge model is also the model being evaluated here',
          whyWrong:
            'Self-preference is real and worth ruling out, but position bias is the larger effect on a pairwise run and the one you can correct in an afternoon.',
        },
        {
          id: 'b',
          text: 'Whether the win rate survives swapping the presentation order',
        },
        {
          id: 'c',
          text: 'Whether the comparison set is larger than a thousand pairs',
          whyWrong:
            'More pairs tighten the interval around a biased estimate. The estimator stays wrong, it just reports itself with more confidence.',
        },
        {
          id: 'd',
          text: 'Whether the judge ran at temperature zero for every pair',
          whyWrong:
            'Cuts run-to-run variance and leaves a systematic preference for whichever response was shown first completely intact.',
        },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'drill.finetune.vs.rag',
    mode: 'drill',
    nodeIds: ['ai.finetune'],
    difficulty: 'core',
    explanation:
      'Choose by failure mode. Wrong or stale *facts* is a retrieval problem. Wrong *form*, tone, structure, refusing to emit the schema, is what tuning fixes well. A customer asking to fine-tune on their knowledge base is usually describing a retrieval problem in the vocabulary they picked up from a conference talk.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each symptom to the intervention that actually addresses it.',
      pairs: [
        { left: 'Answers cite last quarter’s policy', right: 'Fix retrieval freshness' },
        { left: 'Output prose when you need strict JSON', right: 'Structured output / tuning' },
        { left: 'Tone is wrong for a regulated audience', right: 'Fine-tuning' },
        { left: 'Confidently answers questions it has no source for', right: 'Grounding + refusal policy' },
      ],
    },
  },
  {
    id: 'drill.cost.caching',
    mode: 'drill',
    nodeIds: ['ai.cost', 'ai.latency'],
    difficulty: 'core',
    explanation:
      'When a long, stable system prompt and document set is resent on every turn, prompt caching is the largest single lever. It attacks the dominant term. Cutting max output tokens or switching models changes a smaller term and usually costs quality. Always find the dominant term before optimising.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agent resends a 30k-token policy pack with every turn. Input dominates the bill by roughly 20:1. What gives the biggest saving first?',
      choices: [
        {
          id: 'a',
          text: 'Cut max output tokens and prompt the model to answer briefly',
          whyWrong:
            'Attacks the five percent term. At twenty to one input against output, even halving the output moves the bill by low single digits.',
        },
        {
          id: 'b',
          text: 'Route every call to the smaller model in the same family',
          whyWrong:
            'Trades answer quality for a saving that is available without one. Tier by task difficulty once the input term is dealt with, not before.',
        },
        { id: 'c', text: 'Cache the stable 30k-token policy prefix between turns' },
        {
          id: 'd',
          text: 'Batch the turns overnight to get the batch pricing tier',
          whyWrong:
            'This is an interactive agent, so latency is a product requirement and the batch tier is not available to it in the first place.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'drill.mcp.what',
    mode: 'drill',
    nodeIds: ['ai.mcp', 'ai.tool_calling'],
    difficulty: 'intro',
    explanation:
      'MCP standardises how a model-facing application discovers and calls external tools and resources, so an integration written once is reusable across hosts. For enterprise work the appeal is organizational as much as technical: the customer’s platform team can own and version an MCP server without shipping code into your agent.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s platform team wants to own their own integrations rather than filing tickets against your agent. What do you propose?',
      choices: [
        {
          id: 'a',
          text: 'They hand you an OpenAPI spec and you write the tool wrappers',
          whyWrong:
            'Works, and puts you in the critical path of every change they make. That is precisely the ticket queue they are trying to leave.',
        },
        { id: 'b', text: 'They run an MCP server and your agent discovers its tools' },
        {
          id: 'c',
          text: 'They fork your agent repo and add integrations to their copy',
          whyWrong:
            'Creates a divergent copy you will be asked to support forever, and turns every upgrade you ship into a merge conflict for them.',
        },
        {
          id: 'd',
          text: 'They describe their APIs in prose inside the system prompt',
          whyWrong:
            'Prose is not an interface: no schema, no validation, no error contract, and the prompt grows with every integration they add.',
        },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'drill.rag.permission_bleed',
    mode: 'drill',
    nodeIds: ['ai.rag_failure', 'sec.pii', 'sec.zero_trust'],
    difficulty: 'edge',
    explanation:
      'Permission bleed is the RAG failure that ends pilots: the index was built by a service account that could read everything, so retrieval happily returns documents the asking user could never open. Filtering must happen at query time against the *user’s* identity, and the ACL must be carried on the chunk.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'During a demo, an HR document surfaces for an engineer who cannot open it in the source system. What went wrong?',
      choices: [
        {
          id: 'a',
          text: 'The embedding model reproduced text it memorized in training',
          whyWrong:
            'The document came out of their own corpus through retrieval. Nothing about the model’s training data is implicated by this failure.',
        },
        {
          id: 'b',
          text: 'Chunk size was too large, so the HR text rode along with it',
          whyWrong:
            'Chunk size changes answer quality and citation precision. It has no bearing on which chunks a given user is permitted to see.',
        },
        {
          id: 'c',
          text: 'Temperature was high enough for the model to invent details',
          whyWrong:
            'A sampling setting cannot produce a specific, real, internal document. The text was retrieved and handed to the model, not generated.',
        },
        { id: 'd', text: 'Retrieval never filters chunks by the asking user’s access' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'drill.latency.ttft',
    mode: 'drill',
    nodeIds: ['ai.latency'],
    difficulty: 'core',
    explanation:
      'Perceived responsiveness tracks time-to-first-token far more closely than total completion time. Streaming a fast first token while the rest generates changes the felt experience without changing the workload. Which is why it is usually the first thing to fix when a customer says "it feels slow".',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer says the assistant "feels slow" at 6 seconds per answer. You have one week. What do you do first?',
      choices: [
        { id: 'a', text: 'Stream tokens and show retrieval progress as it happens' },
        {
          id: 'b',
          text: 'Move to a smaller model to cut end-to-end generation time',
          whyWrong:
            'Trades answer quality for a number the user never perceives directly. Take the free perceptual win before you spend quality on it.',
        },
        {
          id: 'c',
          text: 'Cache answers to identical questions in a lookup layer',
          whyWrong:
            'Helps the narrow slice of repeated queries. In a support corpus most questions are phrased uniquely, so the hit rate stays low.',
        },
        {
          id: 'd',
          text: 'Explain that six seconds is normal for a RAG pipeline',
          whyWrong:
            'It may even be true, and it still reads as an excuse. The complaint is about felt latency, which you can move inside the week.',
        },
      ],
      correctId: 'a',
    },
  },

  // ── Data & Integration ───────────────────────────────────────────────────
  {
    id: 'drill.data.messy_dates',
    mode: 'drill',
    nodeIds: ['data.messy', 'data.schema_map'],
    difficulty: 'core',
    explanation:
      'Three acquired systems means three date conventions and at least one that is ambiguous for the first twelve days of every month. Deciding a canonical representation early, and quarantining rows you cannot confidently parse rather than guessing, is what stops a silent 3% corruption you discover in month four.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A merged feed contains dates as 03/04/2026, 2026-04-03 and 20260403. What do you do with rows you cannot disambiguate?',
      choices: [
        {
          id: 'a',
          text: 'Assume the convention most common in the file and move on',
          whyWrong:
            'Silently corrupts a fraction of rows, and the fraction stays invisible until somebody reconciles a compliance report months later.',
        },
        {
          id: 'b',
          text: 'Drop the unparseable rows and log a count on every run',
          whyWrong:
            'Data loss with only a counter to show for it. Keep the raw values so the decision stays reversible once the source owner answers.',
        },
        { id: 'c', text: 'Quarantine them with the raw value and ask the source owner' },
        {
          id: 'd',
          text: 'Keep all three formats as strings and parse at query time',
          whyWrong:
            'Moves the ambiguity to every downstream consumer, each of whom resolves it differently. Resolve it once, at ingest, and record the decision.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'drill.data.backfill',
    mode: 'drill',
    nodeIds: ['data.cdc', 'data.idempotency'],
    difficulty: 'deep',
    explanation:
      'The standard CDC cutover is: start capturing the change stream first, then snapshot, then replay the buffered changes over the snapshot. Snapshot-then-stream leaves a gap containing exactly the rows that changed during the snapshot, typically the most active and most noticed records.',
    diagramId: 'cdc-cutover',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the steps for a zero-gap CDC cutover from the customer’s Oracle instance.',
      steps: [
        'Start capturing the change stream and buffer it',
        'Take a consistent snapshot of the source tables',
        'Load the snapshot into the target',
        'Replay buffered changes from the snapshot point forward, idempotently',
      ],
    },
  },
  {
    id: 'drill.ratelimit.retry',
    mode: 'drill',
    nodeIds: ['data.rate_limits', 'data.connectors'],
    difficulty: 'core',
    explanation:
      'Retrying on a fixed interval synchronises every client into a thundering herd against an API that is already struggling. Exponential backoff with jitter spreads them out; respecting an explicit Retry-After beats guessing. Getting this wrong against a customer’s Salesforce org is a good way to have your integration user suspended.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Your connector is being 429’d by the customer’s CRM. Which responses are correct? Pick all that apply.',
      choices: [
        { id: 'a', text: 'Honour the Retry-After header when the API sends one' },
        { id: 'b', text: 'Back off exponentially with jitter' },
        { id: 'c', text: 'Cap concurrency client-side below the published quota' },
        {
          id: 'd',
          text: 'Retry immediately in a tight loop until it succeeds',
          whyWrong: 'Turns a rate limit into an outage and gets your integration user suspended.',
        },
        {
          id: 'e',
          text: 'Spread the load across several integration users to multiply the quota',
          whyWrong:
            'Quota evasion. It will be noticed, and it converts a technical problem into a trust problem.',
        },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Security & Compliance ────────────────────────────────────────────────
  {
    id: 'drill.gdpr.erasure',
    mode: 'drill',
    nodeIds: ['sec.gdpr', 'ai.rag_failure'],
    difficulty: 'edge',
    explanation:
      'An erasure request has to reach every derived copy, and an embedding index is a derived copy. Teams routinely delete the source row and leave the vector, so the "deleted" content keeps surfacing in retrieval. Designing chunk records with a stable subject key from day one is what makes this a delete statement rather than a re-index.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A GDPR erasure request arrives for one individual. Which stores must you reach? Pick all that apply.',
      choices: [
        { id: 'a', text: 'The source system of record' },
        { id: 'b', text: 'The vector index containing chunks derived from their data' },
        { id: 'c', text: 'Conversation logs and agent memory containing their details' },
        { id: 'd', text: 'Backups, within the retention policy you documented' },
        {
          id: 'e',
          text: 'The foundation model’s weights',
          whyWrong:
            'You are not training on their data in a hosted deployment, and you could not surgically remove it if you were. Say so plainly rather than implying you can.',
        },
      ],
      correctIds: ['a', 'b', 'c', 'd'],
    },
  },
  {
    id: 'drill.soc2.types',
    mode: 'drill',
    nodeIds: ['sec.soc2'],
    difficulty: 'intro',
    explanation:
      'Type I attests that controls were designed appropriately at a point in time; Type II attests that they operated effectively across a window, typically 3–12 months. Procurement teams asking for "SOC 2" almost always mean Type II, and answering with a Type I report without flagging the difference reads as evasive.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Procurement asks for your SOC 2 report. You have Type I only. What do you say?',
      choices: [
        { id: 'a', text: 'You hold Type I; give the date the Type II window closes' },
        {
          id: 'b',
          text: 'Send the Type I report and wait to see whether they notice',
          whyWrong:
            'They will notice, and then the conversation is about candor rather than about a report you are a few months from having.',
        },
        {
          id: 'c',
          text: 'Tell them you are SOC 2 compliant and move the call along',
          whyWrong:
            'There is no such status. It will not survive one follow-up from a procurement team that reads these reports for a living.',
        },
        {
          id: 'd',
          text: 'Offer the ISO 27001 certificate in place of the report',
          whyWrong:
            'A substitution with no acknowledgment of the gap. Offer it and name the gap, and the same sentence becomes helpful instead of evasive.',
        },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'drill.residency.inference',
    mode: 'drill',
    nodeIds: ['sec.residency', 'gcp.ai_residency'],
    difficulty: 'deep',
    explanation:
      'Residency covers data at rest *and* where processing happens. A customer who has pinned storage to an EU region but calls a model endpoint that serves from elsewhere has not met the commitment. Vertex generative AI supports data residency alongside CMEK and VPC Service Controls precisely because customers need to constrain both.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A German customer has pinned all storage to europe-west3 and asks whether they are now compliant with their residency commitment. What is missing?',
      choices: [
        {
          id: 'a',
          text: 'Where inference runs: processing location must be constrained too, not just storage',
        },
        {
          id: 'b',
          text: 'Nothing; pinning storage is sufficient',
          whyWrong:
            'Residency commitments generally cover processing as well as storage. Prompt content leaving the region is a transfer.',
        },
        {
          id: 'c',
          text: 'They need CMEK before residency means anything',
          whyWrong: 'Related control, different guarantee. Residency holds without CMEK.',
        },
        {
          id: 'd',
          text: 'They need a second region for DR first',
          whyWrong: 'A resilience concern, and a careless second region can itself break residency.',
        },
      ],
      correctId: 'a',
    },
  },

  // ── Delivery & Economics ─────────────────────────────────────────────────
  {
    id: 'drill.thin_slice.def',
    mode: 'drill',
    nodeIds: ['del.thin_slice', 'del.risk_sequencing'],
    difficulty: 'core',
    explanation:
      'A thin slice must be narrow in scope but complete in depth: one real record traveling the entire path, through the layer you are least sure about. Building the easy layers first feels productive and defers exactly the risk that decides whether the project is possible.',
    diagramId: 'thin-slice',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Week two of a 90-day engagement. Which of these is a genuine thin slice?',
      choices: [
        {
          id: 'a',
          text: 'One real claim flows from their SFTP drop through parsing, retrieval and the model to a reviewed answer',
        },
        {
          id: 'b',
          text: 'A polished UI with mocked responses',
          whyWrong:
            'Nothing risky is proven. It also raises expectations faster than it reduces uncertainty.',
        },
        {
          id: 'c',
          text: 'The full ingestion pipeline for all fourteen source systems',
          whyWrong:
            'Broad and shallow. You will spend six weeks on connectors before learning whether the model can do the task at all.',
        },
        {
          id: 'd',
          text: 'An evaluation harness with no system behind it',
          whyWrong:
            'Valuable, and not end-to-end. Pair it with the slice rather than shipping it alone.',
        },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'drill.slo.math',
    mode: 'drill',
    nodeIds: ['del.slo'],
    difficulty: 'core',
    explanation:
      'Roughly: 99.9% allows about 43 minutes of downtime per 30-day month, 99.95% about 22 minutes, 99.99% about 4. Being able to do this conversion out loud stops you agreeing to a number in a contract that your architecture has no chance of meeting.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each availability target to its approximate monthly downtime budget.',
      pairs: [
        { left: '99.9%', right: '~43 minutes' },
        { left: '99.95%', right: '~22 minutes' },
        { left: '99.99%', right: '~4 minutes' },
        { left: '99%', right: '~7 hours' },
      ],
    },
  },
  {
    id: 'drill.poc.exit',
    mode: 'drill',
    nodeIds: ['del.poc_exit', 'cust.expectations'],
    difficulty: 'core',
    explanation:
      'A POC without written exit criteria cannot be passed, only extended. Agreeing the metric, the threshold, the dataset and the decision-maker up front converts "is it good enough?" from an argument into an arithmetic check, and gives you something to point at when scope drifts in week six.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'What must a POC exit criterion contain to be usable? Pick all that apply.',
      choices: [
        { id: 'a', text: 'A specific metric with a numeric threshold' },
        { id: 'b', text: 'The dataset it will be measured on' },
        { id: 'c', text: 'Who decides, and by when' },
        {
          id: 'd',
          text: 'A list of features to be delivered',
          whyWrong:
            'A scope list, not a success test. You can ship every feature and still fail the customer’s actual bar.',
        },
        {
          id: 'e',
          text: 'The technology stack',
          whyWrong: 'Irrelevant to whether the POC succeeded.',
        },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Customer Craft ───────────────────────────────────────────────────────
  {
    id: 'drill.badnews.timing',
    mode: 'drill',
    nodeIds: ['cust.bad_news', 'cust.ownership'],
    difficulty: 'core',
    explanation:
      'Bad news degrades with age. Told early with a plan and options, a slip is a managed event; told late, it is a trust failure that outlives the schedule problem. The rubric interviewers use is almost exactly this: did you own it, did you bring options, and did the customer hear it from you first.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'You have just realised the integration will slip three weeks. Order your next actions.',
      steps: [
        'Confirm the new date well enough to commit to it',
        'Tell your customer contact today, with the cause and the revised date',
        'Offer two options: descope to hold the date, or hold scope and move the date',
        'Send a written summary of what was agreed',
      ],
    },
  },
  {
    id: 'drill.discovery.open',
    mode: 'drill',
    nodeIds: ['cust.discovery_q'],
    difficulty: 'intro',
    explanation:
      'Closed questions confirm what you already suspect; open ones surface what you did not know to ask. Early discovery is exactly when your model of the problem is most wrong, which is when a leading question is most expensive.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'First discovery call with an operations director. Which question earns its slot?',
      choices: [
        {
          id: 'a',
          text: '"Walk me through what happens today when a claim comes in that nobody can categorise."',
        },
        {
          id: 'b',
          text: '"Would you say accuracy is your main concern?"',
          whyWrong:
            'Leading and closed. You will get agreement and learn nothing you did not already believe.',
        },
        {
          id: 'c',
          text: '"Are you using a vector database?"',
          whyWrong:
            'Solution-space question in a problem-space conversation. It also signals you have already decided.',
        },
        {
          id: 'd',
          text: '"What is your budget?"',
          whyWrong:
            'A question for later and probably for someone else. Asking it first frames you as a vendor rather than an engineer.',
        },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'drill.saying_no.governance',
    mode: 'drill',
    nodeIds: ['cust.saying_no', 'cust.pushback', 'sec.zero_trust'],
    difficulty: 'deep',
    explanation:
      'The pattern that works: acknowledge the legitimate need, name the specific constraint, then offer a path that meets the need without breaking the constraint. A flat refusal makes you an obstacle; silent compliance makes you the reason their audit fails.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer VP asks you to grant the agent blanket read access across all systems "so it stops saying it cannot help". What is the strongest response?',
      choices: [
        {
          id: 'a',
          text: 'Agree the refusals are a real problem, explain why blanket access breaks their own access model, and propose scoped access to the two systems behind most refusals',
        },
        {
          id: 'b',
          text: 'Grant it for the pilot and tighten it before production',
          whyWrong:
            'Pilot permissions become production permissions. You would also be overriding their access model without their security team in the room.',
        },
        {
          id: 'c',
          text: 'Refuse, citing policy',
          whyWrong:
            'Correct outcome, delivered as an obstacle. The VP still has the problem that made them ask.',
        },
        {
          id: 'd',
          text: 'Escalate to their CISO without telling the VP',
          whyWrong:
            'Going around someone is the fastest way to lose the champion you need.',
        },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'drill.explaining.accuracy',
    mode: 'drill',
    nodeIds: ['cust.explaining_ai', 'cust.expectations', 'ai.nondeterminism'],
    difficulty: 'deep',
    explanation:
      'Non-technical stakeholders do not need the mechanism, they need to know what to do about it. Reframing from "how accurate is it" to "what happens on the cases it gets wrong, and how would we know" gives them a decision they can actually make, and quietly introduces the review workflow the design needs anyway.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A non-technical VP saw a flawless demo and asks "so it is 100% accurate?". What do you say?',
      choices: [
        {
          id: 'a',
          text: '"No. On our test set it handles about four in five cases unaided. The design question is what we do with the fifth, and how you would know."',
        },
        {
          id: 'b',
          text: '"It is very accurate in our testing."',
          whyWrong:
            'Vague enough to be heard as yes. They will quote it back to you in a steering committee.',
        },
        {
          id: 'c',
          text: '"No system is 100% accurate."',
          whyWrong: 'True, unhelpful, and slightly dismissive of a fair question.',
        },
        {
          id: 'd',
          text: '"Let me explain how transformers work."',
          whyWrong:
            'Answers a question nobody asked, and reads as avoidance to someone who needs a business answer.',
        },
      ],
      correctId: 'a',
    },
  },
];
