import type { DrillItem } from '@shared/content';

import { cite } from '../sources';

/**
 * Expansion bank: depth on the branches the first seed pass covered thinnest,
 * the AI platform surface, security and compliance, data engineering, and the
 * delivery economics questions that decide real deals.
 *
 * Difficulty tags follow the honest rubric: `intro` is answerable cold from
 * fundamentals, `core` is the working knowledge the role assumes, `deep`
 * requires reasoning about a trade-off, `edge` separates people who have
 * shipped the thing from people who have read about it.
 */
export const DRILL_EXPANSION: DrillItem[] = [
  // ── GCP AI Platform ──────────────────────────────────────────────────────
  {
    id: 'x.agent_engine.sessions',
    mode: 'drill',
    nodeIds: ['gcp.agent_engine', 'ai.memory'],
    difficulty: 'core',
    explanation:
      'Agent Engine gives an agent two distinct kinds of state: Sessions hold the turn-by-turn history of one conversation, and Memory Bank persists facts about a user across conversations. Conflating them is how agents end up either forgetting everything at midnight or dragging an entire transcript into every prompt.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer wants their support agent to remember a user’s preferences from previous conversations. Which Agent Engine capability is built for that?',
      choices: [
        { id: 'a', text: 'Sessions: hold one conversation open per user indefinitely', whyWrong: 'A session is one conversation’s event history. Held open forever it bloats context and cost, and one crash takes the lot.' },
        { id: 'b', text: 'Memory Bank: durable user facts recalled across sessions' },
        { id: 'c', text: 'Replay every past transcript into each new prompt', whyWrong: 'Context windows and token budgets make transcript replay collapse within weeks of real usage.' },
        { id: 'd', text: 'Nightly per-user fine-tune of the base model', whyWrong: 'Fine-tuning bakes knowledge into weights: per-user tuning is slow, expensive and unmaintainable at any scale.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'x.adk.eval',
    mode: 'drill',
    nodeIds: ['gcp.adk', 'ai.evals'],
    difficulty: 'core',
    explanation:
      'ADK ships an evaluation harness: you record expected tool-call trajectories and final responses as test files, then run them against every agent change. The point is regression detection for behavior you cannot unit-test, which is most agent behavior.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You changed an ADK agent’s instructions and its tool descriptions. What is the built-in way to check nothing else broke?',
      choices: [
        { id: 'a', text: 'Chat with the agent for ten minutes and judge the replies', whyWrong: 'Manual poking finds the failures you already suspected. The regression that costs you a customer is the one you did not think to try.' },
        { id: 'b', text: 'Diff the prompt text and reason through what changed', whyWrong: 'Prompt diffs do not predict behavior. Small wording changes reroute tool calls in ways reading cannot catch.' },
        { id: 'c', text: 'Run the ADK eval sets against recorded trajectories' },
        { id: 'd', text: 'Rely on type checking and CI to catch the behavior change', whyWrong: 'Types verify the code compiles, not that the model still picks the right tool for the request.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'x.a2a.purpose',
    mode: 'drill',
    nodeIds: ['gcp.a2a', 'ai.agents'],
    difficulty: 'core',
    explanation:
      'A2A is an open protocol for agents to discover and call other agents across vendors and frameworks: an agent publishes a card describing its skills, and peers negotiate tasks over a standard wire format. MCP connects one agent to its tools; A2A connects agents to each other.',
    citations: cite('geap', 'mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s procurement agent (built in-house) must delegate work to a vendor’s logistics agent (different framework). Which standard is designed for exactly this hop?',
      choices: [
        { id: 'a', text: 'MCP, which standardizes tool and data access for one agent', whyWrong: 'MCP connects an agent to its tools and data sources. It has no notion of delegating a task to another autonomous agent.' },
        { id: 'b', text: 'A shared REST API with an OpenAPI spec per partner', whyWrong: 'Workable plumbing, but every pair of teams reinvents auth, task lifecycle and streaming. The protocol exists to stop that.' },
        { id: 'c', text: 'A shared database table both agents read and write', whyWrong: 'Integration by shared table couples release cycles and has no contract for task state, errors or capability discovery.' },
        { id: 'd', text: 'A2A: cross-vendor agent discovery and task exchange' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'x.model_armor.scope',
    mode: 'drill',
    nodeIds: ['gcp.model_armor', 'ai.guardrails'],
    difficulty: 'deep',
    explanation:
      'Model Armor screens prompts and responses independently of which model serves them, so one policy covers Gemini, Model Garden deployments and self-hosted models alike. Centralizing the screening is the point: guardrails implemented per-app drift apart, and the auditor asks about the one app that skipped them.',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A bank runs Gemini for one product and a self-hosted model for another, and wants one enforced policy for prompt injection and data-loss screening. What do you propose?',
      choices: [
        { id: 'a', text: 'Per-team safety instructions written into each system prompt', whyWrong: 'System-prompt guardrails are suggestions to the model, not enforcement, and prompt injection targets exactly this layer.' },
        { id: 'b', text: 'Model Armor screening prompts and responses for both' },
        { id: 'c', text: 'The safety filters built into each model, tuned per product', whyWrong: 'Built-in filters differ per model, are not centrally configurable, and leave you no shared audit trail across the two products.' },
        { id: 'd', text: 'A regex blocklist enforced at the shared API gateway', whyWrong: 'Regex catches yesterday’s known-bad strings. Injection attacks are paraphrased past it in minutes.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'x.rag_engine.build_vs_buy',
    mode: 'drill',
    nodeIds: ['gcp.rag_engine', 'ai.chunking'],
    difficulty: 'deep',
    explanation:
      'A managed RAG service earns its keep by owning corpus ingestion, chunking, embedding, retrieval and citation plumbing. The trade is control: exotic chunking strategies, custom rerankers or unusual metadata filtering may push you back to assembling the pipeline yourself on Vector Search.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'When does managed RAG (RAG Engine) stop being the right call versus building on Vector Search directly?',
      choices: [
        { id: 'a', text: 'Once the corpus grows past a few thousand documents', whyWrong: 'Corpus size is what managed services handle well. Scale alone is an argument for managed, not against it.' },
        { id: 'b', text: 'Whenever the customer is sensitive to platform cost', whyWrong: 'Self-assembled pipelines carry engineering and operations cost that usually exceeds the managed premium at moderate scale.' },
        { id: 'c', text: 'When custom chunkers, rerankers or filters are the product' },
        { id: 'd', text: 'When answers must carry page-level citations to source', whyWrong: 'Grounded citations are one of the things managed RAG ships with. Needing them is a reason to buy, not to build.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'x.vector_search.recall',
    mode: 'drill',
    nodeIds: ['gcp.vector_search', 'ai.hybrid_search'],
    difficulty: 'deep',
    explanation:
      'Approximate nearest-neighbor search trades a little recall for a lot of latency and cost, and the knobs (leaf nodes to search, index shape) move you along that curve. The failure mode is silent: nothing errors, the right document simply is not in the candidates.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Users report the RAG assistant "sometimes misses" a document that is definitely in the index, with no errors logged. What is the first thing to check?',
      choices: [
        { id: 'a', text: 'The model is hallucinating a miss that did not happen', whyWrong: 'Check retrieval before generation: if the chunk never reached the prompt, no amount of prompting fixes it.' },
        { id: 'b', text: 'Network latency between the app and the index endpoint', whyWrong: 'Latency produces slow answers or timeouts, not documents that silently fail to appear.' },
        { id: 'c', text: 'ANN recall: the vector never enters the candidate set' },
        { id: 'd', text: 'The context window is truncating retrieved chunks away', whyWrong: 'Possible later in the chain, but "sometimes misses with no errors" is the classic recall signature. Verify candidates first.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'x.model_garden.claude',
    mode: 'drill',
    nodeIds: ['gcp.model_garden', 'gcp.billing'],
    difficulty: 'core',
    explanation:
      'Third-party models in Model Garden, Claude included, are served inside Google Cloud with billing on the GCP invoice and access controlled by IAM. For an enterprise that has already cleared GCP through procurement and security review, that routing is often the difference between using a model this quarter and next year.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer wants Claude but their procurement only has Google Cloud approved as a vendor. What is the pragmatic path?',
      choices: [
        { id: 'a', text: 'Open a direct contract with the model provider instead', whyWrong: 'Right eventually, perhaps, but a new vendor onboarding cycle is months of legal and security review the timeline does not have.' },
        { id: 'b', text: 'Use a personal API key until procurement catches up', whyWrong: 'Shadow IT with customer data is a security-review failure and potentially a contract breach. Never propose it.' },
        { id: 'c', text: 'Tell them Gemini is the only model available on GCP', whyWrong: 'False, and the customer will find out it is false, which costs you the credibility the account runs on.' },
        { id: 'd', text: 'Serve Claude via Model Garden on the existing contract' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'x.document_ai.when',
    mode: 'drill',
    nodeIds: ['gcp.document_ai', 'data.messy'],
    difficulty: 'core',
    explanation:
      'Sending page images of structured forms straight to a general LLM works in demos and degrades on volume: skewed scans, tables spanning pages, handwriting. Document AI processors are purpose-built extractors that output structured fields with confidence scores you can route on, and a confidence threshold is what makes human review a queue rather than a bottleneck.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An insurer needs to extract fields from 40,000 scanned claim forms a month, with human review only where extraction is uncertain. What is the sound architecture?',
      choices: [
        { id: 'a', text: 'A multimodal LLM per page image, trusting the JSON it returns', whyWrong: 'No per-field confidence signal means you either review everything or review nothing. Both fail at 40k a month.' },
        { id: 'b', text: 'Document AI, with low-confidence fields sent to review' },
        { id: 'c', text: 'Manual keying of each form, with an LLM double-checking', whyWrong: 'Keeps the full manual cost of 40k forms and adds an inference bill on top of it. Backwards.' },
        { id: 'd', text: 'OCR to raw text, then regex the field values out of it', whyWrong: 'Layout is the information in a form. Flattening to raw text destroys the structure the fields live in.' },
      ],
      correctId: 'b',
    },
  },

  // ── AI engineering ───────────────────────────────────────────────────────
  {
    id: 'x.evals.golden_drift',
    mode: 'drill',
    nodeIds: ['ai.evals', 'ai.llm_judge'],
    difficulty: 'edge',
    explanation:
      'A golden set curated once decays as the product and its users drift: new intents appear, old ones fade, and the eval keeps scoring the world of six months ago. Feeding a sample of real production failures back into the set is what keeps the gate honest. An eval that never changes eventually tests nothing.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your eval suite has passed at 95% for four months, but customer complaints about answer quality are rising. What is the most likely explanation?',
      choices: [
        { id: 'a', text: 'The model degraded while the eval stayed accurate', whyWrong: 'Possible, but a static pass rate with rising complaints points at the measure, not the model. A degrading model usually moves the score.' },
        { id: 'b', text: 'Users are wrong about quality more often than before', whyWrong: 'Sometimes individually, never in aggregate over a trend. Treating complaint volume as noise is how products die confident.' },
        { id: 'c', text: 'The pass threshold is set too strictly for this suite', whyWrong: 'A too-strict threshold produces false alarms, the opposite symptom of passing steadily while quality falls.' },
        { id: 'd', text: 'The golden set has drifted away from real traffic' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'x.llm_judge.bias',
    mode: 'drill',
    nodeIds: ['ai.llm_judge', 'ai.evals'],
    difficulty: 'deep',
    explanation:
      'LLM judges have measurable biases: they favor longer answers, favor the first position in pairwise comparisons, and favor outputs styled like their own. Position randomization, length controls and periodic human calibration are not optional hygiene, they are what makes the judge a measurement instrument instead of a vibe.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'You are building an LLM-as-judge pairwise comparison. Which safeguards are genuinely necessary? Select all that apply.',
      choices: [
        { id: 'a', text: 'Randomize which answer appears first in each comparison' },
        { id: 'b', text: 'Spot-check a sample of judgments against human ratings' },
        { id: 'c', text: 'Watch for length bias: longer should not silently mean better' },
        { id: 'd', text: 'Always use the same model as judge and generator', whyWrong: 'Self-judging amplifies style bias: a model grades its own dialect kindly. Prefer a different judge, not the same one.' },
        { id: 'e', text: 'Run the judge at temperature 2.0 for diversity of opinion', whyWrong: 'A judge should be as deterministic as possible; sampling noise in the grader is variance in your metric.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'x.structured.validation',
    mode: 'drill',
    nodeIds: ['ai.structured_output', 'ai.tool_calling'],
    difficulty: 'core',
    explanation:
      'Constrained decoding or a JSON schema guarantees shape, not truth: the model can emit a perfectly valid object whose values are wrong, stale or fabricated. Schema validation is the first gate, business-rule validation is the one that saves you, and the retry loop handles the model’s bad days.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your extraction pipeline uses schema-constrained output and never gets malformed JSON. A customer reports invoices booked with negative totals. What was missing?',
      choices: [
        { id: 'a', text: 'A stricter JSON schema with tighter types and enums', whyWrong: 'You can encode a minimum of zero, but schemas cannot express most business invariants, such as totals matching line items.' },
        { id: 'b', text: 'A larger model with better extraction accuracy', whyWrong: 'Reduces error frequency, cannot eliminate it. Pipelines are safe because of gates, not optimism about the model.' },
        { id: 'c', text: 'Lower temperature so extraction is deterministic', whyWrong: 'Less sampling variance does not stop a model from confidently misreading a credit note as an invoice.' },
        { id: 'd', text: 'Business-rule checks after schema validation' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'x.mcp.server_scope',
    mode: 'drill',
    nodeIds: ['ai.mcp', 'idp.scopes'],
    difficulty: 'deep',
    explanation:
      'An MCP server executes with whatever credentials it holds, and the model decides when to call it. The blast radius of a prompt-injected agent is exactly the union of its tools’ permissions, so every tool follows least privilege: read-only credentials for read tools, scoped writes, and no admin tokens anywhere near the model’s reach.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are wiring an MCP server that gives an agent access to the customer’s ticketing system. The vendor offers one admin API token. What do you do?',
      choices: [
        { id: 'a', text: 'Mint scoped per-tool credentials, read-only where possible' },
        { id: 'b', text: 'Take the admin token, instruct the model to avoid writes', whyWrong: 'Instructions are not authorization. Prompt injection exists precisely to make the model ignore that sentence.' },
        { id: 'c', text: 'Take the admin token and log every call the agent makes', whyWrong: 'An audit trail tells you which tickets were deleted, after they were deleted. Detection does not substitute for prevention.' },
        { id: 'd', text: 'Decline the integration until the vendor ships scopes', whyWrong: 'Unnecessary: you can scope credentials on your side. Blanket refusal is judgment failure in the other direction.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.cost.cache_prompt',
    mode: 'drill',
    nodeIds: ['ai.cost', 'ai.context'],
    difficulty: 'core',
    explanation:
      'When every request re-sends the same multi-thousand-token system prompt and tool definitions, the stable prefix dominates spend. Prompt caching prices cached input tokens at a fraction of fresh ones, so structuring prompts as stable-prefix-first is often the single largest cost lever in an agent, ahead of model choice.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agent’s bill is dominated by input tokens: a 6,000-token system prompt and tool schema re-sent on every call. What is the highest-leverage fix?',
      choices: [
        { id: 'a', text: 'Route every call to the smallest model that still passes', whyWrong: 'Changes quality everywhere to fix a cost problem that caching removes without touching quality at all.' },
        { id: 'b', text: 'Cut tool descriptions until the system prompt is smaller', whyWrong: 'Degrading tool selection to save input tokens trades your success rate for pennies caching would have saved anyway.' },
        { id: 'c', text: 'Reorder for caching: stable prefix first, request last' },
        { id: 'd', text: 'Batch many user requests into a single larger call', whyWrong: 'Cross-user batching wrecks latency, isolation and error handling. Wrong tool for an input-token problem.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'x.latency.streaming',
    mode: 'drill',
    nodeIds: ['ai.latency', 'client.streaming_ui'],
    difficulty: 'core',
    explanation:
      'Time-to-first-token is what users experience as speed; total generation time is what benchmarks measure. Streaming turns a six-second wait into a response that starts in half a second, which is why perceived-latency work usually beats model-swap work.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Users call the assistant "slow". Traces show 800ms to first token, then 5 seconds of generation, delivered all at once. What do you fix first?',
      choices: [
        { id: 'a', text: 'Stream the response: first token on screen in under a second changes the perceived wait entirely' },
        { id: 'b', text: 'Swap to a faster model', whyWrong: 'Cuts total time somewhat, at a quality cost, while leaving the all-at-once delivery that creates the "slow" perception.' },
        { id: 'c', text: 'Add a fun loading animation', whyWrong: 'Decorating a 5.8-second blank wait does not compete with filling it with the actual answer.' },
        { id: 'd', text: 'Cache full responses to repeated questions', whyWrong: 'Helps the tiny fraction of exactly-repeated queries; the median request still waits.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.rag.failure_order',
    mode: 'drill',
    nodeIds: ['ai.rag_failure', 'ai.observability'],
    difficulty: 'deep',
    explanation:
      'RAG debugging has a canonical order because each stage’s failure masquerades as the next one’s: if ingestion dropped the document, retrieval "fails"; if retrieval missed, generation "hallucinates". Checking generation first, which is where everyone starts, wastes days prompting around a missing chunk.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'A RAG assistant gives a wrong answer about a document the customer swears is in the system. Order the diagnostic steps.',
      steps: [
        'Confirm the document was ingested and chunked, and the chunks exist in the index',
        'Run the user’s query against retrieval alone and inspect the returned chunks',
        'Check whether the right chunk was in the prompt but ranked too low or truncated',
        'Only then examine how the model used the context it was given',
      ],
    },
  },
  {
    id: 'x.context.rot',
    mode: 'drill',
    nodeIds: ['ai.context', 'ai.memory'],
    difficulty: 'deep',
    explanation:
      'Long-running agent conversations accumulate stale tool outputs, dead ends and repetition. Models attend unevenly across very long contexts, so quality degrades even while everything still "fits". Compaction, summarizing completed work and pruning superseded tool results, is maintenance, not optimization.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agent handling long multi-step tasks gets noticeably dumber near the end of big jobs, though the context window is not exceeded. What is the likely cause?',
      choices: [
        { id: 'a', text: 'Context degradation: stale tool outputs and dead ends are diluting attention; compact the history' },
        { id: 'b', text: 'The model provider is throttling quality', whyWrong: 'A persistent myth. Within-conversation degradation tracks context growth, not provider mood.' },
        { id: 'c', text: 'Token limits are truncating silently', whyWrong: 'You stated the window is not exceeded; truncation also produces missing-information errors, not diffuse dumbness.' },
        { id: 'd', text: 'Temperature drifts upward over a conversation', whyWrong: 'Temperature is per-request and does not drift on its own.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.finetune.when',
    mode: 'drill',
    nodeIds: ['ai.finetune', 'ai.prompt_design'],
    difficulty: 'deep',
    explanation:
      'Fine-tuning teaches form: style, format, a persona, a narrow classification skill. It does not teach facts you could retrieve, and it freezes knowledge at training time. The decision rule that holds up: retrieval for knowledge, prompting for behavior you can specify, fine-tuning for behavior you can only demonstrate.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each requirement to the right first tool.',
      pairs: [
        { left: 'Answers must reflect this week’s product catalog', right: 'RAG over the catalog' },
        { left: 'Output must follow a strict house style no prompt has captured', right: 'Fine-tune on exemplars' },
        { left: 'The agent must refuse out-of-scope requests', right: 'Prompted policy plus guardrails' },
        { left: 'Classify tickets into 40 stable internal categories cheaply', right: 'Fine-tuned small model' },
      ],
    },
  },
  {
    id: 'x.observability.traces',
    mode: 'drill',
    nodeIds: ['ai.observability', 'ai.tool_calling'],
    difficulty: 'core',
    explanation:
      'When an agent misbehaves, the question is always "what did it see and what did it decide, step by step". Logging only final answers means reconstructing that from memory. Tracing every step, prompt, tool call, tool result, decision, is the difference between a five-minute diagnosis and a shrug.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which of these belong in every agent trace? Select all that apply.',
      choices: [
        { id: 'a', text: 'Each tool call with its arguments and returned result' },
        { id: 'b', text: 'The exact prompt (or a reference to it) for each model call' },
        { id: 'c', text: 'Token counts and latency per step' },
        { id: 'd', text: 'Only the final answer, to keep storage costs down', whyWrong: 'The final answer without the path to it is exactly the log that cannot answer "why did it do that".' },
        { id: 'e', text: 'The raw weights of the model', whyWrong: 'Not observable, not yours to log, and no diagnostic value per request.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Security and compliance ──────────────────────────────────────────────
  {
    id: 'x.hipaa.baa',
    mode: 'drill',
    nodeIds: ['sec.hipaa', 'gcp.assured'],
    difficulty: 'core',
    explanation:
      'HIPAA work on a cloud requires a signed Business Associate Agreement, and the BAA covers an enumerated list of services, not the whole catalog. The deployment discipline is keeping PHI inside covered services, and the classic failure is a covered pipeline that leaks PHI into an uncovered convenience service, logs, a notebook, an unlisted API.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A hospital asks whether they can process PHI on Google Cloud. What is the accurate answer?',
      choices: [
        { id: 'a', text: 'Yes, under a BAA, and only in services the BAA covers. Architecture must keep PHI inside that boundary' },
        { id: 'b', text: 'Yes, any GCP service is fine because Google is HIPAA compliant', whyWrong: 'No cloud is blanket "HIPAA compliant". The BAA covers specific services, and compliance is a property of your deployment, not the platform.' },
        { id: 'c', text: 'No, healthcare data cannot go to public cloud', whyWrong: 'False for over a decade. Regulated healthcare runs on public cloud under BAAs everywhere.' },
        { id: 'd', text: 'Yes, as long as the data is encrypted', whyWrong: 'Encryption is necessary and nowhere near sufficient. Without a BAA, encrypted PHI on the platform is still a compliance failure.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.gdpr.roles',
    mode: 'drill',
    nodeIds: ['sec.gdpr', 'sec.pii'],
    difficulty: 'core',
    explanation:
      'Under GDPR the customer deciding why and how personal data is processed is the controller; your platform processing it on their instructions is the processor. The role decides your obligations: processors need a data processing agreement, documented sub-processors, and the machinery to support deletion and access requests, because the controller’s legal duties flow through the contract to you.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your AI platform processes EU end-user data on behalf of a customer who decides what is collected and why. Under GDPR, your company is the:',
      choices: [
        { id: 'a', text: 'Processor: you act on the controller’s instructions, under a data processing agreement' },
        { id: 'b', text: 'Controller: you run the servers', whyWrong: 'Running infrastructure does not make you controller. Deciding purposes and means does, and that is the customer here.' },
        { id: 'c', text: 'Joint controller with the customer', whyWrong: 'Joint control requires jointly deciding purposes. A platform acting on instructions is the textbook processor.' },
        { id: 'd', text: 'Neither: GDPR only applies to EU companies', whyWrong: 'GDPR applies by whose data is processed, not where the company is incorporated. This mistake is expensive.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.residency.processing',
    mode: 'drill',
    nodeIds: ['sec.residency', 'gcp.ai_residency'],
    difficulty: 'edge',
    explanation:
      'Storing data in-region is the easy half. The question that catches AI deployments is where inference happens: a prompt sent to a model endpoint is data in transit and in processing, and a globally-routed endpoint can process it outside the region while the storage bucket sits compliantly at home. Regional model endpoints and ML-processing commitments close the gap; assuming storage residency covers inference does not.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A German customer requires all personal data handled in the EU. Data is stored in europe-west3, but the app calls a global model endpoint. Compliant?',
      choices: [
        { id: 'a', text: 'Not necessarily: inference is processing, and a global endpoint may process outside the EU. Use regional endpoints with ML-processing guarantees' },
        { id: 'b', text: 'Yes: residency is about where data is stored', whyWrong: 'Residency obligations typically cover processing too. "Stored in Frankfurt, processed wherever" fails the requirement as written.' },
        { id: 'c', text: 'Yes, because prompts are transient', whyWrong: 'Transient processing of personal data is still processing. Duration is not the test.' },
        { id: 'd', text: 'No, and it cannot be fixed on a public cloud', whyWrong: 'Regional AI endpoints and processing commitments exist for exactly this. Overclaiming impossibility loses winnable deals.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.tenancy.models',
    mode: 'drill',
    nodeIds: ['sec.tenancy', 'idp.rls'],
    difficulty: 'deep',
    explanation:
      'Tenancy is a spectrum: shared tables with row-level isolation, schema-per-tenant, database-per-tenant, project-per-tenant. Each step right costs operational complexity and buys blast-radius isolation and cleaner compliance stories. The honest answer to "which one" is a function of tenant count, regulatory exposure and how much ops the team can carry.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each customer profile to the sensible tenancy model.',
      pairs: [
        { left: 'SaaS with 10,000 small business tenants', right: 'Shared schema with enforced row-level security' },
        { left: 'A dozen enterprise tenants with per-tenant compliance audits', right: 'Database or project per tenant' },
        { left: 'One regulated tenant demanding provable isolation and own keys', right: 'Dedicated project with CMEK' },
        { left: 'Internal tool for three teams in one company', right: 'Shared everything with app-level scoping' },
      ],
    },
  },
  {
    id: 'x.eu_ai_act.tiers',
    mode: 'drill',
    nodeIds: ['sec.eu_ai_act', 'ai.guardrails'],
    difficulty: 'deep',
    explanation:
      'The EU AI Act regulates by risk tier: prohibited practices, high-risk systems with heavy obligations (risk management, data governance, logging, human oversight, conformity assessment), limited-risk transparency duties, and minimal risk. The architectural consequence: classification is a design input, because a high-risk designation dictates logging, oversight and documentation you cannot bolt on later.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer wants AI-assisted CV screening for hiring in the EU. What does the EU AI Act mean for your design?',
      choices: [
        { id: 'a', text: 'Employment screening is high-risk: build in logging, human oversight, and documentation from day one' },
        { id: 'b', text: 'Nothing until enforcement begins', whyWrong: 'Obligations phase in on a schedule, and systems take longer to build than deadlines take to arrive. Retrofitting oversight into a shipped screener is a rebuild.' },
        { id: 'c', text: 'The Act bans AI in hiring', whyWrong: 'It does not. It classifies employment-related AI as high-risk with obligations, which is a design constraint, not a prohibition.' },
        { id: 'd', text: 'Only the model vendor has obligations', whyWrong: 'Deployers and providers of high-risk systems both carry duties. "The vendor handles it" is not a compliance strategy.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.zero_trust.beyondcorp',
    mode: 'drill',
    nodeIds: ['sec.zero_trust', 'gcp.iam'],
    difficulty: 'core',
    explanation:
      'Zero trust replaces "inside the network = trusted" with per-request verification of identity and device context. The practical consequence for architecture: no service trusts a caller because of its IP range, and internal service-to-service calls authenticate the same way external ones do.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s security team asks how your services authorize internal service-to-service calls "since they are inside the VPC anyway". The zero-trust answer:',
      choices: [
        { id: 'a', text: 'Every call carries verified service identity and is authorized per-request; the network location grants nothing' },
        { id: 'b', text: 'Internal traffic is trusted because the perimeter firewall blocks outsiders', whyWrong: 'Perimeter trust is the model zero trust exists to replace: one compromised pod inherits the whole "inside".' },
        { id: 'c', text: 'Services share a static internal API key', whyWrong: 'A shared long-lived secret is one leak away from total lateral movement, and rotation panic.' },
        { id: 'd', text: 'mTLS everywhere, no authorization needed after that', whyWrong: 'mTLS authenticates the peer; it does not decide what that peer may do. Authentication without authorization is half the control.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.audit.access_transparency',
    mode: 'drill',
    nodeIds: ['sec.audit', 'gcp.scc'],
    difficulty: 'deep',
    explanation:
      'Admin Activity audit logs are always on and record configuration changes; Data Access logs record reads of data and mostly need enabling; Access Transparency goes one level further and logs when the cloud provider’s own staff access your resources. Regulated customers ask for all three by name, and the second one being off by default is a classic audit finding.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A bank’s auditor asks for evidence of every read of a sensitive BigQuery dataset over the past quarter. What determines whether you can produce it?',
      choices: [
        { id: 'a', text: 'Whether Data Access audit logs were enabled for BigQuery before the quarter began' },
        { id: 'b', text: 'Nothing: all access is always logged automatically', whyWrong: 'Admin Activity logs are always on; Data Access logs for reads largely are not. This asymmetry is exactly what catches teams.' },
        { id: 'c', text: 'Whether the dataset had CMEK enabled', whyWrong: 'Key management controls decryption, it does not produce an access trail.' },
        { id: 'd', text: 'Whether VPC Service Controls were configured', whyWrong: 'Perimeters restrict where data can flow; they are not a read-by-read audit record.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.pii.deident',
    mode: 'drill',
    nodeIds: ['sec.pii', 'ai.guardrails'],
    difficulty: 'deep',
    explanation:
      'Masking direct identifiers is the start, not the finish: quasi-identifiers (ZIP code, birth date, job title) re-identify people by combination. Tokenization preserves referential integrity for joins; redaction destroys it; format-preserving techniques keep downstream systems working. Which one is right depends on what the data must still do afterward.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match the de-identification need to the technique.',
      pairs: [
        { left: 'Analysts must still join customer records across tables', right: 'Deterministic tokenization' },
        { left: 'Free-text support tickets go to an LLM', right: 'Detect and redact identifiers before the prompt' },
        { left: 'Legacy system requires values that look like real SSNs', right: 'Format-preserving encryption' },
        { left: 'Published dataset must resist re-identification by combination', right: 'Generalize quasi-identifiers (k-anonymity)' },
      ],
    },
  },

  // ── Data engineering ─────────────────────────────────────────────────────
  {
    id: 'x.cdc.log_vs_query',
    mode: 'drill',
    nodeIds: ['data.cdc', 'data.batch_stream'],
    difficulty: 'deep',
    explanation:
      'Query-based CDC polls with "what changed since X", which misses deletes, hammers the source, and depends on trustworthy timestamps. Log-based CDC tails the database’s own transaction log, capturing every insert, update and delete in order with minimal source load. The catch is operational: log access, retention windows, and connector infrastructure like Datastream.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'The nightly "changed rows" sync from a customer’s Postgres misses deletions, and their DBA complains about query load. What do you move to?',
      choices: [
        { id: 'a', text: 'Log-based CDC tailing the write-ahead log: deletes included, near-zero source impact' },
        { id: 'b', text: 'Poll more frequently with smaller batches', whyWrong: 'More polling means more load, and a query still cannot see a row that no longer exists.' },
        { id: 'c', text: 'Add a deleted_at column and never physically delete', whyWrong: 'Soft deletes are a schema change to the customer’s system of record for your pipeline’s convenience. Sometimes possible, rarely yours to demand.' },
        { id: 'd', text: 'Full table export every night and diff', whyWrong: 'Catches deletes at the cost of exporting everything daily, the heaviest possible load profile, and a full day of staleness.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.idempotency.retry',
    mode: 'drill',
    nodeIds: ['data.idempotency', 'scale.queueing'],
    difficulty: 'core',
    explanation:
      'Any retried side effect will eventually double-fire: networks fail after the operation succeeded but before the acknowledgment arrived. Idempotency keys let the receiver detect the replay and return the original result. "At-least-once delivery plus idempotent handlers" is the pattern that makes distributed pipelines survivable.',
    citations: cite('pubsubOrdering'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A payment webhook occasionally fires twice and customers get double-charged. The vendor will not change their retry behavior. What do you build?',
      choices: [
        { id: 'a', text: 'Idempotency: record each event id, and make the charge handler a no-op on ids already processed' },
        { id: 'b', text: 'Ask the vendor nicely for exactly-once delivery', whyWrong: 'Exactly-once delivery across systems you do not control is not a thing to be granted; duplicates are a property of retries over unreliable networks.' },
        { id: 'c', text: 'Add a 5-second sleep before processing', whyWrong: 'A timing heuristic against a retry window you do not control. It fails the day their retry policy changes.' },
        { id: 'd', text: 'Drop any webhook that arrives within a minute of the last one', whyWrong: 'Two legitimate different payments a minute apart now silently vanish. You traded duplicates for lost revenue.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.messy.encoding',
    mode: 'drill',
    nodeIds: ['data.messy', 'data.quality'],
    difficulty: 'core',
    explanation:
      'Real enterprise CSVs arrive in unexpected encodings, with embedded delimiters, inconsistent quoting and headers that drift between exports. The professional pattern is a quarantine pipeline: parse defensively, route unparseable rows aside with a reason, and never let one bad row abort the batch or, worse, load silently wrong.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s weekly CSV drop sometimes contains rows that break the loader. The current job aborts the whole file. What is the right design?',
      choices: [
        { id: 'a', text: 'Load good rows, quarantine bad ones with the parse reason, and report the quarantine count each run' },
        { id: 'b', text: 'Keep aborting: bad data should fail fast', whyWrong: 'Fail-fast is for your code, not their data. One malformed row holding a million good ones hostage every week is an outage schedule.' },
        { id: 'c', text: 'Skip bad rows silently', whyWrong: 'Silent data loss is the worst outcome in data engineering: the numbers are wrong and no one knows to distrust them.' },
        { id: 'd', text: 'Ask the customer to clean their exports', whyWrong: 'Worth requesting, never worth depending on. Their export process has produced this format for years and will outlive your request.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.schema_map.contract',
    mode: 'drill',
    nodeIds: ['data.schema_map', 'data.connectors'],
    difficulty: 'deep',
    explanation:
      'Field-to-field mapping is the easy part of integration; semantics are the hard part. "Status: closed" in one system is "resolved" plus "cancelled" in another, units differ, and enums drift. A living mapping document owned jointly with the customer’s data owner, with explicit handling for unmapped values, is what separates an integration from a slow-motion data corruption.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Mapping a customer’s CRM into your platform, you find their "status" enum has 14 values, four undocumented. What do you do with records carrying unmapped values?',
      choices: [
        { id: 'a', text: 'Route them to an explicit "unmapped" state, surface counts, and resolve the semantics with the data owner' },
        { id: 'b', text: 'Map anything unknown to the closest-looking known value', whyWrong: 'A guess encoded in a pipeline becomes a fact downstream. Nobody re-examines it until a report is wrong in front of an executive.' },
        { id: 'c', text: 'Drop those records', whyWrong: 'Silent loss again: four undocumented statuses might be 2% of records or 40% of the revenue-bearing ones.' },
        { id: 'd', text: 'Pause the integration until the customer documents everything', whyWrong: 'You will wait forever. Enterprise systems are permanently under-documented; the pipeline must handle that truth.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.rate_limits.backoff',
    mode: 'drill',
    nodeIds: ['data.rate_limits', 'scale.timeouts'],
    difficulty: 'core',
    explanation:
      'Retrying immediately on 429 is how a thundering herd keeps itself throttled: every client retries in sync and the spikes repeat. Exponential backoff spreads retries out, jitter desynchronizes the herd, and honoring Retry-After headers respects what the server already told you. All three together are the standard.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'A batch job hits an API returning 429s. Order the correct client response.',
      steps: [
        'Honor the Retry-After header if the response carries one',
        'Otherwise back off exponentially from a small base delay',
        'Add random jitter so parallel workers do not retry in sync',
        'Cap total retries and surface persistent throttling as a failure, not a hang',
      ],
    },
  },

  // ── Scaling and productionizing ──────────────────────────────────────────
  {
    id: 'x.timeouts.budget',
    mode: 'drill',
    nodeIds: ['scale.timeouts', 'scale.queueing'],
    difficulty: 'deep',
    explanation:
      'Timeouts must shrink as calls go deeper: if the edge gives up at 10s while a downstream call is allowed 30s, the downstream work continues for a caller that already left, holding connections and compounding load precisely when the system is struggling. Deadline propagation, every hop passing its remaining budget down, is the fix.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Service A (timeout 10s) calls B (timeout 30s) which calls C (timeout 60s). Under load, B and C churn on work whose callers have vanished. What is the structural fix?',
      choices: [
        { id: 'a', text: 'Propagate deadlines: each hop passes remaining time down, and inner timeouts never exceed outer ones' },
        { id: 'b', text: 'Raise A’s timeout to 60s', whyWrong: 'Now users wait a minute for failures, and the inversion remains one config change away from returning.' },
        { id: 'c', text: 'Remove timeouts on B and C', whyWrong: 'Unbounded waits under load are how thread pools exhaust and a slowdown becomes an outage.' },
        { id: 'd', text: 'Retry the calls that time out', whyWrong: 'Retrying against an already-overloaded downstream is adding load to the fire. Backoff helps, but the deadline inversion is the actual defect.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.caching.stampede',
    mode: 'drill',
    nodeIds: ['scale.caching', 'scale.hotspots'],
    difficulty: 'edge',
    explanation:
      'When a popular key expires, every concurrent request misses at once and stampedes the backing store, which is how "we added a cache" becomes the cause of the outage. Single-flight locking (one request recomputes, the rest wait), staggered TTLs, and serving stale while revalidating are the standard defenses.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Every hour, on the hour, the database gets hammered and latency spikes. The hot dashboard query is cached with a one-hour TTL. What is happening?',
      choices: [
        { id: 'a', text: 'Cache stampede: the popular key expires and all concurrent requests recompute at once. Use single-flight or stale-while-revalidate' },
        { id: 'b', text: 'The database needs an index on the dashboard query', whyWrong: 'An index makes each recomputation cheaper but the synchronized thundering herd remains; the periodicity is the tell.' },
        { id: 'c', text: 'The cache is too small', whyWrong: 'Eviction pressure causes diffuse misses, not a spike aligned to the top of the hour.' },
        { id: 'd', text: 'Someone scheduled a cron job on the hour', whyWrong: 'Worth one glance, but a spike matching your own TTL is the signature of expiry, not coincidence.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.capacity.headroom',
    mode: 'drill',
    nodeIds: ['scale.capacity', 'del.napkin'],
    difficulty: 'core',
    explanation:
      'Capacity planning against average load is planning to fail at peak: real traffic is spiky, and the meaningful numbers are peak sustained load, burst multiples, and growth. Napkin math that starts from peak-with-headroom is the difference between a launch and an incident review.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s API averages 50 requests/second. Marketing expects launch-day traffic of 4× normal, and the daily peak already runs 3× the average. What do you provision for?',
      choices: [
        { id: 'a', text: 'Around 600 rps plus headroom: peak (150) times launch multiple (4), then margin for error' },
        { id: 'b', text: '50 rps: that is the measured load', whyWrong: 'Averages hide peaks. A system sized to the mean is down every day at lunchtime, never mind launch day.' },
        { id: 'c', text: '200 rps: average times the launch multiple', whyWrong: 'Applies the launch multiple to the average instead of the peak; the two multipliers stack.' },
        { id: 'd', text: '10,000 rps to be safe', whyWrong: 'A 60× overprovision is not caution, it is burning the budget the project needed for something else. Headroom is a multiplier, not a superstition.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.rollback.model',
    mode: 'drill',
    nodeIds: ['prod.model_release', 'prod.rollback'],
    difficulty: 'deep',
    explanation:
      'Model and prompt changes are releases and need the same machinery as code: versioning, progressive rollout, guardrail metrics and instant rollback. The extra trap in AI systems is entanglement, a prompt tuned for model version N can regress on N+1, so prompt and model versions pin together, and roll back together.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'After switching your agent to a newer model version, task completion drops 8%. The old model version remains available. What should have been in place to make this a non-event?',
      choices: [
        { id: 'a', text: 'Pinned model+prompt versions, canary rollout gated on eval metrics, one-step rollback to the previous pair' },
        { id: 'b', text: 'A bigger context window on the new model', whyWrong: 'Irrelevant to the regression mechanism. Newer is not a direction of quality for your task, it is a different distribution.' },
        { id: 'c', text: 'Waiting for other companies to test the new version first', whyWrong: 'Other people’s workloads do not test your prompts. Their green light means nothing for your tasks.' },
        { id: 'd', text: 'Prompt tweaks after the drop was noticed', whyWrong: 'Patching live while users churn is the expensive path. The machinery exists so the drop never reaches 100% of traffic.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.progressive.canary',
    mode: 'drill',
    nodeIds: ['prod.progressive', 'prod.cicd'],
    difficulty: 'core',
    explanation:
      'A canary that cannot fail is decoration. The discipline is the metric gate: define the guardrail metrics and rollback thresholds before the rollout begins, so promotion is a data check rather than a feeling. "It looks fine" twenty minutes into a 1% canary is how bad releases reach 100%.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the steps of a disciplined progressive rollout.',
      steps: [
        'Define guardrail metrics and rollback thresholds before shipping anything',
        'Release to a small canary slice and let it soak against those metrics',
        'Promote in stages, checking the gates at each step',
        'Roll back immediately on a tripped gate, then diagnose with the traffic stopped',
      ],
    },
  },
  {
    id: 'x.nplusone.orm',
    mode: 'drill',
    nodeIds: ['scale.n_plus_one', 'client.perf'],
    difficulty: 'core',
    explanation:
      'The N+1 pattern, one query for the list, then one per row for details, is invisible at development data sizes and ruinous at production sizes. It hides behind ORMs and, increasingly, behind agent loops that call a tool once per item when a batch call exists.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A page listing 50 orders makes 51 database queries. The same shape appears in your agent: a tool call per line item. What is the shared fix?',
      choices: [
        { id: 'a', text: 'Batch: fetch the collection and its associations in one or two queries, and give the agent a batch tool' },
        { id: 'b', text: 'Cache the 51 queries', whyWrong: 'Caching an inefficiency makes it faster until invalidation, then it is slow and stale. Fix the shape, then cache if still needed.' },
        { id: 'c', text: 'Move the database closer to reduce per-query latency', whyWrong: 'Halving the per-query cost of 51 queries still loses to making 2.' },
        { id: 'd', text: 'Raise the connection pool size', whyWrong: 'More concurrent capacity for wasteful queries scales the waste, not the page.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.incident.comms',
    mode: 'drill',
    nodeIds: ['prod.incident', 'cust.bad_news'],
    difficulty: 'deep',
    explanation:
      'During a customer-visible incident, silence is read as either ignorance or concealment, both worse than the outage. The cadence that preserves trust: acknowledge fast with what you know, commit to an update time, meet it even when the update is "still investigating", and never speculate about causes you have not confirmed.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your platform has been degraded for 20 minutes for a major customer. Root cause unknown. The account manager asks what to tell them. You say:',
      choices: [
        { id: 'a', text: 'Acknowledge now, state impact and that cause is under investigation, and commit to an update at a specific time' },
        { id: 'b', text: 'Wait until you know the root cause so you only communicate accurate information', whyWrong: 'Accuracy-via-silence reads as stonewalling. "We know, we are on it, next update at 14:30" is accurate today.' },
        { id: 'c', text: 'Say it was probably the cloud provider', whyWrong: 'Unconfirmed blame you may retract is a credibility loan at loan-shark rates.' },
        { id: 'd', text: 'Downplay: most users are unaffected', whyWrong: 'The customer on the call is affected. Minimizing their experience teaches them your status page lies.' },
      ],
      correctId: 'a',
    },
  },

  // ── Delivery and economics ───────────────────────────────────────────────
  {
    id: 'x.napkin.tokens',
    mode: 'drill',
    nodeIds: ['del.napkin', 'ai.cost'],
    difficulty: 'core',
    explanation:
      'The estimate that matters in the meeting is the shape, not the third decimal: requests per month times tokens per request, split input/output because they price differently, and English text runs roughly four characters per token. Being able to do this on a whiteboard is a trust-building move; promising to "get back to them" with a spreadsheet is a momentum-losing one.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: '5,000 support conversations/day, averaging 6 model calls each, roughly 3,000 input and 400 output tokens per call. What is the monthly token volume to price?',
      choices: [
        { id: 'a', text: 'Around 2.7 billion input and 360 million output tokens' },
        { id: 'b', text: 'Around 90 million input and 12 million output tokens', whyWrong: 'That is one day’s volume: 5,000 × 6 × 3,000 input. The question priced a month.' },
        { id: 'c', text: 'Around 450 million total tokens', whyWrong: 'Drops the 6 calls per conversation, the multiplier agent architectures always add.' },
        { id: 'd', text: 'It cannot be estimated without exact prompts', whyWrong: 'Precision can wait; the order of magnitude cannot. "Billions of input tokens monthly" is the fact that shapes the architecture conversation.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.tco.hidden',
    mode: 'drill',
    nodeIds: ['del.tco', 'del.pilot_to_prod'],
    difficulty: 'deep',
    explanation:
      'The model bill is the visible cost and rarely the dominant one. Evaluation infrastructure, observability, human review queues, on-call, retraining the workflow, and the engineers who own all of it usually outweigh inference. A TCO that is only the per-token math is a pitch, not an estimate.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A CFO asks for the real total cost of running the AI assistant in production. Beyond inference, which belong in the number? Select all that apply.',
      choices: [
        { id: 'a', text: 'Evaluation and regression infrastructure, and the time to maintain golden sets' },
        { id: 'b', text: 'Human review capacity for low-confidence outputs' },
        { id: 'c', text: 'Observability, tracing storage, and on-call ownership' },
        { id: 'd', text: 'The cost of the demo environment used in the sales cycle', whyWrong: 'Sales cost, not run cost. Mixing them muddies both numbers and CFOs notice.' },
        { id: 'e', text: 'A 10x contingency multiplier on everything', whyWrong: 'Padding is not estimating. Named line items with assumptions beat blanket multipliers in every executive room.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'x.poc_exit.criteria',
    mode: 'drill',
    nodeIds: ['del.poc_exit', 'del.discovery_scope'],
    difficulty: 'core',
    explanation:
      'A proof of concept without written exit criteria does not end, it fades: the customer keeps adding "one more scenario" and the team keeps polishing a thing that will never be judged. Exit criteria agreed before work starts, with numbers, an owner and a decision date, are what make a POC a decision instrument.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Kickoff for a 4-week POC. What must be agreed in writing before engineering starts?',
      choices: [
        { id: 'a', text: 'Measurable success criteria, who decides, and the decision date, so week four ends in a verdict' },
        { id: 'b', text: 'The full production architecture', whyWrong: 'Premature: the POC exists to inform that design. Locking it now front-loads guesses.' },
        { id: 'c', text: 'The final contract value', whyWrong: 'Commercials follow the POC outcome; negotiating the end before the evidence is backwards.' },
        { id: 'd', text: 'Nothing: POCs should stay flexible', whyWrong: 'Flexibility about scope is fine; flexibility about what success means guarantees the fade-out ending where nobody buys.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.thin_slice.first',
    mode: 'drill',
    nodeIds: ['del.thin_slice', 'del.risk_sequencing'],
    difficulty: 'deep',
    explanation:
      'The first slice should traverse the whole system end to end at minimum width, touching the scariest integration on the way, because integration risk is where AI deployments die. A beautiful UI over a mocked backend retires zero risk; an ugly path from real data to real output retires the most.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Week one of a 90-day engagement to build a claims assistant on the customer’s legacy mainframe data. What do you build first?',
      choices: [
        { id: 'a', text: 'One claim, pulled from the real mainframe, through the model, to one displayed answer, however ugly' },
        { id: 'b', text: 'The full UI with mocked data, for early stakeholder demos', whyWrong: 'Demos well, retires nothing. The mainframe integration, the actual risk, stays untouched while calendar burns.' },
        { id: 'c', text: 'The complete data pipeline for all claim types', whyWrong: 'Horizontal slices deliver no end-to-end proof until late, which is exactly when you cannot afford surprises.' },
        { id: 'd', text: 'Prompt engineering against synthetic claims', whyWrong: 'Synthetic data hides the messiness that is the entire difficulty of the mainframe.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.slo.error_budget',
    mode: 'drill',
    nodeIds: ['del.slo', 'prod.oncall'],
    difficulty: 'core',
    explanation:
      'An SLO is a target with a consequence: the error budget is the allowed unreliability, and burning it is the agreed trigger to trade feature work for reliability work. Without the budget mechanism, "99.9%" is a poster on the wall and every incident becomes a negotiation.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your service has a 99.9% monthly availability SLO and has already burned 80% of the error budget by mid-month. What does the mechanism say happens now?',
      choices: [
        { id: 'a', text: 'Risky launches slow or stop and reliability work takes priority until the budget recovers' },
        { id: 'b', text: 'Nothing until the SLO is actually breached', whyWrong: 'Waiting to react until the promise is already broken defeats the point of a budget, which is early steering.' },
        { id: 'c', text: 'The SLO is adjusted to fit the burn rate', whyWrong: 'Moving the target when you miss is how SLOs become fiction, and customers eventually price that fiction into the contract.' },
        { id: 'd', text: 'On-call is doubled', whyWrong: 'More people watching the same instability responds to the symptom. The mechanism changes what work gets done.' },
      ],
      correctId: 'a',
    },
  },

  // ── Customer craft ───────────────────────────────────────────────────────
  {
    id: 'x.discovery.open_q',
    mode: 'drill',
    nodeIds: ['cust.discovery_q', 'cust.stakeholders'],
    difficulty: 'core',
    explanation:
      'Early discovery is for the customer’s model of the problem, which only open questions surface. Closed questions collect confirmations of your assumptions; "walk me through what happens today when X" collects the workflow, the exceptions, and usually the actual problem, which is rarely the one in the RFP.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'First discovery call for an "AI to speed up underwriting" project. Which opening question earns its slot?',
      choices: [
        { id: 'a', text: '“Walk me through what happens today from application received to decision made.”' },
        { id: 'b', text: '“So you want to automate underwriting decisions, right?”', whyWrong: 'A closed leading question that locks in your framing. They will say yes and you will build the wrong thing accurately.' },
        { id: 'c', text: '“Which model would you like us to use?”', whyWrong: 'Implementation detail before the problem is understood, and it delegates your expertise to the customer.' },
        { id: 'd', text: '“What is your budget?”', whyWrong: 'Legitimate later; as an opener it signals you are scoping your effort, not their problem.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.expectations.accuracy',
    mode: 'drill',
    nodeIds: ['cust.expectations', 'cust.explaining_ai'],
    difficulty: 'deep',
    explanation:
      'Agreeing to "it must always be right" is signing up to fail; refusing AI because it errs ignores that the current process errs too. The professional move is reframing to a measurable comparison with the human baseline plus a designed escalation path for the residual, which is a system that can actually be built and evaluated.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A COO says: “We will deploy the assistant when it never gives a wrong answer.” Your response?',
      choices: [
        { id: 'a', text: 'Reframe: measure against today’s human error rate, set a target above it, and design escalation for the cases it gets wrong' },
        { id: 'b', text: 'Promise the accuracy bar will be met', whyWrong: 'You just signed a contract physics cannot honor. The miss will arrive in production, in front of this COO.' },
        { id: 'c', text: 'Explain that LLMs hallucinate and nothing can be done', whyWrong: 'Technically flavored surrender. Mitigations, grounding, confidence routing, review queues, are the actual product.' },
        { id: 'd', text: 'Suggest waiting for better models', whyWrong: 'Postponement is a competitor’s opening. The baseline-plus-escalation frame ships value now.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.pushback.scope',
    mode: 'drill',
    nodeIds: ['cust.pushback', 'cust.saying_no'],
    difficulty: 'deep',
    explanation:
      'Mid-engagement scope requests are won or lost on frame: a bare "no" damages the relationship, a silent "yes" damages the delivery. Acknowledging the validity, making the trade-off explicit, and routing the decision to the person who owns the priority keeps you the advisor instead of the obstacle.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Week 6 of 12. The customer’s VP asks to add a second language to the assistant "since you are already in there". It would cost roughly three weeks. You say:',
      choices: [
        { id: 'a', text: '“Great candidate for phase two. In this phase it would push the launch three weeks; if it outranks the launch date, let’s take that trade to the steering group.”' },
        { id: 'b', text: '“Sure, we’ll fit it in.”', whyWrong: 'A silent yes converts their request into your slip. In week 11 the delay will be your fault, not their ask.' },
        { id: 'c', text: '“No, that’s out of scope.”', whyWrong: 'Correct on the facts, corrosive in the delivery: contract language where a trade-off conversation was available.' },
        { id: 'd', text: '“We’ll try our best.”', whyWrong: 'The worst of both: they heard yes, you meant maybe, and the gap lands at launch.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.exec.brief',
    mode: 'drill',
    nodeIds: ['cust.exec_comms', 'del.pilot_to_prod'],
    difficulty: 'core',
    explanation:
      'Executive communication is decision-first: state the situation, the ask, and the consequence in the first three sentences, then hold the detail for questions. A chronological engineering narrative buries the decision on slide nine, and the meeting ends before slide nine.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'You have five minutes with the sponsor to unblock a stalled integration. Order the briefing.',
      steps: [
        'The headline: pilot is on track except one blocker, and you need a decision today',
        'The blocker in one sentence: security review for the CRM connection has no owner',
        'The ask: name an owner this week, or accept a two-week slip',
        'Offer detail and options for questions, not before',
      ],
    },
  },
  {
    id: 'x.ownership.language',
    mode: 'drill',
    nodeIds: ['cust.ownership', 'cust.exec_comms'],
    difficulty: 'core',
    explanation:
      'Ownership language names a person, a deliverable and a date; deflection language names a process. Customers under pressure hear the difference instantly: “we are looking into it” buys distrust, “I will have the root cause by Thursday and call you either way” buys patience.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer escalates a data quality issue. Which reply is ownership rather than deflection?',
      choices: [
        { id: 'a', text: '“I own this. You’ll have the root cause and a fix plan from me by Thursday noon, and I’ll call you either way.”' },
        { id: 'b', text: '“The team is looking into it.”', whyWrong: 'No name, no date, no deliverable. This sentence is why customers escalate past you.' },
        { id: 'c', text: '“This looks like an issue on your side’s data export.”', whyWrong: 'Even when true, blame-first costs the relationship. Diagnose jointly, then assign causes with evidence.' },
        { id: 'd', text: '“We’ll prioritize it in the next sprint.”', whyWrong: 'Process language. Their outage does not care about your ceremonies, and they hear that you don’t either.' },
      ],
      correctId: 'a',
    },
  },

  // ── GCP foundations depth ────────────────────────────────────────────────
  {
    id: 'x.wif.keys',
    mode: 'drill',
    nodeIds: ['gcp.wif', 'idp.service_auth'],
    difficulty: 'core',
    explanation:
      'Exported service account keys are long-lived bearer secrets: anyone holding the JSON is the service account, forever, until someone remembers to rotate. Workload Identity Federation exchanges the external platform’s own short-lived identity token for GCP credentials, so there is no stored secret to leak, rotate, or find in a repo two years later.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s GitHub Actions pipeline deploys to GCP using a service account key stored as a repo secret. What do you recommend?',
      choices: [
        { id: 'a', text: 'Workload Identity Federation: exchange the pipeline’s OIDC token for short-lived GCP credentials, delete the key' },
        { id: 'b', text: 'Rotate the key monthly', whyWrong: 'Better than never, still a stored long-lived secret with a 30-day blast window and a manual process that will be skipped.' },
        { id: 'c', text: 'Encrypt the key with a second key', whyWrong: 'Now there are two secrets. The pipeline still ultimately holds a decrypted long-lived credential.' },
        { id: 'd', text: 'Restrict the key by source IP', whyWrong: 'CI runner IP ranges are broad and shared with every other tenant of that CI provider.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.cmek.revoke',
    mode: 'drill',
    nodeIds: ['gcp.kms', 'sec.tenancy'],
    difficulty: 'deep',
    explanation:
      'CMEK gives the customer control of the key that wraps their data’s encryption: disable or destroy the key and the data becomes cryptographically unreadable, an off-switch that survives any dispute with the provider or a compromised project. That control story, not stronger mathematics, is what the customer is buying; the cipher is the same.',
    citations: cite('cmek'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer asks why they should use CMEK when Google already encrypts everything at rest. The honest answer:',
      choices: [
        { id: 'a', text: 'Control, not cryptography: with CMEK they hold a revocation switch and an audit trail for key use' },
        { id: 'b', text: 'CMEK uses stronger encryption algorithms', whyWrong: 'It does not. The algorithms match default encryption; the difference is entirely who controls the key lifecycle.' },
        { id: 'c', text: 'CMEK makes data breaches impossible', whyWrong: 'Overclaim. CMEK does nothing against compromised credentials reading data through the front door while keys are enabled.' },
        { id: 'd', text: 'There is no real reason; it is compliance theater', whyWrong: 'Dismissive and wrong: revocability and key-use auditing are concrete, testable properties regulators legitimately ask for.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.bq.cost_control',
    mode: 'drill',
    nodeIds: ['gcp.bigquery', 'prod.cost_monitoring'],
    difficulty: 'core',
    explanation:
      'On-demand BigQuery bills by bytes scanned, so an unpartitioned full-table scan in a dashboard refreshed hourly is a money printer running backwards. Partitioning plus clustering cuts the scanned bytes, required partition filters make the cut mandatory, and maximum-bytes-billed guards catch the query that forgot.',
    citations: cite('bqPartition'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A customer’s BigQuery bill tripled after a new dashboard shipped. Which controls actually address it? Select all that apply.',
      choices: [
        { id: 'a', text: 'Partition the fact tables by date and require partition filters' },
        { id: 'b', text: 'Cluster on the columns the dashboard filters by' },
        { id: 'c', text: 'Set maximum bytes billed on the dashboard’s queries' },
        { id: 'd', text: 'Switch all queries to SELECT *', whyWrong: 'Backwards: SELECT * scans every column, and column pruning is one of the main levers you have.' },
        { id: 'e', text: 'Export everything to CSV and query locally', whyWrong: 'Abandoning the warehouse to save the warehouse. Loses governance, freshness and concurrency for a cost problem partitioning solves.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'x.spanner_vs_alloydb',
    mode: 'drill',
    nodeIds: ['gcp.spanner', 'gcp.alloydb'],
    difficulty: 'deep',
    explanation:
      'AlloyDB is the answer when the workload speaks PostgreSQL and needs a serious managed engine in a region. Spanner is the answer when the requirement is horizontal write scale or multi-region strong consistency, and it asks for schema and query adjustments in return. Leading with the exotic option when the boring one fits is a classic architecture review finding.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer is migrating a 2TB PostgreSQL OLTP database. Single region is fine, write volume fits one primary, and the app uses Postgres extensions. What do you propose?',
      choices: [
        { id: 'a', text: 'AlloyDB: PostgreSQL-compatible, managed, and the migration is a move rather than a rewrite' },
        { id: 'b', text: 'Spanner, because it is the most scalable option', whyWrong: 'Scale they do not need, bought with schema rework and extension incompatibility they will definitely notice.' },
        { id: 'c', text: 'BigQuery', whyWrong: 'An analytical warehouse for an OLTP workload: single-row transactional patterns are precisely what it is not for.' },
        { id: 'd', text: 'Firestore', whyWrong: 'A document store for a relational app with Postgres extensions means rewriting the data layer for no stated benefit.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.compute.spectrum',
    mode: 'drill',
    nodeIds: ['gcp.compute_choice', 'gcp.gke'],
    difficulty: 'core',
    explanation:
      'The compute decision is mostly a question of what you want to own: Cloud Run owns the infrastructure and gives you request-scoped scale including to zero; GKE hands you the cluster’s power and its operational bill; GCE is for workloads that need the raw machine. Teams default to Kubernetes for status reasons and then staff a platform team to carry it.',
    citations: cite('cloudRun'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      pairs: [
        { left: 'Stateless API, spiky traffic, two-person team', right: 'Cloud Run' },
        { left: 'Fleet of services with custom operators and sidecars', right: 'GKE' },
        { left: 'Licensed database requiring specific kernel settings', right: 'Compute Engine' },
        { left: 'Event-driven glue that runs for seconds', right: 'Cloud Run functions' },
      ],
      stem: 'Match the workload to the least-ownership compute that serves it.',
    },
  },
  {
    id: 'x.iam.conditions',
    mode: 'drill',
    nodeIds: ['gcp.iam', 'idp.rbac_abac'],
    difficulty: 'deep',
    explanation:
      'Plain role bindings answer who can do what; IAM Conditions add when and on what, expiry times, resource-name prefixes, request attributes. Time-boxed elevated access that expires by itself replaces the “temporary” admin grant that someone was supposed to remember to remove and never did.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A contractor needs write access to one bucket for a three-week migration. The customer’s habit is granting project-level Storage Admin "temporarily". What do you set up instead?',
      choices: [
        { id: 'a', text: 'A bucket-scoped role with an IAM Condition that expires the binding on the end date' },
        { id: 'b', text: 'Project Storage Admin with a calendar reminder to remove it', whyWrong: 'The reminder gets snoozed and the access outlives the contract. Standing privilege plus human memory is the anti-pattern itself.' },
        { id: 'c', text: 'Share a signed URL for each object', whyWrong: 'Signed URLs are for object-level, mostly read-oriented sharing; a three-week write migration through them is unmanageable.' },
        { id: 'd', text: 'Give the contractor a copy of the data instead', whyWrong: 'Now regulated data lives outside the customer’s controls entirely, which is worse than any over-grant inside them.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'x.pubsub.dlq',
    mode: 'drill',
    nodeIds: ['gcp.pubsub', 'data.idempotency'],
    difficulty: 'core',
    explanation:
      'A message that cannot be processed will be redelivered forever, and one poison message can pin a subscriber at full CPU while real traffic backs up behind it. A dead-letter topic with a bounded delivery-attempt count moves the poison aside for inspection and lets the healthy stream flow.',
    citations: cite('pubsubOrdering'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'One malformed message is crashing a Pub/Sub subscriber on every redelivery, and the backlog is growing. What is the durable fix?',
      choices: [
        { id: 'a', text: 'Configure a dead-letter topic with a max delivery attempts limit, and alert on dead-lettered messages' },
        { id: 'b', text: 'Catch the exception and ack the message unseen', whyWrong: 'Unblocks the queue by silently destroying data. The malformed message was evidence of something; now it is gone.' },
        { id: 'c', text: 'Restart the subscriber whenever it crashes', whyWrong: 'The message redelivers after every restart. You have automated the crash loop, not fixed it.' },
        { id: 'd', text: 'Increase the ack deadline', whyWrong: 'More time to fail identically. The deadline was never the problem.' },
      ],
      correctId: 'a',
    },
  },
];
