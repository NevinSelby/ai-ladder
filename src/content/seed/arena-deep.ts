import type { ArenaItem } from '@shared/content';

import { cite } from '../sources';

/** Third wave of Trade-off Arena calls: platform, AI craft, compliance, scale and delivery
 *  judgment, each forced into a binary by a constraint stated in the situation. */
export const ARENA_DEEP: ArenaItem[] = [
  {
    id: 'ar3.runtime.cloudrun_vs_gke',
    mode: 'arena',
    nodeIds: ['gcp.compute_choice', 'gcp.gke', 'del.handover'],
    difficulty: 'deep',
    explanation:
      'Both runtimes serve this workload comfortably, so the decision is about operational ownership rather than capability. Reuse wins when the cluster is genuinely well run; separation wins when the platform team is already at its limit.',
    citations: cite('cloudRun'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A customer runs one GKE Standard cluster for a legacy Java estate, staffed by two platform engineers. Your new Python agent service has to land somewhere they can operate after you leave.',
      optionA: 'Deploy the agent service on Cloud Run',
      optionB: 'Add a namespace on the existing GKE cluster',
      defensible: 'either',
      keyPoints: [
        'The cluster already exists, so the marginal operational cost of one more namespace is small',
        'Cloud Run takes the agent out of the cluster upgrade blast radius entirely',
        'Two platform engineers is the real constraint: count who is on call, not what is technically possible',
        'Either way, name who owns node upgrades and who owns the runtime rollback',
      ],
      fieldTake:
        'The deciding question is not which runtime scales better, it is whose pager fires when the control plane upgrades on a Tuesday. If the team already survives that cadence, reuse is cheap. If they barely survive it, do not add a customer-facing service to the same failure domain.',
    },
  },
  {
    id: 'ar3.gke.autopilot_vs_standard',
    mode: 'arena',
    nodeIds: ['gcp.gke', 'gcp.compute_choice'],
    difficulty: 'deep',
    explanation:
      'Autopilot removes operational work by narrowing what workloads may do on a node, and privileged host-level agents sit precisely outside that boundary. A mandatory security agent is a hard requirement, so the runtime bends, not the requirement.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A customer’s security policy requires a third-party endpoint agent running as a privileged DaemonSet on every node. They also asked you to "just use Autopilot" to cut operations work.',
      optionA: 'Autopilot, and seek an exception for the security agent',
      optionB: 'Standard with managed node pools and the DaemonSet installed',
      defensible: 'B',
      keyPoints: [
        'Autopilot restricts privileged workloads and host access by design; that restriction is the product',
        'A mandated security agent is a compliance requirement, not a preference to negotiate away',
        'Standard with node auto-upgrade and auto-repair recovers most of the operational savings',
        'Check whether the vendor ships an Autopilot-compatible mode before conceding the point',
      ],
      fieldTake:
        'Autopilot is not GKE with less work, it is GKE with a narrower contract, and the node-level agents enterprises mandate are exactly what falls outside that contract. Ask for the security tooling inventory before you recommend it, because discovering this in week six turns a runtime choice into a re-platform.',
    },
  },
  {
    id: 'ar3.vpc.shared_vs_own',
    mode: 'arena',
    nodeIds: ['gcp.vpc', 'gcp.landing_zone'],
    difficulty: 'core',
    explanation:
      'The change queue is a scheduling input, not a wall, and both paths are defensible if you start the request immediately. What is never defensible is treating a temporary private VPC as free, because that fork is still there at handover.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The central network team owns a Shared VPC and works to a three-week change queue. Your pilot needs a subnet and firewall rules, and it must be live in six weeks.',
      optionA: 'Attach to the Shared VPC and enter the change queue now',
      optionB: 'Stand up your own VPC and peer it later',
      defensible: 'either',
      keyPoints: [
        'Filing the network request on day one costs nothing and starts the clock',
        'A private VPC you peer later is a migration you volunteered for',
        'Shared VPC is where the customer’s egress controls and monitoring already live',
        'If you fork the network, agree in writing when it folds back and who does it',
      ],
      fieldTake:
        'The mistake is treating three weeks of queue as a blocker instead of a lead time. Submit the request in week one with your best guess at ranges and design around whatever comes back. Teams that build their own VPC temporarily are still running it a year later.',
    },
  },
  {
    id: 'ar3.psc.per_tenant_attachment',
    mode: 'arena',
    nodeIds: ['gcp.psc', 'sec.tenancy'],
    difficulty: 'edge',
    explanation:
      'The scaling property that matters with forty customers is per-customer onboarding work, not throughput. A service attachment is published once and consumed many times, while certificate distribution creates a relationship you maintain forever.',
    citations: cite('psc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'You publish a managed API that forty enterprise customers consume, and each one wants private connectivity. Your team is four engineers.',
      optionA: 'A Private Service Connect service attachment consumed by each customer VPC',
      optionB: 'One public ingress with mutual TLS and per-customer certificates',
      defensible: 'A',
      keyPoints: [
        'A service attachment is published once; per-customer work drops to a connection approval',
        'Mutual TLS proves identity but leaves a public endpoint, which several of the forty will reject outright',
        'Consumer connections are approved and revoked centrally, so offboarding is one action',
        'Size the NAT subnet and check connection limits before you promise forty',
      ],
      fieldTake:
        'Ask how much work each new customer creates for your four engineers, because that is the number that decides this. Private Service Connect turns onboarding into an approval; certificate distribution turns it into an expiry you will be paged for at 2am in three years.',
    },
  },
  {
    id: 'ar3.vpcsc.dryrun_vs_enforce',
    mode: 'arena',
    nodeIds: ['gcp.vpcsc', 'del.risk_sequencing'],
    difficulty: 'deep',
    explanation:
      'Dry-run mode logs exactly the violations an enforced perimeter would cause, without breaking anything. On an estate nobody can fully enumerate, that log is the only honest way to build the ingress and egress rules before the audit date.',
    citations: cite('vpcsc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'An audit in three weeks requires an enforced perimeter around the data projects. Nobody can enumerate every service that currently calls into them.',
      optionA: 'Enforce the perimeter now and fix breakage as it surfaces',
      optionB: 'Run dry-run for two weeks, then enforce using the observed access as your rule set',
      defensible: 'B',
      keyPoints: [
        'Dry-run logs would-be violations without denying a single request',
        'Two weeks of logs catch the weekly and nightly jobs a one-day survey misses',
        'Enforcing blind on an unmapped estate breaks production and burns the audit goodwill',
        'Three weeks fits two weeks of observation plus a week of rule authoring',
      ],
      fieldTake:
        'Dry-run is the step people skip because it feels like delay, and it is the only way to find the job that runs on the last Friday of the month. Start it the day the audit is scheduled, not the week before enforcement.',
    },
  },
  {
    id: 'ar3.bigquery.slots_vs_ondemand',
    mode: 'arena',
    nodeIds: ['gcp.bigquery', 'del.tco'],
    difficulty: 'core',
    explanation:
      'A reservation sized for a monthly peak is idle for most of the month, and predictability can be bought more cheaply with quotas and budget alerts. On-demand billing follows bytes scanned, which partitioning and clustering attack directly.',
    citations: cite('bqPartition'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Analysts run a few hundred gigabytes of ad hoc queries a day, and one monthly rebuild scans several terabytes. Finance wants a predictable line item.',
      optionA: 'On-demand pricing, with custom quotas and partitioned tables',
      optionB: 'A slot reservation sized for the monthly rebuild',
      defensible: 'A',
      keyPoints: [
        'A reservation sized for a monthly peak sits idle for the other twenty-nine days',
        'On-demand cost tracks bytes scanned, which partitioning and clustering directly reduce',
        'Predictability is available through custom query quotas and budget alerts, not only reservations',
        'Revisit reservations when daily load, not monthly load, would keep slots busy',
      ],
      fieldTake:
        'Finance hears predictable and reaches for a reservation, but a reservation makes the bill predictable by making it permanently equal to your worst day. Show them the partitioning fix first: a large cut in bytes scanned is a better story than a flat rate nobody can reduce later.',
    },
  },
  {
    id: 'ar3.spanner.vs.alloydb',
    mode: 'arena',
    nodeIds: ['gcp.spanner', 'gcp.alloydb', 'del.tco'],
    difficulty: 'core',
    explanation:
      'Spanner’s differentiator is external consistency across regions, which a single-region product does not consume. AlloyDB keeps the team’s Postgres fluency, tooling and hiring pool, all of which are real assets on a delivery timeline.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A European bank needs a transactional store for a new lending product, single-region, with a team fluent in Postgres. Their architect proposed Spanner because "it is what Google uses".',
      optionA: 'Spanner',
      optionB: 'AlloyDB for PostgreSQL',
      defensible: 'B',
      keyPoints: [
        'Global external consistency is Spanner’s reason to exist and this workload never calls on it',
        'Postgres fluency is an asset, and a different dialect and tool chain discards part of it',
        'AlloyDB read pools and columnar acceleration absorb the reporting load without a second system',
        'Spanner earns its place at global write distribution or beyond what one primary can hold',
      ],
      fieldTake:
        'Choosing the more impressive database is how teams spend a year rebuilding operational habits they already had. Ask where the second write region is; if the answer is that there is not one, the decision has already been made for you.',
    },
  },
  {
    id: 'ar3.firestore.vs.bigtable',
    mode: 'arena',
    nodeIds: ['gcp.firestore', 'ai.memory'],
    difficulty: 'core',
    explanation:
      'At a few hundred writes per second with single-entity reads, both stores work, so operability decides. Firestore brings queries, security rules and client SDKs without the row-key design skill Bigtable quietly assumes.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Conversation transcripts for an assistant arrive at a couple of hundred writes per second, and reads are always the last fifty turns of one conversation. A data engineer wants Bigtable for scale.',
      optionA: 'Firestore, keyed by conversation with turns as documents',
      optionB: 'Bigtable with a conversation-prefixed row key',
      defensible: 'A',
      keyPoints: [
        'A few hundred writes per second sits comfortably inside Firestore’s operating range',
        'The access pattern is a single-entity read, which both handle, so operations decide',
        'Bigtable earns itself at sustained very high throughput or very large scans',
        'Firestore gives queries, security rules and offline clients without extra services',
      ],
      fieldTake:
        'Bigtable gets chosen for the traffic people imagine having and then operated by a team that has never designed a row key. Pick the store whose failure modes the customer can debug at 3am, and revisit when a measured throughput number, not a hypothetical one, breaks it.',
    },
  },
  {
    id: 'ar3.pubsub.ordering_scope',
    mode: 'arena',
    nodeIds: ['gcp.pubsub', 'scale.hotspots'],
    difficulty: 'deep',
    explanation:
      'Ordering keys give per-entity ordering while preserving parallelism across entities, which is what the requirement actually described. Global ordering serializes the topic and caps throughput at a single consumer for a guarantee nobody asked for.',
    citations: cite('pubsubOrdering'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A payments team asks for strict ordering on an event topic. Probing shows what they need is that two events for the same account never arrive out of order.',
      optionA: 'Ordering keys set to the account id',
      optionB: 'A single globally ordered stream',
      defensible: 'A',
      keyPoints: [
        'Ordering keys preserve order within a key and parallelism across keys',
        'Global ordering serializes everything and caps throughput at one consumer',
        'A busy account becomes a hot key, so size the busiest key rather than the average',
        'Ordering also forces in-order redelivery, which slows recovery behind a poison message',
      ],
      fieldTake:
        'Almost nobody needs global ordering, they need ordering with respect to an entity, and the difference is the entire throughput budget. Ask "ordered with respect to what?" and you will usually get an id back, which is your ordering key.',
    },
  },
  {
    id: 'ar3.pubsub.push_vs_pull',
    mode: 'arena',
    nodeIds: ['gcp.pubsub', 'scale.queueing'],
    difficulty: 'deep',
    explanation:
      'Push delivery rate is governed by the subscription, while the binding constraint here is a fixed downstream concurrency ceiling. Pull lets the consumer hold exactly the permitted number of messages in flight, which is the only place that limit is actually known.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Each message triggers a model call that takes up to two minutes, and the downstream quota allows only ten concurrent calls. The team wants a push subscription because it is simpler.',
      optionA: 'Push subscription delivering straight to the service',
      optionB: 'Pull subscription with the consumer controlling concurrency',
      defensible: 'B',
      keyPoints: [
        'Push delivery is paced by the subscription, not by your downstream quota',
        'Pull lets the consumer take exactly ten in flight and stop, which is the real constraint',
        'Two-minute handling means ack deadline extension and redelivery planning either way',
        'Push is the right default when handling is fast and the consumer scales freely',
      ],
      fieldTake:
        'Push is simpler right up until the thing you must protect is a quota rather than CPU. When the bottleneck is a fixed concurrency ceiling downstream, the side that pulls work should be the side that knows the ceiling.',
    },
  },
  {
    id: 'ar3.kms.ekm_vs_cmek',
    mode: 'arena',
    nodeIds: ['gcp.kms', 'sec.residency'],
    difficulty: 'edge',
    explanation:
      'The stated requirement is unilateral key control, which means the key material has to live outside the provider boundary. CMEK answers lifecycle and audit questions well, but it does not answer the question this customer asked.',
    citations: cite('cmek'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A customer says the control they need is the ability to make their data unreadable without asking anyone. Cloud KMS keys in their own project already satisfy their auditor.',
      optionA: 'Cloud External Key Manager, with key material held by their own key service',
      optionB: 'CMEK with keys in Cloud KMS in the customer’s project',
      defensible: 'A',
      keyPoints: [
        'Unilateral control means the material must sit outside the provider, which is what EKM provides',
        'CMEK gives key lifecycle control and audit while the material still lives inside the boundary',
        'EKM makes the external key service a hard availability dependency for every read',
        'If the auditor is already satisfied, check whether the requirement is real or a repeated phrase',
      ],
      fieldTake:
        'CMEK and external key management are sold as the same reassurance and answer different questions: one is about key lifecycle and audit, the other about who physically holds the material. Before you accept the EKM availability hit, make someone say out loud which of the two fears they have.',
    },
  },
  {
    id: 'ar3.assured.vs.assembled',
    mode: 'arena',
    nodeIds: ['gcp.assured', 'sec.residency', 'gcp.landing_zone'],
    difficulty: 'edge',
    explanation:
      'Assured Workloads enforces residency and personnel controls in the platform and produces evidence, at the cost of a narrower service catalog. Assembled controls keep the full catalog but move the burden of proof onto you, permanently.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A public-sector customer needs enforced residency and personnel-access controls. Assured Workloads delivers both with attestation, at the price of a narrower service catalog and slower access to new features.',
      optionA: 'An Assured Workloads folder with the appropriate control package',
      optionB: 'Org policy location constraints, CMEK and access transparency, assembled yourself',
      defensible: 'either',
      keyPoints: [
        'Assured Workloads enforces the constraints in the platform, so accidental drift is not possible',
        'The assembled path keeps the full catalog and costs you continuous proof that it is configured right',
        'The deciding question is whether someone external will demand evidence or only an internal team',
        'Check which required services are in scope before committing either way',
      ],
      fieldTake:
        'A good justification names the artifact you owe: if an outside party will say "prove it", buy the enforcement and the attestation. If it is internal policy, assembled controls are faster and admit services the packaged set has not. The bad justification picks Assured Workloads for the name and discovers in week eight that a service the design depends on is unavailable.',
    },
  },
  {
    id: 'ar3.billing.quota_before_launch',
    mode: 'arena',
    nodeIds: ['gcp.billing', 'scale.capacity'],
    difficulty: 'core',
    explanation:
      'A filed quota request is not a capacity commitment and has no date you can plan against. Capping the launch cohort to the quota in hand converts an availability risk into a scope decision you control.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Launch is in ten days and current model quota covers about a fifth of forecast peak. The increase request is filed but has no committed date.',
      optionA: 'Launch as planned and escalate the quota request',
      optionB: 'Launch to a capped cohort sized to the quota you actually hold',
      defensible: 'B',
      keyPoints: [
        'A filed request is not a commitment and carries no date you can plan against',
        'A capped cohort turns an availability risk into a scope decision you control',
        'Ramping the cohort as quota lands gives you a load test with real traffic',
        'Escalate anyway, but keep the approval off the launch critical path',
      ],
      fieldTake:
        'Treat quota like lead time on a physical part: you order early and plan the build around the quantity in hand. Launches that assume an approval lands on time are how teams discover the approval queue does not care about their date.',
    },
  },
  {
    id: 'ar3.landing_zone.exception_vs_conform',
    mode: 'arena',
    nodeIds: ['gcp.landing_zone', 'del.risk_sequencing'],
    difficulty: 'deep',
    explanation:
      'A monthly exception board turns a policy carve-out into a calendar dependency even when it succeeds. Conforming keeps the handover clean, and either way the exception should be filed in parallel because the form is cheap and the wait is not.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The customer’s landing zone blocks the service you need, and the exception board meets once a month. Your delivery window is twelve weeks.',
      optionA: 'File for an exception and design around the block until it clears',
      optionB: 'Redesign now to use only services the landing zone already permits',
      defensible: 'either',
      keyPoints: [
        'A monthly board means an exception costs a month of calendar even when granted',
        'Conforming keeps handover clean because nothing depends on a carve-out someone must maintain',
        'File the exception regardless; its cost is a form, not a delay',
        'Name which parts of the design collapse if the board says no',
      ],
      fieldTake:
        'The failure mode is designing on the assumption of a yes and having no plan when the board refuses in week five. Run both: file the exception, build the conforming version, keep the switch cheap. An exception that arrives after you shipped without it is a bonus, not a dependency.',
    },
  },
  {
    id: 'ar3.compute.job_vs_service',
    mode: 'arena',
    nodeIds: ['gcp.compute_choice', 'ai.chunking'],
    difficulty: 'core',
    explanation:
      'A ninety-minute unit of work wants a start, an exit code and a retry policy, which is what a job provides and what a request handler resists. Running it inside the serving service also makes batch work compete with user traffic for instances.',
    citations: cite('cloudRun'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A nightly re-embedding run takes about ninety minutes over the changed documents. The team wants to add it to the existing Cloud Run service behind a scheduled HTTP call.',
      optionA: 'A Cloud Run job triggered on a schedule',
      optionB: 'A scheduled HTTP endpoint on the existing service',
      defensible: 'A',
      keyPoints: [
        'Ninety minutes of work does not belong behind a request timeout',
        'A job gives retries, parallel task execution and an exit status you can alert on',
        'Sharing the service makes the batch run compete with user traffic for instances',
        'Jobs keep the serving container small because batch dependencies ship separately',
      ],
      fieldTake:
        'The tell is that the team is reaching for the deployment they already have rather than the shape the work actually is. Batch work wants a start, an exit code and a retry policy; request handlers offer none of those and will fight you for all three.',
    },
  },
  {
    id: 'ar3.model_garden.third_party',
    mode: 'arena',
    nodeIds: ['gcp.model_garden', 'gcp.geap', 'del.risk_sequencing'],
    difficulty: 'core',
    explanation:
      'Model Garden serves third-party models inside the same project, IAM and logging boundary the security team already approved. Spending a quarter of prompt engineering to avoid a procurement cycle that was never required is a self-inflicted cost.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'On your eval set, a third-party model available through Model Garden beats the first-party option by a clear margin. Security has approved Google Cloud and nothing else.',
      optionA: 'Use the third-party model through Model Garden',
      optionB: 'Use Gemini and close the gap with prompt and retrieval work',
      defensible: 'A',
      keyPoints: [
        'Model Garden keeps the model inside the approved project, IAM and logging boundary',
        'No new vendor contract and no new data path, so the existing approval covers it',
        'Keep the eval set as the gate so the choice is revisited when models move',
        'Confirm regional availability and the data handling terms for that specific model',
      ],
      fieldTake:
        'Teams hear "third-party model" and assume "third-party vendor review", then burn a quarter closing a measured quality gap by hand. The control plane is what security approved, so check what it now serves before you concede the gap.',
    },
  },
  {
    id: 'ar3.agent_engine.vs.own_runtime',
    mode: 'arena',
    nodeIds: ['gcp.agent_engine', 'gcp.compute_choice', 'del.handover'],
    difficulty: 'deep',
    explanation:
      'Sessions and durable memory are the parts teams consistently underestimate, and a managed agent runtime ships them. A mature Cloud Run platform makes the marginal deployment cost near zero, so the decision turns on whose identity, networking and observability model you adopt.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The customer has a mature Cloud Run platform with their own CI, logging and network policy. The agent needs durable sessions and long-term memory.',
      optionA: 'Agent Engine, using its managed sessions and memory',
      optionB: 'Cloud Run with a session store and memory layer you build',
      defensible: 'either',
      keyPoints: [
        'Sessions and memory are real engineering, and a managed runtime is you not doing it',
        'A mature platform means the marginal cost of one more Cloud Run service is near zero',
        'A managed runtime means adopting its identity, networking and observability model, not theirs',
        'The memory schema is your design in both options, only the storage differs',
      ],
      fieldTake:
        'A good justification names what you are buying: if it is session durability and memory, say so, because that is weeks of work you are not doing. "Managed is better" collapses the moment the customer’s network policy and the runtime’s assumptions disagree in week seven.',
    },
  },
  {
    id: 'ar3.rag_engine.managed_first',
    mode: 'arena',
    nodeIds: ['gcp.rag_engine', 'ai.chunking', 'del.thin_slice'],
    difficulty: 'core',
    explanation:
      'The six-week goal is evidence about retrieval quality, not a finished pipeline. A managed baseline tells you with numbers which document classes fail, which is the only defensible reason to spend weeks on table extraction.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'One engineer has six weeks to prove retrieval works over a mixed corpus of PDFs and wiki pages. The PDFs contain tables that matter to the answers.',
      optionA: 'Managed RAG Engine pipeline first, measure, then specialize what fails',
      optionB: 'A custom pipeline with dedicated table extraction from day one',
      defensible: 'A',
      keyPoints: [
        'The deliverable is evidence about retrieval quality, not a finished ingestion pipeline',
        'A managed baseline produces a per-document-class failure list with numbers attached',
        'Table extraction is expensive to build and may matter to only a slice of queries',
        'Hold the eval set constant so a custom stage has to prove it earned its complexity',
      ],
      fieldTake:
        'Build the measurement before the sophistication. Half the time the tables turn out to appear in six percent of the questions people ask, and the team that started with a custom parser spent four of its six weeks on the wrong sixth.',
    },
  },
  {
    id: 'ar3.vector_search.vs.pgvector',
    mode: 'arena',
    nodeIds: ['gcp.vector_search', 'gcp.alloydb', 'idp.rls'],
    difficulty: 'deep',
    explanation:
      'Two million vectors is small, and the query is mostly not vector search: tenancy, freshness and permissions all live in Postgres. Keeping the embeddings beside them lets one query enforce isolation that would otherwise be reimplemented in application code.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Two million chunks, every query filtered by tenant and by document freshness, with results joined to permissions held in Postgres. The platform team already runs AlloyDB.',
      optionA: 'A dedicated vector index service',
      optionB: 'pgvector in AlloyDB beside the relational data',
      defensible: 'B',
      keyPoints: [
        'Two million vectors is well inside what a Postgres index handles',
        'Heavy metadata filtering and joins are where a separate vector store costs the most',
        'Row-level security enforces tenancy in the same query that performs the search',
        'A dedicated index earns itself at hundreds of millions of vectors or strict recall targets at scale',
      ],
      fieldTake:
        'What settles this is not the vector count, it is how much of the query is not vector search. When permissions, freshness and tenancy all live in Postgres, moving embeddings out means rewriting the WHERE clause in application code, and that is where tenant leaks come from.',
    },
  },
  {
    id: 'ar3.model_armor.vs.tool_gate',
    mode: 'arena',
    nodeIds: ['gcp.model_armor', 'ai.guardrails', 'ai.tool_calling'],
    difficulty: 'edge',
    explanation:
      'Content screening lowers the rate at which injection succeeds; it does not bound what happens when it does. A deterministic gate on the send tool holds regardless of how the attack is phrased, which is why it is the control you cannot ship without.',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'An agent reads inbound customer email and can send replies without review. You have one sprint of hardening budget.',
      optionA: 'Model Armor screening on prompts and responses',
      optionB: 'A deterministic gate on the send tool: approved recipients only, human confirm otherwise',
      defensible: 'B',
      keyPoints: [
        'Screening is probabilistic, so it reduces injection success rate rather than bounding impact',
        'The email body is attacker-controlled input, which makes the send tool the blast radius',
        'A recipient allowlist holds regardless of how cleverly the injection is phrased',
        'Both belong in the end state; the gate is the one you cannot launch without',
      ],
      fieldTake:
        'Screening decides how often the model is fooled; authorization decides what happens when it is. Spend the first sprint on the control that still holds against an attack you have not imagined, then add screening to cut the noise.',
    },
  },
  {
    id: 'ar3.evals.golden_vs_shadow',
    mode: 'arena',
    nodeIds: ['ai.evals', 'prod.model_release', 'ai.nondeterminism'],
    difficulty: 'edge',
    explanation:
      'Eighty labeled cases cannot resolve a small regression, and shadow traffic produces volume without labels. The two methods detect different classes of failure, so the justification has to say which failure you are buying coverage against.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The pinned model version is deprecated in thirty days and a successor is available. Your golden set is eighty cases; production handles fifty thousand requests a day.',
      optionA: 'Run the golden set, compare scores, and cut over',
      optionB: 'Shadow the new model on live traffic for two weeks and diff the outputs',
      defensible: 'either',
      keyPoints: [
        'Eighty cases cannot resolve a small regression; the interval is wider than the effect',
        'Shadow traffic gives real distribution and volume but produces no labels on its own',
        'Shadowing doubles inference cost and needs a diffing plan agreed before it starts',
        'The strong answer uses both: golden set as the gate, shadow diffs to find what it never covered',
      ],
      fieldTake:
        'A good justification says what each method can and cannot detect: the golden set catches known failure modes, shadowing catches the ones nobody wrote a case for. A weak one treats "we ran the evals" as sufficient without asking how large a regression eighty cases could hide.',
    },
  },
  {
    id: 'ar3.cost.cache_vs_tier',
    mode: 'arena',
    nodeIds: ['ai.cost', 'scale.caching'],
    difficulty: 'deep',
    explanation:
      'With sixty percent near-duplicate traffic, the cheapest token is the one never generated, and a cache leaves the novel forty percent on the strong model. Downgrading the model taxes exactly the queries that needed the capability.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The support widget’s bill is three times budget, and sixty percent of questions are near-duplicates of the top two hundred. The policy corpus behind the answers changes monthly.',
      optionA: 'Route everything to a smaller, cheaper model',
      optionB: 'Put a semantic cache in front of the current model',
      defensible: 'B',
      keyPoints: [
        'Sixty percent duplication means the cheapest token is the one you never generate',
        'Downgrading taxes quality on the forty percent that are genuinely novel',
        'Cache keys must include the corpus version so a policy change invalidates cleanly',
        'Measure near-miss hits: a cache that answers the wrong question is worse than the bill',
      ],
      fieldTake:
        'Model tiering is the reflex and caching is usually the bigger number, and they are not exclusive. What bites is invalidation: tie the cache key to the retrieval corpus version, or you will serve last month’s refund policy long after legal changed it.',
    },
  },
  {
    id: 'ar3.latency.voice_rerank',
    mode: 'arena',
    nodeIds: ['ai.latency', 'ai.rerank'],
    difficulty: 'deep',
    explanation:
      'In speech, silence past a few hundred milliseconds reads as a failed turn rather than as thinking, so the latency budget is genuinely hard. Retrieval quality lost by dropping the reranker can be partly recovered with hybrid search and tighter chunking, which cost nothing at inference time.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A voice agent must start speaking within roughly a third of a second. Your reranker measurably improves answers and adds a quarter of a second before generation can begin.',
      optionA: 'Drop the reranker on the voice path',
      optionB: 'Keep it and cover the gap with a spoken acknowledgment',
      defensible: 'A',
      keyPoints: [
        'Silence past a few hundred milliseconds in speech reads as a broken call, not as thinking',
        'Filler phrases work once or twice per call and do not scale to every turn',
        'Hybrid search and tighter chunking recover part of the quality at no inference cost',
        'The same reranker is clearly worth keeping on a chat surface where streaming hides the wait',
      ],
      fieldTake:
        'Latency budgets belong to a surface, not to a system. The reranker that is obviously worth 250ms in a chat window is obviously not worth it in a phone call, and teams get into trouble by shipping one retrieval config to both.',
    },
  },
  {
    id: 'ar3.finetune.distill_for_cost',
    mode: 'arena',
    nodeIds: ['ai.finetune', 'ai.cost', 'del.tco'],
    difficulty: 'edge',
    explanation:
      'This is an amortization problem, not a knowledge problem: the task is stable, the prompt is long and fixed, and the volume is large. Those three conditions together are the narrow case where moving behavior into weights beats paying for the prompt on every call.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A classification step runs ten million times a month behind a six-thousand-token few-shot prompt, and quality is already acceptable. Nothing about the task changes month to month.',
      optionA: 'Distill into a tuned small model using logged inputs and accepted outputs',
      optionB: 'Keep the prompt and lean on prompt caching',
      defensible: 'A',
      keyPoints: [
        'A stable task is the condition under which weights beat a prompt',
        'Ten million calls amortizes tuning and serving setup quickly at this prompt size',
        'The training data already exists in the logs of inputs and accepted outputs',
        'Caching discounts the shared prefix but you still pay something on every call',
      ],
      fieldTake:
        'Fine-tuning gets dismissed because everyone learned "use retrieval for knowledge", and this is not a knowledge problem. Stable task, huge volume, long fixed prompt: that is the one shape where distillation pays, and keep the large model as the labeler for the next round.',
    },
  },
  {
    id: 'ar3.guardrails.untrusted_retrieval',
    mode: 'arena',
    nodeIds: ['ai.guardrails', 'ai.tool_calling', 'ai.agents'],
    difficulty: 'deep',
    explanation:
      'Delimiters and warnings are instructions to a model that can be out-instructed by the attacker’s text. Splitting the path so the context that reads untrusted content holds no write capability removes the privilege rather than relying on persuasion resistance.',
    citations: cite('modelArmor'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'An assistant summarizes inbound supplier emails and also holds tools that update purchase orders. The email content is reachable by anyone who can email the company.',
      optionA: 'Sanitize retrieved content: strip instructions, delimit it, warn the model',
      optionB: 'Split the path so the model that reads untrusted content holds no write tools',
      defensible: 'B',
      keyPoints: [
        'Delimiters and warnings are instructions competing with the attacker’s instructions',
        'Separating reading from acting removes the capability rather than the temptation',
        'The summarizer’s output crosses back as data, so validate it against a schema',
        'Sanitization is still worth doing; it is just not a security boundary',
      ],
      fieldTake:
        'Prompt injection is a privilege problem wearing a content-filtering costume: the fix is that the context which touched attacker text does not hold the credential. Say it that way and the design writes itself, and it stops depending on how well the model resists persuasion this month.',
    },
  },
  {
    id: 'ar3.chunking.tables_as_rows',
    mode: 'arena',
    nodeIds: ['ai.chunking', 'data.quality'],
    difficulty: 'deep',
    explanation:
      'Column alignment is destroyed when a table is linearized into text, and no chunk size restores it. Numeric questions want a lookup, which is exact and verifiable, while prose chunks continue to serve the narrative questions.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Users ask numeric questions about quarterly financial reports, and the numbers live in wide tables. Page-level chunks retrieve the right page and the model still reads the wrong column.',
      optionA: 'Tune chunk size and overlap until the tables survive',
      optionB: 'Extract tables into structured rows and answer numeric questions with a query tool',
      defensible: 'B',
      keyPoints: [
        'Linearizing a table loses column alignment, and no chunk size brings it back',
        'A numeric question wants a lookup, and a lookup is verifiable in a way generation is not',
        'Prose chunks still serve narrative questions, so this is routing, not replacement',
        'Extraction quality becomes a data pipeline problem with its own tests and alerts',
      ],
      fieldTake:
        'When the failure is arithmetic or column selection, more retrieval tuning is motion without progress. Get the numbers into rows and let the model write the query, because "which cell" is a question SQL answers exactly and embeddings answer approximately.',
    },
  },
  {
    id: 'ar3.rerank.encoder_vs_llm',
    mode: 'arena',
    nodeIds: ['ai.rerank', 'ai.cost', 'ai.latency'],
    difficulty: 'core',
    explanation:
      'A cross-encoder scores a hundred candidate pairs in one batched pass at predictable latency and cost, which is exactly the task it was trained for. LLM reranking pays tokens proportional to candidate text on every single query.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'You retrieve a hundred candidates and must return the best handful inside a p95 budget of about a second. Volume is high enough that per-query cost matters.',
      optionA: 'A cross-encoder reranker over the hundred candidates',
      optionB: 'An LLM reranker prompted to score each candidate',
      defensible: 'A',
      keyPoints: [
        'A cross-encoder scores a hundred pairs in one batched pass at predictable latency',
        'LLM reranking costs tokens proportional to candidate text, on every query',
        'Cross-encoders are trained for ranking rather than adapted to it',
        'An LLM reranker earns its place when relevance needs multi-step reasoning about the query',
      ],
      fieldTake:
        'People reach for an LLM because it is the tool in hand, and reranking is one of the few places a small purpose-built model still wins on quality, latency and cost at once. Keep the LLM for the rare query where relevance genuinely requires reasoning.',
    },
  },
  {
    id: 'ar3.memory.summary_vs_recall',
    mode: 'arena',
    nodeIds: ['ai.memory', 'ai.context'],
    difficulty: 'edge',
    explanation:
      'Summaries protect coherence and lose specifics; per-turn retrieval protects specifics and loses the narrative of how the case evolved. The justification has to name which failure the customer will complain about, because both failures are real.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A support case runs for weeks, and users quote back specific commitments made in earlier messages. The context window cannot hold the whole thread.',
      optionA: 'Maintain a rolling summary of the case',
      optionB: 'Store every turn and retrieve the relevant ones per question',
      defensible: 'either',
      keyPoints: [
        'Summaries lose exactly the specifics customers quote back, like a fee that was waived',
        'Retrieval preserves specifics but loses how the case evolved between them',
        'The strong pattern is both: summary for state, retrieval for evidence, citations to turns',
        'Either way, decide what is never summarized away: commitments, amounts, dates',
      ],
      fieldTake:
        'A good justification names the failure it is protecting against, since summary protects coherence and retrieval protects fidelity. The weak answer picks one and never asks what happens when a customer says "you told me on the twelfth", which is the only version of this that ends in a complaint.',
    },
  },
  {
    id: 'ar3.tool_calling.granularity',
    mode: 'arena',
    nodeIds: ['ai.tool_calling', 'ai.agents'],
    difficulty: 'core',
    explanation:
      'Forty tool descriptions crowd the context and raise the chance of selecting the wrong one, while six task-shaped tools put the multi-call sequence into code where it is deterministic and testable. The model should be spending its judgment on the task, not on orchestrating four sequential writes.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The CRM exposes forty REST endpoints, and the team’s instinct is to make each one a tool. The agent handles about six recurring jobs.',
      optionA: 'Forty thin tools, one per endpoint',
      optionB: 'Six task-shaped tools that compose the endpoints internally',
      defensible: 'B',
      keyPoints: [
        'Forty descriptions crowd the context and raise wrong-tool selection rates',
        'Task-shaped tools move the call sequence into code, where it is deterministic and testable',
        'Fewer tools means fewer error surfaces to describe, log and retry',
        'Add a thin escape-hatch tool only once a real job cannot be expressed',
      ],
      fieldTake:
        'Design tools around what the user is trying to get done, not around the API you happen to have. Every step left in the model’s head is a step you cannot unit test, and the model’s job is judgment, not sequencing four POSTs correctly every time.',
    },
  },
  {
    id: 'ar3.context.longwindow_vs_retrieval',
    mode: 'arena',
    nodeIds: ['ai.context', 'ai.cost', 'ai.rag_failure'],
    difficulty: 'deep',
    explanation:
      'Cross-document comparison is where retrieval most often drops the clause it needed, and a stable shared prefix is the case where caching makes long context affordable. It stops being defensible the moment the corpus outgrows the window or per-user permissions differ.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Thirty contracts totaling roughly two hundred thousand tokens are queried a few hundred times a day, often comparing clauses across documents. The whole set fits in the context window.',
      optionA: 'Put the full corpus in context and rely on prompt caching',
      optionB: 'Retrieve the relevant clauses per question',
      defensible: 'either',
      keyPoints: [
        'Cross-document comparison is where retrieval most often omits the clause that mattered',
        'A stable corpus with a shared prefix is the case where caching makes long context affordable',
        'Attention over long context degrades unevenly, so measure recall by position, not on average',
        'Retrieval becomes mandatory once the corpus outgrows the window or users see different subsets',
      ],
      fieldTake:
        'Corpus size does not decide this, question shape does: "find the clause" is retrieval, "compare all thirty" is context. A good justification also names what breaks it, and the answer is usually the thirty-first contract or the first customer whose users cannot all see everything.',
    },
  },
  {
    id: 'ar3.agents.step_budget',
    mode: 'arena',
    nodeIds: ['ai.agents', 'scale.timeouts'],
    difficulty: 'core',
    explanation:
      'A run at forty steps when the norm is five is not deeper thinking, it is a loop that cannot terminate. A step cap gives a bounded worst case for latency and cost, and the partial result plus an honest note is usable where an endless spinner is not.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A research agent normally finishes in five tool calls, but a few percent of runs pass forty and cost a dollar each. The task is user-facing.',
      optionA: 'Cap the loop at eight steps and return partial work with what it found',
      optionB: 'Let it run under a token budget until it finishes',
      defensible: 'A',
      keyPoints: [
        'Forty steps against a norm of five is a stuck loop, not deeper reasoning',
        'A step cap gives a bounded, predictable worst case for latency and cost',
        'Partial results plus "here is what I could not resolve" is usable; a spinner is not',
        'Log the capped runs; they are your best sample of tasks the tools cannot do',
      ],
      fieldTake:
        'Termination conditions are the part of agent design nobody demos and everybody needs. Cap the steps, return the partial, and treat the cap-hit rate as a product metric, because it tells you precisely which jobs your tools cannot actually complete.',
    },
  },
  {
    id: 'ar3.evals.judge_vs_assertions',
    mode: 'arena',
    nodeIds: ['ai.evals', 'ai.llm_judge', 'ai.structured_output'],
    difficulty: 'core',
    explanation:
      'When a single right answer exists per field, comparison is exact, deterministic and free, while a judge layers its own error rate onto the system under test. Per-field accuracy also tells you which field to fix, which an overall score never does.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The output is a structured extraction from invoices: nine fields, each with a single right answer. Someone proposes an LLM judge to score quality.',
      optionA: 'An LLM judge with a rubric',
      optionB: 'Field-level assertions against labeled ground truth',
      defensible: 'B',
      keyPoints: [
        'Where a right answer exists, comparison is exact, deterministic and free',
        'A judge adds its own error rate on top of the system you are measuring',
        'Per-field accuracy names the field to fix; a single score does not',
        'Save the judge for outputs where no single correct string exists',
      ],
      fieldTake:
        'Use a judge only where a diff cannot work. Teams spend a week calibrating a judge for a task that an equality check answers perfectly, then wonder why the number moves when the judge’s own model is updated.',
    },
  },
  {
    id: 'ar3.grounding.web_vs_corpus',
    mode: 'arena',
    nodeIds: ['gcp.rag_engine', 'gcp.geap', 'cust.expectations'],
    difficulty: 'core',
    explanation:
      'The stated requirement is never contradicting the company’s own documentation, and only the documentation guarantees that. Coverage gaps are a content backlog, and the unanswered questions are the list.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A public product FAQ assistant must never contradict the company’s own documentation. Web grounding would cover questions the docs do not answer.',
      optionA: 'Ground on the internal documentation corpus only',
      optionB: 'Ground on web search for coverage',
      defensible: 'A',
      keyPoints: [
        'Web results include competitors, resellers and stale posts about your own product',
        'The requirement is consistency with the docs, which only the docs can guarantee',
        'Coverage gaps are a documentation backlog, and the unanswered questions name it',
        'Web grounding suits questions about the world, not questions about your product',
      ],
      fieldTake:
        'Route by whose truth the answer belongs to: questions about your product are answered from your corpus or not at all. The "I do not have that documented" responses are the most valuable content roadmap you will ever get for free, so log them.',
    },
  },
  {
    id: 'ar3.hipaa.deident_vs_baa',
    mode: 'arena',
    nodeIds: ['sec.hipaa', 'sec.pii'],
    difficulty: 'deep',
    explanation:
      'De-identification strips ages, dates and identifiers that a clinical summary depends on, so it degrades the product to buy comfort rather than compliance. A BAA with in-scope services is the designed path for PHI, and the real work becomes access control and audit.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A health system wants a clinical summarization assistant. Their privacy officer suggests de-identifying every note before it reaches the model.',
      optionA: 'De-identify notes, then summarize',
      optionB: 'Send PHI to covered services under the BAA, with access controls and audit',
      defensible: 'B',
      keyPoints: [
        'De-identification removes ages, dates and identifiers that carry the clinical signal',
        'A BAA plus in-scope services is the designed path for PHI, not a workaround',
        'Imperfect de-identification gives false comfort while context still re-identifies people',
        'Minimum necessary still applies: send the relevant note, not the whole chart',
      ],
      fieldTake:
        'De-identification is the right instinct for analytics and the wrong one for clinical care, because the identifiers are the signal. Confirm the specific services are in scope, then move the conversation to access logging, which is what a privacy officer actually has to answer for.',
    },
  },
  {
    id: 'ar3.gdpr.erasure_index',
    mode: 'arena',
    nodeIds: ['sec.gdpr', 'gcp.vector_search'],
    difficulty: 'deep',
    explanation:
      'Until the weekly reindex runs, the index still serves content about a person who asked to be erased. Targeted deletion depends on subject identifiers being present in vector metadata, which is a design decision that has to be made long before the first request.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'An erasure request arrives for a person whose records were embedded into the retrieval index months ago. Your reindex job runs weekly over the whole corpus.',
      optionA: 'Delete the source records and let the weekly reindex remove the vectors',
      optionB: 'Delete the vectors directly by subject id, then delete the source',
      defensible: 'B',
      keyPoints: [
        'Between request and reindex, the index keeps serving content about that person',
        'Targeted deletion needs subject ids in vector metadata, decided at ingestion time',
        'Derived artifacts count too: caches, evaluation sets and logged prompts need the same sweep',
        'Document the deletion path before the first request, not under a legal clock',
      ],
      fieldTake:
        'The erasure question is never "can you delete the row", it is "can you enumerate everywhere the row went". Put a subject id on every derived artifact on day one, because retrofitting that after the first request means a full rebuild while a deadline runs.',
    },
  },
  {
    id: 'ar3.residency.trace_storage',
    mode: 'arena',
    nodeIds: ['sec.residency', 'ai.observability', 'sec.gdpr'],
    difficulty: 'deep',
    explanation:
      'Prompts containing personal data are personal data, and the transport being telemetry does not change that. Redaction costs reproducibility while EU-hosted storage costs you a system to run, so the justification has to name which loss you accepted.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Your EU-resident deployment sends traces to a vendor that stores data in the US, and the traces contain full prompts. The team relies on those prompts to debug bad answers.',
      optionA: 'Redact prompt and response bodies from traces and keep the vendor',
      optionB: 'Move trace storage into the EU and keep the full payloads',
      defensible: 'either',
      keyPoints: [
        'Prompts with personal data are personal data; calling the pipe telemetry changes nothing',
        'Redacted traces still carry latency, token counts and error structure, which is most debugging',
        'Keeping payloads means owning the store, its retention and its access controls',
        'Either way, prompt retention needs a stated period and a documented lawful basis',
      ],
      fieldTake:
        'The strong justification names the loss: redaction costs you the ability to reproduce a bad answer, EU-hosted storage costs you a system to operate. The weak one assumes traces are just telemetry, which is how customer prompts end up in a US index nobody declared in the DPA.',
    },
  },
  {
    id: 'ar3.tenancy.pool_vs_silo',
    mode: 'arena',
    nodeIds: ['sec.tenancy', 'del.tco', 'idp.rls'],
    difficulty: 'deep',
    explanation:
      'Two hundred silos is two hundred deployments to patch, migrate and monitor, which is a permanent tax on a single product team. Isolation in the data layer plus per-tenant keys answers most of what "dedicated" is actually asking for.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Two hundred small tenants and three large ones share one platform, and the three are asking for dedicated infrastructure. You must commit to one tenancy model this quarter.',
      optionA: 'Pooled infrastructure with tenant isolation enforced in the data layer',
      optionB: 'A dedicated stack per tenant',
      defensible: 'A',
      keyPoints: [
        'Two hundred silos is two hundred deployments to patch, migrate and monitor',
        'Row-level security and per-tenant keys answer most of what dedicated is asked for',
        'Design the pooled model so one tenant can be lifted out later without a rewrite',
        'Reserve silos for contractual cases and price them as the exception they are',
      ],
      fieldTake:
        'Ask the three large tenants which control they actually want, and it is usually key custody, an audit boundary or a noisy-neighbor guarantee. All three have pooled answers, and offering those beats committing your roadmap to operating two hundred copies of your own product.',
    },
  },
  {
    id: 'ar3.pii.redact_at_ingest',
    mode: 'arena',
    nodeIds: ['sec.pii', 'ai.rag_failure'],
    difficulty: 'deep',
    explanation:
      'Anything in a shared index can surface in someone else’s answer, so entry into the index is the trust boundary. Output-layer redaction has to catch paraphrase, which is far harder than matching a field at ingestion time.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Support transcripts feed a retrieval index used by every agent in the company, and they contain customer names, addresses and partial card numbers. Analytics also wants the raw text.',
      optionA: 'Redact identifiers before indexing and keep raw transcripts in a restricted store',
      optionB: 'Index raw transcripts and redact in the response layer',
      defensible: 'A',
      keyPoints: [
        'Anything in the index can surface in another user’s answer, so indexing is the boundary',
        'Output redaction must catch paraphrase, which is much harder than matching a field',
        'A restricted raw store still serves the analytics and audit use cases',
        'Use a stable token per entity so retrieval can still connect related transcripts',
      ],
      fieldTake:
        'The index is a distribution mechanism, so treat entry into it as the trust boundary. Tokenize rather than blank out: "customer 8814" keeps the linkage that makes retrieval useful, and nobody has to trust a regular expression running after generation.',
    },
  },
  {
    id: 'ar3.zero_trust.keys_vs_wif',
    mode: 'arena',
    nodeIds: ['sec.zero_trust', 'gcp.wif'],
    difficulty: 'edge',
    explanation:
      'A long-lived service account key exists whether or not anyone is deploying, and it outlives both the engagement and the engineer who created it. "Cannot mint OIDC tokens" is usually one small component away rather than an architectural limit.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A partner’s on-premises build server needs to deploy into the customer’s project, and their CI cannot mint OIDC tokens today. The deployment must work next week.',
      optionA: 'Issue a service account key, vault it, and rotate on a schedule',
      optionB: 'Put a small OIDC-capable step in front of the build and federate',
      defensible: 'B',
      keyPoints: [
        'A long-lived key is a credential that exists whether or not a deploy is running',
        'Rotation schedules decay, and the key outlives the engagement and the engineer',
        'Cannot mint OIDC is usually one component away, not an architectural limit',
        'If you must ship a key, bound it: one narrow service account, an expiry and an audit alert',
      ],
      fieldTake:
        'The temporary key is the most permanent object in enterprise delivery. Spend the two days on federation while you still have attention and budget, because after go-live nobody funds replacing a credential that already works.',
    },
  },
  {
    id: 'ar3.eu_ai_act.hiring_tier',
    mode: 'arena',
    nodeIds: ['sec.eu_ai_act', 'ai.guardrails'],
    difficulty: 'deep',
    explanation:
      'Candidate selection is a named high-risk use, and a human making the final call is one required oversight control rather than an exemption from the tier. The heavy obligations land at design time, so retrofitting logging and documentation onto a shipped system costs far more.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A customer’s tool ranks job applicants and a recruiter makes every final decision. They want to treat it as low risk because a human decides.',
      optionA: 'Treat it as high risk and build the documentation, logging and oversight now',
      optionB: 'Classify it as limited risk on the basis of human decision-making',
      defensible: 'A',
      keyPoints: [
        'Employment and candidate selection is a named high-risk use, and review does not reclassify it',
        'The heaviest obligations are design-time: data governance, logging, technical documentation',
        'Retrofitting record-keeping onto a shipped system costs more than building it in',
        'Meaningful human oversight is one required control, not a waiver of the others',
      ],
      fieldTake:
        'The seductive argument is that a human decides so it is only a recommendation, and it fails because ranking shapes the decision, which is the harm the tier addresses. Get the classification in writing early, because it determines the logging schema and nobody wants to change that after launch.',
    },
  },
  {
    id: 'ar3.hipaa.prompt_logging',
    mode: 'arena',
    nodeIds: ['sec.hipaa', 'ai.observability'],
    difficulty: 'edge',
    explanation:
      'Full prompt logs on a clinical assistant are a PHI store with breach-notification consequences to match, while metadata-only logging leaves some failures unreproducible. Both are defensible with a stated retention period and a named access list; neither is defensible by default.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Debugging a clinical assistant is far easier with full prompt and response logs, and those prompts contain PHI. The compliance lead asks how long you keep them.',
      optionA: 'Retain full prompts for thirty days, restricted access, full audit trail',
      optionB: 'Log metadata and hashes only, reproducing failures from the source record on demand',
      defensible: 'either',
      keyPoints: [
        'Full prompt logs are a PHI store, with breach notification consequences to match',
        'Metadata-only logging makes some failures effectively unreproducible',
        'Reproducing from source works only if inputs are deterministic and versioned',
        'Either way, the retention period and the access list belong in the risk assessment',
      ],
      fieldTake:
        'A good justification says who can read the logs and for how long, in one sentence. The failure is defaulting to logging everything because the observability tool made it easy, then discovering during a breach exercise that your debug index is the largest uncatalogued PHI store in the company.',
    },
  },
  {
    id: 'ar3.multiregion.active_passive',
    mode: 'arena',
    nodeIds: ['scale.multiregion', 'del.slo'],
    difficulty: 'deep',
    explanation:
      'Turn the availability target into minutes per year and a rehearsed failover fits inside it comfortably. Active-active forces conflict handling, split brain and data gravity onto a team that has never run a failover at all.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The customer wants 99.95 percent availability and has proposed active-active across two regions. Their session state lives in a single-region database and nobody has run a failover.',
      optionA: 'Active-passive with a rehearsed failover and a measured recovery time',
      optionB: 'Active-active from the start',
      defensible: 'A',
      keyPoints: [
        '99.95 percent allows roughly four hours a year, which a rehearsed failover fits inside',
        'Active-active forces conflict handling, split brain and data gravity up front',
        'A failover nobody has rehearsed is a document, not a capability',
        'Active-active earns itself when the target exceeds what any recovery window absorbs',
      ],
      fieldTake:
        'Do the arithmetic in the room: convert the percentage into minutes per year and ask whether a practiced thirty-minute failover fits. Most enterprise targets do, and quarterly failover drills buy more real availability than a second active region the team cannot operate.',
    },
  },
  {
    id: 'ar3.caching.answer_vs_retrieval',
    mode: 'arena',
    nodeIds: ['scale.caching', 'ai.rag_failure'],
    difficulty: 'deep',
    explanation:
      'A cached answer outlives the correction that made it wrong, which turns a fixed document into a day of incorrect responses. Retrieval and embedding are the deterministic, expensive stages and they invalidate naturally when a document changes.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'To cut latency and cost, someone proposes caching final answers for twenty-four hours keyed by question text. The underlying policy corpus is edited most days.',
      optionA: 'Cache final answers with a twenty-four hour TTL',
      optionB: 'Cache retrieval results and embeddings, and generate the answer every time',
      defensible: 'B',
      keyPoints: [
        'A cached answer outlives the edit that made it wrong, which is a support incident',
        'Retrieval and embedding are the deterministic, expensive stages and cache safely',
        'Retrieval caches invalidate naturally on document change, keyed by corpus version',
        'Generation is the cheaper part of the tail once retrieval is warm',
      ],
      fieldTake:
        'Cache the deterministic stages, not the judgment. Answer caches feel like the big win until legal changes a policy at 9am and the assistant repeats yesterday’s version until tomorrow, citing a document that now says something else.',
    },
  },
  {
    id: 'ar3.queueing.isolation',
    mode: 'arena',
    nodeIds: ['scale.queueing', 'scale.hotspots'],
    difficulty: 'deep',
    explanation:
      'The contended resource is model quota, and priority ordering inside one queue does not partition quota. Separate queues with separate quota give interactive traffic a floor that no batch run can take, and let each path carry its own retry and deadline policy.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Interactive chat and a nightly bulk classification job share one work queue and one model quota. Chat latency triples while the bulk job runs.',
      optionA: 'Separate queues with separate quota for interactive and bulk',
      optionB: 'One queue with priority ordering so chat jumps ahead',
      defensible: 'A',
      keyPoints: [
        'The scarce resource is model quota, and queue priority does not partition quota',
        'Separate quota gives interactive traffic a floor no batch run can consume',
        'Priority ordering still leaves chat behind in-flight bulk requests already holding capacity',
        'Bulk work wants different retries and deadlines, which separate paths let you set',
      ],
      fieldTake:
        'Find what is actually scarce before you tune the queue. Nine times out of ten the queue is the symptom and shared quota is the resource, and no amount of priority ordering helps once the batch job already holds the tokens.',
    },
  },
  {
    id: 'ar3.degradation.fallback_quality',
    mode: 'arena',
    nodeIds: ['scale.degradation', 'prod.model_release'],
    difficulty: 'deep',
    explanation:
      'A silent quality drop is invisible to users and to dashboards unless the fallback is labeled, while an honest failure costs completeness. The defensible answer depends entirely on what a wrong answer costs in this domain, which is what the justification must name.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'At peak, the primary model starts returning capacity errors on a small fraction of requests. You can fall back to a weaker model or return an honest retry message.',
      optionA: 'Automatic fallback to the smaller model',
      optionB: 'Fail the request politely and ask the user to retry',
      defensible: 'either',
      keyPoints: [
        'A silent quality drop is invisible to users and dashboards unless responses are labeled',
        'For low-stakes answers a slightly worse response beats no response',
        'Where advice carries consequences, a wrong answer costs more than a delay',
        'If you fall back, tag the response so evals and complaints attribute correctly',
      ],
      fieldTake:
        'The justification has to price being wrong in this specific domain, which is what separates a chat assistant from a dosing calculator. Either way, emit a fallback-rate metric, because the worst version of automatic fallback is the one where nobody notices you served the cheap model for six weeks.',
    },
  },
  {
    id: 'ar3.capacity.test_vs_feature',
    mode: 'arena',
    nodeIds: ['scale.capacity', 'del.pilot_to_prod'],
    difficulty: 'core',
    explanation:
      'A slow ramp does find limits, but real users pay for the discovery, and quota ceilings and pool limits surface at the worst possible moment. A missing feature is a conversation with a date attached; a launch-day capacity failure is a reputation.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Two weeks to launch, and you can either run a realistic load test or finish the last requested feature. The sponsor has been promised the feature.',
      optionA: 'Run the load test and ship the feature after launch',
      optionB: 'Ship the feature and ramp traffic slowly instead of load testing',
      defensible: 'A',
      keyPoints: [
        'A slow ramp discovers limits with real users paying the cost of the discovery',
        'Load tests find quota ceilings and connection pool limits before customers do',
        'A missing feature is a conversation; a launch-day capacity failure is a reputation',
        'Give the sponsor a committed date for the feature, which is usually the real ask',
      ],
      fieldTake:
        'Sponsors ask for features because that is the vocabulary they have, and not one of them wants to explain a failed launch. Trade the feature for a named date, then spend two weeks finding the connection pool ceiling before ten thousand users find it for you.',
    },
  },
  {
    id: 'ar3.progressive.prompt_canary',
    mode: 'arena',
    nodeIds: ['prod.progressive', 'ai.nondeterminism', 'prod.model_release'],
    difficulty: 'deep',
    explanation:
      'Error rate and latency do not move when a prompt change makes answers subtly worse, so a percentage canary watches the wrong signals. A quality regression needs a reader, and internal users are the cohort you can actually ask to read.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'You are releasing a prompt change whose effect is answer quality, and quality has no fast automated signal. The team’s usual canary is five percent of traffic for an hour.',
      optionA: 'Percentage canary at five percent for an hour, watching errors and latency',
      optionB: 'Cohort canary to internal users first, with humans reading a sample of outputs',
      defensible: 'B',
      keyPoints: [
        'Error rate and latency do not move when answers get subtly worse',
        'A quality regression needs a reader, and internal users can be asked to read',
        'Five percent for an hour is too few samples to see a shift in a rare failure mode',
        'Keep the percentage canary for technical failures; it is simply not the gate here',
      ],
      fieldTake:
        'Match the canary to the failure you are actually afraid of. Percentage canaries were designed for crashes and latency, and prompt changes rarely fail that way; they fail by getting blander or by dropping a caveat that mattered to one segment.',
    },
  },
  {
    id: 'ar3.model_release.pin_vs_alias',
    mode: 'arena',
    nodeIds: ['prod.model_release', 'sec.eu_ai_act'],
    difficulty: 'core',
    explanation:
      'Reproducing a decision months later requires knowing which model version produced it, and a floating alias changes the system with no change record. Pinning converts model updates into planned work gated on the eval set.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A lender must reproduce, months later, how a given decision was produced. The platform offers a floating alias that always points at the latest model.',
      optionA: 'Pin a specific model version and migrate deliberately',
      optionB: 'Track the alias and receive improvements automatically',
      defensible: 'A',
      keyPoints: [
        'Reproducibility requires knowing which model version produced a given output',
        'A floating alias changes the system with no change record, which is the audit gap',
        'Pinning turns model updates into planned work with an eval gate',
        'Record the version alongside every logged decision, not only in deployment config',
      ],
      fieldTake:
        'For a regulated workload the alias is not a convenience, it is an untracked deployment happening on someone else’s schedule. Pin the version, log it with every decision, and put the upgrade on your own calendar with the golden set as the gate.',
    },
  },
  {
    id: 'ar3.rollback.mitigate_first',
    mode: 'arena',
    nodeIds: ['prod.rollback', 'prod.incident'],
    difficulty: 'core',
    explanation:
      'Mitigation and diagnosis are separate jobs, and only the first is experienced by users. Bisecting live puts at least one more bad configuration in front of customers while you satisfy your curiosity.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Answer quality dropped sharply after a release that changed the system prompt and rebuilt the retrieval index together. Users are complaining right now.',
      optionA: 'Roll back both changes, then bisect offline',
      optionB: 'Bisect in production to identify which change caused it',
      defensible: 'A',
      keyPoints: [
        'Mitigation and diagnosis are different jobs, and users only experience the first',
        'Bisecting live puts at least one more bad configuration in front of customers',
        'Both artifacts must be independently versioned for rollback to be possible at all',
        'The underlying fault is shipping prompt and index changes as one release',
      ],
      fieldTake:
        'Restore service, then be curious. The point worth raising in the retro is not which change broke it, it is that the two were coupled in one release, which is why the answer took an hour instead of a minute.',
    },
  },
  {
    id: 'ar3.capacity.commit_vs_ondemand',
    mode: 'arena',
    nodeIds: ['scale.capacity', 'gcp.billing', 'del.tco'],
    difficulty: 'deep',
    explanation:
      'A commitment made against a forecast with a factor-of-three range is priced at the guess, not at the traffic. Four weeks of real traffic replaces the range with a distribution, and the commitment can then be sized against the observed floor.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Provisioned model throughput would guarantee capacity at peak and costs the same whether or not you use it. Your launch forecast is a guess with a factor-of-three range.',
      optionA: 'Commit to provisioned throughput sized to the mid forecast',
      optionB: 'Start on demand, measure four weeks, then commit',
      defensible: 'B',
      keyPoints: [
        'A commitment against a guess is priced at the guess, not at the traffic',
        'Four weeks of real traffic replaces a range with a distribution',
        'On demand carries contention risk at peak, so cap the cohort until the number is known',
        'Commit against the observed floor of traffic, never against the peak',
      ],
      fieldTake:
        'Buy commitments against your floor and serve the peak on demand, the same way you would size reserved capacity anywhere else. Teams that commit to the forecast end up paying for a peak that arrives two quarters late, then defending the spend instead of the architecture.',
    },
  },
  {
    id: 'ar3.tco.cost_per_outcome',
    mode: 'arena',
    nodeIds: ['del.tco', 'cust.exec_comms', 'ai.cost'],
    difficulty: 'core',
    explanation:
      'The CFO already holds a cost per resolved ticket, so any other unit has to be converted by them, usually pessimistically. Quoting cost per resolved ticket including review time survives the finance review and exposes deflection rate as the real lever.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The CFO wants your number next to their current cost per resolved support ticket. Your instinct is to quote infrastructure and model spend.',
      optionA: 'Quote infrastructure plus model spend per month',
      optionB: 'Quote cost per resolved ticket, including review time and failure handling',
      defensible: 'B',
      keyPoints: [
        'The CFO already has a per-ticket number, so any other unit gets converted by them',
        'Human review and escalations are part of the delivered outcome and belong in the number',
        'A per-outcome figure survives volume changes; a monthly total does not',
        'It also exposes deflection rate as the sensitivity, which is the honest lever',
      ],
      fieldTake:
        'Present the comparison in their unit, not yours, and include the human cost even though it makes your number worse. A per-ticket figure with review time in it survives scrutiny; an infrastructure estimate gets a silent markup applied by someone who assumes you left something out.',
    },
  },
  {
    id: 'ar3.thin_slice.riskiest_first',
    mode: 'arena',
    nodeIds: ['del.thin_slice', 'del.risk_sequencing'],
    difficulty: 'deep',
    explanation:
      'The connector is the unknown, and unknowns discovered in week ten leave no recovery time. A stubbed interface still demos, so you can buy stakeholder confidence cheaply while spending the real weeks on the thing that could end the project.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Twelve weeks to deliver. The visible part is a chat interface, and the part that could kill the project is a connector to a mainframe nobody has integrated with in a decade.',
      optionA: 'Build the interface first so stakeholders see progress',
      optionB: 'Build the connector first, with a stub interface for demos',
      defensible: 'B',
      keyPoints: [
        'The connector is the unknown, and unknowns found in week ten have no recovery time',
        'A stubbed interface still demos; stakeholders mostly need to see something move',
        'If the connector proves impossible, week three is when a redesign is still cheap',
        'Interface work is estimable, which is exactly why it can safely go later',
      ],
      fieldTake:
        'Sequence by what could end the project, not by what looks like progress. Ship a deliberately plain interface in week two so nobody feels blind, and spend the real weeks on the integration whose failure mode is that there is no project.',
    },
  },
  {
    id: 'ar3.poc_exit.accuracy_number',
    mode: 'arena',
    nodeIds: ['del.poc_exit', 'ai.evals', 'cust.expectations'],
    difficulty: 'core',
    explanation:
      'An accuracy target with no defined population or judge is unfalsifiable, and you can hit it on your chosen set and still fail the review. A business metric ties the exit criterion to the value that funded the pilot, with accuracy kept as an internal diagnostic.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The sponsor writes "95 percent accuracy" into the pilot exit criteria. Nobody has defined what a unit of accuracy is measured over or who judges it.',
      optionA: 'Accept the number and define precisely what it is measured on',
      optionB: 'Replace it with a business metric such as deflection rate at a satisfaction floor',
      defensible: 'B',
      keyPoints: [
        'Accuracy over what population, judged by whom, is where the number becomes unfalsifiable',
        'A business metric ties the exit to the value that funded the pilot',
        'Keep a technical accuracy measure as a diagnostic rather than as the gate',
        'The measurement method is agreed before any building starts, whichever you use',
      ],
      fieldTake:
        'The trap in accepting 95 percent is that you will hit it on the set you chose and still fail the review, because the sponsor was describing a feeling of reliability. Translate to the outcome they are buying, and keep accuracy as the instrument that tells you why the outcome moved.',
    },
  },
  {
    id: 'ar3.pilot_to_prod.harden_vs_rewrite',
    mode: 'arena',
    nodeIds: ['del.pilot_to_prod', 'prod.cicd'],
    difficulty: 'deep',
    explanation:
      'The valuable artifacts are the prompts, the retrieval configuration and the eval set, and those port in an afternoon, which is what makes a rewrite closer to a port. Hardening in place is defensible too, but it means inheriting decisions nobody made deliberately.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The pilot is a notebook and a Streamlit app, it works, and users like it. Production is expected in eight weeks on the customer’s standard platform.',
      optionA: 'Harden the pilot in place and deploy it as it stands',
      optionB: 'Rewrite onto the target platform, carrying over the prompts and eval set',
      defensible: 'either',
      keyPoints: [
        'The valuable artifacts are the prompts, retrieval config and eval set, not the framework',
        'Hardening a prototype means inheriting decisions nobody made deliberately',
        'A rewrite gated by a passing eval set is a port, not a restart, which is why it is fast',
        'The customer’s operations team has to run the result, and that constrains the answer',
      ],
      fieldTake:
        'The rewrite is often cheap because the intelligence lives in the prompts and the eval set, and both move in an afternoon. It stops being cheap when the notebook contains six undocumented data fixes, so go read it before you promise either path.',
    },
  },
  {
    id: 'ar3.slo.dependency_ceiling',
    mode: 'arena',
    nodeIds: ['del.slo', 'scale.degradation'],
    difficulty: 'deep',
    explanation:
      'You cannot promise availability above a hard dependency without redundancy, so the only two honest options are building the fallback or lowering the number. Both are signable; what is not signable is the higher number on the belief that the dependency is usually fine.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'A customer wants 99.9 percent on the assistant, and the model service you depend on publishes a lower availability target. Contract signature is waiting on the number.',
      optionA: 'Commit to 99.9 percent and engineer a second-provider fallback to earn it',
      optionB: 'Commit to the number your dependency supports and explain why',
      defensible: 'either',
      keyPoints: [
        'You cannot exceed a hard dependency’s availability without redundancy',
        'A second provider means a second prompt, a second eval run and ongoing drift management',
        'Availability can be defined around degraded service rather than perfect answers',
        'Whichever you sign, measure the error budget on the customer’s definition of up',
      ],
      fieldTake:
        'A good justification prices the fallback honestly, including the eval work to keep two providers behaving alike. The bad one signs 99.9 percent because the dependency is usually fine, which converts a vendor incident into your breach of contract.',
    },
  },
  {
    id: 'ar3.risk_sequencing.security_early',
    mode: 'arena',
    nodeIds: ['del.risk_sequencing', 'sec.zero_trust', 'cust.stakeholders'],
    difficulty: 'core',
    explanation:
      'The eight-week clock starts on submission, not on readiness, so waiting for a finished design spends the buffer you do not have. Early review also surfaces hard constraints while the design can still absorb them cheaply.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The customer’s security review takes eight weeks and can reject the architecture outright. Your design will not be finished for another three.',
      optionA: 'Open the review now with the design as it stands, marked provisional',
      optionB: 'Finish the design, then submit something complete',
      defensible: 'A',
      keyPoints: [
        'The eight-week queue starts when you submit, not when you feel ready',
        'Early review surfaces hard constraints while the design can still absorb them',
        'Security teams prefer being consulted over being presented to',
        'Resubmission is cheap compared with a rejection that lands after build',
      ],
      fieldTake:
        'The security reviewer is a stakeholder you design with, not a gate you pass through. Book the first conversation in week one with a diagram and a list of open questions, because their objections are cheapest to satisfy before they are load-bearing.',
    },
  },
  {
    id: 'ar3.cdc.log_vs_polling',
    mode: 'arena',
    nodeIds: ['data.cdc', 'data.quality'],
    difficulty: 'deep',
    explanation:
      'Six weeks of no pipeline is six weeks of not learning what the data actually looks like, and polling’s gaps are known and measurable. The condition that makes it defensible is naming those gaps and instrumenting reconciliation, not pretending they do not exist.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'Log-based capture on the source database needs a vendor approval that takes about six weeks. Polling an updated timestamp column can start tomorrow.',
      optionA: 'Start with timestamp polling and name its gaps explicitly',
      optionB: 'Wait for log-based capture and start clean',
      defensible: 'A',
      keyPoints: [
        'Polling misses hard deletes and any update that does not touch the timestamp',
        'Six weeks with no pipeline is six weeks of not learning what the data looks like',
        'The gaps are measurable: run periodic row-count and checksum reconciliation',
        'File the vendor approval on day one so the better path still arrives on schedule',
      ],
      fieldTake:
        'Ship the imperfect pipeline and instrument its imperfection, so a reconciliation report tells you the real error rate instead of your fears. What loses trust is polling quietly and letting someone find deleted rows still sitting in the warehouse six months later.',
    },
  },
  {
    id: 'ar3.batch_stream.index_freshness',
    mode: 'arena',
    nodeIds: ['data.batch_stream', 'ai.rag_failure'],
    difficulty: 'core',
    explanation:
      'Fifty edits a day is roughly one every ten minutes, so a few-minute batch is already indistinguishable from immediate to an author. Micro-batching also gives natural retries and a re-runnable window when embedding fails, which per-edit streaming makes into bespoke error handling.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'About fifty documents are edited a day, and authors want their edits searchable immediately. The proposal on the table is an event-driven streaming indexer.',
      optionA: 'Micro-batch the changed documents every few minutes',
      optionB: 'Event-driven streaming index updates per edit',
      defensible: 'A',
      keyPoints: [
        'Fifty edits a day is one every ten minutes, so a few-minute batch already reads as immediate',
        'Micro-batching gives natural retries and a re-runnable window when embedding fails',
        'Streaming per edit means per-document failure handling and ordering on every save',
        'Add a manual reindex button, which answers "immediately" for the case authors care about',
      ],
      fieldTake:
        'Authors mean "before I go and check", which is minutes, not milliseconds. Give them a reindex button for the document they are staring at and batch the rest, and you avoid owning an event pipeline for a workload of fifty items a day.',
    },
  },
  {
    id: 'ar3.quality.quarantine_vs_fail',
    mode: 'arena',
    nodeIds: ['data.quality', 'data.ingest_patterns'],
    difficulty: 'deep',
    explanation:
      'Partial data in a financial close is worse than no data because it looks complete, while a blocked operational dashboard costs the business every morning. The justification has to name which consumer you are protecting, and the strongest answer refuses the shared table.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'The nightly feed arrives with about three percent of rows failing validation. The same table serves an operational dashboard and the month-end financial close.',
      optionA: 'Fail the whole load and page the source team',
      optionB: 'Quarantine the bad rows, load the rest, and publish the quarantine count',
      defensible: 'either',
      keyPoints: [
        'Partial data in a financial close is worse than none, because it looks complete',
        'A blocked operational dashboard costs the business every morning it is empty',
        'Completeness metadata is the reconciler: publish row counts and quarantine counts per load',
        'The strong version splits the consumers so each gets the behavior it needs',
      ],
      fieldTake:
        'A good justification names the consumer whose failure mode you are protecting, and the best one refuses the shared table. The bad justification quarantines quietly, because three percent of rows missing with no marker is how a close gets signed off on numbers nobody can reproduce.',
    },
  },
  {
    id: 'ar3.cdc.backfill_order',
    mode: 'arena',
    nodeIds: ['data.cdc', 'data.idempotency'],
    difficulty: 'edge',
    explanation:
      'Starting the change stream before the snapshot means no change during the four-day backfill is lost, and the overlap is harmless if writes are idempotent upserts. Backfilling first only works when the source retains logs from before the backfill began.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      situation:
        'You need two billion historical rows plus a live change stream in the same table. The backfill will take about four days.',
      optionA: 'Backfill first, then start the change stream from the snapshot position',
      optionB: 'Start the change stream into a buffer first, then backfill from a consistent snapshot',
      defensible: 'B',
      keyPoints: [
        'Starting the stream first means no change during the four-day backfill is lost',
        'The snapshot must be taken at or after the stream start position for the overlap to be safe',
        'Overlap requires idempotent upserts keyed by primary key and change version',
        'Backfilling first only works if the source retains logs from before it started',
      ],
      fieldTake:
        'The safe order is stream first, snapshot second, replay the overlap, and it works because idempotent upserts make duplicates free while gaps are permanent. Check the source log retention before agreeing to a four-day backfill, because that retention window is the real deadline.',
    },
  },
];
