/**
 * The concept taxonomy.
 *
 * Every content item cites one or more node ids. The DAG is deliberately shallow
 * (branch -> node) because the SRS scheduler and the craft meters both operate on
 * nodes, and deep hierarchies make "what am I actually weak at?" unanswerable.
 *
 * Nodes carry a `cloud` tag. GCP is live; AWS and Azure ship as locked
 * `coming_soon` nodes so the roadmap is visible in the UI from day one and so the
 * eventual cross-cloud mapping drills have somewhere to hang.
 *
 * Shared verbatim between the Expo app and the Supabase edge functions.
 */

export const BRANCHES = [
  'gcp_foundations',
  'gcp_ai_platform',
  'ai_engineering',
  'client_engineering',
  'identity_access',
  'data_integration',
  'scaling_reliability',
  'productionizing',
  'security_compliance',
  'delivery_economics',
  'customer_craft',
] as const;
export type Branch = (typeof BRANCHES)[number];

export type Cloud = 'gcp' | 'aws' | 'azure' | 'neutral';
export type NodeStatus = 'live' | 'coming_soon';

/** Which craft meter this concept feeds. */
export type MeterKey = 'depth' | 'platform' | 'aiCraft' | 'client' | 'scope';

export interface TaxonomyNode {
  id: string;
  branch: Branch;
  label: string;
  /** One line, shown on the progress screen when you tap a weak node. */
  blurb: string;
  meter: MeterKey;
  cloud: Cloud;
  status: NodeStatus;
  /** Ids of nodes worth knowing first. Used to order the beginner ramp. */
  requires?: string[];
}

export const BRANCH_META: Record<Branch, { label: string; blurb: string; meter: MeterKey }> = {
  gcp_foundations: {
    label: 'GCP Foundations',
    blurb: 'Identity, networking, perimeters, compute and data primitives.',
    meter: 'platform',
  },
  gcp_ai_platform: {
    label: 'GCP AI Platform',
    blurb: 'Gemini Enterprise Agent Platform, Agent Engine, ADK, grounding, Model Armor.',
    meter: 'platform',
  },
  ai_engineering: {
    label: 'AI Engineering',
    blurb: 'Cloud-neutral craft: retrieval, agents, evals, guardrails, cost.',
    meter: 'aiCraft',
  },
  client_engineering: {
    label: 'Client Engineering',
    blurb: 'The half users touch: streaming UI, offline, tokens in the browser, error states.',
    meter: 'depth',
  },
  identity_access: {
    label: 'Identity & Access',
    blurb: 'Who is calling, on whose behalf, with what scope, the questions that block deals.',
    meter: 'platform',
  },
  scaling_reliability: {
    label: 'Scaling & Reliability',
    blurb: 'What breaks between the demo and ten thousand concurrent users.',
    meter: 'platform',
  },
  productionizing: {
    label: 'Productionizing',
    blurb: 'Release, migrate, observe, roll back, and be on call for it.',
    meter: 'scope',
  },
  data_integration: {
    label: 'Data & Integration',
    blurb: 'Messy real data, connectors, CDC, batch vs streaming.',
    meter: 'depth',
  },
  security_compliance: {
    label: 'Security & Compliance',
    blurb: 'The controls that decide whether an enterprise AI deal closes.',
    meter: 'platform',
  },
  delivery_economics: {
    label: 'Delivery & Economics',
    blurb: 'Scoping, pilots, TCO, SLAs, handover.',
    meter: 'scope',
  },
  customer_craft: {
    label: 'Customer Craft',
    blurb: 'Discovery, executive comms, expectation management.',
    meter: 'client',
  },
};

const n = (
  id: string,
  branch: Branch,
  label: string,
  blurb: string,
  opts: Partial<Pick<TaxonomyNode, 'meter' | 'cloud' | 'status' | 'requires'>> = {}
): TaxonomyNode => ({
  id,
  branch,
  label,
  blurb,
  meter: opts.meter ?? BRANCH_META[branch].meter,
  cloud: opts.cloud ?? (branch.startsWith('gcp_') ? 'gcp' : 'neutral'),
  status: opts.status ?? 'live',
  requires: opts.requires,
});

export const TAXONOMY: TaxonomyNode[] = [
  // ── GCP Foundations ──────────────────────────────────────────────────────
  n('gcp.iam', 'gcp_foundations', 'IAM & service accounts',
    'Principals, roles, bindings, and why primitive roles lose deals.'),
  n('gcp.wif', 'gcp_foundations', 'Workload Identity Federation',
    'Keyless auth from outside GCP: the answer to "can we not email you a JSON key?".',
    { requires: ['gcp.iam'] }),
  n('gcp.hierarchy', 'gcp_foundations', 'Resource hierarchy & org policy',
    'Org, folders, projects, and the constraints that make guardrails real.'),
  n('gcp.vpc', 'gcp_foundations', 'VPC & networking',
    'Shared VPC, subnets, routes, firewall, Cloud NAT.'),
  n('gcp.psc', 'gcp_foundations', 'Private Service Connect',
    'Reaching Google APIs and partner services without leaving private address space.',
    { requires: ['gcp.vpc'] }),
  n('gcp.vpcsc', 'gcp_foundations', 'VPC Service Controls',
    'A data-exfiltration perimeter around APIs. The control that unblocks regulated deals.',
    { requires: ['gcp.vpc'] }),
  n('gcp.interconnect', 'gcp_foundations', 'Hybrid connectivity',
    'Cloud VPN, Dedicated and Partner Interconnect, and when each is worth the wait.'),
  n('gcp.landing_zone', 'gcp_foundations', 'Landing zones',
    'The opinionated project/network/policy baseline you inherit or have to build.',
    { requires: ['gcp.hierarchy'] }),
  n('gcp.compute_choice', 'gcp_foundations', 'Cloud Run vs GKE vs Functions',
    'Picking a runtime you can hand back to the customer without a platform team.'),
  n('gcp.gke', 'gcp_foundations', 'GKE',
    'Autopilot vs Standard, node pools, workload identity, private clusters.'),
  n('gcp.bigquery', 'gcp_foundations', 'BigQuery',
    'Slots vs on-demand, partitioning, clustering, and the cost traps.'),
  n('gcp.alloydb', 'gcp_foundations', 'AlloyDB & Cloud SQL',
    'Managed Postgres tiers, read pools, and pgvector for retrieval.'),
  n('gcp.spanner', 'gcp_foundations', 'Spanner',
    'External consistency at global scale, and when it is overkill.'),
  n('gcp.firestore', 'gcp_foundations', 'Firestore & Bigtable',
    'Document vs wide-column, and picking by access pattern.'),
  n('gcp.pubsub', 'gcp_foundations', 'Pub/Sub',
    'At-least-once delivery, ordering keys, dead-letter topics, push vs pull.'),
  n('gcp.dataflow', 'gcp_foundations', 'Dataflow & Dataproc',
    'Streaming and batch pipelines, windowing, and the managed-vs-DIY call.'),
  n('gcp.dataplex', 'gcp_foundations', 'Dataplex & governance',
    'Catalog, lineage, and data quality, what auditors ask for.'),
  n('gcp.kms', 'gcp_foundations', 'Cloud KMS & CMEK',
    'Customer-managed keys, key rotation, and what CMEK does and does not prove.'),
  n('gcp.assured', 'gcp_foundations', 'Assured Workloads',
    'Region, personnel-access, residency and key constraints enforced by policy.',
    { requires: ['gcp.kms'] }),
  n('gcp.scc', 'gcp_foundations', 'Security Command Center',
    'Posture findings, threat detection, and the dashboard the CISO will ask for.'),
  n('gcp.observability', 'gcp_foundations', 'Cloud Logging, Monitoring & Trace',
    'Log sinks, log-based metrics, SLOs, and tracing across services.'),
  n('gcp.billing', 'gcp_foundations', 'Billing, quotas & committed use',
    'Budgets, quota ceilings that bite mid-pilot, CUDs and sustained-use discounts.'),

  // ── GCP AI Platform ──────────────────────────────────────────────────────
  n('gcp.geap', 'gcp_ai_platform', 'Gemini Enterprise Agent Platform',
    'The 2026 rebrand of Vertex AI; all model and agent roadmap now ships here.'),
  n('gcp.model_garden', 'gcp_ai_platform', 'Model Garden',
    'First-party Gemini plus third-party models including Claude, served through one control plane.',
    { requires: ['gcp.geap'] }),
  n('gcp.agent_engine', 'gcp_ai_platform', 'Agent Engine',
    'Managed agent runtime with Sessions and Memory Bank for persistent context.',
    { requires: ['gcp.geap'] }),
  n('gcp.adk', 'gcp_ai_platform', 'Agent Development Kit (ADK)',
    'Code-first agent authoring: tools, sub-agents, callbacks, evaluation.',
    { requires: ['gcp.agent_engine'] }),
  n('gcp.a2a', 'gcp_ai_platform', 'A2A protocol',
    'Agent-to-agent interop: agent cards, task delegation across vendors.'),
  n('gcp.agent_studio', 'gcp_ai_platform', 'Agent Studio & Agent Garden',
    'Low-code authoring and prebuilt agent patterns, the demo-to-pilot shortcut.'),
  n('gcp.vector_search', 'gcp_ai_platform', 'Vertex Vector Search',
    'ANN index tuning, filtering, and when AlloyDB pgvector is the better answer.'),
  n('gcp.rag_engine', 'gcp_ai_platform', 'RAG Engine & grounding',
    'Managed retrieval, grounding with Google Search, and citation surfaces.'),
  n('gcp.model_armor', 'gcp_ai_platform', 'Model Armor',
    'Runtime screening of prompts, responses and tool calls for injection and leakage.'),
  n('gcp.document_ai', 'gcp_ai_platform', 'Document AI',
    'OCR, form parsing, and where it beats shoving a PDF into a model.'),
  n('gcp.vertex_training', 'gcp_ai_platform', 'Tuning & custom training',
    'Supervised tuning, distillation, and the honest cost of owning a model.'),
  n('gcp.ai_residency', 'gcp_ai_platform', 'AI data residency & controls',
    'CMEK, VPC-SC and residency guarantees for generative workloads.',
    { requires: ['gcp.vpcsc', 'gcp.kms'] }),

  // ── AI Engineering (cloud-neutral) ───────────────────────────────────────
  n('ai.context', 'ai_engineering', 'Context engineering',
    'What goes in the window, in what order, and what you drop first under pressure.'),
  n('ai.prompt_design', 'ai_engineering', 'System prompt design',
    'Role, constraints, output contracts, and few-shot that earns its tokens.'),
  n('ai.chunking', 'ai_engineering', 'Chunking & document prep',
    'Semantic vs fixed windows, overlap, metadata, and parent-document retrieval.'),
  n('ai.hybrid_search', 'ai_engineering', 'Hybrid & lexical retrieval',
    'BM25 plus dense vectors, fusion, and why pure embeddings miss exact terms.',
    { requires: ['ai.chunking'] }),
  n('ai.rerank', 'ai_engineering', 'Reranking',
    'Cross-encoders and LLM rerankers: the cheapest large quality win in RAG.',
    { requires: ['ai.hybrid_search'] }),
  n('ai.rag_failure', 'ai_engineering', 'RAG failure modes',
    'Stale indexes, lost-in-the-middle, permission bleed, confident non-answers.',
    { requires: ['ai.chunking'] }),
  n('ai.tool_calling', 'ai_engineering', 'Tool calling design',
    'Tool granularity, descriptions as prompts, error surfaces, idempotency.'),
  n('ai.agents', 'ai_engineering', 'Agent architecture',
    'Loops, planners, sub-agents, termination conditions, and human checkpoints.',
    { requires: ['ai.tool_calling'] }),
  n('ai.mcp', 'ai_engineering', 'Model Context Protocol',
    'Servers, resources, tools, and MCP as the enterprise integration surface.'),
  n('ai.memory', 'ai_engineering', 'Memory architecture',
    'Session state, summarisation, long-term stores, and what not to remember.'),
  n('ai.evals', 'ai_engineering', 'Evals & golden sets',
    'The single most requested senior AI skill: proving the thing works.'),
  n('ai.llm_judge', 'ai_engineering', 'LLM-as-judge',
    'Rubric design, position bias, calibration against human labels.',
    { requires: ['ai.evals'] }),
  n('ai.observability', 'ai_engineering', 'Tracing & observability',
    'Spans across a chain, token accounting, and debugging a bad answer after the fact.'),
  n('ai.guardrails', 'ai_engineering', 'Guardrails & prompt injection',
    'Direct and indirect injection, tool-call gating, output validation.'),
  n('ai.latency', 'ai_engineering', 'Latency & streaming',
    'TTFT vs total, streaming UX, prefill/decode, batching, caching.'),
  n('ai.cost', 'ai_engineering', 'Token economics',
    'Cost per resolved task, prompt caching, model tiering, and where budgets die.'),
  n('ai.finetune', 'ai_engineering', 'Fine-tune vs RAG vs prompt',
    'Choosing by failure mode rather than by fashion.'),
  n('ai.structured_output', 'ai_engineering', 'Structured output',
    'Schemas, validation, repair loops, and refusing to parse prose.'),
  n('ai.nondeterminism', 'ai_engineering', 'Working with non-determinism',
    'Temperature, seeds, regression gates, and setting expectations about variance.'),

  // ── Client Engineering ───────────────────────────────────────────────────
  n('client.streaming_ui', 'client_engineering', 'Streaming UI',
    'SSE versus WebSocket, partial renders, and what the user sees while tokens arrive.'),
  n('client.token_storage', 'client_engineering', 'Tokens in the client',
    'Where an access token may live, why localStorage is a finding, and PKCE for public clients.',
    { meter: 'platform' }),
  n('client.error_states', 'client_engineering', 'Error and empty states',
    'Retry affordances, partial failure, and never showing a spinner that cannot end.'),
  n('client.optimistic', 'client_engineering', 'Optimistic updates',
    'Render immediately, reconcile on the server response, roll back on conflict.'),
  n('client.offline', 'client_engineering', 'Offline and flaky networks',
    'Local-first writes, an outbox queue, and conflict resolution on reconnect.'),
  n('client.cancellation', 'client_engineering', 'Cancellation and abort',
    'Aborting an in-flight generation, and the usage event that never arrives when you do.'),
  n('client.a11y', 'client_engineering', 'Accessibility',
    'Contrast, focus order, screen readers, and live regions for streaming text.'),
  n('client.perf', 'client_engineering', 'Client performance',
    'Re-render cost of streaming text, virtualised lists, and bundle size on a bad connection.'),
  n('client.state', 'client_engineering', 'Client state and caching',
    'Server-state caching, invalidation after a mutation, and stale reads users notice.'),

  // ── Identity & Access ────────────────────────────────────────────────────
  n('idp.oidc', 'identity_access', 'OIDC and OAuth flows',
    'Authorization code with PKCE, client credentials, and picking by client type.'),
  n('idp.saml', 'identity_access', 'SAML and enterprise SSO',
    'IdP-initiated versus SP-initiated, assertion validation, and the SSO tax on every deal.'),
  n('idp.jwt', 'identity_access', 'JWT validation',
    'Signature, issuer, audience, expiry, clock skew, and the checks people skip.',
    { requires: ['idp.oidc'] }),
  n('idp.token_exchange', 'identity_access', 'Token exchange and OBO',
    'RFC 8693: trading an agent token for a scoped one that still names the user as subject.',
    { requires: ['idp.oidc'] }),
  n('idp.agent_identity', 'identity_access', 'Agent identity and delegation',
    'Modeling an agent as an actor, multi-hop delegation, and who is accountable for the call.',
    { requires: ['idp.token_exchange'] }),
  n('idp.dpop', 'identity_access', 'Sender-constrained tokens',
    'DPoP and mTLS binding, so a stolen bearer token is not enough on its own.'),
  n('idp.revocation', 'identity_access', 'Revocation and session events',
    'Short TTLs, refresh rotation, and continuous access evaluation for near-real-time revocation.'),
  n('idp.rbac_abac', 'identity_access', 'RBAC, ABAC and ReBAC',
    'Roles, attributes and relationships, and which one a per-document AI question needs.'),
  n('idp.scopes', 'identity_access', 'Scopes, audience and least privilege',
    'Narrow audience, short TTL, and why one token for everything is the finding.'),
  n('idp.service_auth', 'identity_access', 'Service-to-service auth',
    'Workload identity, mTLS, and never shipping a shared secret between services.'),
  n('idp.rls', 'identity_access', 'Row-level security',
    'Pushing authorisation into the database so a missed WHERE clause cannot leak a tenant.'),
  n('idp.impersonation', 'identity_access', 'Impersonation and break-glass',
    'Support acting as a user, with consent, an audit trail and a time bound.'),

  // ── Scaling & Reliability ────────────────────────────────────────────────
  n('scale.load_shape', 'scaling_reliability', 'Reading the load shape',
    'Peak versus average, burstiness, and the number that actually sizes the system.'),
  n('scale.horizontal', 'scaling_reliability', 'Horizontal scaling and statelessness',
    'What has to leave the process before you can add a second one.'),
  n('scale.autoscaling', 'scaling_reliability', 'Autoscaling and cold starts',
    'Scale-to-zero economics against the first user waiting eight seconds.'),
  n('scale.caching', 'scaling_reliability', 'Caching layers',
    'What is safe to cache, for how long, and invalidation you can actually reason about.'),
  n('scale.pooling', 'scaling_reliability', 'Connection pooling',
    'The serverless-plus-Postgres trap, and where the pooler has to live.'),
  n('scale.queueing', 'scaling_reliability', 'Queue-based load levelling',
    'Absorbing a spike instead of dropping it, and the latency you trade for it.'),
  n('scale.hotspots', 'scaling_reliability', 'Hot keys and skew',
    'One tenant, one partition, one popular row taking the whole system down.'),
  n('scale.n_plus_one', 'scaling_reliability', 'N+1 and chatty calls',
    'The pattern that is invisible at demo scale and fatal at production scale.'),
  n('scale.timeouts', 'scaling_reliability', 'Timeouts, retries and circuit breakers',
    'Retry budgets, jitter, and why a naive retry storm makes an outage worse.'),
  n('scale.degradation', 'scaling_reliability', 'Graceful degradation',
    'Shedding load and serving a reduced answer instead of failing the request.'),
  n('scale.multiregion', 'scaling_reliability', 'Multi-region and failover',
    'Active-passive versus active-active, data gravity, and what residency permits.'),
  n('scale.capacity', 'scaling_reliability', 'Capacity planning',
    'Headroom, quota ceilings, and load testing that reflects the real traffic mix.'),

  // ── Productionizing ──────────────────────────────────────────────────────
  n('prod.cicd', 'productionizing', 'CI/CD',
    'Reproducible builds, environment promotion, and a pipeline the customer can run.'),
  n('prod.progressive', 'productionizing', 'Progressive delivery',
    'Canary, blue-green and feature flags, shipping without a big-bang cutover.'),
  n('prod.rollback', 'productionizing', 'Rollback and forward-fix',
    'What is actually reversible, and why a schema change usually is not.'),
  n('prod.migrations', 'productionizing', 'Schema migrations',
    'Expand and contract, backfills, and never deploying code and schema in one step.'),
  n('prod.config', 'productionizing', 'Config and secrets',
    'Secret managers, rotation, and the environment variable that ends up in a log.'),
  n('prod.envs', 'productionizing', 'Environments and parity',
    'Why staging never matches production, and which differences actually matter.'),
  n('prod.oncall', 'productionizing', 'On-call and runbooks',
    'Alerts that mean something, and a runbook the receiving team has actually used.'),
  n('prod.incident', 'productionizing', 'Incident response',
    'Declaring, communicating, mitigating, and writing the blameless follow-up.'),
  n('prod.chaos', 'productionizing', 'Failure testing',
    'Injecting the dependency failure before it happens to you at 3am.'),
  n('prod.cost_monitoring', 'productionizing', 'Cost monitoring and guardrails',
    'Budgets, anomaly alerts, and per-tenant attribution before the bill surprises anyone.'),
  n('prod.model_release', 'productionizing', 'Model and prompt releases',
    'Versioning prompts, pinning models, and gating a release on the eval set.',
    { meter: 'aiCraft' }),
  n('prod.data_migration', 'productionizing', 'Cutover and data migration',
    'Dual-write, shadow reads, reconciliation, and the day you turn the old system off.'),

  // ── Data & Integration ───────────────────────────────────────────────────
  n('data.messy', 'data_integration', 'Messy-data repair',
    'Encodings, ragged rows, sentinel nulls, dates from four systems.'),
  n('data.schema_map', 'data_integration', 'Schema mapping',
    'Reconciling three acquired systems with inconsistent labels.'),
  n('data.cdc', 'data_integration', 'Change data capture',
    'Log-based vs query-based, backfill plus stream, and ordering guarantees.'),
  n('data.batch_stream', 'data_integration', 'Batch vs streaming',
    'Latency requirements that justify the operational cost of streaming.'),
  n('data.ingest_patterns', 'data_integration', 'Enterprise ingestion patterns',
    'SFTP drops, bucket landing zones, webhooks, and the nightly file that arrives at 03:40.'),
  n('data.connectors', 'data_integration', 'Enterprise connectors',
    'Salesforce, SAP, ServiceNow, Epic/FHIR, auth models and rate limits.'),
  n('data.quality', 'data_integration', 'Data quality & contracts',
    'Expectations, quarantine tables, and who gets paged when a feed drifts.'),
  n('data.idempotency', 'data_integration', 'Idempotency & replay',
    'Exactly-once as a fiction, dedupe keys, and safe re-runs.'),
  n('data.rate_limits', 'data_integration', 'Rate limiting & backpressure',
    'Token buckets, retries with jitter, and queues that do not silently drop.'),

  // ── Security & Compliance ────────────────────────────────────────────────
  n('sec.hipaa', 'security_compliance', 'HIPAA',
    'PHI, BAAs, minimum necessary, and what a covered entity will actually ask.'),
  n('sec.gdpr', 'security_compliance', 'GDPR',
    'Lawful basis, DPAs, subject access, erasure against an embedding index.'),
  n('sec.soc2', 'security_compliance', 'SOC 2 & security questionnaires',
    'Type I vs II, and answering a 300-row spreadsheet without lying.'),
  n('sec.fedramp', 'security_compliance', 'FedRAMP & public sector',
    'Authorisation boundaries, IL levels, and why the timeline is the answer.'),
  n('sec.eu_ai_act', 'security_compliance', 'EU AI Act',
    'Risk tiers, high-risk obligations, transparency and logging duties.'),
  n('sec.residency', 'security_compliance', 'Data residency & sovereignty',
    '130+ jurisdictions with data-protection law; where bytes may sit and travel.'),
  n('sec.pii', 'security_compliance', 'PII handling & de-identification',
    'Tokenisation, redaction, k-anonymity, and re-identification risk.'),
  n('sec.tenancy', 'security_compliance', 'Tenancy models',
    'Shared, siloed, and bring-your-own-cloud, and their blast radius.'),
  n('sec.zero_trust', 'security_compliance', 'Zero trust & least privilege',
    'Identity-aware access, short-lived credentials, no standing admin.'),
  n('sec.audit', 'security_compliance', 'Audit & access transparency',
    'Immutable logs, who-saw-what, and the evidence pack for a renewal.'),

  // ── Delivery & Economics ─────────────────────────────────────────────────
  n('del.discovery_scope', 'delivery_economics', 'Scoping an engagement',
    'Turning a vague ask into a 90-day plan with a defensible boundary.'),
  n('del.thin_slice', 'delivery_economics', 'Thin slice / walking skeleton',
    'The narrowest end-to-end path that proves the risky part.'),
  n('del.poc_exit', 'delivery_economics', 'POC exit criteria',
    'Agreeing what "it worked" means before you build anything.'),
  n('del.pilot_to_prod', 'delivery_economics', 'Pilot to production',
    'The hardening gap: SLOs, on-call, data volume, and the security review.'),
  n('del.tco', 'delivery_economics', 'TCO & pricing conversations',
    'Run cost, people cost, and the number the CFO actually compares against.'),
  n('del.napkin', 'delivery_economics', 'Capacity & napkin math',
    'Tokens, QPS, index RAM, egress, estimated live, out loud, in the room.'),
  n('del.slo', 'delivery_economics', 'SLAs & SLOs',
    'Availability maths, error budgets, and what you can promise on a shared platform.'),
  n('del.handover', 'delivery_economics', 'Handover & enablement',
    'Runbooks, training, and leaving without the thing rotting.'),
  n('del.risk_sequencing', 'delivery_economics', 'Sequencing by risk',
    'Doing the thing most likely to kill the project first.'),

  // ── Customer Craft ───────────────────────────────────────────────────────
  n('cust.discovery_q', 'customer_craft', 'Discovery questioning',
    'Open before closed, and the one question that changes the architecture.'),
  n('cust.stakeholders', 'customer_craft', 'Stakeholder mapping',
    'Economic buyer, champion, blocker, and the security lead nobody invited.'),
  n('cust.exec_comms', 'customer_craft', 'Executive communication',
    'Answer first, three reasons, no architecture diagram in the first slide.'),
  n('cust.bad_news', 'customer_craft', 'Delivering bad news',
    'Early, owned, with a plan and an option set. Never a surprise on Friday.'),
  n('cust.saying_no', 'customer_craft', 'Saying no',
    'Declining a request while keeping the relationship and the governance intact.'),
  n('cust.expectations', 'customer_craft', 'Expectation management',
    'The overpromise trap: what a demo implies versus what production costs.'),
  n('cust.explaining_ai', 'customer_craft', 'Explaining AI limits',
    'Accuracy, hallucination and variance, to someone who saw one great demo.'),
  n('cust.pushback', 'customer_craft', 'Handling pushback',
    'Acknowledge the valid part first, then trade off explicitly.'),
  n('cust.ownership', 'customer_craft', 'Ownership language',
    '"I will have it by Friday" versus "we are looking into it".'),

  // ── Locked: other clouds ─────────────────────────────────────────────────
  n('aws.core', 'gcp_foundations', 'AWS equivalents',
    'IAM, VPC/PrivateLink, Bedrock, EKS, mapped from what you already know.',
    { cloud: 'aws', status: 'coming_soon' }),
  n('azure.core', 'gcp_foundations', 'Azure equivalents',
    'Entra ID, Private Endpoints, AI Foundry, AKS, mapped from what you already know.',
    { cloud: 'azure', status: 'coming_soon' }),
  n('xcloud.mapping', 'gcp_foundations', 'Cross-cloud mapping',
    'PSC ↔ PrivateLink ↔ Private Endpoint, and friends. Unlocks with AWS or Azure.',
    { cloud: 'neutral', status: 'coming_soon' }),
];

export const TAXONOMY_BY_ID: Record<string, TaxonomyNode> = Object.fromEntries(
  TAXONOMY.map((node) => [node.id, node])
);

export const LIVE_NODES = TAXONOMY.filter((node) => node.status === 'live');

export function nodesForBranch(branch: Branch): TaxonomyNode[] {
  return TAXONOMY.filter((node) => node.branch === branch);
}

/** Meter a set of cited nodes should credit. Ties resolve to the first node. */
export function meterForNodes(nodeIds: string[]): MeterKey {
  const counts = new Map<MeterKey, number>();
  for (const id of nodeIds) {
    const node = TAXONOMY_BY_ID[id];
    if (!node) continue;
    counts.set(node.meter, (counts.get(node.meter) ?? 0) + 1);
  }
  let best: MeterKey = 'platform';
  let bestCount = -1;
  for (const [meter, count] of counts) {
    if (count > bestCount) {
      best = meter;
      bestCount = count;
    }
  }
  return best;
}
