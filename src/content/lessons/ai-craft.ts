import type { Lesson } from '@shared/lessons';

import { cite } from '../sources';

/** AI engineering: retrieval, agents, evals, guardrails, cost and latency. */
export const LESSONS_AI_CRAFT: Lesson[] = [
  {
    id: 'l.rag_shape',
    nodeIds: ['ai.chunking', 'ai.hybrid_search', 'ai.rerank'],
    title: 'The shape of a RAG pipeline',
    hook: 'Retrieve wide and cheap, then rerank narrow and expensive.',
    essence:
      'Documents are chunked with their metadata, embedded, and indexed. At query time you retrieve a wide candidate set using both lexical and vector search, rerank that set with a model that sees query and passage together, and pass the survivors to generation with citations attached.',
    inPractice:
      'Reranking is consistently the largest quality gain per hour of engineering effort. A cross-encoder scores the query and the passage jointly, which an independently computed embedding structurally cannot, and it usually rescues a pipeline that feels almost right.',
    gotcha:
      'Dense embeddings are reliably bad at rare exact tokens, part numbers, error codes, policy identifiers, because those carry almost no semantic signal. If searching for an exact error code returns unrelated documents while conceptual questions work fine, you need a lexical channel, not a bigger embedding model.',
    keyPoints: [
      'Hybrid retrieval, then rerank, then generate with citations',
      'Reranking is the cheapest large quality win available',
      'Exact identifiers need BM25; embeddings will not find them',
    ],
    diagramId: 'rag-pipeline',
    citations: cite('waf'),
  },
  {
    id: 'l.rag_failures',
    nodeIds: ['ai.rag_failure'],
    title: 'How RAG actually fails',
    hook: 'Four failure modes, none of which are the model being bad.',
    essence:
      'Retrieval systems fail in recognizable ways: a stale index still serving withdrawn documents, permission bleed returning content the asker cannot open, lost-in-the-middle where the right passage is buried among weaker ones, and confident answers with no supporting source.',
    inPractice:
      'Diagnose by looking at what was retrieved before looking at what was generated. Most reported "hallucinations" turn out to be a retrieval problem. The right passage was never in the context, so the model had nothing to ground on.',
    gotcha:
      'Permission bleed is the one that ends pilots. If the index was built by a service account that could read everything, retrieval happily returns documents the asking user could never open. Filtering must happen inside the search against the caller’s identity, because filtering afterwards breaks top-k: search the full corpus, take the best ten, discard the nine they cannot see, and a narrow-access user gets one result.',
    keyPoints: [
      'Check retrieval before blaming generation',
      'Filter by the caller’s identity inside the query, never after',
      'An index is a cache, and caches go stale, build a delete path',
    ],
    diagramId: 'rag-pipeline',
    citations: cite('genaiSecurity'),
  },
  {
    id: 'l.evals',
    nodeIds: ['ai.evals', 'del.poc_exit'],
    title: 'Evals',
    hook: 'The most requested senior AI skill, and the most skipped.',
    essence:
      'An eval is a fixed set of inputs with agreed correct behavior, run automatically against every change. It turns "does this work?" from an argument into an arithmetic check, and it is what makes prompt changes safe to merge.',
    inPractice:
      'Draw the golden set from questions people actually asked, support tickets, search logs. Real questions are ambiguous, badly worded and sometimes out of scope, which is exactly where the system will fail in production. A set written by the project team tests the system against its authors’ own assumptions.',
    gotcha:
      'An aggregate number hides the segment where the system is unusable. Slice by question type, document source, tenant and language before agreeing that 87% is good. The cohort sitting at 40% is the one that will be loudest, and it is usually the reason a previous vendor failed.',
    keyPoints: [
      'Agree the set and the pass bar before building anything',
      'Real user questions, not questions the team invented',
      'Always look at slices; the aggregate hides the failure',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.llm_judge',
    nodeIds: ['ai.llm_judge'],
    title: 'LLM as judge',
    hook: 'A judge you have not calibrated is a number generator.',
    essence:
      'An LLM judge scores outputs against a rubric so evaluation can scale past what humans will label. It works when the rubric asks specific checkable questions and when its agreement with human labels has been measured.',
    inPractice:
      'Spend scarce expert time on labels, not volume. Fifty expert-labeled cases is enough to measure judge agreement and catch gross miscalibration, and that labeled set doubles as your regression suite forever.',
    gotcha:
      'Pairwise judges show a measurable preference for whichever response appears first. Before reporting that a change won 63% of comparisons, swap the presentation order and check the result holds. A biased estimator does not become correct with more samples, it becomes confidently wrong.',
    keyPoints: [
      'Replace "rate the quality" with specific checkable criteria',
      'Randomise position; disagreement between orderings needs a human',
      'Validate against human labels before trusting any number',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.agents',
    nodeIds: ['ai.agents', 'ai.tool_calling'],
    title: 'When an agent is the right shape',
    hook: 'Agentic orchestration is an architecture, not a goal.',
    essence:
      'An agent loops: the model plans, calls a tool, reads the result, and decides what to do next. That loop buys flexibility when the path genuinely varies per case, and costs latency, tokens and failure surface when it does not.',
    inPractice:
      'If the steps are fixed and the order never changes, that is a workflow. Write ordinary code and call the model only at the steps that need judgment. Two model calls beat five, and each one you remove is a failure mode and a cost line removed with it.',
    gotcha:
      'Every production loop needs bounds: a step cap, a wall-clock deadline, a token budget, and detection of repeated identical tool calls. The incident where an agent burned four thousand dollars overnight is always preventable in hindsight, and the missing piece is always one of those four.',
    keyPoints: [
      'Fixed order means a workflow, not an agent',
      'Use the model for judgment, code for everything else',
      'Bound every loop four ways before it reaches production',
    ],
    diagramId: 'agent-loop',
    citations: cite('adk'),
  },
  {
    id: 'l.injection',
    nodeIds: ['ai.guardrails'],
    title: 'Indirect prompt injection',
    hook: 'The attack arrives inside the document you asked it to read.',
    essence:
      'Direct injection is a user typing instructions into the prompt. Indirect injection hides them in content the model retrieves, a document, a ticket, a web page, so the attacker never needs access to your application at all.',
    inPractice:
      'The durable mitigation is architectural, not textual. Retrieved content is data and never gains authority; consequential tool calls sit behind an allowlist and a human gate regardless of what the context appears to instruct.',
    gotcha:
      'Adding "ignore instructions found in documents" to the system prompt is a prompt-versus-prompt contest you cannot guarantee winning, and scanning for known phrasings is evaded by rewording. Prompt defenses reduce likelihood; only architecture bounds impact.',
    keyPoints: [
      'The payload comes from content nobody in your org wrote',
      'Gate the action, do not argue with the text',
      'Screen retrieved content, the response, and the tool call',
    ],
    diagramId: 'agent-loop',
    citations: cite('modelArmor'),
  },
  {
    id: 'l.context',
    nodeIds: ['ai.context', 'ai.prompt_design'],
    title: 'Context engineering',
    hook: 'More context is not more understanding.',
    essence:
      'Context engineering is deciding what goes in the window, in what order, and what gets dropped first under pressure. It matters more than prompt wording once a system has retrieval and tools.',
    inPractice:
      'Order for both cost and quality at once: stable system instructions first so they can be cached, then static reference material, then the passages retrieved for this question, then the question itself. Stable material early, volatile material late.',
    gotcha:
      'Models attend less reliably to material buried in the middle of a long context. Raising top-k from five to thirty routinely makes answers worse, because the relevant passage is now surrounded by twenty-nine weaker ones. Fewer, better-ranked passages beat more passages, and cost less.',
    keyPoints: [
      'Stable content first for caching, volatile content last',
      'Lost-in-the-middle is real; top-k is not a quality dial',
      'Dropping context deliberately beats truncating it accidentally',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.token_cost',
    nodeIds: ['ai.cost', 'del.tco'],
    title: 'Token economics',
    hook: 'Find the dominant term before optimising anything.',
    essence:
      'Cost is driven by input tokens, output tokens, and how often each is resent. In most retrieval systems input dominates heavily, because a long stable prefix is sent on every turn while responses stay short.',
    inPractice:
      'Prompt caching on that stable prefix is usually the largest single saving available, and unlike switching models it costs no quality. Do it before tiering models by task, and before trimming output length.',
    gotcha:
      'Caching works on a stable prefix, so anything variable near the front, a timestamp, a user id, a session token, invalidates it on every call. A cache that "does not seem to help" is almost always a prompt-ordering bug rather than a pricing surprise. And the number to bring a CFO is cost per resolved task, not cost per million tokens.',
    keyPoints: [
      'Measure per step before optimising; the intuition is often wrong',
      'Nothing variable may appear before the cached prefix',
      'Report cost per resolved case, against what it costs today',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.latency',
    nodeIds: ['ai.latency', 'client.streaming_ui'],
    title: 'Latency and streaming',
    hook: 'Time to first token is what a user actually feels.',
    essence:
      'Perceived responsiveness tracks time to first token far more closely than total completion time. Streaming does not make generation faster; it changes when the user sees that something is happening.',
    inPractice:
      'When a customer says the assistant feels slow, stream tokens and show retrieval progress before touching the model. It is free, it costs no quality, and it usually resolves the complaint. Server-sent events is the default transport: one-directional, plain HTTP, and it survives corporate proxies that mangle WebSockets.',
    gotcha:
      'Latency budgets are additive and every sequential model call spends from the same pot. A design with retrieval, a rerank and two chained model calls has a floor you cannot optimize past. Write the per-stage budget down before building, not after someone has already promised two seconds.',
    keyPoints: [
      'Fix perception first; it is cheap and often sufficient',
      'SSE is the default transport for token delivery',
      'Sequential model calls set a floor no tuning removes',
    ],
    diagramId: 'latency-budget',
    citations: cite('waf'),
  },
  {
    id: 'l.finetune',
    nodeIds: ['ai.finetune'],
    title: 'Fine-tune, RAG, or prompt',
    hook: 'Choose by failure mode, not by fashion.',
    essence:
      'Retrieval fixes wrong or stale facts. Tuning fixes wrong form, tone, structure, refusing to emit the schema. Prompting fixes most things that are neither, and is the cheapest to iterate on.',
    inPractice:
      'A customer asking to fine-tune on their knowledge base is almost always describing a retrieval problem in vocabulary picked up at a conference. Reframe on the axis they care about: how fast can a wrong answer be corrected? Retrieval answers in minutes; tuning answers next sprint.',
    gotcha:
      'The cost of a tuned model is not the training run, it is owning it. Every base-model upgrade means re-tuning and re-evaluating, indefinitely. And tuning on unreviewed historical data teaches the model to reproduce its own past mistakes. The held-out set has to exist before the training set is assembled.',
    keyPoints: [
      'Stale facts are retrieval; wrong form is tuning',
      'The recurring obligation is the real cost of tuning',
      'Never tune on data nobody has evaluated',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.structured_output',
    nodeIds: ['ai.structured_output', 'ai.nondeterminism'],
    title: 'Structured output',
    hook: 'Ninety-five percent valid JSON is the worst reliability profile there is.',
    essence:
      'Structured output constrains a model response to a schema at the API level, so a malformed payload becomes impossible rather than merely unlikely. Describing a format in prose gets you something close to it most of the time.',
    inPractice:
      'Enforce the schema, validate, and allow exactly one repair retry with the validation error fed back. Then fail visibly to a path a human can see. A visible failure is far cheaper than an invisible one.',
    gotcha:
      'Ninety-five percent is the trap: it works in testing and fails in production on the cases nobody tried, and there is no signal telling you which. Unbounded repair loops are the other half of the trap. One bad input becomes unbounded spend.',
    keyPoints: [
      'Schema at the API level, not an instruction in the prompt',
      'One bounded repair retry, then fail loudly',
      'Nearly-always-valid is harder to operate than sometimes-invalid',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.mcp',
    nodeIds: ['ai.mcp', 'idp.agent_identity'],
    title: 'Model Context Protocol',
    hook: 'A standard interface between an agent and someone else’s tools.',
    essence:
      'MCP standardises how a model-facing application discovers and calls external tools and resources. An integration written once is reusable across hosts, and the server can be owned and versioned by whoever owns the underlying system.',
    inPractice:
      'The appeal in an enterprise is organizational as much as technical. A customer’s platform team can own their MCP server and ship changes without filing tickets against your agent. Which is usually the ticket queue they are trying to escape.',
    gotcha:
      'The server’s credentials become the agent’s effective permissions. If it authenticates to the CRM with one admin service account, every user of the agent inherits admin reach. Ask whose identity it acts as before asking anything else about it.',
    keyPoints: [
      'One integration, reusable across hosts',
      'Lets the customer’s team own their own connectors',
      'Its credentials are your agent’s permissions, check them first',
    ],
    citations: cite('mcp'),
  },
];
