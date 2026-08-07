import type { DrillItem } from '@shared/content';

import { cite } from '../sources';

/** GCP AI Platform: Gemini Enterprise Agent Platform, Agent Engine, ADK, grounding, Model Armor. */
export const DRILL_AI_PLATFORM: DrillItem[] = [
  {
    id: 'p.model_garden.claude',
    mode: 'drill',
    nodeIds: ['gcp.model_garden', 'gcp.geap', 'sec.residency'],
    difficulty: 'core',
    explanation:
      'Model Garden serves first-party Gemini alongside third-party models including Claude, through one control plane. The practical benefit for a regulated customer is that the model choice does not change the governance story: the same IAM, the same perimeter, the same audit logs, and no second vendor contract.',
    citations: cite('geap', 'genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer standardized on GCP governance but their team prefers Claude for a workload. What is the cleanest answer?',
      choices: [
        { id: 'a', text: 'Call the vendor API directly and open an egress exception', whyWrong: 'Buys a second contract, a second log estate, and a standing hole in the perimeter, all avoidable.' },
        { id: 'b', text: 'Standardize on Gemini and have the team re-benchmark', whyWrong: 'Overrides a considered technical preference on governance grounds Model Garden already satisfies.' },
        { id: 'c', text: 'Serve Claude through Model Garden, same IAM and perimeter' },
        { id: 'd', text: 'Self-host open weights on GKE inside their own project', whyWrong: 'Buys residency they already have, and trades a managed endpoint for GPU capacity planning.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'p.agent_engine.sessions',
    mode: 'drill',
    nodeIds: ['gcp.agent_engine', 'ai.memory'],
    difficulty: 'core',
    explanation:
      'Sessions hold the state of one conversation; Memory Bank holds what should survive across them. The design discipline is deciding what is worth remembering. A memory store that accumulates everything becomes both a privacy liability and a retrieval problem that degrades every later turn.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your agent keeps re-asking a user for their department every conversation. What is the right fix?',
      choices: [
        { id: 'a', text: 'Raise the session timeout so state survives between visits', whyWrong: 'Sessions are scoped to one conversation. A longer timeout just moves the re-ask to the next one.' },
        { id: 'b', text: 'Write it to Memory Bank, loaded at session start' },
        { id: 'c', text: 'Put the department list in the shared system prompt', whyWrong: 'A per-user fact cannot live in an instruction block that is identical for every user.' },
        { id: 'd', text: 'Move to a larger context window so old turns fit', whyWrong: 'Context is discarded with the session, so window size changes nothing across conversations.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'p.adk.subagents',
    mode: 'drill',
    nodeIds: ['gcp.adk', 'ai.agents'],
    difficulty: 'deep',
    explanation:
      'Sub-agents are worth their cost when a task genuinely needs a different toolset, a different instruction set, or isolation from the parent’s context. Splitting an agent because the prompt got long is usually the wrong reason, it adds hand-off failure modes to solve a prompt-organization problem.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'When does splitting an ADK agent into sub-agents genuinely earn its complexity?',
      choices: [
        { id: 'a', text: 'When the system prompt has outgrown one instruction block', whyWrong: 'A prompt-organization problem. Splitting adds hand-off failure modes without addressing it.' },
        { id: 'b', text: 'When end-to-end latency is over the agreed budget', whyWrong: 'More agents means more sequential model calls, so the split usually makes latency worse.' },
        { id: 'c', text: 'When separate teams want to own parts of the behavior', whyWrong: 'An org chart is a poor reason to add runtime hand-offs. Use modules and code review instead.' },
        { id: 'd', text: 'When a sub-task needs its own tools and not the parent context' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'p.a2a.what',
    mode: 'drill',
    nodeIds: ['gcp.a2a', 'ai.mcp'],
    difficulty: 'deep',
    explanation:
      'MCP standardises how one agent reaches tools and resources. A2A standardises how agents discover and delegate to each other across vendor boundaries. Conflating them in a customer conversation is a fast way to lose the room; the short version is tools versus peers.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each protocol or concept to what it standardises.',
      pairs: [
        { left: 'How an agent discovers and calls tools', right: 'MCP' },
        { left: 'How agents delegate tasks to other agents', right: 'A2A' },
        { left: 'How an agent advertises its own capabilities', right: 'Agent card' },
        { left: 'Where conversational state lives between turns', right: 'Sessions' },
      ],
    },
  },
  {
    id: 'p.model_armor.placement',
    mode: 'drill',
    nodeIds: ['gcp.model_armor', 'ai.guardrails'],
    difficulty: 'deep',
    explanation:
      'Screening only the user turn leaves indirect injection untouched, because the payload arrives inside retrieved content. Screening the tool call as well is what stops a successful injection from becoming an action, the difference between a bad answer and an email sent to an attacker.',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Where should runtime screening sit for an agent that retrieves documents and can send email? Pick all that apply.',
      choices: [
        { id: 'a', text: 'On retrieved content before it enters the context' },
        { id: 'b', text: 'On the proposed tool call before it executes' },
        { id: 'c', text: 'On the model’s response before it reaches the user' },
        { id: 'd', text: 'On the model weights at load time', whyWrong: 'Not a runtime surface, and irrelevant for a hosted model.' },
        { id: 'e', text: 'Only on the user’s typed input', whyWrong: 'This is the common half-measure. The authenticated user is rarely the attacker; the document they did not write is.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'p.rag_engine.citations',
    mode: 'drill',
    nodeIds: ['gcp.rag_engine', 'cust.explaining_ai'],
    difficulty: 'core',
    explanation:
      'Citations are not a nicety in regulated settings. They are the mechanism by which a human can verify the answer, and often the reason legal will sign off at all. An assistant that is right without showing why is unusable in a domain where being wrong has consequences.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A pharma customer’s legal team is nervous about a research assistant. Which design choice most reduces their concern?',
      choices: [
        { id: 'a', text: 'Every claim links to its source passage, one click to verify' },
        { id: 'b', text: 'A standing disclaimer that outputs may be inaccurate', whyWrong: 'Transfers risk to the reader without helping them assess anything. Legal teams see straight through it.' },
        { id: 'c', text: 'A higher-capability model tuned on their own literature', whyWrong: 'Lowers the error rate and leaves every answer unverifiable, which is the actual objection.' },
        { id: 'd', text: 'Full query and response logging kept for later review', whyWrong: 'Helps reconstruct an incident afterward, not judge an answer at the moment of use.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'p.document_ai.when',
    mode: 'drill',
    nodeIds: ['gcp.document_ai', 'data.messy'],
    difficulty: 'core',
    explanation:
      'Scanned documents with tables and stamps need layout-aware extraction before a model sees them. Feeding raw OCR text to an LLM loses the table structure that carries the meaning, and the model confidently reconstructs rows that were never adjacent.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'The customer’s claims arrive as scanned PDFs with multi-column tables. What goes in front of the model?',
      choices: [
        { id: 'a', text: 'Plain OCR text, concatenated in reading order per page', whyWrong: 'Column boundaries vanish and the model confidently pairs values from rows that were never adjacent.' },
        { id: 'b', text: 'Page images straight to a multimodal model, one call each', whyWrong: 'Workable on clean pages, but costly per page and unreliable on dense tables at claims volume.' },
        { id: 'c', text: 'Layout-aware parsing that preserves table structure' },
        { id: 'd', text: 'A regex extraction pipeline tuned per insurer template', whyWrong: 'Brittle against scan skew, and every new insurer adds another template to maintain.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'p.tuning.cost',
    mode: 'drill',
    nodeIds: ['gcp.vertex_training', 'ai.finetune', 'del.tco'],
    difficulty: 'deep',
    explanation:
      'The cost of a tuned model is not the training run; it is owning it. Every base-model upgrade means re-tuning and re-evaluating, and the tuned checkpoint must be maintained for as long as it serves. That ongoing obligation is what customers underestimate.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer says fine-tuning is cheap because the training run is only a few hundred dollars. What do you add?',
      choices: [
        { id: 'a', text: 'The recurring cost: every base model upgrade means re-tuning and re-evaluating, indefinitely' },
        { id: 'b', text: 'That inference on a tuned model is much more expensive', whyWrong: 'Not the main issue, and often untrue. The ongoing obligation is the real cost.' },
        { id: 'c', text: 'That tuning requires a dedicated GPU cluster', whyWrong: 'Managed tuning does not; that is what makes the run cheap.' },
        { id: 'd', text: 'That tuned models cannot use CMEK', whyWrong: 'Incorrect.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'p.agent_studio.role',
    mode: 'drill',
    nodeIds: ['gcp.agent_studio', 'del.thin_slice'],
    difficulty: 'core',
    explanation:
      'Low-code authoring is excellent for getting a business user’s idea in front of them in a day, and it is a poor place to end up when the thing needs tests, version control and a review process. Being explicit about that transition, rather than letting a prototype drift into production, is part of the job.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A business stakeholder built a working agent in Agent Studio and wants it in production next month. What do you say?',
      choices: [
        { id: 'a', text: 'Great: it proved the idea. Now we port it to code so it can have tests, review and a release process.' },
        { id: 'b', text: 'Ship it as is; it already works', whyWrong: 'Production means change management. A prototype with no tests or version history will not survive its first modification.' },
        { id: 'c', text: 'Start over from scratch in code', whyWrong: 'Discards a validated design and the stakeholder’s goodwill along with it.' },
        { id: 'd', text: 'Low-code is not suitable for real work', whyWrong: 'Dismissive and wrong. It did exactly the job it is good at.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'p.vector_search.filter',
    mode: 'drill',
    nodeIds: ['gcp.vector_search', 'ai.rag_failure', 'sec.tenancy'],
    difficulty: 'edge',
    explanation:
      'Filtering after retrieval breaks top-k: search the full corpus, take the best ten, then discard the nine the user cannot see, and you have given a narrow-access user one result instead of ten. Restrictions must be applied inside the search so the k you asked for is the k you get.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'In a multi-tenant index, why is filtering results after the vector search a bug rather than an inefficiency?',
      choices: [
        { id: 'a', text: 'Top-k is computed over the whole corpus, so a narrow-access user is left with almost nothing after filtering' },
        { id: 'b', text: 'It is slower', whyWrong: 'True and secondary. The correctness failure is what matters.' },
        { id: 'c', text: 'It costs more', whyWrong: 'Marginal, and not the reason to change the design.' },
        { id: 'd', text: 'It cannot be audited', whyWrong: 'It can be. The problem is the results, not the logging.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'p.grounding.refusal',
    mode: 'drill',
    nodeIds: ['gcp.rag_engine', 'ai.guardrails', 'cust.expectations'],
    difficulty: 'deep',
    explanation:
      'A confident answer with no supporting source is the failure mode that destroys trust in an enterprise assistant, because it is indistinguishable from a good answer until someone checks. Designing an explicit "I could not find this" path is worth more than a few points of accuracy.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Retrieval returns nothing relevant. What should the system do?',
      choices: [
        { id: 'a', text: 'Say it could not find an answer and point at what it searched' },
        { id: 'b', text: 'Answer from the model’s general knowledge', whyWrong: 'Produces an ungrounded claim that looks identical to a grounded one. This is precisely how trust is lost.' },
        { id: 'c', text: 'Return the closest documents anyway and let the user judge', whyWrong: 'Better than fabricating, but presenting irrelevant sources as if relevant is its own kind of misleading.' },
        { id: 'd', text: 'Retry with a higher top-k', whyWrong: 'Reasonable once, but eventually you must handle the genuine no-answer case.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'p.geap.governance',
    mode: 'drill',
    nodeIds: ['gcp.geap', 'gcp.ai_residency', 'sec.residency'],
    difficulty: 'deep',
    explanation:
      'Vertex generative AI supports CMEK, VPC Service Controls and data residency. Knowing which of the three answers which question, key custody, exfiltration boundary, processing location, is what lets you respond to a security questionnaire precisely instead of gesturing at "enterprise-grade security".',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each customer concern to the control that answers it.',
      pairs: [
        { left: '"We must hold the encryption keys"', right: 'CMEK' },
        { left: '"Data must not be copied outside our projects"', right: 'VPC Service Controls' },
        { left: '"Processing must stay in the EU"', right: 'Data residency' },
        { left: '"Screen prompts and tool calls for injection"', right: 'Model Armor' },
      ],
    },
  },
  {
    id: 'p.agent.human_gate',
    mode: 'drill',
    nodeIds: ['gcp.agent_engine', 'ai.agents', 'sec.eu_ai_act'],
    difficulty: 'edge',
    explanation:
      'The line worth defending is between actions that are reversible and those that are not. Reading a record is cheap to get wrong; issuing a refund, sending an external email or changing an entitlement is not. Putting the human gate at exactly that boundary keeps the agent useful without making it dangerous.',
    diagramId: 'agent-loop',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which agent actions should sit behind an explicit human approval step? Pick all that apply.',
      choices: [
        { id: 'a', text: 'Issuing a refund to a customer' },
        { id: 'b', text: 'Sending an email outside the organization' },
        { id: 'c', text: 'Changing a user’s access entitlements' },
        { id: 'd', text: 'Looking up an order status', whyWrong: 'Read-only and reversible. Gating it destroys the value of the agent for no risk reduction.' },
        { id: 'e', text: 'Summarizing a document the user already opened', whyWrong: 'No external effect at all.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'p.geap.naming',
    mode: 'drill',
    nodeIds: ['gcp.geap', 'gcp.agent_engine', 'gcp.adk'],
    difficulty: 'intro',
    explanation:
      'Being fluent in the current names is not pedantry. A customer’s architect judges whether you have deployed recently by whether you use last year’s vocabulary. After Cloud Next ’26, the platform is the Gemini Enterprise Agent Platform, with Agent Engine as the managed runtime and ADK as the code-first authoring kit.',
    citations: cite('geap', 'agentEngine', 'adk'),
    origin: 'seed',
    criticScore: null,
    verifiedAt: '2026-07-31',
    payload: {
      kind: 'match',
      stem: 'Match each component to what it is.',
      pairs: [
        { left: 'The umbrella platform, formerly Vertex AI', right: 'Gemini Enterprise Agent Platform' },
        { left: 'Managed runtime with Sessions and Memory Bank', right: 'Agent Engine' },
        { left: 'Code-first agent authoring kit', right: 'ADK' },
        { left: 'Prebuilt agent patterns you can start from', right: 'Agent Garden' },
      ],
    },
  },
  {
    id: 'p.model.selection',
    mode: 'drill',
    nodeIds: ['gcp.model_garden', 'ai.cost', 'ai.latency'],
    difficulty: 'deep',
    explanation:
      'Model tiering by task difficulty is the standard cost lever once the obvious wins are taken: a cheap fast model for classification and routing, a capable one for the reasoning step that actually needs it. Doing it before you have measured which step needs what is guesswork.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'You need to cut the cost of a multi-step agent without losing quality. Order these steps.',
      steps: [
        'Instrument per-step token usage so you know where the money goes',
        'Cache the stable prompt prefix that every step resends',
        'Move the classification and routing steps to a cheaper, faster model',
        'Re-run the eval set to confirm quality held after the changes',
      ],
    },
  },
  {
    id: 'p.streaming.ux',
    mode: 'drill',
    nodeIds: ['gcp.agent_engine', 'ai.latency', 'cust.expectations'],
    difficulty: 'core',
    explanation:
      'An agent that runs tools for eight seconds in silence reads as broken. Streaming intermediate progress, "searching the policy handbook", "found 3 documents", costs nothing and changes the perceived experience entirely, because the user can see that work is happening.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Users say the agent "hangs" during multi-step tool use, though it always completes. What do you change?',
      choices: [
        { id: 'a', text: 'Stream intermediate progress so each tool step is visible as it happens' },
        { id: 'b', text: 'Add a generic loading spinner', whyWrong: 'Better than nothing, and it conveys no information about whether progress is being made.' },
        { id: 'c', text: 'Reduce the number of tool calls', whyWrong: 'May harm answer quality to fix a communication problem.' },
        { id: 'd', text: 'Increase the client timeout', whyWrong: 'The requests were not timing out; the users were.' },
      ],
      correctId: 'a',
    },
  },
];
