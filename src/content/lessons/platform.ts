import type { Lesson } from '@shared/lessons';

import { cite } from '../sources';

/** GCP foundations, the AI platform, and the security controls that gate deals. */
export const LESSONS_PLATFORM: Lesson[] = [
  {
    id: 'l.vpcsc',
    nodeIds: ['gcp.vpcsc'],
    title: 'VPC Service Controls',
    hook: 'A perimeter around your data that valid credentials cannot cross.',
    essence:
      'VPC Service Controls draws a boundary around a set of projects and their Google APIs. Inside the perimeter everything works normally; a request that would move data across the boundary is refused, whatever IAM says. It is an exfiltration control, not an authentication one.',
    inPractice:
      'When a security architect says the risk that worries them is an authorised engineer copying a dataset somewhere personal, this is the control that answers it. Nothing about roles or network paths addresses that threat, because the person already has both.',
    gotcha:
      'It is constantly confused with Private Service Connect. PSC changes the path traffic takes; VPC-SC changes what may leave. A credentialed insider is stopped only by the perimeter. Expect legitimate jobs to break the day you enable it. That is the control working, and the fix is a scoped egress rule, not turning it off.',
    keyPoints: [
      'Blocks data movement across a project boundary even for valid credentials',
      'Complements, does not replace, private connectivity',
      'Run it in dry-run first, then add egress rules for the jobs it catches',
    ],
    diagramId: 'vpcsc-vs-psc',
    citations: cite('vpcsc'),
  },
  {
    id: 'l.psc',
    nodeIds: ['gcp.psc'],
    title: 'Private Service Connect',
    hook: 'Reaching a service privately, in either direction.',
    essence:
      'Private Service Connect gives a service a private address inside a VPC. Consumers reach Google APIs or a partner service without traffic leaving private address space, and a producer can publish a service directly into a customer network.',
    inPractice:
      'The producer direction is the one that unlocks enterprise deals. Instead of asking a customer to permit inbound internet access, a conversation measured in weeks, you publish the service and they create an endpoint on their side.',
    gotcha:
      'Creating the endpoint is only half of it. If DNS still resolves the service name to its public address, traffic quietly keeps taking the public path and everything looks fine. You need a private DNS zone overriding that record, and the failure is silent until someone reads a flow log.',
    keyPoints: [
      'Private addressing for both consuming and publishing a service',
      'Removes the inbound-firewall conversation from enterprise onboarding',
      'Without a private DNS override the endpoint is bypassed silently',
    ],
    diagramId: 'vpcsc-vs-psc',
    citations: cite('psc'),
  },
  {
    id: 'l.wif',
    nodeIds: ['gcp.wif', 'idp.service_auth'],
    title: 'Workload Identity Federation',
    hook: 'Authenticate external workloads without ever issuing a key.',
    essence:
      'Workload Identity Federation lets an external identity provider, GitHub Actions, AWS, any OIDC issuer, exchange its own token for short-lived Google credentials. No service account key is created, distributed, or rotated, because none exists.',
    inPractice:
      'When a customer says their security policy forbids long-lived credentials, this is the answer, and offering it before being asked reliably shortens a security review. It is also the fix for the service account key someone emailed around last year.',
    gotcha:
      'The attribute condition is not optional. Without one restricting which repository, branch or subject may exchange a token, anyone holding a token from that issuer can impersonate your service account. Which is worse than the key you removed.',
    keyPoints: [
      'Short-lived credentials minted per request; nothing to rotate',
      'The standard answer to "we do not allow exported keys"',
      'Always constrain by repository, branch or subject',
    ],
    citations: cite('wif'),
  },
  {
    id: 'l.cmek',
    nodeIds: ['gcp.kms'],
    title: 'CMEK and what it proves',
    hook: 'Key custody is a real control. It is not the control people think it is.',
    essence:
      'Customer-managed encryption keys put the key in the customer’s KMS rather than the provider’s. They can rotate it, and critically they can disable it, which renders the data unreadable. That kill switch is the substance of CMEK.',
    inPractice:
      'Customers ask for CMEK to satisfy a control that says they must hold their own keys. Confirm which control they are answering, because the answer changes whether CMEK alone is sufficient or whether Assured Workloads and access-transparency logging also need to be in scope.',
    gotcha:
      'CMEK does not mean the provider cannot see the data. Services decrypt in order to operate on it. Claiming otherwise in front of a security team that knows the difference costs you the room. Rotation is also cheaper than people expect: existing data stays readable under its old key version, so nothing is re-encrypted.',
    keyPoints: [
      'The real power is disabling the key, not owning it',
      'Does not prove the provider never accessed plaintext',
      'Rotation creates a new primary; old data stays readable',
    ],
    citations: cite('cmek'),
  },
  {
    id: 'l.assured',
    nodeIds: ['gcp.assured', 'sec.residency'],
    title: 'Assured Workloads',
    hook: 'Residency the platform enforces, rather than residency you promise.',
    essence:
      'Assured Workloads applies a compliance regime to a folder: which regions resources may be created in, who may access them, and how keys are managed. The constraints are evaluated when a resource is created, so a non-compliant deployment fails rather than succeeding quietly.',
    inPractice:
      'This is the difference between telling an auditor you intend to keep data in the EU and demonstrating that the platform refuses to create a resource anywhere else. It converts a policy into a technical control you can show.',
    gotcha:
      'The trade is availability of the newest things. A compliance-constrained folder has a restricted service and region set, and new capabilities reach it later. Warn the customer before the workload lands there, not during their security review, or you will be explaining why the model configuration you demoed is unavailable.',
    keyPoints: [
      'Enforced at resource creation, not audited afterwards',
      'Constrains region, personnel access and key management together',
      'Newest services and configurations arrive there late',
    ],
    diagramId: 'landing-zone',
    citations: cite('assured'),
  },
  {
    id: 'l.landing_zone',
    nodeIds: ['gcp.landing_zone', 'gcp.hierarchy'],
    title: 'Landing zones and org policy',
    hook: 'The baseline every workload inherits before it exists.',
    essence:
      'A landing zone is the opinionated foundation of a cloud estate: folder hierarchy, network topology, org policy constraints, logging sinks and identity federation. Workloads land inside it and inherit its guardrails automatically.',
    inPractice:
      'Your first question arriving at a customer is whether one exists. Deploying into a mature landing zone is a different engagement from being the first workload in a bare organization, in the second case you are building the foundation, and that belongs in the estimate.',
    gotcha:
      'Org policy constraints are preventive and evaluated at creation time, which is what makes them worth more than any dashboard. A detective control tells you a service account key was created; a constraint means one cannot be. Reach for the preventive version whenever it exists.',
    keyPoints: [
      'Hierarchy, network, policy, logging and identity, decided once',
      'Its absence is scope, not a detail',
      'Prefer constraints that prevent over findings that report',
    ],
    diagramId: 'landing-zone',
    citations: cite('waf'),
  },
  {
    id: 'l.geap',
    nodeIds: ['gcp.geap', 'gcp.agent_engine'],
    title: 'Gemini Enterprise Agent Platform',
    hook: 'What Vertex AI became, and why the name matters.',
    essence:
      'At Cloud Next ’26 Vertex AI was rebranded to the Gemini Enterprise Agent Platform, and Vertex capabilities now ship through it rather than as a standalone product. It bundles model access, a code-first kit for authoring agents, a managed runtime with persistent sessions and memory, and the enterprise governance layer around all of it.',
    inPractice:
      'Use the current vocabulary in customer conversations. An architect judges whether you have deployed recently by whether you are using last year’s product names, and getting this one wrong is unusually visible because the rename was recent and widely covered.',
    gotcha:
      'A customer’s architecture document written last year will say Vertex AI Agent Builder. That is a rename and a consolidation, not a deprecation, telling them their platform was discontinued is a memorable error in the wrong direction.',
    keyPoints: [
      'Vertex roadmap now ships through the agent platform',
      'Agent Engine is the managed runtime; ADK is the code-first kit',
      'Old documents will use the old name; it is the same thing',
    ],
    citations: cite('geap', 'agentEngine'),
  },
  {
    id: 'l.model_armor',
    nodeIds: ['gcp.model_armor', 'ai.guardrails'],
    title: 'Model Armor and injection surfaces',
    hook: 'Screening prompts, responses and tool calls at runtime.',
    essence:
      'Model Armor inspects what goes into and out of a model, prompts, responses, and the tool calls an agent proposes, looking for prompt injection, sensitive data and harmful content. It is a runtime control sitting alongside the model rather than inside it.',
    inPractice:
      'Place it on all three surfaces. Screening the user turn is the obvious one and the least valuable, because the authenticated user is rarely the attacker.',
    gotcha:
      'The dangerous injection arrives inside content the model was asked to read. A retrieved document, a ticket, an email. Screening only what the user typed leaves the real hole open. Screening the proposed tool call is what stops a successful injection from becoming an action taken.',
    keyPoints: [
      'Indirect injection through retrieved content is the real threat',
      'Gate the tool call, not just the text',
      'A runtime control, not a substitute for scoped permissions',
    ],
    diagramId: 'agent-loop',
    citations: cite('modelArmor'),
  },
  {
    id: 'l.tenancy',
    nodeIds: ['sec.tenancy'],
    title: 'Tenancy models',
    hook: 'Every isolation choice is a blast-radius versus unit-cost trade.',
    essence:
      'Shared infrastructure with row-level isolation is cheapest and has the widest blast radius. A project per tenant inverts both. Running inside the customer’s own cloud account gives them their perimeter and gives you the hardest operational job.',
    inPractice:
      'Regulated customers routinely pay for isolation, so this is a commercial conversation as much as a technical one. Knowing which model you are selling belongs in scoping, not in deployment, retrofitting isolation after the fact is close to a rewrite.',
    gotcha:
      'Shared tenancy is where permission bugs become incidents. Row-level security in the database is the backstop worth having: a developer who forgets a tenant filter gets no rows rather than everyone’s rows.',
    keyPoints: [
      'Cost and blast radius move in opposite directions',
      'The choice is a scoping decision, not a deployment detail',
      'Row-level security turns a likely leak into an impossible one',
    ],
    diagramId: 'tenancy-models',
    citations: cite('waf'),
  },
  {
    id: 'l.residency',
    nodeIds: ['sec.residency', 'gcp.ai_residency'],
    title: 'Data residency',
    hook: 'Where bytes rest, and where they are processed.',
    essence:
      'Residency commitments generally cover both storage and processing. Over a hundred and thirty jurisdictions now have data-protection legislation with rules about where data may live and when it may cross a border.',
    inPractice:
      'For an AI workload the processing half is the one that bites. A customer who has pinned storage to an EU region but calls a model endpoint serving from elsewhere has not met their commitment, and prompt content leaving the region is a transfer.',
    gotcha:
      'The primary data path is the one everybody checks. Residency fails through side channels: logs shipped to a central project in another region, traces sent to a third-party observability vendor, error reporting that includes request payloads. Those are the paths that fail an audit, because nobody drew them on the architecture diagram.',
    keyPoints: [
      'Processing location counts, not just storage',
      'Logs, traces and error reports are the usual leak',
      'Constrain it with policy so non-compliant creation fails',
    ],
    citations: cite('genaiSecurity'),
  },
  {
    id: 'l.compute_choice',
    nodeIds: ['gcp.compute_choice', 'del.handover'],
    title: 'Choosing a runtime',
    hook: 'The deciding question is who operates it after you leave.',
    essence:
      'Cloud Run, GKE Autopilot and GKE Standard can all run your container. They differ in how much platform work the receiving team inherits: none, some, and a cluster with an upgrade cadence.',
    inPractice:
      'Ask how many platform engineers the customer has. A team with none inherits a GKE Standard cluster as a liability, and it will rot within two quarters. Cloud Run hands back something four backend engineers can actually keep alive.',
    gotcha:
      'For an AI proxy specifically, per-instance concurrency is the cost lever nobody touches. A container that spends most of a request waiting on a model API is idle, not busy, raising concurrency lets one instance serve many in-flight requests, often a several-fold saving with no latency penalty.',
    keyPoints: [
      'Optimize for who operates it, not for capability',
      'Kubernetes is a commitment, not a deployment target',
      'Raise concurrency before raising CPU on an I/O-bound service',
    ],
    citations: cite('cloudRun'),
  },
  {
    id: 'l.bigquery_cost',
    nodeIds: ['gcp.bigquery', 'del.tco'],
    title: 'BigQuery cost shape',
    hook: 'On-demand bills per byte scanned, so pruning beats tuning.',
    essence:
      'On-demand BigQuery charges for bytes scanned. Partitioning prunes whole partitions before the scan starts; clustering sorts within a partition and helps selective filters. Capacity pricing reserves compute instead, and wins once load is high and steady.',
    inPractice:
      'When a bill triples after a dashboard ships, work in order: partition the fact table and make the dashboard filter on it, stop selecting every column, then cluster. Reservations are the answer to steady load, not to spiky load. A reservation idle for three weeks a month is worse than on-demand.',
    gotcha:
      'Selecting every column defeats partitioning and clustering together, because the engine must read every column regardless of how well the table is organized. The single cheapest fix is usually the projection, not the schema.',
    keyPoints: [
      'Partition first, cluster second, materialise last',
      'Reservations reward steady load; spiky load stays on-demand',
      'A wildcard projection undoes your table design',
    ],
    citations: cite('bqPartition'),
  },
];
