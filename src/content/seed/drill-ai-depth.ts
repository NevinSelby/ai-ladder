import type { DrillItem } from '@shared/content';

import { cite } from '../sources';

/**
 * Depth bank for the two branches the app exists for: the GCP AI platform
 * surface and production AI engineering. Retrieval quality, eval design, agent
 * architecture, guardrails and token economics, written from the angles the
 * earlier banks did not take.
 */
export const DRILL_AI_DEPTH: DrillItem[] = [
  // ── Gemini Enterprise Agent Platform ─────────────────────────────────────
  {
    id: 'a2.geap.rebrand_docs',
    mode: 'drill',
    nodeIds: ['gcp.geap'],
    difficulty: 'intro',
    explanation:
      'A rebrand is a naming event, not a migration. What it does change is the vocabulary you use in front of an architect, in a security questionnaire and in a console screenshot. Speaking last year’s names is a small thing that costs credibility disproportionately.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    verifiedAt: '2026-07-31',
    payload: {
      kind: 'mcq',
      stem: 'A customer’s platform team asks whether they must rewrite everything now that the platform is the Gemini Enterprise Agent Platform. What is the accurate answer?',
      choices: [
        { id: 'a', text: 'The platform name changed and working deployments carried over. Update docs as you touch them, and use the current names in anything new or customer-facing' },
        { id: 'b', text: 'Nothing changed except marketing, so ignore it entirely', whyWrong: 'Dismissive. The names in a security review, a support ticket and a console screenshot have to match what the customer actually sees.' },
        { id: 'c', text: 'Every pipeline has to be rebuilt on the new platform', whyWrong: 'A rebrand is not a migration. Telling a customer to rebuild working pipelines spends their budget on renaming.' },
        { id: 'd', text: 'Wait until the old names are removed before changing anything', whyWrong: 'Leaves the team speaking outdated vocabulary in front of the one person in the room who will notice.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.geap.region_check',
    mode: 'drill',
    nodeIds: ['gcp.geap', 'gcp.ai_residency'],
    difficulty: 'deep',
    explanation:
      'Model and feature availability differ by region, and so does the capacity you are allowed to consume there. Confirming all three before the design is fixed is a ten-minute task in week one and a redesign in week eight.',
    citations: cite('geap', 'genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'You are committing to a specific model for a deployment that must run in one European region. What has to be confirmed first? Select all that apply.',
      choices: [
        { id: 'a', text: 'That the model is actually served from that region' },
        { id: 'b', text: 'That the throughput you need is available there, not just somewhere' },
        { id: 'c', text: 'That the features you depend on, such as tuning or batch, exist in that region' },
        { id: 'd', text: 'That it is the newest model in the catalog', whyWrong: 'Newest is not a requirement anyone stated, and it correlates with narrower regional availability, not wider.' },
        { id: 'e', text: 'That it scores well on public benchmarks', whyWrong: 'Benchmarks say nothing about regional availability and nothing about this customer’s task.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'a2.geap.version_retire',
    mode: 'drill',
    nodeIds: ['gcp.geap', 'prod.model_release'],
    difficulty: 'core',
    explanation:
      'Following an auto-updating alias in production means behavior can change without a deploy on your side. Pinning turns a surprise into a scheduled piece of work, and the schedule is what lets you move deliberately when a version is retired.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'The model version your agent pins is being retired in 60 days. Order the migration.',
      steps: [
        'Confirm production is pinned, so nothing changes underneath you while you work',
        'Run the eval set against the successor version with the prompt unchanged',
        'Compare per slice, then adjust the prompt only where the comparison shows a regression',
        'Canary the new model and prompt pair together, keeping the old pair one config change away',
      ],
    },
  },
  {
    id: 'a2.geap.surface_match',
    mode: 'drill',
    nodeIds: ['gcp.geap', 'gcp.model_garden'],
    difficulty: 'intro',
    explanation:
      'The platform is several surfaces with distinct jobs, and customers routinely ask for one while describing another. Being able to place each one in a sentence is the difference between a clear scoping conversation and a vague one.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    verifiedAt: '2026-07-31',
    payload: {
      kind: 'match',
      stem: 'Match each job to the surface that does it.',
      pairs: [
        { left: 'Serve first-party and third-party models behind one API', right: 'Model Garden' },
        { left: 'Host a deployed agent with sessions and memory', right: 'Agent Engine' },
        { left: 'Author an agent in code with tools and sub-agents', right: 'ADK' },
        { left: 'Screen prompts and responses independently of the model', right: 'Model Armor' },
      ],
    },
  },
  {
    id: 'a2.model_garden.open_weights',
    mode: 'drill',
    nodeIds: ['gcp.model_garden', 'ai.cost'],
    difficulty: 'deep',
    explanation:
      'Self-deploying open weights is a real option and it is an infrastructure commitment, not a pricing trick. The break-even is utilization: accelerators you rent by the hour and use a fraction of are the expensive path, and the patching and scaling become yours either way.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team wants an open-weights model and can either call a managed endpoint or deploy the weights themselves. What is the difference worth raising?',
      choices: [
        { id: 'a', text: 'Self-deployment means owning capacity, idle accelerator cost, patching and scaling; the managed endpoint trades some control for none of that' },
        { id: 'b', text: 'Self-deployment is always cheaper because there is no per-token markup', whyWrong: 'Only at sustained high utilization. At 12% utilization you are paying for an idle GPU around the clock.' },
        { id: 'c', text: 'The managed endpoint cannot sit inside a VPC Service Controls perimeter', whyWrong: 'Managed AI APIs are exactly what perimeters are built to cover.' },
        { id: 'd', text: 'Self-deployment gives better quality from the same weights', whyWrong: 'Same weights, same model. Serving choice moves cost, latency and control, not capability.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.model_garden.swap_order',
    mode: 'drill',
    nodeIds: ['gcp.model_garden', 'ai.evals'],
    difficulty: 'core',
    explanation:
      'A model swap is a release, and the fact that it is one line of config is exactly why teams skip the release discipline. Running your own eval set through the same interface is the whole benefit of a single control plane over many models.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'A newer model appears in the catalog and a stakeholder wants it. Order the work before it serves production traffic.',
      steps: [
        'Confirm it is available in your regions with the throughput you need',
        'Run the existing eval set against it through the same interface, prompt unchanged',
        'Compare per slice rather than on the headline number, and note where it lost',
        'Canary a small share of traffic with the previous model one config change away',
      ],
    },
  },
  {
    id: 'a2.model_garden.quota',
    mode: 'drill',
    nodeIds: ['gcp.model_garden', 'scale.capacity'],
    difficulty: 'deep',
    explanation:
      'Serving capacity is granted per model and per region. A pilot that ran comfortably proves nothing about the allowance for a different model in the same project, and that surprise usually lands on the day of a demo.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A pilot ran fine. Switching to a different model in the same project, throughput collapses with quota errors. Most likely explanation?',
      choices: [
        { id: 'a', text: 'Capacity is granted per model and region, so the headroom you had does not follow you to a different model' },
        { id: 'b', text: 'The new model is slower per token', whyWrong: 'That shows up as latency, not as throttling errors.' },
        { id: 'c', text: 'The project exhausted its budget', whyWrong: 'Budgets produce billing alerts and, at worst, a disabled project. They do not throttle individual requests.' },
        { id: 'd', text: 'The old model’s allowance is now shared with the new one', whyWrong: 'Inverts it. The problem is that the allowance does not transfer at all, not that it is being divided.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.model_garden.license',
    mode: 'drill',
    nodeIds: ['gcp.model_garden'],
    difficulty: 'core',
    explanation:
      'Catalog availability is an operational convenience, not a legal opinion for the customer’s use case. Open-weights models ship with real licenses carrying real restrictions on use, outputs and redistribution, and legal will want to read them regardless of where the model is served.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Legal asks whether serving an open-weights model through Model Garden means the license question is handled for them. What do you say?',
      choices: [
        { id: 'a', text: 'No. The model’s own license still governs how they use it and what they may do with outputs, and legal should read it' },
        { id: 'b', text: 'Yes, anything in the catalog is pre-cleared for commercial use', whyWrong: 'Availability in a catalog is not a legal clearance for a specific customer’s deployment.' },
        { id: 'c', text: 'Licenses do not apply to model weights', whyWrong: 'They very much do, and some carry acceptable-use and field-of-use restrictions.' },
        { id: 'd', text: 'It only matters if they redistribute the weights', whyWrong: 'Several licenses constrain use and output handling, not only redistribution.' },
      ],
      correctId: 'a',
    },
  },

  // ── Agent Engine ─────────────────────────────────────────────────────────
  {
    id: 'a2.agent_engine.managed_value',
    mode: 'drill',
    nodeIds: ['gcp.agent_engine', 'gcp.adk'],
    difficulty: 'core',
    explanation:
      'A team that already runs containers can host an agent themselves. What they would then build is the agent-shaped part: conversation state, durable memory, and a trace of the loop. Naming those concretely is a better argument than any claim about pricing.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A team already runs services on Cloud Run and asks what a managed agent runtime adds. Which of these are genuine answers? Select all that apply.',
      choices: [
        { id: 'a', text: 'Session state for the conversation in progress' },
        { id: 'b', text: 'A durable memory store for facts that outlive one conversation' },
        { id: 'c', text: 'Tracing of the agent’s steps, tool calls and model calls' },
        { id: 'd', text: 'A model that no longer needs careful prompting', whyWrong: 'Nothing about a runtime changes what the model needs in its prompt.' },
        { id: 'e', text: 'Relief from evaluating the agent before release', whyWrong: 'Managed hosting does not tell you whether the agent is any good. That remains your eval set.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'a2.agent_engine.memory_write',
    mode: 'drill',
    nodeIds: ['gcp.agent_engine', 'ai.memory'],
    difficulty: 'deep',
    explanation:
      'Retention is decided at write time in every privacy review you will ever sit through. An extraction policy you can state in a sentence, with provenance recorded per fact, is what makes Memory Bank an asset rather than an unscoped personal-data store.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are deciding what an assistant writes to Memory Bank after each conversation. What is the sound policy?',
      choices: [
        { id: 'a', text: 'Extract a small set of durable, purpose-relevant facts under an explicit policy, recording where each came from' },
        { id: 'b', text: 'Store a summary of every conversation', whyWrong: 'Summaries accumulate, dilute retrieval, and quietly become a personal-data store nobody scoped or can defend.' },
        { id: 'c', text: 'Store everything and filter at read time', whyWrong: 'Filtering later does not undo storing. The obligation attaches when you write.' },
        { id: 'd', text: 'Let the model decide case by case', whyWrong: 'A policy the model improvises is one you cannot describe to an auditor or test in an eval.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.agent_engine.resume',
    mode: 'drill',
    nodeIds: ['gcp.agent_engine'],
    difficulty: 'intro',
    explanation:
      'Models are stateless between calls. Continuity across a device switch is something your system stores and replays, not something the model recalls, and being precise about that is the first step in every memory conversation with a customer.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A user starts a conversation on mobile and continues on the web an hour later. What makes the continuation work?',
      choices: [
        { id: 'a', text: 'The client resumes the same session, so the stored event history becomes the context for the next turn' },
        { id: 'b', text: 'The model remembers, since it is the same model', whyWrong: 'Models hold nothing between calls. Anything that carries over was stored and re-sent by your system.' },
        { id: 'c', text: 'A larger context window', whyWrong: 'The window holds what you put in it. Size does not create continuity.' },
        { id: 'd', text: 'Memory Bank replays the previous conversation', whyWrong: 'Memory Bank holds durable facts across conversations, not the turn-by-turn history of one in progress.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.agent_engine.state_match',
    mode: 'drill',
    nodeIds: ['gcp.agent_engine', 'ai.memory'],
    difficulty: 'intro',
    explanation:
      'Four kinds of state with four different lifecycles, four different owners and four very different privacy profiles. Most confused agent designs are a mix-up between two of these rows.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each piece of state to where it belongs.',
      pairs: [
        { left: 'The turn-by-turn history of the conversation in progress', right: 'Session' },
        { left: 'A durable fact about this user, still useful next month', right: 'Memory Bank' },
        { left: 'Company policy documents, identical for every user', right: 'Retrieval index' },
        { left: 'The agent’s role and rules of engagement', right: 'System instructions' },
      ],
    },
  },

  // ── ADK ──────────────────────────────────────────────────────────────────
  {
    id: 'a2.adk.workflow_vs_llm',
    mode: 'drill',
    nodeIds: ['gcp.adk', 'ai.agents'],
    difficulty: 'deep',
    explanation:
      'Sampling is the wrong mechanism for a sequence that never varies. Expressing a fixed order as composition puts it in code, where it is testable and cannot be skipped on the run where the model was feeling creative.',
    diagramId: 'agent-loop',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Three steps must always run in the same order and the sequence never varies. How should that be expressed in an ADK agent?',
      choices: [
        { id: 'a', text: 'As a deterministic workflow composition, so the order is code rather than something the model rediscovers each run' },
        { id: 'b', text: 'As one LLM agent instructed to follow the three steps in order', whyWrong: 'Puts a fixed sequence at the mercy of sampling. It will skip a step eventually, and only sometimes, which is the worst way to find out.' },
        { id: 'c', text: 'As three agents that call each other by name', whyWrong: 'Adds delegation and hand-off failure modes to express something a sequence already expresses.' },
        { id: 'd', text: 'As a single tool that performs all three internally', whyWrong: 'Workable, and it hides the steps from tracing and evaluation, which is exactly where you will need them.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.adk.before_tool_gate',
    mode: 'drill',
    nodeIds: ['gcp.adk', 'ai.guardrails'],
    difficulty: 'deep',
    explanation:
      'An entitlement check has to be code on the execution path, not a sentence the model may choose to honor. A callback that runs before the tool executes can see the actual arguments and refuse, which is the only place the check is worth anything.',
    diagramId: 'agent-loop',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Every tool call touching customer records must be checked against an entitlement service before it runs, without trusting the prompt. Where does that check go?',
      choices: [
        { id: 'a', text: 'In a callback that runs before the tool executes, where it can inspect the arguments and block the call' },
        { id: 'b', text: 'In the tool description, telling the model to check entitlements first', whyWrong: 'The model choosing to check is not an enforcement point. This is precisely why callbacks exist.' },
        { id: 'c', text: 'In the system instructions', whyWrong: 'Instructions are suggestions. Prompt injection exists to make the model ignore them.' },
        { id: 'd', text: 'In a post-processing step on the final answer', whyWrong: 'By then the tool has already read the record. The exposure happened before the answer was written.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.adk.state_handle',
    mode: 'drill',
    nodeIds: ['gcp.adk', 'ai.context'],
    difficulty: 'core',
    explanation:
      'Large intermediate results belong in agent state with a reference passed forward, not in the conversation history where every later turn re-sends them. This is the difference between an agent that gets slower as it works and one that does not.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'One step produces a large intermediate result that a later step needs. How should it travel between them?',
      choices: [
        { id: 'a', text: 'In agent state or an artifact, with only what the model must reason about placed in the prompt' },
        { id: 'b', text: 'In the conversation history, so nothing is lost', whyWrong: 'Every subsequent turn re-sends it, paying tokens and diluting attention for material the model is not reasoning about.' },
        { id: 'c', text: 'In an external database, with the model asked to remember the row id', whyWrong: 'You have rebuilt state the framework already provides, including the part where the model must not lose the id.' },
        { id: 'd', text: 'Summarized, with the original discarded', whyWrong: 'Fine when the summary suffices, lossy when a later step needs a detail the summary dropped.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.adk.description_is_prompt',
    mode: 'drill',
    nodeIds: ['gcp.adk', 'ai.tool_calling'],
    difficulty: 'intro',
    explanation:
      'Tool selection is driven by text the model reads: the name, the description and the parameter documentation. A flawless implementation behind a vague description will be called at the wrong moment, and no amount of code review catches that.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'In a code-first agent, what actually determines whether the model picks the right tool?',
      choices: [
        { id: 'a', text: 'The tool name, description and parameter docs, because that text is what the model sees at decision time' },
        { id: 'b', text: 'The order the tools were registered in', whyWrong: 'Not a contract worth relying on, and it does not survive the first refactor.' },
        { id: 'c', text: 'The quality of the tool’s implementation', whyWrong: 'The model never sees the body. Implementation quality decides whether the call works, not whether it is made.' },
        { id: 'd', text: 'How many tools are available', whyWrong: 'It affects selection accuracy in aggregate, and it does not decide which tool is right for a given request.' },
      ],
      correctId: 'a',
    },
  },

  // ── A2A ──────────────────────────────────────────────────────────────────
  {
    id: 'a2.a2a.card_contents',
    mode: 'drill',
    nodeIds: ['gcp.a2a'],
    difficulty: 'core',
    explanation:
      'An agent card is a public contract: what this agent can do, how to reach it, how to authenticate, and which interaction modes it supports. Internals belong nowhere near it, both because peers should not depend on them and because publishing them hands an attacker a map.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'What belongs in an agent card so a peer can decide whether to delegate to yours? Select all that apply.',
      choices: [
        { id: 'a', text: 'The skills it offers, described so a caller can match a task to them' },
        { id: 'b', text: 'The endpoint and the authentication scheme required to call it' },
        { id: 'c', text: 'Which interaction modes it supports, such as streaming or long-running tasks' },
        { id: 'd', text: 'The system prompt it runs', whyWrong: 'Internal implementation, and publishing it hands an attacker the exact text to work against.' },
        { id: 'e', text: 'The model it uses internally', whyWrong: 'Not a contract callers should depend on. You would break every peer the day you changed models.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'a2.a2a.boundary_only',
    mode: 'drill',
    nodeIds: ['gcp.a2a', 'ai.agents'],
    difficulty: 'core',
    explanation:
      'Protocols earn their overhead at boundaries: different teams, different frameworks, different organizations. Inside one process they add serialization, network failure modes and a discovery step in exchange for nothing.',
    citations: cite('geap', 'mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Two agents live in the same codebase, same team, same deployment. A colleague wants them to talk over A2A. What do you say?',
      choices: [
        { id: 'a', text: 'A cross-boundary protocol buys nothing here. Compose them in process and save A2A for hops that actually cross a boundary' },
        { id: 'b', text: 'Agreed, it is the standard, so use it everywhere', whyWrong: 'Standards are worth their cost at boundaries. Applied inside one process this is overhead with no counterparty to interoperate with.' },
        { id: 'c', text: 'Use MCP between them instead', whyWrong: 'MCP standardizes an agent’s connection to tools and resources, not delegation to a peer agent.' },
        { id: 'd', text: 'Merge them into a single agent', whyWrong: 'Possibly right, and it answers a decomposition question that was not the one asked.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.a2a.peer_output_trust',
    mode: 'drill',
    nodeIds: ['gcp.a2a', 'ai.guardrails'],
    difficulty: 'edge',
    explanation:
      'A result from a peer agent is text produced by a model you do not control, possibly from content you cannot see. Authentication tells you who sent it; it says nothing about whether the payload should be allowed to steer your agent or authorize an action.',
    citations: cite('geap', 'modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your agent delegates a task to a partner’s agent over A2A and receives a structured result. How should it be treated?',
      choices: [
        { id: 'a', text: 'As untrusted input: validate it, keep it out of the instruction position, and never let it authorize a consequential action on its own' },
        { id: 'b', text: 'As trusted, since the partner is contractually bound', whyWrong: 'A contract governs the partner, not the content reaching your context. A compromised or injected peer produces exactly this output.' },
        { id: 'c', text: 'As trusted because the transport is mutually authenticated', whyWrong: 'Authentication identifies the sender. It does not vouch for what the payload asks your agent to do.' },
        { id: 'd', text: 'As a tool result, which the framework already sanitizes', whyWrong: 'Frameworks move bytes. Nothing in the stack decides what those bytes are allowed to make your agent do.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.a2a.long_running',
    mode: 'drill',
    nodeIds: ['gcp.a2a', 'ai.latency'],
    difficulty: 'deep',
    explanation:
      'Delegated work that takes minutes needs a task identity the caller can poll or subscribe to. Holding an open request for twenty minutes fails at the first proxy, restart or deploy, and retrying without a task id starts the work again several times over.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A delegated task takes twenty minutes. What does the calling agent need from the protocol?',
      choices: [
        { id: 'a', text: 'A task identity it can poll or subscribe to for status, so the call is not a twenty-minute open request' },
        { id: 'b', text: 'A longer HTTP timeout', whyWrong: 'A connection held for twenty minutes dies at the first proxy, restart or deploy in the path.' },
        { id: 'c', text: 'To retry until the call returns', whyWrong: 'Retrying without a task identity starts the twenty minutes of work again, in parallel.' },
        { id: 'd', text: 'To block the user’s session until it completes', whyWrong: 'Turns a background job into a hostage situation for the person waiting.' },
      ],
      correctId: 'a',
    },
  },

  // ── Agent Studio and Agent Garden ────────────────────────────────────────
  {
    id: 'a2.agent_studio.sprawl',
    mode: 'drill',
    nodeIds: ['gcp.agent_studio'],
    difficulty: 'core',
    explanation:
      'Low-code adoption succeeds and then produces an inventory problem. The answer is ownership and telemetry rather than restriction: restricting who may build recreates the shadow tooling the platform was meant to absorb.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Six months after enabling low-code agent building, a customer has 140 agents and no idea which are used. Order what you do.',
      steps: [
        'Inventory what exists and name an owner for each agent',
        'Add usage telemetry so real use is visible rather than assumed',
        'Retire the unused ones with their owners rather than around them',
        'Require an owner and a review date at creation from that point on',
      ],
    },
  },
  {
    id: 'a2.agent_studio.ownership',
    mode: 'drill',
    nodeIds: ['gcp.agent_studio', 'del.handover'],
    difficulty: 'core',
    explanation:
      'The support question is settled at publication or it is settled during an incident. Agreeing owner, reach and review date when the agent is shared costs one conversation and prevents the month-end page that nobody signed up for.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A business team wants to publish a low-code agent to their whole department. What must be agreed first? Select all that apply.',
      choices: [
        { id: 'a', text: 'Who owns it and who gets called when it breaks' },
        { id: 'b', text: 'Which data sources it may reach, and under whose identity' },
        { id: 'c', text: 'A review date and the conditions that would retire it' },
        { id: 'd', text: 'That the platform team will rewrite it in code before launch', whyWrong: 'Discards the speed that made low-code worth adopting, for an agent that may never need it.' },
        { id: 'e', text: 'That it will never be changed after publication', whyWrong: 'Freezing it guarantees it goes stale. Change is the thing to govern, not to forbid.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'a2.agent_studio.garden_start',
    mode: 'drill',
    nodeIds: ['gcp.agent_studio'],
    difficulty: 'intro',
    explanation:
      'Prebuilt agent patterns exist so that the first week is spent on what makes this customer different, not on reassembling the loop, the tool wiring and the state handling that everybody needs.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer wants a returns-handling agent and asks where to start.',
      choices: [
        { id: 'a', text: 'Start from a prebuilt pattern in Agent Garden and adapt it, rather than assembling the loop from scratch' },
        { id: 'b', text: 'Write it from first principles so it fits their process exactly', whyWrong: 'Fitting exactly is what adaptation is for. Rebuilding common scaffolding spends the week on the part nobody differentiates on.' },
        { id: 'c', text: 'Buy a third-party returns agent', whyWrong: 'Possibly right eventually, and it is a procurement conversation rather than a first engineering step.' },
        { id: 'd', text: 'Fine-tune a model on their returns history', whyWrong: 'Reaches for the most expensive and least reversible tool before anyone has established what the agent must do.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.agent_studio.whose_identity',
    mode: 'drill',
    nodeIds: ['gcp.agent_studio', 'idp.scopes'],
    difficulty: 'deep',
    explanation:
      'An agent built by someone with broad access, then shared widely, silently lends that access to everyone who uses it. The question is whether queries run as the builder, as a service identity, or as the person asking, and it has to be answered before the share button.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A finance analyst built a low-code agent over a data source only they can see, and wants to share it with the department. What is the first question?',
      choices: [
        { id: 'a', text: 'Whose identity the agent queries with: the builder’s access, a service identity, or the person asking' },
        { id: 'b', text: 'Whether the answers are accurate enough to share', whyWrong: 'A real concern and a separate one. Sharing an agent that queries with the builder’s entitlements is a data-access incident at any accuracy.' },
        { id: 'c', text: 'How many people will use it', whyWrong: 'Scale changes the cost of the mistake, not whether it is one.' },
        { id: 'd', text: 'Whether the data source can carry the load', whyWrong: 'An operational question that does not touch who is allowed to see what.' },
      ],
      correctId: 'a',
    },
  },

  // ── Vector Search ────────────────────────────────────────────────────────
  {
    id: 'a2.vector_search.reembed',
    mode: 'drill',
    nodeIds: ['gcp.vector_search', 'ai.rag_failure'],
    difficulty: 'edge',
    explanation:
      'Vectors from two different embedding models occupy different spaces, so distances between them carry no meaning. Matching dimensionality is what makes this bug silent: the numbers fit, the geometry does not, and quality degrades in a way no error surfaces.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team upgrades their embedding model and re-embeds only newly ingested documents. What happens?',
      choices: [
        { id: 'a', text: 'The index now holds vectors from two incompatible spaces, so similarity across them is meaningless. Everything must be re-embedded' },
        { id: 'b', text: 'Older documents rank a little lower', whyWrong: 'Understates it badly. Cross-model similarity is not a weaker signal, it is not a signal.' },
        { id: 'c', text: 'Nothing, as long as the dimensionality matches', whyWrong: 'Matching dimensionality is exactly why this fails silently rather than loudly.' },
        { id: 'd', text: 'The index rejects the new vectors', whyWrong: 'It will accept them happily, which is the problem.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.vector_search.freshness',
    mode: 'drill',
    nodeIds: ['gcp.vector_search'],
    difficulty: 'core',
    explanation:
      'Nightly full rebuilds are the wrong shape for a minutes-level freshness requirement, and making them more frequent multiplies the most expensive operation in the pipeline. Streaming updates add documents individually, which is what the requirement actually asks for.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer needs documents searchable within minutes of publication. Their pipeline rebuilds the index nightly. What changes?',
      choices: [
        { id: 'a', text: 'Move to streaming index updates so individual documents are added and removed as they change' },
        { id: 'b', text: 'Rebuild the index every ten minutes', whyWrong: 'Full rebuilds do not become cheap by being frequent. You have multiplied the heaviest operation in the pipeline.' },
        { id: 'c', text: 'Keep the nightly build and search the source system for recent documents', whyWrong: 'Two retrieval paths with different ranking, and users get to notice the seam.' },
        { id: 'd', text: 'Hold recent documents in the prompt', whyWrong: 'Does not scale past a handful and has nothing to do with retrieval.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.vector_search.store_match',
    mode: 'drill',
    nodeIds: ['gcp.vector_search'],
    difficulty: 'core',
    explanation:
      'There is no single right vector store. The choice follows corpus size, whether permissions live in a relational schema you already query, and whether the lookup is semantic at all. Reaching for a dedicated index by reflex adds a system a lot of customers do not need.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match the situation to the retrieval store that fits it.',
      pairs: [
        { left: 'Tens of millions of vectors, retrieval quality is the product', right: 'A dedicated vector index' },
        { left: 'A few hundred thousand chunks, filtered by relational permissions', right: 'pgvector in the operational database' },
        { left: 'Lookup by exact part number or document id', right: 'A lexical index' },
        { left: 'Five documents the user already selected', right: 'No index, pass them directly' },
      ],
    },
  },
  {
    id: 'a2.vector_search.selective_filter',
    mode: 'drill',
    nodeIds: ['gcp.vector_search', 'sec.tenancy'],
    difficulty: 'deep',
    explanation:
      'Approximate search explores a bounded slice of the index. When a tenant owns a thousandth of the corpus, most of what the search visits fails the filter, so a correctly filtered search still under-returns. Widening the candidate search or giving small tenants their own namespace is what fixes it.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'In a shared index, one tenant owns 0.05% of the corpus. Their searches return very few results even though the filter is applied inside the search. Why?',
      choices: [
        { id: 'a', text: 'Approximate search visits a limited portion of the index, and almost nothing it visits belongs to that tenant' },
        { id: 'b', text: 'The tenant’s embeddings are lower quality', whyWrong: 'Nothing about the tenant changes how their text embeds. The effect tracks their share of the corpus, not their content.' },
        { id: 'c', text: 'The filter is being applied after retrieval', whyWrong: 'Stated otherwise. This is the harder case where in-search filtering still under-returns.' },
        { id: 'd', text: 'Their documents were never indexed', whyWrong: 'That gives zero results, not few, and ingestion counts would show it.' },
      ],
      correctId: 'a',
    },
  },

  // ── RAG Engine and grounding ─────────────────────────────────────────────
  {
    id: 'a2.rag_engine.source_routing',
    mode: 'drill',
    nodeIds: ['gcp.rag_engine'],
    difficulty: 'core',
    explanation:
      'Internal policy and current public facts are two different grounding problems with two different freshness owners. Routing between them explicitly, and saying in the citation which was used, is what stops a public-web answer being read as company policy.',
    diagramId: 'rag-pipeline',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An assistant must answer from the customer’s internal handbook and also from current public information. What is the design?',
      choices: [
        { id: 'a', text: 'Two grounding sources with explicit routing, and citations that make clear which one the answer came from' },
        { id: 'b', text: 'Crawl the public web into the private corpus so there is one source', whyWrong: 'You now own freshness for the entire internet, and the crawl is stale before it finishes.' },
        { id: 'c', text: 'Use the model’s own knowledge for public facts', whyWrong: 'Frozen at training time and uncitable, which is the exact combination that produces confident stale answers.' },
        { id: 'd', text: 'Use web grounding only, since the handbook is public to employees', whyWrong: 'Employee-visible is not internet-visible. The handbook is not on the public web.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.rag_engine.still_yours',
    mode: 'drill',
    nodeIds: ['gcp.rag_engine', 'ai.rag_failure'],
    difficulty: 'core',
    explanation:
      'A managed retrieval service owns the mechanics: chunking execution, embedding, indexing, nearest-neighbor search. It does not own corpus policy. Which documents belong in it, when they leave, and who may see what remain design decisions with your name on them.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which of these stay your responsibility even on a managed RAG service? Select all that apply.',
      choices: [
        { id: 'a', text: 'Deciding which documents belong in the corpus at all' },
        { id: 'b', text: 'Removing documents when they are withdrawn or superseded' },
        { id: 'c', text: 'Restricting retrieval to what the asking user is entitled to see' },
        { id: 'd', text: 'Implementing the nearest-neighbor search', whyWrong: 'The service owns this. Reimplementing it is the definition of not using the managed path.' },
        { id: 'e', text: 'Choosing the on-disk embedding format', whyWrong: 'An internal detail of the service, not a decision handed to you.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'a2.rag_engine.chunk_knob',
    mode: 'drill',
    nodeIds: ['gcp.rag_engine', 'ai.chunking'],
    difficulty: 'core',
    explanation:
      'When passages arrive mangled, the lever is upstream of generation: how the source was parsed and how it was split. Reaching for generation settings or top-k when the text itself is broken is the most common wasted week in a managed RAG deployment.',
    diagramId: 'rag-pipeline',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Retrieval on a managed corpus returns passages that cut off mid-clause and lose the clause number. What is the lever you actually have?',
      choices: [
        { id: 'a', text: 'The parsing and chunking configuration: how the source is read, and where it is split' },
        { id: 'b', text: 'The generation temperature', whyWrong: 'No sampling setting can recover text that was never in the passage.' },
        { id: 'c', text: 'A higher top-k', whyWrong: 'More badly cut passages is more of the same problem.' },
        { id: 'd', text: 'A larger context window', whyWrong: 'The clause number is missing from the chunk, not squeezed out by the window.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.rag_engine.citation_grain',
    mode: 'drill',
    nodeIds: ['gcp.rag_engine', 'cust.explaining_ai'],
    difficulty: 'deep',
    explanation:
      'A citation exists so a human can check the claim in seconds. Pointing at a 90-page document technically cites the source and practically does not, and reviewers stop verifying long before they stop complaining.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Reviewers complain that citations point at 90-page PDFs and verifying one answer takes ten minutes. What do you change?',
      choices: [
        { id: 'a', text: 'Cite the passage: carry the chunk’s location through to the UI so the reviewer lands on the sentence' },
        { id: 'b', text: 'Add more citations per answer', whyWrong: 'More 90-page documents to open. The grain is wrong, not the count.' },
        { id: 'c', text: 'Generate a summary of each cited document', whyWrong: 'Inserts another generated artifact between the reviewer and the evidence they are trying to check.' },
        { id: 'd', text: 'Link to a document search for the key terms', whyWrong: 'Hands the verification work back to the reviewer with an extra step attached.' },
      ],
      correctId: 'a',
    },
  },

  // ── Model Armor ──────────────────────────────────────────────────────────
  {
    id: 'a2.model_armor.floor',
    mode: 'drill',
    nodeIds: ['gcp.model_armor', 'gcp.geap'],
    difficulty: 'deep',
    explanation:
      'The teams a CISO is worried about are the ones who never come to the review. A policy floor set above the project, which individual projects can strengthen but not weaken, makes the unscreened state unreachable rather than merely discouraged.',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A CISO wants assurance that no team can ship a generative feature without prompt screening, including teams they have never met. What do you propose?',
      choices: [
        { id: 'a', text: 'Enforce screening as a policy floor above the project, which projects can tighten but not weaken' },
        { id: 'b', text: 'A written standard every team must follow', whyWrong: 'A standard nobody enforces is a document, and the team that ignores it is exactly the population the CISO asked about.' },
        { id: 'c', text: 'A code review checklist item', whyWrong: 'Catches teams already inside the review process, which is not where the risk is.' },
        { id: 'd', text: 'Quarterly audits of deployed features', whyWrong: 'Detection after the fact. The question was how to make the bad state unreachable.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.model_armor.fp_tuning',
    mode: 'drill',
    nodeIds: ['gcp.model_armor', 'ai.evals'],
    difficulty: 'edge',
    explanation:
      'Every screening control produces its first false positive in week one, and that is the moment teams disable it. Turning the complaints into a labeled sample makes threshold tuning a measurement rather than an argument, and the sample becomes the regression set for the next policy change.',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'After enabling screening, support reports legitimate questions being blocked. Order the disciplined response.',
      steps: [
        'Collect a sample of the blocked requests from real traffic',
        'Label which were genuinely unsafe and which were not',
        'Tune thresholds against that labeled sample rather than against complaint volume',
        'Keep the sample as a regression set for the next policy change',
      ],
    },
  },
  {
    id: 'a2.model_armor.latency_cost',
    mode: 'drill',
    nodeIds: ['gcp.model_armor', 'ai.latency'],
    difficulty: 'core',
    explanation:
      'Screening costs time on the way in and on the way out, and the honest number belongs in the latency budget before someone promises a p95. The output screen is the one that catches leaked data, so it is not the half to quietly drop.',
    diagramId: 'latency-budget',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'The product owner asks what runtime screening costs in latency. What do you do?',
      choices: [
        { id: 'a', text: 'Give the measured number from the latency budget, and note which checks can run alongside other work rather than in series' },
        { id: 'b', text: 'Say it is negligible', whyWrong: 'An unmeasured claim made to the person who will quote it back when p95 misses.' },
        { id: 'c', text: 'Screen only the input to halve the cost', whyWrong: 'The output screen is what catches leaked data. That is not a trade to make silently for milliseconds.' },
        { id: 'd', text: 'Screen a sample of requests', whyWrong: 'A control running on a tenth of traffic prevents a tenth of the incidents.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.model_armor.not_authz',
    mode: 'drill',
    nodeIds: ['gcp.model_armor', 'ai.guardrails'],
    difficulty: 'core',
    explanation:
      'A filter changes how often a bad instruction gets through. A permission changes what happens when one does. Teams that treat screening as a substitute for scoping credentials have replaced a bound on impact with a reduction in likelihood, which is not the same control.',
    diagramId: 'agent-loop',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team argues that with runtime screening in place they no longer need to scope the agent’s tool credentials. What is wrong with that?',
      choices: [
        { id: 'a', text: 'Screening reduces how often a bad instruction gets through. It does not bound what the agent can do when one does, and only permissions do that' },
        { id: 'b', text: 'Screening is not accurate enough yet', whyWrong: 'Frames it as a maturity problem. Even perfect screening is a filter, not an authorization boundary.' },
        { id: 'c', text: 'Screening does not cover tool calls', whyWrong: 'Tool-call screening exists. The point is that a filter and a permission are different kinds of control.' },
        { id: 'd', text: 'Nothing is wrong, screening is sufficient', whyWrong: 'This is the belief that shows up in the incident review.' },
      ],
      correctId: 'a',
    },
  },

  // ── Document AI ──────────────────────────────────────────────────────────
  {
    id: 'a2.document_ai.approach_match',
    mode: 'drill',
    nodeIds: ['gcp.document_ai'],
    difficulty: 'intro',
    explanation:
      'Not every document needs a processor and not every document survives without one. Matching the approach to the artifact avoids both failure modes: expensive parsing of clean digital text, and raw OCR of a form whose meaning lives in its layout.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match the document problem to the right processing approach.',
      pairs: [
        { left: 'Structured claim forms with the same layout every time', right: 'A form or custom extraction processor' },
        { left: 'Contracts where clause boundaries matter for retrieval', right: 'Layout parsing, then chunk on the structure' },
        { left: 'Scanned pages with handwriting in the margins', right: 'OCR plus a human review step' },
        { left: 'A clean digital PDF of prose', right: 'Direct text extraction, no processor needed' },
      ],
    },
  },
  {
    id: 'a2.document_ai.feeds_chunker',
    mode: 'drill',
    nodeIds: ['gcp.document_ai', 'ai.chunking'],
    difficulty: 'core',
    explanation:
      'The parsing step should hand the chunker structure, not a wall of text. Headings, clause numbers, tables and reading order are precisely the information that lets chunks follow real boundaries instead of arbitrary character counts.',
    diagramId: 'rag-pipeline',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are building retrieval over 4,000 contracts. What should the parsing step hand to the chunker?',
      choices: [
        { id: 'a', text: 'The document structure: headings, clause numbers, tables and reading order' },
        { id: 'b', text: 'One long string of text per document', whyWrong: 'Discards exactly the structure the chunker needs to know where a clause starts and ends.' },
        { id: 'c', text: 'One chunk per page', whyWrong: 'Page breaks are a printing artifact. Clauses do not respect them.' },
        { id: 'd', text: 'Page images, for a multimodal model to read at query time', whyWrong: 'Charges the parsing cost on every query instead of once at ingestion.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.document_ai.field_level',
    mode: 'drill',
    nodeIds: ['gcp.document_ai', 'ai.evals'],
    difficulty: 'deep',
    explanation:
      'Document-level accuracy averages over fields that matter very differently. A pipeline can be 94% right per document while getting the total wrong one time in ten, and the finance team is reacting to the second number, not the first.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Extraction reports 94% document-level accuracy and the customer’s finance team is unhappy. What is the likely disconnect?',
      choices: [
        { id: 'a', text: 'Document-level accuracy hides per-field performance, and the field they care about is almost certainly worse than the average' },
        { id: 'b', text: 'The model needs more training data', whyWrong: 'Possibly, and you cannot know until you see which fields fail and how.' },
        { id: 'c', text: '94% is simply too low for finance', whyWrong: 'A number without a per-field breakdown cannot be judged too low or high enough.' },
        { id: 'd', text: 'Finance teams always want 100%', whyWrong: 'Dismisses a specific complaint that almost certainly points at a specific field.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.document_ai.batch_mode',
    mode: 'drill',
    nodeIds: ['gcp.document_ai'],
    difficulty: 'core',
    explanation:
      'Sixty thousand pages with nobody waiting is a throughput problem, not a latency one. Driving it through interactive requests pays interactive rates and fights per-request limits for work that has all night to finish.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer processes 60,000 pages overnight with no user waiting. How should the pipeline call the extractor?',
      choices: [
        { id: 'a', text: 'As a batch workload sized for throughput, with per-document results written for downstream steps' },
        { id: 'b', text: 'Interactive requests in a tight loop', whyWrong: 'Pays interactive rates and hits per-request limits for work nobody is waiting on.' },
        { id: 'c', text: 'Interactive requests fanned out across many workers', whyWrong: 'The same trade at higher cost and with more throttling.' },
        { id: 'd', text: 'Spread across the day to smooth load', whyWrong: 'Solves a load problem that does not exist. The window is overnight and empty.' },
      ],
      correctId: 'a',
    },
  },

  // ── Tuning and custom training ───────────────────────────────────────────
  {
    id: 'a2.vertex_training.distill',
    mode: 'drill',
    nodeIds: ['gcp.vertex_training', 'ai.cost'],
    difficulty: 'core',
    explanation:
      'A narrow, high-volume step is the classic distillation case: use the capable model to produce labeled examples, tune a small model on them, and keep the capable model as the fallback for low-confidence cases. It is one of the few cost levers that changes the structure rather than shaving a percentage.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A classification step runs 40 million times a month and a large model does it well. What is worth proposing?',
      choices: [
        { id: 'a', text: 'Use the large model’s reviewed outputs to tune a small one for that task, and keep the large model as the low-confidence fallback' },
        { id: 'b', text: 'Keep the large model and negotiate a discount', whyWrong: 'A commercial lever that leaves the cost structure untouched, so the next volume increase brings the same conversation.' },
        { id: 'c', text: 'Cache the classifications', whyWrong: 'Only helps when inputs repeat. Forty million distinct items do not.' },
        { id: 'd', text: 'Shorten the prompt', whyWrong: 'Worth doing, and an order of magnitude short of what a tuned small model changes here.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.vertex_training.data_duty',
    mode: 'drill',
    nodeIds: ['gcp.vertex_training', 'sec.pii'],
    difficulty: 'deep',
    explanation:
      'A tuning dataset made of real customer correspondence is a personal-data asset with a lifecycle: a purpose, a de-identification decision, an access boundary and a retention answer that covers the checkpoints as well as the source files. Doing that after the training run is doing it in the wrong order.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'The tuning set is 20,000 real customer emails. Order the work before a training run.',
      steps: [
        'Establish the lawful basis and the purpose this data may be used for',
        'De-identify what the task does not need, including identifiers inside message bodies',
        'Restrict the training bucket and record who has access to it',
        'Decide retention and deletion for the dataset and for the resulting checkpoints',
      ],
    },
  },
  {
    id: 'a2.vertex_training.decide',
    mode: 'drill',
    nodeIds: ['gcp.vertex_training', 'ai.finetune'],
    difficulty: 'core',
    explanation:
      'The question is never "should we tune" in the abstract. It is whether a measured gap survives a serious attempt at prompting and retrieval, and whether tuning closes it on the same measurement. Without the baseline the whole exercise is unfalsifiable.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'A customer is convinced they need a tuned model. Order the work that decides whether they do.',
      steps: [
        'Build an eval set that defines what good looks like for this task',
        'Measure the base model with a careful prompt and, where relevant, retrieval',
        'Tune only the behavior that measurement shows prompting cannot reach',
        'Re-run the same eval on the tuned model and compare against the recorded baseline',
      ],
    },
  },
  {
    id: 'a2.vertex_training.ownership',
    mode: 'drill',
    nodeIds: ['gcp.vertex_training'],
    difficulty: 'edge',
    explanation:
      'A tuned model is an artifact with a lifecycle, and the lifecycle is what customers underestimate. The prompt built around it is pinned to it, and the day the base model moves you owe a re-tune and a re-evaluation before anything ships.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A tuned model passed evaluation. What does the team now own that it did not before? Select all that apply.',
      choices: [
        { id: 'a', text: 'A serving artifact whose lifecycle they manage' },
        { id: 'b', text: 'A re-tune and re-evaluation whenever the base model moves' },
        { id: 'c', text: 'Version pinning between the tuned artifact and the prompt built around it' },
        { id: 'd', text: 'A separate audit trail that hosted models do not provide', whyWrong: 'Audit logging is a platform capability. Tuning neither adds nor removes it.' },
        { id: 'e', text: 'Responsibility for the accelerator hardware', whyWrong: 'Managed tuning and serving keep that on the platform side.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── AI data residency and controls ───────────────────────────────────────
  {
    id: 'a2.ai_residency.perimeter_gap',
    mode: 'drill',
    nodeIds: ['gcp.ai_residency', 'gcp.geap'],
    difficulty: 'core',
    explanation:
      'A prompt is data leaving storage. A perimeter that covers the data projects but not the AI APIs leaves the most convenient exfiltration path open: read from protected storage, send to a service outside the boundary, and nothing in the network layer objects.',
    diagramId: 'vpcsc-vs-psc',
    citations: cite('vpcsc', 'genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer has VPC Service Controls around their data projects but calls the model API from an unprotected project. What is the gap?',
      choices: [
        { id: 'a', text: 'The AI APIs need to be inside the perimeter too, or data can be read from protected storage and sent to a service outside it' },
        { id: 'b', text: 'Nothing, since the data never leaves storage', whyWrong: 'The retrieval step exists to take data out of storage and put it in a prompt. That is the whole flow.' },
        { id: 'c', text: 'Nothing, since prompts are encrypted in transit', whyWrong: 'TLS protects the wire. A perimeter controls where data is allowed to go at all.' },
        { id: 'd', text: 'A firewall rule is missing on the calling project', whyWrong: 'Firewalls govern network reachability, not API-level movement between Google-managed services.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.ai_residency.agent_state',
    mode: 'drill',
    nodeIds: ['gcp.ai_residency', 'gcp.agent_engine'],
    difficulty: 'edge',
    explanation:
      'Regional model endpoints answer the processing question. They say nothing about where the conversation history and remembered facts are stored, and those stores hold a far richer record of a person than any single prompt did.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An EU customer accepts regional model endpoints, then asks where the agent’s conversation history and remembered facts are stored. Why is that the right question?',
      choices: [
        { id: 'a', text: 'Session and memory stores hold user content, so their location and retention are part of the residency answer rather than an implementation detail' },
        { id: 'b', text: 'It is not: only the model call matters for residency', whyWrong: 'The model call is transient. The stores are where content actually sits, which is usually what a residency clause is about.' },
        { id: 'c', text: 'Agent state is not personal data', whyWrong: 'A conversation history is a detailed record of a person. It is squarely personal data.' },
        { id: 'd', text: 'Encryption makes location irrelevant', whyWrong: 'Residency is a jurisdiction question. Encrypted data in the wrong jurisdiction is still in the wrong jurisdiction.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.ai_residency.cmek_claim',
    mode: 'drill',
    nodeIds: ['gcp.ai_residency'],
    difficulty: 'intro',
    explanation:
      'CMEK is a real and specific control: the customer holds, rotates and can revoke the keys protecting data at rest. Stretching it into a claim about processing is an overpromise that gets tested in the security review, with your credibility attached to it.',
    citations: cite('cmek', 'genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer says CMEK on their AI workload means Google cannot see their prompts. Is that right?',
      choices: [
        { id: 'a', text: 'Not quite. CMEK gives them custody of the keys protecting data at rest, which is a real control with a specific scope, not a claim about processing' },
        { id: 'b', text: 'Yes, that is what CMEK means', whyWrong: 'Overpromises a control they will test later, and you will be the one who said it.' },
        { id: 'c', text: 'No, CMEK adds nothing beyond default encryption', whyWrong: 'Understates it. Key custody, rotation and revocation are exactly what a regulator asks about.' },
        { id: 'd', text: 'Yes, provided the keys are held outside Google', whyWrong: 'Where the key lives changes custody, not what encryption at rest covers.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.ai_residency.prompt_logs',
    mode: 'drill',
    nodeIds: ['gcp.ai_residency', 'ai.observability'],
    difficulty: 'deep',
    explanation:
      'Turning on full prompt and response logging creates a second copy of regulated content in a store with its own location, its own retention and its own access list. Treating that as a logging setting rather than a data decision is how a debugging convenience becomes an audit finding.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A team enables full prompt and response logging for debugging. Which obligations does that create? Select all that apply.',
      choices: [
        { id: 'a', text: 'Deciding where the log sink lives, in jurisdiction terms' },
        { id: 'b', text: 'Setting a retention period for the user content now stored there' },
        { id: 'c', text: 'Restricting who can read the logs, at least as tightly as the source data' },
        { id: 'd', text: 'None: logs are metadata', whyWrong: 'Full prompt logs are content, and the privacy officer will read them exactly that way.' },
        { id: 'e', text: 'Disabling tracing for the agent', whyWrong: 'Conflates content logging with tracing. You can keep the trace structure and redact the content inside it.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Context engineering ──────────────────────────────────────────────────
  {
    id: 'a2.context.drop_order',
    mode: 'drill',
    nodeIds: ['ai.context', 'ai.cost'],
    difficulty: 'deep',
    explanation:
      'Context pressure has a natural priority order, and knowing it in advance turns an emergency truncation into a policy. Raw material whose conclusion is already recorded goes first; the instruction and the live question go last, because without them nothing else matters.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'A long agent turn exceeds the context budget. Order what you drop or compress, from first to last.',
      steps: [
        'Raw tool output whose conclusion is already recorded elsewhere in the context',
        'Results from branches the agent tried and abandoned',
        'Older turns, replaced by a summary of what was decided',
        'The lowest-ranked retrieved passages, keeping the ones actually cited',
      ],
    },
  },
  {
    id: 'a2.context.data_not_instructions',
    mode: 'drill',
    nodeIds: ['ai.context', 'ai.guardrails'],
    difficulty: 'core',
    explanation:
      'Everything in the window is one stream of tokens. The distinction between your instructions and retrieved material exists only if you build it, with clear delimiters and an explicit statement that content inside them is data. It is a mitigation rather than a boundary, and it is still worth doing on every prompt.',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Retrieved documents go into the same prompt as your instructions. What do you do about that structurally?',
      choices: [
        { id: 'a', text: 'Put retrieved text inside clear delimiters and state that content within them is data to be used, never instructions to be followed' },
        { id: 'b', text: 'Trust the model to tell instructions from content', whyWrong: 'It is all text in one stream. The distinction only exists if you create it.' },
        { id: 'c', text: 'Strip anything that looks like an instruction', whyWrong: 'You cannot enumerate what an instruction looks like, and legitimate documents are full of imperative sentences.' },
        { id: 'd', text: 'Place documents after the question so they carry less weight', whyWrong: 'Position affects attention, not authority. A well-placed injection still reads as an instruction.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.context.tool_payload',
    mode: 'drill',
    nodeIds: ['ai.context', 'ai.tool_calling'],
    difficulty: 'core',
    explanation:
      'A tool that returns everything makes the context problem the agent’s problem. Returning the fields the agent needs plus a handle for the rest keeps the window clean, and selection at the tool boundary always beats truncation after the fact.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A tool returns a 60,000-token API response and the next model call becomes slow and worse. What is the fix at the tool boundary?',
      choices: [
        { id: 'a', text: 'Return the fields the agent actually needs plus a handle to fetch the rest on demand' },
        { id: 'b', text: 'Move to a model with a larger context window', whyWrong: 'Pays for the payload instead of removing it, and the quality drop from irrelevant bulk stays exactly where it was.' },
        { id: 'c', text: 'Summarize the response with another model call', whyWrong: 'A round trip and a lossy step to fix something the tool could have returned correctly the first time.' },
        { id: 'd', text: 'Truncate the response at a character limit', whyWrong: 'Cuts arbitrarily, so the needed field goes missing at random. Selection beats truncation.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.context.compaction_shape',
    mode: 'drill',
    nodeIds: ['ai.context', 'ai.memory'],
    difficulty: 'deep',
    explanation:
      'Keeping only the recent N turns is the intuitive strategy and it drops the original request and the constraints agreed at the start, which is exactly what the agent then keeps violating. Keep the framing and the live turns verbatim, compress the middle.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A support conversation has run 60 turns. How do you keep it working?',
      choices: [
        { id: 'a', text: 'Keep the opening framing and the recent turns verbatim, and replace the middle with a summary of decisions and facts established' },
        { id: 'b', text: 'Keep the most recent turns and drop everything older', whyWrong: 'Drops the original request and the constraints agreed early, which is precisely what the agent then starts violating.' },
        { id: 'c', text: 'Summarize everything, including the latest turn', whyWrong: 'The current turn is the one the model needs word for word. Summarizing it loses what is being responded to.' },
        { id: 'd', text: 'Start a new conversation', whyWrong: 'Sometimes the right product decision and not a context strategy. The user did not ask to start over.' },
      ],
      correctId: 'a',
    },
  },

  // ── System prompt design ─────────────────────────────────────────────────
  {
    id: 'a2.prompt.fewshot_boundary',
    mode: 'drill',
    nodeIds: ['ai.prompt_design', 'ai.evals'],
    difficulty: 'core',
    explanation:
      'Every few-shot example is paid for on every call, so each one has to earn its tokens. The ones that do are drawn from current failures at the boundary between confusable classes, not from the clearest examples of behavior the model already gets right.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are adding few-shot examples to a classifier prompt. Where should they come from?',
      choices: [
        { id: 'a', text: 'Cases the model currently gets wrong, chosen to cover the boundaries between the classes it confuses' },
        { id: 'b', text: 'The clearest, most typical example of each class', whyWrong: 'Spends tokens teaching behavior the model already has. Examples pay off at the boundaries.' },
        { id: 'c', text: 'A random sample of production items', whyWrong: 'Random sampling reproduces the class distribution, so the rare and hard classes are the least represented.' },
        { id: 'd', text: 'As many examples as fit in the window', whyWrong: 'Past a handful the marginal example rarely earns the tokens it costs on every single call.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.prompt.positive_target',
    mode: 'drill',
    nodeIds: ['ai.prompt_design'],
    difficulty: 'core',
    explanation:
      'A list of prohibitions describes a space of failures without describing the target. Specifying the desired behavior and constraining the output shape gives the model something to aim at, which is why it outperforms a fourteenth "do not".',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A prompt has accumulated fourteen "do not" rules and the model still breaks them occasionally. What usually works better?',
      choices: [
        { id: 'a', text: 'Describe the desired behavior positively and constrain the output shape, so the target is specified rather than the failures enumerated' },
        { id: 'b', text: 'Repeat the rules in capitals at the end', whyWrong: 'Emphasis buys a little and does not change that the prompt never says what to do instead.' },
        { id: 'c', text: 'Add prohibitions for the remaining cases', whyWrong: 'The list grows without bound, and each addition dilutes the others.' },
        { id: 'd', text: 'Move the rules to the top', whyWrong: 'Placement helps marginally. The structure of the instruction is the problem.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.prompt.in_vcs',
    mode: 'drill',
    nodeIds: ['ai.prompt_design', 'prod.model_release'],
    difficulty: 'core',
    explanation:
      'A prompt read live from a shared document is an unversioned production input that two people can change without a review, a diff or a rollback. Prompts belong in version control, released through the same pipeline as code, with the version recorded in every trace.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Prompts live in a spreadsheet that two people edit, and production reads the current value. What do you change?',
      choices: [
        { id: 'a', text: 'Move them into version control alongside the code, released through the same pipeline, with the version stamped on every trace' },
        { id: 'b', text: 'Add a change log tab to the spreadsheet', whyWrong: 'A change log nobody can diff or revert, attached to a value production reads live.' },
        { id: 'c', text: 'Restrict editing to one person', whyWrong: 'Creates a bottleneck and leaves the unversioned production input exactly where it was.' },
        { id: 'd', text: 'Copy the prompt into the code at deploy time', whyWrong: 'The spreadsheet stays the source of truth and drifts from what actually shipped.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.prompt.no_answer_path',
    mode: 'drill',
    nodeIds: ['ai.prompt_design', 'ai.guardrails'],
    difficulty: 'deep',
    explanation:
      'The unspecified case is the one that ends up in a screenshot. Saying only "admit when you do not know" leaves the model to invent both the wording and the next step, which is where the inconsistency users notice comes from.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'What should a system prompt specify about cases the assistant cannot handle? Select all that apply.',
      choices: [
        { id: 'a', text: 'The wording to use when it cannot answer' },
        { id: 'b', text: 'What to offer instead, such as the relevant team or a place to look' },
        { id: 'c', text: 'When to hand off to a human, and how' },
        { id: 'd', text: 'That it should never refuse', whyWrong: 'Guarantees a fabricated answer for every question outside scope, which is the failure you were trying to prevent.' },
        { id: 'e', text: 'That it should guess when unsure', whyWrong: 'An instruction to produce confident output with no support, indistinguishable from a good answer until someone checks.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Chunking and document prep ───────────────────────────────────────────
  {
    id: 'a2.chunking.strategy_match',
    mode: 'drill',
    nodeIds: ['ai.chunking'],
    difficulty: 'deep',
    explanation:
      'There is no default chunk size worth defending. The unit that retrieves well is the unit that answers a question on its own, and what that is depends entirely on how the source is organized.',
    diagramId: 'rag-pipeline',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match the corpus to the chunking approach that fits it.',
      pairs: [
        { left: 'Policy manuals with numbered sections', right: 'Split on headings, keep the section path in the chunk' },
        { left: 'Support chat transcripts', right: 'Split on turns, keeping a thread together' },
        { left: 'API reference pages', right: 'One chunk per endpoint, including its parameters' },
        { left: 'Long narrative reports with no structure', right: 'Fixed windows with overlap, plus a document summary' },
      ],
    },
  },
  {
    id: 'a2.chunking.table_header',
    mode: 'drill',
    nodeIds: ['ai.chunking', 'ai.rag_failure'],
    difficulty: 'edge',
    explanation:
      'When a table spans chunks, only the first one carries the header row. Later rows arrive as numbers with no column meaning, and the model attaches them to whatever is nearby. Keeping tables intact, or repeating the header in every chunk containing rows, is the fix.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A pricing table spans three chunks. The assistant reports the right numbers against the wrong products. What happened?',
      choices: [
        { id: 'a', text: 'The header row is only in the first chunk, so later rows lost their column meaning. Keep tables intact or repeat the header in each chunk' },
        { id: 'b', text: 'The model misread the numbers', whyWrong: 'The numbers are correct. Losing which column they belong to is a chunking failure, not a reading one.' },
        { id: 'c', text: 'The chunks were retrieved out of order', whyWrong: 'Reordering cannot restore a header that is not in the chunk.' },
        { id: 'd', text: 'The table should not be in the index', whyWrong: 'The table is the answer. Removing it removes the capability.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.chunking.overlap_balance',
    mode: 'drill',
    nodeIds: ['ai.chunking'],
    difficulty: 'core',
    explanation:
      'Overlap buys boundary safety and costs index size and near-duplicate results. The expensive part is not storage, it is a top-k filled with three copies of the same passage, which is why a modest overlap plus deduplication at retrieval is the usual balance.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team sets chunk overlap to 50% because "more context is better". What do you tell them?',
      choices: [
        { id: 'a', text: 'Overlap trades boundary safety against near-duplicate results; a modest overlap plus deduplication at retrieval is the usual balance' },
        { id: 'b', text: 'Overlap should be zero to keep the index clean', whyWrong: 'Guarantees that some answers are split exactly at a boundary and never retrieved whole.' },
        { id: 'c', text: 'Overlap is free because storage is cheap', whyWrong: 'Storage is the smallest cost. The real one is top-k filled with copies of the same passage.' },
        { id: 'd', text: 'Overlap should match the context window', whyWrong: 'Unrelated quantities. Overlap is about chunk boundaries, not about what fits in the prompt.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.chunking.parent_expand',
    mode: 'drill',
    nodeIds: ['ai.chunking', 'ai.context'],
    difficulty: 'core',
    explanation:
      'Small chunks retrieve precisely and read poorly. Retrieving on the small unit and expanding to its parent section before generation gets both properties, which is why it is the standard answer to "our chunks are too small but bigger ones retrieve worse".',
    diagramId: 'rag-pipeline',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Small chunks retrieve precisely but the model answers without enough surrounding context. What is the standard pattern?',
      choices: [
        { id: 'a', text: 'Retrieve on the small chunk, then expand to its parent section before the passage enters the prompt' },
        { id: 'b', text: 'Make every chunk bigger', whyWrong: 'Trades away the retrieval precision that was working, to buy the context that was missing. The pattern gets both.' },
        { id: 'c', text: 'Retrieve more small chunks', whyWrong: 'More fragments from more places is not the same as the paragraphs around the hit.' },
        { id: 'd', text: 'Attach a document summary to every chunk', whyWrong: 'Useful metadata, and no substitute for the sentences immediately surrounding the match.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.chunking.why_at_all',
    mode: 'drill',
    nodeIds: ['ai.chunking'],
    difficulty: 'intro',
    explanation:
      'Chunking is a retrieval decision, not a context-window workaround. Search returns units, so smaller units let it find the relevant paragraph rather than the relevant file, and they keep the rest of the document out of the prompt.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Why chunk documents at all, if the context window could hold several of them whole?',
      choices: [
        { id: 'a', text: 'Retrieval works on units: smaller units let search find the relevant part rather than the relevant file, and keep irrelevant text out of the prompt' },
        { id: 'b', text: 'Because context windows are too small', whyWrong: 'Sometimes true and not the reason. Chunking would still be right with an enormous window.' },
        { id: 'c', text: 'Because embedding models have a token limit', whyWrong: 'A real mechanical constraint, not the design motivation.' },
        { id: 'd', text: 'To reduce storage cost', whyWrong: 'Chunking with overlap increases index size. Cost is not the motivation.' },
      ],
      correctId: 'a',
    },
  },

  // ── Hybrid and lexical retrieval ─────────────────────────────────────────
  {
    id: 'a2.hybrid.exact_ids',
    mode: 'drill',
    nodeIds: ['ai.hybrid_search'],
    difficulty: 'intro',
    explanation:
      'Embeddings encode meaning, and two near-identical part numbers mean almost the same thing to an embedding. Similarity is not equality, which is why exact identifiers are the case dense retrieval is structurally worst at and lexical matching handles for free.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Users search for exact part numbers like "HX-4420-B" and dense retrieval keeps returning similar-looking parts. Why?',
      choices: [
        { id: 'a', text: 'Embeddings encode similarity, not equality, so near-identical identifiers land close together. A lexical channel handles exact tokens' },
        { id: 'b', text: 'The embedding model is undertrained on this domain', whyWrong: 'Even a domain-tuned embedding compresses an identifier into a region of space. Exactness is not what the representation preserves.' },
        { id: 'c', text: 'The chunks are too large', whyWrong: 'Chunk size does not change the fact that the match is by similarity.' },
        { id: 'd', text: 'Top-k is too high', whyWrong: 'A smaller k returns fewer wrong parts, not the right one.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.hybrid.internal_jargon',
    mode: 'drill',
    nodeIds: ['ai.hybrid_search', 'ai.rag_failure'],
    difficulty: 'deep',
    explanation:
      'Internal codenames appear nowhere in the text an embedding model was trained on, so they carry no useful semantics. A lexical channel matches the token exactly this afternoon; tuning an embedding model is weeks of work and a full re-index for the same outcome.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s staff search using internal codenames that appear nowhere in general text. Which change helps most?',
      choices: [
        { id: 'a', text: 'Add a lexical channel so the exact token matches, and carry a glossary into query rewriting' },
        { id: 'b', text: 'Fine-tune the embedding model on their corpus', whyWrong: 'Occasionally worth it, and it is weeks of work plus a full re-index for something a lexical channel fixes today.' },
        { id: 'c', text: 'Instruct the model to expand the acronyms', whyWrong: 'The model does not know what the codename means either, so it will expand it plausibly and wrongly.' },
        { id: 'd', text: 'Increase chunk overlap', whyWrong: 'Does nothing for a term the retriever cannot match in the first place.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.hybrid.cross_language',
    mode: 'drill',
    nodeIds: ['ai.hybrid_search', 'ai.rag_failure'],
    difficulty: 'deep',
    explanation:
      'When the query language and the corpus language differ, the lexical channel goes quiet and everything rests on a multilingual embedding. Translating the corpus solves retrieval and creates a worse problem: every citation then points at a translation rather than the authoritative text.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'The corpus is in German, users ask in English, and lexical matching finds nothing. What is the sound design?',
      choices: [
        { id: 'a', text: 'Use a multilingual embedding for the semantic channel, translate or expand the query for the lexical one, and evaluate per language' },
        { id: 'b', text: 'Translate the whole corpus into English at ingestion', whyWrong: 'Every answer then cites a translation instead of the authoritative document, which matters the moment the text is contractual.' },
        { id: 'c', text: 'Require users to search in German', whyWrong: 'Solves an engineering problem by moving it onto users who cannot do it.' },
        { id: 'd', text: 'Drop the lexical channel for this corpus', whyWrong: 'Gives up exact matching of product codes and names, which cross languages perfectly well.' },
      ],
      correctId: 'a',
    },
  },

  // ── Reranking ────────────────────────────────────────────────────────────
  {
    id: 'a2.rerank.recall_ceiling',
    mode: 'drill',
    nodeIds: ['ai.rerank', 'ai.rag_failure'],
    difficulty: 'deep',
    explanation:
      'A reranker reorders the candidate set. If the correct passage was never a candidate, no amount of reranking quality produces it, and teams routinely spend weeks improving a sorter when the list itself was wrong. Candidate recall is the ceiling on everything downstream.',
    diagramId: 'rag-pipeline',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Reranking improved answers, but a class of questions is still wrong and traces show the right passage never appears in the candidates. What now?',
      choices: [
        { id: 'a', text: 'Fix retrieval: a reranker can only reorder what it is given, so candidate recall is the ceiling' },
        { id: 'b', text: 'Use a stronger reranker', whyWrong: 'A better sorter of the wrong list still returns the wrong list.' },
        { id: 'c', text: 'Lower the reranker’s score threshold', whyWrong: 'Changes which candidates survive, not which candidates existed.' },
        { id: 'd', text: 'Send more passages to the model', whyWrong: 'More of a candidate list that never contained the answer.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.rerank.candidate_width',
    mode: 'drill',
    nodeIds: ['ai.rerank', 'ai.latency'],
    difficulty: 'core',
    explanation:
      'Reranking cost scales with candidates, and recall plateaus somewhere. Where it plateaus is a property of your corpus and your queries, so the number comes from a measurement rather than from whatever someone else published.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'How many candidates should go into the reranker?',
      choices: [
        { id: 'a', text: 'Enough that candidate recall is high, few enough that added latency and cost fit the budget, with the number chosen by measurement' },
        { id: 'b', text: 'As many as the reranker will accept', whyWrong: 'Cost scales with candidates, and past the point recall plateaus you are paying for nothing.' },
        { id: 'c', text: 'The same number you send to the model', whyWrong: 'Confuses the two stages. The point of reranking is to consider more than you keep.' },
        { id: 'd', text: 'Ten, which is the usual default', whyWrong: 'A starting point somebody else measured on somebody else’s corpus.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.rerank.abstain_signal',
    mode: 'drill',
    nodeIds: ['ai.rerank', 'ai.guardrails'],
    difficulty: 'edge',
    explanation:
      'Deciding to say "I could not find this" needs a signal comparable across queries. Raw cosine similarity is not: the same value means different things for different questions. A reranker score calibrated against labeled answerable and unanswerable examples is the workable version.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You want the assistant to abstain rather than answer from weak passages. What is the most workable signal?',
      choices: [
        { id: 'a', text: 'A cutoff on the reranker score, calibrated against labeled answerable and unanswerable questions' },
        { id: 'b', text: 'The vector similarity score', whyWrong: 'Not calibrated across queries. The same cosine value means different things for different questions.' },
        { id: 'c', text: 'Asking the model whether the passages are sufficient', whyWrong: 'A useful second check that on its own inherits the model’s strong tendency to find a way to answer.' },
        { id: 'd', text: 'Whether fewer than k passages came back', whyWrong: 'Retrieval will happily return a full k of weak passages for a question with no answer in the corpus.' },
      ],
      correctId: 'a',
    },
  },

  // ── RAG failure modes ────────────────────────────────────────────────────
  {
    id: 'a2.rag.acl_at_index',
    mode: 'drill',
    nodeIds: ['ai.rag_failure', 'sec.tenancy'],
    difficulty: 'deep',
    explanation:
      'A crawler that ignores permissions builds an index where every document is visible to every query. The model cannot respect an entitlement it was never told about, so access control has to travel with the chunk and be applied inside the search.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An index was built by crawling a shared drive. A contractor asks a question and receives a passage from an HR file. What was the design error?',
      choices: [
        { id: 'a', text: 'Permissions were never carried into the index, so retrieval had no way to know what this user may see' },
        { id: 'b', text: 'The HR file should not have been on the shared drive', whyWrong: 'True and not your control. The system you build must respect the permissions that exist, not the ones you wish existed.' },
        { id: 'c', text: 'The model should have refused to use it', whyWrong: 'The model cannot enforce an entitlement it was never told about.' },
        { id: 'd', text: 'The contractor should not have had an account', whyWrong: 'Contractors legitimately use the assistant. The failure is that retrieval ignored the difference between them and an employee.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.rag.version_conflict',
    mode: 'drill',
    nodeIds: ['ai.rag_failure'],
    difficulty: 'core',
    explanation:
      'Superseded policies are usually retained deliberately, so deleting them is not available. Version and effective date have to become filterable metadata, with the current version the default and the date visible in the citation so a human can spot the mismatch.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Retrieval returns the 2024 and 2026 versions of the same policy, and the answer blends them. What is the fix?',
      choices: [
        { id: 'a', text: 'Make version and effective date filterable metadata, default to the current version, and show the date in the citation' },
        { id: 'b', text: 'Delete the old versions', whyWrong: 'Usually impossible: superseded policies are retained for a reason, and questions about them are legitimate.' },
        { id: 'c', text: 'Tell the model to prefer newer documents', whyWrong: 'Depends on the model noticing a date it may not have been given, correctly, on every answer.' },
        { id: 'd', text: 'Rerank by recency', whyWrong: 'Recency is not relevance. A recent unrelated memo will outrank the correct older clause.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.rag.aggregate_query',
    mode: 'drill',
    nodeIds: ['ai.rag_failure', 'ai.tool_calling'],
    difficulty: 'edge',
    explanation:
      'Some questions have no answer in any document because the answer is a computation over all of them. Retrieval returns a sample and the model counts the sample, confidently. The fix is routing that class of question to a query over structured data instead.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Users ask "how many contracts expire next quarter?" and get a confident wrong number. Why is this hard for retrieval?',
      choices: [
        { id: 'a', text: 'The answer is an aggregate over the whole corpus while retrieval returns a handful of passages. It needs a query against structured data, not top-k' },
        { id: 'b', text: 'The chunks are too small to hold the answer', whyWrong: 'No chunk holds it. The answer is not in any document, it is a computation over all of them.' },
        { id: 'c', text: 'Embeddings cannot represent numbers well', whyWrong: 'A real weakness and not the mechanism here. Even perfect retrieval returns a sample.' },
        { id: 'd', text: 'The model cannot count', whyWrong: 'It counted what it was given. It was given five contracts out of nine hundred.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.rag.multihop',
    mode: 'drill',
    nodeIds: ['ai.rag_failure', 'ai.agents'],
    difficulty: 'deep',
    explanation:
      'When the second lookup depends on a value from the first, no single query is similar to both documents, so no top-k reliably surfaces them together. Iterative retrieval, where the first result forms the second query, is the shape that works.',
    diagramId: 'rag-pipeline',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'A question needs the customer’s plan tier from one document and that tier’s cancellation window from another. Order the retrieval design.',
      steps: [
        'Retrieve for the first fact using the user’s question as written',
        'Extract the specific value the second lookup depends on',
        'Issue a second retrieval built from that value',
        'Answer from both, citing each source separately',
      ],
    },
  },
  {
    id: 'a2.rag.query_rewrite',
    mode: 'drill',
    nodeIds: ['ai.rag_failure', 'ai.hybrid_search'],
    difficulty: 'core',
    explanation:
      'Twenty years of search boxes have trained everyone to type two words. Rewriting the query before searching, using the conversation and the corpus vocabulary, is one of the cheapest quality improvements available and it asks nothing of the user.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Users type "refund late" and retrieval returns noise. What is the cheap improvement?',
      choices: [
        { id: 'a', text: 'Rewrite the query before searching, expanding it from the conversation and known vocabulary into something with enough signal to match' },
        { id: 'b', text: 'Require users to write full sentences', whyWrong: 'Two decades of search boxes have trained the opposite behavior. You will not undo it with a placeholder.' },
        { id: 'c', text: 'Search the raw string with a higher top-k', whyWrong: 'More results from a weak query is more noise.' },
        { id: 'd', text: 'Embed the query twice and average', whyWrong: 'Averaging identical embeddings changes nothing.' },
      ],
      correctId: 'a',
    },
  },

  // ── Tool calling design ──────────────────────────────────────────────────
  {
    id: 'a2.tools.actionable_errors',
    mode: 'drill',
    nodeIds: ['ai.tool_calling'],
    difficulty: 'deep',
    explanation:
      'A tool error is a prompt. "400 Bad Request" tells the model nothing, so it retries the identical call. Naming the field, the expected format and an example turns a loop into a self-correction, and it costs one string in the error path.',
    diagramId: 'agent-loop',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A tool returns "400 Bad Request" when the model passes a malformed date, and the agent retries the same call four times. What is the fix?',
      choices: [
        { id: 'a', text: 'Return an error the model can act on: which field was wrong, what format is expected, and an example' },
        { id: 'b', text: 'Cap retries at one', whyWrong: 'Stops the loop and leaves the task failed, when the model could have corrected itself if told what was wrong.' },
        { id: 'c', text: 'Describe the date format in the prompt instructions', whyWrong: 'Puts the contract somewhere the model can drift from, when the error path can teach it every single time.' },
        { id: 'd', text: 'Catch the error and return an empty result', whyWrong: 'Converts a fixable failure into a silent wrong answer.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.tools.surface_size',
    mode: 'drill',
    nodeIds: ['ai.tool_calling', 'ai.mcp'],
    difficulty: 'core',
    explanation:
      'Tool selection degrades as the visible set grows, and forty options in one decision is a design problem no model size removes. Reducing what is visible per step, by routing or by splitting into agents with coherent toolsets, is the structural answer.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agent has 40 tools and picks the wrong one often. What is the most reliable structural change?',
      choices: [
        { id: 'a', text: 'Reduce what is visible per decision: route to a small relevant set, or split into agents that each hold a coherent toolset' },
        { id: 'b', text: 'Write longer tool descriptions', whyWrong: 'More text per tool across forty tools makes the selection problem larger, not smaller.' },
        { id: 'c', text: 'Rename tools with numeric prefixes to imply an order', whyWrong: 'Encodes an ordering the model has no reason to respect and that breaks whenever the set changes.' },
        { id: 'd', text: 'Move to a larger model', whyWrong: 'Buys headroom and leaves forty options in one decision, which is the actual defect.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.tools.idempotency_key',
    mode: 'drill',
    nodeIds: ['ai.tool_calling', 'data.idempotency'],
    difficulty: 'edge',
    explanation:
      'A timeout is indistinguishable from a failure, so an agent that never retries writes silently does nothing when a call genuinely fails. The fix belongs in the tool: accept an idempotency key so a repeat returns the original result rather than creating a second shipment.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agent times out waiting for a "create shipment" tool, retries, and the customer gets two shipments. Where does the fix belong?',
      choices: [
        { id: 'a', text: 'In the tool: accept a caller-supplied idempotency key so a repeated call returns the original result' },
        { id: 'b', text: 'In the agent: instruct it never to retry writes', whyWrong: 'A timeout looks exactly like a failure, so never retrying means real failures silently do nothing.' },
        { id: 'c', text: 'In the agent: check whether a shipment exists before creating one', whyWrong: 'A check-then-act race that fails under precisely the conditions that caused the timeout.' },
        { id: 'd', text: 'Raise the tool timeout', whyWrong: 'Moves the boundary without removing it. Some call still crosses it.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.tools.result_shape',
    mode: 'drill',
    nodeIds: ['ai.tool_calling', 'ai.context'],
    difficulty: 'core',
    explanation:
      'A search tool should return enough for the agent to choose and a way to fetch the rest. Returning forty full documents pushes the selection problem into the context window; returning one document takes a decision away from the component that knows the task.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A search tool returns 40 full documents into the agent’s context. What should it return instead?',
      choices: [
        { id: 'a', text: 'A ranked list of titles, ids and short snippets, with a separate tool to fetch a document in full' },
        { id: 'b', text: 'Only the single best document', whyWrong: 'Forces a ranking decision on the tool when the agent, which knows the task, is better placed to make it.' },
        { id: 'c', text: 'All 40, truncated to the first paragraph', whyWrong: 'Arbitrary truncation loses whatever was relevant while still paying for forty items.' },
        { id: 'd', text: 'A model-written summary of all 40', whyWrong: 'An extra call and a lossy layer between the agent and the evidence.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.tools.who_reads',
    mode: 'drill',
    nodeIds: ['ai.tool_calling', 'ai.prompt_design'],
    difficulty: 'intro',
    explanation:
      'A tool description is prompt text sent on every call, and the model is its primary reader. Writing it as developer documentation, with internal jargon and implementation notes, is how tools get selected at the wrong moments for reasons nobody can see.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Who is the primary reader of a tool’s description?',
      choices: [
        { id: 'a', text: 'The model, at decision time. It is prompt text and should be written to help the model choose correctly' },
        { id: 'b', text: 'Other developers, as documentation', whyWrong: 'They read it too, and optimizing for the human reader while the model is the actual consumer is how tools get chosen wrongly.' },
        { id: 'c', text: 'Nobody at run time, it is metadata', whyWrong: 'It is in the prompt on every call, and selection is based on it.' },
        { id: 'd', text: 'The framework, for validation', whyWrong: 'Schemas validate arguments. The description plays no part in validation.' },
      ],
      correctId: 'a',
    },
  },

  // ── Agent architecture ───────────────────────────────────────────────────
  {
    id: 'a2.agents.stuck_loop',
    mode: 'drill',
    nodeIds: ['ai.agents'],
    difficulty: 'deep',
    explanation:
      'A step cap is a backstop, not a strategy. When an agent repeats itself, the productive move is to change its situation: tell it the call returned nothing new, require a different approach or a hand-off, and make the stuck state visible rather than silently absorbed.',
    diagramId: 'agent-loop',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'An agent calls the same search with the same arguments five times running. Which responses actually help? Select all that apply.',
      choices: [
        { id: 'a', text: 'Tell it explicitly that the repeated call returned nothing new' },
        { id: 'b', text: 'Require a different approach or a hand-off after N identical calls' },
        { id: 'c', text: 'Surface the stuck state in traces so it can be alerted on and studied' },
        { id: 'd', text: 'Raise the temperature so it varies its behavior', whyWrong: 'Randomizing a stuck agent produces different stuck behavior, not a plan.' },
        { id: 'e', text: 'Silently deduplicate the repeated calls', whyWrong: 'The agent keeps deciding to repeat itself and can no longer tell why nothing changes.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'a2.agents.when_to_ask',
    mode: 'drill',
    nodeIds: ['ai.agents', 'cust.expectations'],
    difficulty: 'core',
    explanation:
      'The threshold for asking should track reversibility, not confidence in the abstract. One clarifying question costs five seconds; a wrongly issued credit costs a reconciliation, an apology and a rule that the agent may no longer touch credits at all.',
    diagramId: 'agent-loop',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agent has a likely reading of the customer’s intent but is not sure, and the next action issues a credit. What should it do?',
      choices: [
        { id: 'a', text: 'Ask, because a clarifying question costs seconds and a wrong irreversible action costs far more' },
        { id: 'b', text: 'Proceed with the most likely interpretation', whyWrong: 'Optimizes for turn count on exactly the class of action where being wrong is expensive.' },
        { id: 'c', text: 'Proceed and note the uncertainty in the response', whyWrong: 'The credit is already issued. A caveat after an irreversible action is a disclaimer, not a control.' },
        { id: 'd', text: 'Escalate to a human review queue', whyWrong: 'A queue for something the user could answer in five seconds is slower and worse for everyone.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.agents.handoff_payload',
    mode: 'drill',
    nodeIds: ['ai.agents', 'gcp.a2a'],
    difficulty: 'deep',
    explanation:
      'Delegation has to carry the established facts, not just the task label. When a specialist re-asks for information the user already gave, nothing was forgotten: nothing was ever passed, and the user experiences your architecture as incompetence.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A router agent hands a task to a specialist, which then asks the user for information they already provided. What went wrong?',
      choices: [
        { id: 'a', text: 'The hand-off passed the task label but not the facts already established. Delegation must carry the context the receiver needs' },
        { id: 'b', text: 'The specialist needs a longer memory', whyWrong: 'Nothing was forgotten because nothing was passed. Memory is not the missing piece.' },
        { id: 'c', text: 'The router should have answered it itself', whyWrong: 'Removes the specialization rather than designing the hand-off.' },
        { id: 'd', text: 'The user should repeat themselves', whyWrong: 'Making your architecture the user’s problem is the outcome to avoid.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.agents.parallel_tools',
    mode: 'drill',
    nodeIds: ['ai.agents', 'ai.latency'],
    difficulty: 'deep',
    explanation:
      'Independent lookups should not run in series, and the catch is that parallelism changes the error model: one failure no longer stops the sequence, so partial results and their handling have to be defined rather than discovered in production.',
    diagramId: 'latency-budget',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Three independent lookups take 700ms each and the agent does them one at a time. What is the change, and what is the catch?',
      choices: [
        { id: 'a', text: 'Issue them in parallel, and define error handling and partial results, since one failure no longer halts the sequence' },
        { id: 'b', text: 'Combine them into a single tool', whyWrong: 'Sometimes right, and it hides three failure modes behind one call and one error message.' },
        { id: 'c', text: 'Cache the results', whyWrong: 'Helps repeat requests. The first request from any user still waits 2.1 seconds.' },
        { id: 'd', text: 'Use a faster model', whyWrong: 'The time is being spent in the tools, not in the model.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.agents.plan_vs_react',
    mode: 'drill',
    nodeIds: ['ai.agents'],
    difficulty: 'deep',
    explanation:
      'Planning first is worth its extra call when the steps are largely knowable and someone wants to see the plan before anything executes. When each step depends on what the last one returned, the plan is obsolete by step two and you have paid for it anyway.',
    diagramId: 'agent-loop',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'When is plan-then-execute a better shape than deciding one step at a time?',
      choices: [
        { id: 'a', text: 'When the steps are largely knowable up front and you want the plan reviewable before anything runs' },
        { id: 'b', text: 'Whenever the task has more than three steps', whyWrong: 'Step count is not the discriminator. A five-step task whose next step depends on the last result wants the reactive shape.' },
        { id: 'c', text: 'Whenever latency matters', whyWrong: 'Planning adds a model call before any work starts, so it spends latency rather than saving it.' },
        { id: 'd', text: 'Whenever the model is small', whyWrong: 'Smaller models are usually worse at producing a good plan, not better.' },
      ],
      correctId: 'a',
    },
  },

  // ── Model Context Protocol ───────────────────────────────────────────────
  {
    id: 'a2.mcp.description_drift',
    mode: 'drill',
    nodeIds: ['ai.mcp', 'ai.guardrails'],
    difficulty: 'edge',
    explanation:
      'A tool description is prompt text the model follows. When a third-party server updates it, someone outside your organization has edited an instruction your agent obeys, with no code change on your side. Pinning versions and reviewing description diffs is the control.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An approved MCP server ships an update that changes a tool’s description. Why does that deserve review?',
      choices: [
        { id: 'a', text: 'The description is prompt text the model follows, so a third party has effectively edited your agent’s instructions' },
        { id: 'b', text: 'Descriptions are cosmetic, so it does not', whyWrong: 'This assumption is exactly what makes the change dangerous. The description drives every selection decision.' },
        { id: 'c', text: 'Because the argument schema may have changed too', whyWrong: 'Worth checking and a different risk. Schema changes fail loudly; a description change fails silently.' },
        { id: 'd', text: 'Because it invalidates prompt caching', whyWrong: 'True and trivial next to a third party editing text your model obeys.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.mcp.primitives_match',
    mode: 'drill',
    nodeIds: ['ai.mcp'],
    difficulty: 'intro',
    explanation:
      'MCP has a small vocabulary and customers conflate its parts constantly. Being able to place each primitive in one sentence is what lets you scope an integration conversation instead of nodding along to a vague one.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each MCP primitive to what it is.',
      pairs: [
        { left: 'Context the client can read and supply to the model', right: 'Resource' },
        { left: 'An action the model can invoke', right: 'Tool' },
        { left: 'A reusable instruction template the server offers', right: 'Prompt' },
        { left: 'The process that exposes all of the above', right: 'Server' },
      ],
    },
  },
  {
    id: 'a2.mcp.catalog',
    mode: 'drill',
    nodeIds: ['ai.mcp', 'sec.audit'],
    difficulty: 'deep',
    explanation:
      'The blast radius of an agent is the union of its tools’ permissions, so "which servers are wired in and what can they reach" is a question a platform team must be able to answer at any moment. A catalog plus a build-time check makes the answer structural rather than archaeological.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'What should an approved-server catalog record for each MCP server? Select all that apply.',
      choices: [
        { id: 'a', text: 'The owner and the systems it can reach' },
        { id: 'b', text: 'The credentials it holds and their scope' },
        { id: 'c', text: 'The version in use and where it is deployed' },
        { id: 'd', text: 'The model that calls it', whyWrong: 'Changes independently of the server and tells you nothing about its reach.' },
        { id: 'e', text: 'The server’s full source code', whyWrong: 'A repository link is governance. Pasting source into a catalog is not, and it goes stale immediately.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Memory architecture ──────────────────────────────────────────────────
  {
    id: 'a2.memory.supersede',
    mode: 'drill',
    nodeIds: ['ai.memory'],
    difficulty: 'core',
    explanation:
      'People change teams, addresses and preferences constantly, so a memory store without an update path is wrong from the first change onward. Superseding the old fact while keeping when and from what it changed gives you both correctness and an audit trail.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A stored memory says the user’s team is Payments. This week they say they moved to Risk. What should the memory layer do?',
      choices: [
        { id: 'a', text: 'Supersede the old fact, recording when and from what it changed, and let the newer statement win' },
        { id: 'b', text: 'Store both and let retrieval decide', whyWrong: 'Retrieval has no basis to choose, so the agent receives two contradictory facts and picks one arbitrarily.' },
        { id: 'c', text: 'Keep the original, since it was confirmed earlier', whyWrong: 'Guarantees the agent is wrong from the day anything changes, which for people is constantly.' },
        { id: 'd', text: 'Ask the user to confirm on every conversation', whyWrong: 'Turns memory into an interrogation and defeats the reason it exists.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.memory.disclosure_scope',
    mode: 'drill',
    nodeIds: ['ai.memory', 'sec.tenancy'],
    difficulty: 'deep',
    explanation:
      'A memory learned from one person and served to another is a disclosure, however accurate it is. The design question is the scope the fact was written at and whether the second person is entitled to the fact itself, not merely to the agent.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agent remembers that a deal is at risk, learned from the account lead. Another employee asks about that account. What is the design question?',
      choices: [
        { id: 'a', text: 'What scope the memory was written at, and whether this person is entitled to the fact rather than just to the agent' },
        { id: 'b', text: 'Whether the fact is still accurate', whyWrong: 'A separate concern. An accurate fact disclosed to the wrong person is still a disclosure.' },
        { id: 'c', text: 'Whether the agent should have remembered it at all', whyWrong: 'Reasonable, and it does not answer the case where remembering is legitimate for the right audience.' },
        { id: 'd', text: 'Whether the second employee is authenticated', whyWrong: 'They are. Authentication is not entitlement to a specific fact.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.memory.selective_load',
    mode: 'drill',
    nodeIds: ['ai.memory', 'ai.context'],
    difficulty: 'intro',
    explanation:
      'A memory store is retrieved from, not dumped. Loading everything pays for it on every turn and buries the two facts that matter among the ones that do not, which is the same failure as an oversized top-k.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A user has 300 stored facts. What goes into the prompt at the start of a conversation?',
      choices: [
        { id: 'a', text: 'The few likely to matter for this conversation, selected by relevance, plus a small always-on set such as role and language' },
        { id: 'b', text: 'All 300', whyWrong: 'Paid for on every turn, and it buries the two that matter among 298 that do not.' },
        { id: 'c', text: 'The 20 most recent', whyWrong: 'Recency is a weak proxy for relevance and it drops stable facts like role or entitlement.' },
        { id: 'd', text: 'None, until the model asks', whyWrong: 'The model cannot ask for a fact it does not know exists, and the round trip costs a turn.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.memory.vs_index',
    mode: 'drill',
    nodeIds: ['ai.memory', 'ai.rag_failure'],
    difficulty: 'intro',
    explanation:
      'Memory and the retrieval index have different owners, different lifecycles and very different privacy profiles. Memory is learned about a person in conversation; the index is shared source material that exists whether or not anyone ever asks.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What is the difference between an agent’s memory and its retrieval index?',
      choices: [
        { id: 'a', text: 'Memory holds facts about this user or account learned in conversation; the index holds shared source material that exists independently of any conversation' },
        { id: 'b', text: 'Memory is short-term and the index is long-term', whyWrong: 'Memory is specifically the long-lived part. The short-lived part is the session.' },
        { id: 'c', text: 'Memory lives in the model and the index in a database', whyWrong: 'Nothing lives in the model between calls.' },
        { id: 'd', text: 'They are the same thing under two names', whyWrong: 'Different owners, different lifecycles, and a very different answer when a privacy officer asks about deletion.' },
      ],
      correctId: 'a',
    },
  },

  // ── Evals and golden sets ────────────────────────────────────────────────
  {
    id: 'a2.evals.week_one',
    mode: 'drill',
    nodeIds: ['ai.evals', 'del.poc_exit'],
    difficulty: 'core',
    explanation:
      'Without a target, prompt work is opinion exchange and nobody can say whether week six was progress. The questions come from the people who answer them today, and the threshold is agreed before anyone has an interest in where it lands.',
    diagramId: 'thin-slice',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'A customer wants an assistant over their knowledge base in eight weeks. Order the first week.',
      steps: [
        'Collect real questions from their existing support tickets and search logs',
        'Agree the correct answers with the people who answer those questions today',
        'Write down the metric and the threshold that means it is worth shipping',
        'Build the thinnest end-to-end pipeline that can be measured against it',
      ],
    },
  },
  {
    id: 'a2.evals.stage_signals',
    mode: 'drill',
    nodeIds: ['ai.evals', 'ai.rerank'],
    difficulty: 'core',
    explanation:
      'An end-to-end score is the thing being explained, not the explanation. Measuring whether the correct passage was a candidate, where it ranked after reranking, and whether it reached the prompt localizes the loss to a stage and ends the prompt argument.',
    diagramId: 'rag-pipeline',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Answer quality is 71% and the team is arguing about prompts. Which measurements localize the problem to a stage? Select all that apply.',
      choices: [
        { id: 'a', text: 'Whether the correct passage was in the candidate set at all' },
        { id: 'b', text: 'Where the correct passage ranked after reranking' },
        { id: 'c', text: 'Whether the correct passage actually reached the final prompt' },
        { id: 'd', text: 'The end-to-end answer score', whyWrong: 'The number you already have. It is what needs explaining, not what explains it.' },
        { id: 'e', text: 'The model’s self-reported confidence', whyWrong: 'Not calibrated, and it says nothing about what retrieval did or did not return.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'a2.evals.sample_size',
    mode: 'drill',
    nodeIds: ['ai.evals', 'ai.nondeterminism'],
    difficulty: 'edge',
    explanation:
      'Two cases out of 25 is inside the run-to-run noise of a stochastic system. Reporting it as an eight-point improvement creates a number you will have to defend in a month when it does not hold, and the honest move is to widen the set or run repeats before claiming anything.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A 25-case eval moves from 20 correct to 22 after a prompt change. What can you conclude?',
      choices: [
        { id: 'a', text: 'Very little: two cases on 25 sits inside run-to-run noise, and the set is too small to detect a change this size' },
        { id: 'b', text: 'An eight-point improvement', whyWrong: 'Treats two samples as a measurement, and you will be defending that number when it does not reproduce.' },
        { id: 'c', text: 'That the change is safe to ship', whyWrong: 'Safety is about regressions, and 25 cases cannot cover the surface where they occur.' },
        { id: 'd', text: 'That the eval set is well designed', whyWrong: 'Nothing in the result speaks to how the set was built.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.evals.ci_tiers',
    mode: 'drill',
    nodeIds: ['ai.evals', 'prod.cicd'],
    difficulty: 'deep',
    explanation:
      'A gate that is too slow to run gets skipped exactly when it matters, under deadline on the change most likely to break something. Tiering it, fast subset per change, full set before merge, expensive judged set nightly, keeps feedback close to the author without pretending the cost is zero.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'The full eval takes 40 minutes and costs real money, so running it on every commit is not viable. What do you do?',
      choices: [
        { id: 'a', text: 'Tier it: a fast subset on every change, the full set before merge, the expensive judged set nightly' },
        { id: 'b', text: 'Run the full set nightly only', whyWrong: 'Regressions surface up to a day after the change that caused them, when the author has moved on.' },
        { id: 'c', text: 'Run it manually when someone thinks it matters', whyWrong: 'Which is exactly when it will not be run: under deadline, on the riskiest change.' },
        { id: 'd', text: 'Shrink the set until it fits', whyWrong: 'Buys speed by destroying the coverage that made the gate meaningful.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.evals.define_correct',
    mode: 'drill',
    nodeIds: ['ai.evals'],
    difficulty: 'intro',
    explanation:
      'Correctness for generated text has to be written down per case: which facts must appear, which must not, and where wording may vary. Exact match measures phrasing, and a remembered impression is not reproducible between two people or between two weeks.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What does "correct" mean for a generated answer in an eval set?',
      choices: [
        { id: 'a', text: 'A written criterion per case: which facts must appear, which must not, and what an acceptable answer may vary on' },
        { id: 'b', text: 'Exact string match against a reference answer', whyWrong: 'Two correct answers rarely share wording, so this measures phrasing rather than correctness.' },
        { id: 'c', text: 'A reviewer’s overall impression recorded as a score', whyWrong: 'Not reproducible between people or between weeks, which makes it unusable as a gate.' },
        { id: 'd', text: 'Whatever the model itself judges as good', whyWrong: 'Circular, and it inherits every bias the generator already has.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.evals.acceptance_clause',
    mode: 'drill',
    nodeIds: ['ai.evals', 'del.poc_exit'],
    difficulty: 'core',
    explanation:
      'Every vague acceptance phrase becomes an argument in week eleven. A named eval set, a metric, a threshold and a named adjudicator turn "does it work" into something both sides can check, which is worth more to the customer than to you.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer asks what "working" means for the pilot they are paying for. What goes in the document?',
      choices: [
        { id: 'a', text: 'A named eval set, the metric, the threshold, and who adjudicates disputed cases' },
        { id: 'b', text: '"Positive feedback from pilot users"', whyWrong: 'Unfalsifiable and hostage to whoever happens to be in the room. There is no version of this you can pass or fail.' },
        { id: 'c', text: '"Accuracy above 90%"', whyWrong: 'On what set, measured by whom, judged how. Every one of those becomes an argument later.' },
        { id: 'd', text: '"No hallucinations"', whyWrong: 'A promise no system can keep, written into a document you will be held to.' },
      ],
      correctId: 'a',
    },
  },

  // ── LLM-as-judge ─────────────────────────────────────────────────────────
  {
    id: 'a2.judge.reference_split',
    mode: 'drill',
    nodeIds: ['ai.llm_judge'],
    difficulty: 'core',
    explanation:
      'Grading against a gold answer is a much stronger signal than grading against a rubric alone, so use it wherever you have one. Generating the missing references with a model would turn a guess into ground truth, which is how an eval quietly starts measuring nothing.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You have gold answers for half the eval set and none for the other half. How should the judge be used?',
      choices: [
        { id: 'a', text: 'Grade against the reference where one exists, use explicit criteria where none does, and report the two halves separately' },
        { id: 'b', text: 'Generate references for the other half with a model', whyWrong: 'You would then be grading the system against a model’s guess while calling it ground truth.' },
        { id: 'c', text: 'Use reference-free judging everywhere for consistency', whyWrong: 'Throws away the strongest signal you have on half the set to make one number look tidy.' },
        { id: 'd', text: 'Drop the cases without references', whyWrong: 'Those are usually the open-ended cases where quality actually varies.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.judge.instrument_version',
    mode: 'drill',
    nodeIds: ['ai.llm_judge', 'ai.nondeterminism'],
    difficulty: 'edge',
    explanation:
      'A judge is a measuring instrument, and changing it changes the scale. Scores from two judge versions are not comparable, the shift is not uniform across case types, and a gate expressed as an absolute threshold silently becomes stricter or looser overnight.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your judge model is upgraded and every historical score shifts by a few points. What do you do?',
      choices: [
        { id: 'a', text: 'Treat the judge as a versioned instrument: pin it, re-baseline deliberately, and never compare scores across judge versions' },
        { id: 'b', text: 'Adjust the old scores by the average shift', whyWrong: 'The shift is not uniform across case types, so a single offset misstates exactly the cases you care about.' },
        { id: 'c', text: 'Always use the latest judge for freshness', whyWrong: 'Your metric then moves underneath you, and a quality trend becomes uninterpretable.' },
        { id: 'd', text: 'Ignore it, since the ranking is preserved', whyWrong: 'Rankings shift too, and the gate is a threshold on an absolute number.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.judge.checkable_criteria',
    mode: 'drill',
    nodeIds: ['ai.llm_judge'],
    difficulty: 'deep',
    explanation:
      'A 1 to 5 scale asks for a holistic judgment that humans themselves do not make consistently, so disagreement is guaranteed. Several yes-or-no checks about verifiable properties, combined afterward, produce a number that means the same thing to the judge and the labeler.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your judge outputs a 1 to 5 score and human labelers disagree with it constantly. What is the most effective redesign?',
      choices: [
        { id: 'a', text: 'Replace the scale with several yes-or-no checks about verifiable properties, and combine them into a score' },
        { id: 'b', text: 'Move to a 1 to 10 scale for finer resolution', whyWrong: 'More resolution on an undefined judgment produces more precise disagreement.' },
        { id: 'c', text: 'Give the judge an example of each score level', whyWrong: 'Anchoring helps somewhat, and it still asks for a holistic judgment humans do not make consistently.' },
        { id: 'd', text: 'Average three judge calls', whyWrong: 'Reduces variance around a number that does not mean the same thing to the judge and the labeler.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.judge.calibration',
    mode: 'drill',
    nodeIds: ['ai.llm_judge', 'ai.evals'],
    difficulty: 'deep',
    explanation:
      'The only evidence that a judge is trustworthy is agreement with human labels on a held-out sample, re-measured whenever the judge, the rubric or the task changes. A fluent explanation attached to a wrong score is the failure mode, not the reassurance.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What tells you whether your judge can be trusted?',
      choices: [
        { id: 'a', text: 'Measured agreement with human labels on a held-out calibration sample, re-measured whenever the judge or rubric changes' },
        { id: 'b', text: 'That the judge explains its reasoning', whyWrong: 'A fluent explanation for a wrong score is precisely the failure mode. Explanations persuade without validating.' },
        { id: 'c', text: 'That its scores are stable across runs', whyWrong: 'Consistency is necessary and says nothing about being right.' },
        { id: 'd', text: 'That its scores correlate with user satisfaction', whyWrong: 'A good outcome measure that moves slowly and is confounded by everything else in the product.' },
      ],
      correctId: 'a',
    },
  },

  // ── Tracing and observability ────────────────────────────────────────────
  {
    id: 'a2.obs.quality_signals',
    mode: 'drill',
    nodeIds: ['ai.observability', 'prod.oncall'],
    difficulty: 'deep',
    explanation:
      'Infrastructure dashboards are green during every quality incident, because nothing is failing. The signals that move are behavioral: how often the system abstains, how often retrieval comes back thin, how often tools error and get retried.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Latency and error dashboards are green while answer quality degrades. Which production signals would catch it? Select all that apply.',
      choices: [
        { id: 'a', text: 'The rate of "I could not find an answer" responses' },
        { id: 'b', text: 'How often retrieval returns nothing or only low-scoring passages' },
        { id: 'c', text: 'Tool call error and retry rates' },
        { id: 'd', text: 'Average response length', whyWrong: 'Moves for many reasons unrelated to quality, and it is easy to over-read in either direction.' },
        { id: 'e', text: 'CPU utilization on the serving layer', whyWrong: 'A capacity signal. It is green during every quality incident, which is the problem being described.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'a2.obs.correlation_id',
    mode: 'drill',
    nodeIds: ['ai.observability', 'ai.agents'],
    difficulty: 'core',
    explanation:
      'One request that crosses a router, a specialist and three tool calls in two services is only reconstructable if a single id travels with it. Matching by timestamp fails under concurrency, and matching by user id gives you their other five conversations too.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A complaint spans a router agent, a specialist agent and three tool calls across two services. What makes it debuggable?',
      choices: [
        { id: 'a', text: 'One correlation id created at the entry point and propagated through every hop, including the delegated agent' },
        { id: 'b', text: 'Timestamps, matched up by hand', whyWrong: 'Under concurrency, interleaved requests make timestamp matching guesswork.' },
        { id: 'c', text: 'Logging the user id everywhere', whyWrong: 'Narrows to a person, not to a request. Their other conversations land in the same bucket.' },
        { id: 'd', text: 'Storing the final answer with its immediate inputs', whyWrong: 'The inputs to the last step are not the path that produced them.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.obs.field_match',
    mode: 'drill',
    nodeIds: ['ai.observability', 'ai.cost'],
    difficulty: 'core',
    explanation:
      'Each recurring question about a live AI system has one trace field that answers it. Knowing the mapping is what turns "we will look into it" into an answer inside the same call, and it is also the checklist for what a trace must capture.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each debugging question to the trace field that answers it.',
      pairs: [
        { left: 'Why did it pick that tool?', right: 'The tool descriptions and the prompt at that step' },
        { left: 'Why was the answer ungrounded?', right: 'The retrieved passages and their scores' },
        { left: 'Why did the bill spike for one team?', right: 'Per-request token counts tagged by tenant' },
        { left: 'Why did answers change this week?', right: 'The pinned model and prompt versions' },
      ],
    },
  },

  // ── Guardrails and prompt injection ──────────────────────────────────────
  {
    id: 'a2.guard.retrieval_first',
    mode: 'drill',
    nodeIds: ['ai.guardrails', 'idp.rbac_abac'],
    difficulty: 'core',
    explanation:
      'If a passage should never have been retrievable for this user, the exposure happened inside your system before any screening ran. Output redaction is a worthwhile second layer and a poor first one, because it is guessing at content rather than enforcing an entitlement.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An internal assistant retrieves salary data for HR. A non-HR user asks a leading question and the answer includes a salary band. Where should this have been stopped?',
      choices: [
        { id: 'a', text: 'At retrieval, by filtering to what this user may see, with output screening as a second layer rather than the only one' },
        { id: 'b', text: 'At the output, by detecting and redacting salary figures', whyWrong: 'A useful backstop that guesses at content. The passage should never have reached the prompt in the first place.' },
        { id: 'c', text: 'In the system prompt, by forbidding salary disclosure', whyWrong: 'Instructions do not bound what the model was handed.' },
        { id: 'd', text: 'At the model, by choosing one that refuses sensitive topics', whyWrong: 'Salary questions are legitimate for HR. Refusing a topic is not the same as respecting an entitlement.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.guard.attack_match',
    mode: 'drill',
    nodeIds: ['ai.guardrails', 'gcp.model_armor'],
    difficulty: 'intro',
    explanation:
      'These four terms get used interchangeably in customer conversations and mean different things. Direct and indirect attacks arrive by different routes, and a filter and an authorization boundary are different kinds of defense with different guarantees.',
    diagramId: 'agent-loop',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each attack or control to what it describes.',
      pairs: [
        { left: 'The user argues the model out of its own rules', right: 'Direct jailbreak' },
        { left: 'A retrieved document carries instructions aimed at the model', right: 'Indirect prompt injection' },
        { left: 'Content screened before and after the model, outside the prompt', right: 'Runtime guardrail' },
        { left: 'The agent cannot perform the action even once convinced', right: 'Authorization boundary' },
      ],
    },
  },
  {
    id: 'a2.guard.url_exfil',
    mode: 'drill',
    nodeIds: ['ai.guardrails', 'ai.tool_calling'],
    difficulty: 'edge',
    explanation:
      'An outbound request is a write to somebody else’s log. When an agent can fetch a URL that appeared in retrieved content, reading is the exfiltration channel: the data leaves in the request, and scanning the response is looking at the wrong half of the transaction.',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agent can fetch a URL to read a page. A retrieved document contains a link with the customer id in the query string. What is the risk and the control?',
      choices: [
        { id: 'a', text: 'Fetching it sends data to whoever controls that host. Restrict the fetch tool to an allowlist and strip parameters the agent did not construct' },
        { id: 'b', text: 'The risk is malware in the response, so scan it', whyWrong: 'Scanning the response looks at the wrong half. The damage was done by the request that carried the data out.' },
        { id: 'c', text: 'The risk is latency, so add a timeout', whyWrong: 'An availability control applied to a data exfiltration problem.' },
        { id: 'd', text: 'There is no risk, the agent only reads', whyWrong: 'Reading is how this exfiltration works. The outbound request is the leak.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.guard.defense_layers',
    mode: 'drill',
    nodeIds: ['ai.guardrails', 'gcp.model_armor'],
    difficulty: 'deep',
    explanation:
      'No single layer stops injection, and each one has a different job: reduce what arrives, deny it authority, check the consequential action, and bound the damage if all of that fails. Teams that pick one layer and call it done have chosen which incident they will have.',
    diagramId: 'agent-loop',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the layers that stop an injected instruction from becoming a harmful action, as a request flows through.',
      steps: [
        'Screen content before it enters the context',
        'Keep retrieved text delimited as data, never as instructions',
        'Check the proposed tool call against policy before it executes',
        'Bound the damage with scoped credentials the agent cannot exceed',
        'Screen the response before it reaches the user',
      ],
    },
  },

  // ── Latency and streaming ────────────────────────────────────────────────
  {
    id: 'a2.latency.tail_shape',
    mode: 'drill',
    nodeIds: ['ai.latency', 'scale.timeouts'],
    difficulty: 'deep',
    explanation:
      'A fast median and a terrible tail is the signature of retry and fallback paths, not of a slow model. A timeout plus a retry plus a slower fallback stacks into fourteen seconds for the unlucky percent, and none of it shows up in the average.',
    diagramId: 'latency-budget',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'p50 is 1.2 seconds and p99 is 14 seconds. Where do you look first?',
      choices: [
        { id: 'a', text: 'The retry and fallback paths: a timeout plus a retry plus a slower fallback is how a fast median gets a terrible tail' },
        { id: 'b', text: 'The model’s average speed', whyWrong: 'The median already tells you the model is fast. The tail is being made somewhere else.' },
        { id: 'c', text: 'Network latency to the model endpoint', whyWrong: 'That would raise the median too, not only the last percentile.' },
        { id: 'd', text: 'The size of the context', whyWrong: 'Affects the whole distribution, unless a small subset of requests carries far more context, which is worth checking second.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.latency.overlap_stages',
    mode: 'drill',
    nodeIds: ['ai.latency'],
    difficulty: 'core',
    explanation:
      'Sequential stages that do not actually depend on each other are free latency. Starting retrieval on the raw query while classification runs, then using the classification to filter rather than to gate, buys time without touching quality anywhere.',
    diagramId: 'latency-budget',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'The chain runs: classify intent, retrieve, rerank, generate. What is the easy latency win?',
      choices: [
        { id: 'a', text: 'Start retrieval on the raw query in parallel with classification, and use the classification to filter results rather than to gate the start' },
        { id: 'b', text: 'Remove the reranker', whyWrong: 'Trades the largest quality lever for a few hundred milliseconds. Take the free win first.' },
        { id: 'c', text: 'Run everything on a faster model', whyWrong: 'Changes quality across the board to fix a sequencing problem.' },
        { id: 'd', text: 'Cache the classification', whyWrong: 'Helps only repeated queries, and classification is the cheapest step in the chain anyway.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.latency.tool_gap',
    mode: 'drill',
    nodeIds: ['ai.latency', 'ai.agents'],
    difficulty: 'edge',
    explanation:
      'Streaming that stops for six seconds mid-answer reads as a freeze, because the user has been given a signal and then had it taken away. Emitting structured progress when a tool starts and returns fills the gap with information rather than with nothing.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'The agent streams, goes silent for six seconds while a tool runs, then streams again. Users call it a freeze. What do you do?',
      choices: [
        { id: 'a', text: 'Emit a progress event when the tool starts and when it returns, so the gap carries information instead of silence' },
        { id: 'b', text: 'Prefetch the tool result before the model asks for it', whyWrong: 'Only possible when you know which tool will be called, which is the case where you did not need an agent.' },
        { id: 'c', text: 'Buffer the whole response and send it at the end', whyWrong: 'Removes the streaming that was working, to hide a gap in the middle.' },
        { id: 'd', text: 'Show a spinner for the entire response', whyWrong: 'Replaces visible progress with a generic wait, which is worse everywhere except during the gap.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.latency.decode_dominates',
    mode: 'drill',
    nodeIds: ['ai.latency', 'ai.cost'],
    difficulty: 'core',
    explanation:
      'Output tokens are produced one at a time, so total generation time tracks how much you asked the model to write. Prompt size mostly moves time to first token. Trimming a verbose response format is often the cheapest latency work available.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Answers take four seconds to finish generating. What has the largest effect on that number?',
      choices: [
        { id: 'a', text: 'How many tokens the model has to produce, which is set by the output format you asked for' },
        { id: 'b', text: 'How many tokens the prompt contains', whyWrong: 'Prompt size mostly moves time to first token. It is not where four seconds of decoding goes.' },
        { id: 'c', text: 'The number of retrieved passages', whyWrong: 'Input again, spending retrieval time and prefill rather than decode time.' },
        { id: 'd', text: 'The temperature', whyWrong: 'Sampling parameters do not change how fast tokens are produced.' },
      ],
      correctId: 'a',
    },
  },

  // ── Token economics ──────────────────────────────────────────────────────
  {
    id: 'a2.cost.chatty_output',
    mode: 'drill',
    nodeIds: ['ai.cost', 'ai.structured_output'],
    difficulty: 'core',
    explanation:
      'Output tokens are the expensive ones and they are produced serially, so a format that restates its inputs costs money and latency on every single call. Trimming the envelope is one of the few changes that improves both without touching quality.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A summarization step returns a verbose JSON envelope that restates its inputs. Why does that matter more than it looks?',
      choices: [
        { id: 'a', text: 'Output tokens are the expensive ones and are generated serially, so a chatty format costs money and latency on every call' },
        { id: 'b', text: 'Large responses are harder to parse', whyWrong: 'Parsing is not the constraint; a schema handles it. Generation cost is.' },
        { id: 'c', text: 'It risks exceeding the context window', whyWrong: 'Rarely, and the cost shows up long before any limit does.' },
        { id: 'd', text: 'It reduces answer quality', whyWrong: 'Not inherently. The problem is paying for text nobody reads.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.cost.steps_multiply',
    mode: 'drill',
    nodeIds: ['ai.cost', 'ai.agents'],
    difficulty: 'core',
    explanation:
      'Every agent step re-sends the accumulated context, so token volume grows faster than step count. Two designs that answer equally well at three steps and nine are not close on cost or latency, and the nine-step version needs a reason beyond preference.',
    diagramId: 'agent-loop',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Two agent designs answer the same question equally well. One averages 3 model calls, the other 9. What follows?',
      choices: [
        { id: 'a', text: 'The nine-step design costs and delays substantially more, because each step re-sends the accumulated context, so it needs a reason beyond preference' },
        { id: 'b', text: 'They cost about the same, since total tokens are similar', whyWrong: 'Each step resends what came before, so volume grows faster than step count rather than staying flat.' },
        { id: 'c', text: 'The nine-step design is more robust', whyWrong: 'More steps is more places to go wrong. Robustness comes from bounds and recovery, not from step count.' },
        { id: 'd', text: 'Cost is dominated by output tokens either way', whyWrong: 'In agent loops the resent input usually dominates, which is exactly why step count matters so much.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.cost.batch_window',
    mode: 'drill',
    nodeIds: ['ai.cost', 'ai.latency'],
    difficulty: 'core',
    explanation:
      'Work with nobody waiting should not be paying interactive rates or fighting per-request limits. Recognizing that a job is a throughput problem rather than a latency problem is usually a larger saving than any prompt tuning applied to the same job.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A nightly job classifies 2 million documents with no user waiting. What is the obvious lever?',
      choices: [
        { id: 'a', text: 'Run it as an offline batch workload rather than as interactive requests, and size the model to the task' },
        { id: 'b', text: 'Parallelize the interactive calls harder', whyWrong: 'Pays interactive pricing and fights rate limits for work that has all night.' },
        { id: 'c', text: 'Cache the results', whyWrong: 'Two million distinct documents do not repeat.' },
        { id: 'd', text: 'Cut a few hundred tokens from the prompt', whyWrong: 'Worth doing, and it is a percentage on the wrong axis.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.cost.measure_first',
    mode: 'drill',
    nodeIds: ['ai.cost', 'ai.observability'],
    difficulty: 'deep',
    explanation:
      'Intuition about where AI spend goes is wrong about half the time, and the standard first move, switching to a cheaper model, is a quality change made before anyone knows whether the model was the line item. Break the spend down by step and by request type first.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer wants the AI bill cut by 30%. What is the first thing you do?',
      choices: [
        { id: 'a', text: 'Break the spend down by step and by request type, because the intuition about where the money goes is wrong about half the time' },
        { id: 'b', text: 'Switch to a cheaper model', whyWrong: 'The standard reflex, and it is a quality change made before anyone knows whether the model is where the money is.' },
        { id: 'c', text: 'Shorten the system prompt', whyWrong: 'It might be the answer, and it carries the highest chance of a quality regression per dollar saved.' },
        { id: 'd', text: 'Cap usage per user', whyWrong: 'Cuts the bill by cutting the product, which was not what was asked for.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.cost.tier_match',
    mode: 'drill',
    nodeIds: ['ai.cost', 'gcp.model_garden'],
    difficulty: 'core',
    explanation:
      'Model tiering only works once you have decided what each step actually demands. The row worth remembering is the last one: some steps in an AI pipeline should not involve a model at all, and paying for one there is pure waste.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each step to what should serve it.',
      pairs: [
        { left: 'Classifying an incoming ticket into one of twelve queues', right: 'A small fast model' },
        { left: 'Choosing which tool to call next in a loop', right: 'A mid-tier model with strong instruction following' },
        { left: 'Resolving a conflict between two retrieved policies', right: 'The most capable model available' },
        { left: 'Rendering a validated answer into the response template', right: 'No model at all, a template' },
      ],
    },
  },

  // ── Fine-tune vs RAG vs prompt ───────────────────────────────────────────
  {
    id: 'a2.finetune.knows_our_products',
    mode: 'drill',
    nodeIds: ['ai.finetune', 'ai.rag_failure'],
    difficulty: 'core',
    explanation:
      '"Make it know our products" is a knowledge request, and knowledge that changes belongs in retrieval where an update is an ingestion job rather than a training run. Tuning is for behavior you can only demonstrate, and it also gives you nothing to cite.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer wants a tuned model so it "knows our products". What do you propose, and why?',
      choices: [
        { id: 'a', text: 'Retrieval for the product facts, and tuning only if a response style or narrow judgment cannot be reached by prompting. Facts change, weights do not' },
        { id: 'b', text: 'Tune on the product catalog', whyWrong: 'Bakes in a catalog that is stale at the next price change, and leaves you with nothing to cite.' },
        { id: 'c', text: 'Tune and skip retrieval to keep the architecture simple', whyWrong: 'Simple until the first product update, which becomes a re-tune instead of an ingestion run.' },
        { id: 'd', text: 'Neither: put the whole catalog in the prompt', whyWrong: 'Works for a tiny catalog and pays for all of it on every call as it grows.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.finetune.side_effects',
    mode: 'drill',
    nodeIds: ['ai.finetune', 'ai.evals'],
    difficulty: 'edge',
    explanation:
      'Tuning shifts behavior beyond the task you tuned on, and if nothing measures the other tasks you will not find out until a user does. The eval set has to cover what you were not trying to change, which is the coverage teams routinely skip.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'After tuning on 5,000 classification examples the model classifies well, and its other outputs got worse. What should the eval have included?',
      choices: [
        { id: 'a', text: 'The tasks you were not tuning for. Narrow tuning shifts general behavior, and nothing was measuring that' },
        { id: 'b', text: 'A larger training set', whyWrong: 'Volume can help, and the diagnosis here is the missing regression coverage, not the sample count.' },
        { id: 'c', text: 'A lower learning rate', whyWrong: 'A hyperparameter guess with no evidence behind it, and low rates undertrain rather than distort.' },
        { id: 'd', text: 'A check that the base model did not change', whyWrong: 'Worth ruling out and it does not change that nothing was measuring the other tasks.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.finetune.first_move',
    mode: 'drill',
    nodeIds: ['ai.finetune', 'ai.prompt_design'],
    difficulty: 'intro',
    explanation:
      'The order is prompt, then retrieval, then a bigger model, then tuning, because that is increasing order of cost and decreasing order of reversibility. Reaching for tuning first is the most expensive way to discover that the prompt was vague.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A model gets a task wrong. What do you try first?',
      choices: [
        { id: 'a', text: 'A clearer prompt with an explicit output contract and a couple of examples, measured against the eval set' },
        { id: 'b', text: 'Fine-tuning', whyWrong: 'The most expensive and least reversible option, reached for before anyone has shown prompting cannot do it.' },
        { id: 'c', text: 'A larger model', whyWrong: 'Sometimes right, and it is a permanent cost increase applied without knowing whether capability was the limit.' },
        { id: 'd', text: 'More retrieved context', whyWrong: 'Helps when the failure is missing knowledge. Reach for it once you know that is the failure.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.finetune.good_candidates',
    mode: 'drill',
    nodeIds: ['ai.finetune', 'gcp.vertex_training'],
    difficulty: 'deep',
    explanation:
      'Tuning pays off where behavior is stable, demonstrable in quantity, and repeated enough that a smaller model saves real money. It fails where knowledge changes weekly or where the target is nuance nobody can demonstrate consistently in training data.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which tasks are genuinely good candidates for a tuned small model? Select all that apply.',
      choices: [
        { id: 'a', text: 'High-volume classification into a stable set of categories' },
        { id: 'b', text: 'A house output format that prompting keeps missing, with plenty of exemplars' },
        { id: 'c', text: 'A narrow extraction task with thousands of reviewed examples' },
        { id: 'd', text: 'Answering questions about documents that change weekly', whyWrong: 'Knowledge that changes belongs in retrieval. Tuning freezes it at training time.' },
        { id: 'e', text: 'Open-ended writing judged on nuance', whyWrong: 'The hardest thing to demonstrate consistently in training data, and where raw capability matters most.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Structured output ────────────────────────────────────────────────────
  {
    id: 'a2.structured.absent_is_a_value',
    mode: 'drill',
    nodeIds: ['ai.structured_output'],
    difficulty: 'core',
    explanation:
      'A required field the document does not contain is an instruction to invent one, and the model will comply plausibly. Making absence representable, and distinguishing "not present in the document" from "could not be read", is what keeps a fabricated value out of the database.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An extraction schema requires an invoice date, and some invoices genuinely do not carry one. What is the right schema design?',
      choices: [
        { id: 'a', text: 'Allow the field to be explicitly absent with a reason, so "not in the document" is representable and distinct from "could not be read"' },
        { id: 'b', text: 'Keep it required and let the model do its best', whyWrong: 'A required field the document lacks is an instruction to invent one, and it will comply convincingly.' },
        { id: 'c', text: 'Default it to the processing date', whyWrong: 'Fabricates a plausible value that no downstream system can distinguish from a real one.' },
        { id: 'd', text: 'Reject documents without the field', whyWrong: 'Rejects valid documents because the schema is wrong about the world.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.structured.enum_constraint',
    mode: 'drill',
    nodeIds: ['ai.structured_output'],
    difficulty: 'intro',
    explanation:
      'Asking the model to use only the listed values is a request; constraining the field to an enum is a guarantee. The difference shows up as an unexpected category reaching a downstream mapping that silently sends it somewhere wrong.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A classification step returns a free-text category and downstream code string-matches it. What is the change?',
      choices: [
        { id: 'a', text: 'Constrain the field to an enum of the exact allowed values, so an unexpected category is impossible rather than merely unlikely' },
        { id: 'b', text: 'Lowercase and trim the string before comparing', whyWrong: 'Handles the formatting variants you thought of, not the new category the model invents.' },
        { id: 'c', text: 'Map unknown strings to a default category', whyWrong: 'Silently misclassifies, and nobody finds out until a report is wrong in front of somebody senior.' },
        { id: 'd', text: 'Instruct the model to use only the listed values', whyWrong: 'A request rather than a constraint. It holds until it does not, silently.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.structured.streaming_partial',
    mode: 'drill',
    nodeIds: ['ai.structured_output', 'client.streaming_ui'],
    difficulty: 'core',
    explanation:
      'Rendering a form as it generates means parsing an object that is not yet valid. The rule that keeps it safe is that no field is treated as final until the response completes, so a partially generated value never gets acted on as though it were confirmed.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A form fills in as the model generates the structured response. What does that require from the parsing side?',
      choices: [
        { id: 'a', text: 'Incremental parsing that tolerates an incomplete object, plus a rule that no field is final until the response completes' },
        { id: 'b', text: 'Waiting for the full response before parsing', whyWrong: 'Correct and it gives up the progressive rendering the feature exists for.' },
        { id: 'c', text: 'Parsing each line as its own object', whyWrong: 'Assumes a line-delimited format the schema does not guarantee.' },
        { id: 'd', text: 'Asking the model to emit fields in a fixed order', whyWrong: 'Helpful, and it does not make a truncated object parseable.' },
      ],
      correctId: 'a',
    },
  },

  // ── Working with non-determinism ─────────────────────────────────────────
  {
    id: 'a2.nondeterminism.temp_zero_claim',
    mode: 'drill',
    nodeIds: ['ai.nondeterminism', 'cust.expectations'],
    difficulty: 'deep',
    explanation:
      'Greedy decoding narrows the distribution, it does not make a hosted model byte-for-byte reproducible across runs, versions or serving stacks. Promising determinism is a commitment you cannot keep, and the customer finds out by diffing two responses.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team sets temperature to zero and tells the customer the system is now deterministic. What is wrong with that?',
      choices: [
        { id: 'a', text: 'It narrows variance without guaranteeing identical output across runs or versions, so it is a promise that will be tested and broken' },
        { id: 'b', text: 'Temperature zero is not supported by most APIs', whyWrong: 'It generally is. The issue is what is being claimed about it, not whether it can be set.' },
        { id: 'c', text: 'Temperature zero makes answers worse', whyWrong: 'It changes sampling behavior, and for extraction and classification it is often exactly right. Quality is not the point here.' },
        { id: 'd', text: 'Nothing is wrong, that is what temperature zero means', whyWrong: 'This is the claim teams make and then walk back the first time a customer diffs two runs of the same input.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'a2.nondeterminism.flaky_case',
    mode: 'drill',
    nodeIds: ['ai.nondeterminism', 'ai.evals'],
    difficulty: 'core',
    explanation:
      'A case that passes three runs out of five is information, not an inconvenience. Running cases repeatedly by design and reporting a pass rate makes flakiness visible instead of letting it flip the gate at random and erode trust in the whole suite.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'One eval case passes on three runs out of five. How should the harness treat it?',
      choices: [
        { id: 'a', text: 'Run cases repeatedly by design and report a pass rate, so flakiness is visible rather than flipping the gate at random' },
        { id: 'b', text: 'Mark it failed, since it is not reliable', whyWrong: 'Treats a case that works most of the time identically to one that never works, and loses the distinction that matters.' },
        { id: 'c', text: 'Mark it passed, since it usually works', whyWrong: 'Hides exactly the variance the harness exists to measure, and the gate then flips for reasons nobody can explain.' },
        { id: 'd', text: 'Remove it from the set', whyWrong: 'Deletes a measurement because the result is inconvenient. Flaky cases are usually the interesting ones.' },
      ],
      correctId: 'a',
    },
  },
];
