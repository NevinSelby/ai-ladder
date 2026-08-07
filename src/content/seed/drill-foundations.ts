import type { DrillItem } from '@shared/content';

import { cite } from '../sources';

/** GCP Foundations: identity, networking, perimeters, compute, data, ops. */
export const DRILL_FOUNDATIONS: DrillItem[] = [
  {
    id: 'f.vpc.shared',
    mode: 'drill',
    nodeIds: ['gcp.vpc', 'gcp.hierarchy'],
    difficulty: 'core',
    explanation:
      'Shared VPC lets a central network team own subnets, routes and firewall rules in a host project while application teams deploy into service projects they administer themselves. The host project holds the network; the service projects hold the workloads. It is the standard answer when a customer wants central network control without central deployment control. Which is almost every enterprise.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s network team insists on owning all subnets and firewall rules, but six product teams need to deploy their own services. What do you propose?',
      choices: [
        {
          id: 'a',
          text: 'One VPC per team, peered in a hub-and-spoke topology through a transit VPC',
          whyWrong:
            'Peering is not transitive, so spokes never reach each other through the hub. The working alternative is a full mesh of fifteen peerings nobody can reason about.',
        },
        {
          id: 'b',
          text: 'One shared project in which the network team reviews every firewall change',
          whyWrong:
            'It gives central control at the cost of every blast-radius boundary, and project-level IAM cannot keep six teams apart from each other’s resources.',
        },
        { id: 'c', text: 'Shared VPC: the network team owns the host project, teams get service projects' },
        {
          id: 'd',
          text: 'Per-team VPCs joined by Cloud VPN tunnels back to a central hub network',
          whyWrong:
            'Tunnels bring bandwidth ceilings and per-tunnel operations to reproduce what Shared VPC already does natively over the backbone.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'f.vpc.peering',
    mode: 'drill',
    nodeIds: ['gcp.vpc'],
    difficulty: 'deep',
    explanation:
      'VPC peering is not transitive: if A peers with B and B peers with C, A cannot reach C. A VPC advertises only its own subnet routes across a peering, and never re-advertises what it learned from another peer. Teams discover this after building a hub-and-spoke topology that silently does not route, usually during an integration test the week before go-live.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Network A peers with hub B. Network C also peers with hub B. Can a VM in A reach a VM in C?',
      choices: [
        {
          id: 'a',
          text: 'Yes: the hub re-advertises the routes it learned from each spoke',
          whyWrong:
            'A VPC advertises only its own subnet routes across a peering. Routes learned from one peer are never passed on to another.',
        },
        { id: 'b', text: 'No: a peering connects only the two networks attached to it' },
        {
          id: 'c',
          text: 'Yes, if the hub exports custom routes to both spokes',
          whyWrong:
            'Custom route exchange covers static and dynamic routes belonging to the hub itself, not subnet routes belonging to a different peered network.',
        },
        {
          id: 'd',
          text: 'Only when the spoke subnets sit inside the hub’s own CIDR range',
          whyWrong:
            'Overlapping ranges prevent the peering from being created at all. Address planning changes nothing about what gets advertised.',
        },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'f.psc.direction',
    mode: 'drill',
    nodeIds: ['gcp.psc', 'gcp.vpc'],
    difficulty: 'deep',
    explanation:
      'Private Service Connect works in both directions: consumer endpoints reach published services, and a service producer can publish into a consumer’s VPC. The consumer creates an endpoint backed by an address in their own range, so nothing inbound has to be opened and no CIDR negotiation is needed. That second direction is what lets you deliver software into a customer’s network without a conversation that otherwise takes weeks.',
    diagramId: 'vpcsc-vs-psc',
    citations: cite('psc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You need your managed service to be reachable from inside a customer’s VPC without them opening inbound internet access. What do you offer?',
      choices: [
        {
          id: 'a',
          text: 'A public endpoint locked down to their NAT egress ranges by allowlist',
          whyWrong:
            'Traffic still leaves to a public address, which many regulated customers forbid outright, and the allowlist breaks the day their NAT ranges change.',
        },
        {
          id: 'b',
          text: 'VPC peering between your production network and each customer VPC',
          whyWrong:
            'Peering exposes every subnet on both sides and requires non-overlapping ranges across customers whose addressing you do not control.',
        },
        {
          id: 'c',
          text: 'A dedicated Cloud VPN tunnel per customer, terminating in your VPC',
          whyWrong:
            'It works, and you inherit a tunnel, a routing negotiation and an on-call burden for every customer you onboard.',
        },
        { id: 'd', text: 'Publish it via Private Service Connect; they create the endpoint' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'f.vpcsc.egress',
    mode: 'drill',
    nodeIds: ['gcp.vpcsc'],
    difficulty: 'edge',
    explanation:
      'A perimeter blocks legitimate traffic as readily as illegitimate traffic. An egress rule is how you punch a documented, auditable hole for a specific service account calling a specific service in a specific project, and nothing else. That narrow rule is exactly the artefact a security team wants to review, rather than a perimeter someone widened or disabled to unblock a deploy.',
    citations: cite('vpcsc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'After enabling a VPC Service Controls perimeter, the customer’s nightly export to a partner project starts failing. What is the correct fix?',
      choices: [
        { id: 'a', text: 'An egress rule scoped to that service account and the partner project' },
        {
          id: 'b',
          text: 'Put the whole perimeter into dry-run mode until the nightly export completes',
          whyWrong:
            'Dry run stops enforcing for everything, not just the export. It is a good diagnostic step and a dangerous resting state.',
        },
        {
          id: 'c',
          text: 'Add the partner project to the perimeter as a protected resource',
          whyWrong:
            'That pulls a third party you do not administer inside your trust boundary, giving their whole project reach into the protected data.',
        },
        {
          id: 'd',
          text: 'Grant that service account the project owner role in both projects',
          whyWrong:
            'IAM is not the constraint here. The perimeter denies the call whatever role the principal holds, which is the entire point of it.',
        },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'f.iam.conditions',
    mode: 'drill',
    nodeIds: ['gcp.iam', 'sec.zero_trust'],
    difficulty: 'deep',
    explanation:
      'IAM conditions let you attach time, resource-name or request-attribute predicates to a binding, so the grant expires on its own rather than waiting for someone to remember it. Time-bound elevated access is the standard answer to "we need break-glass admin": it satisfies the operational need without leaving a standing privileged principal for an auditor to find.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An on-call engineer needs elevated access during incidents only. What keeps that from becoming standing privilege?',
      choices: [
        {
          id: 'a',
          text: 'A separate admin identity they sign into while an incident is open',
          whyWrong:
            'The privilege is still permanent, it simply lives on a second identity that nobody watches between incidents.',
        },
        { id: 'b', text: 'An IAM condition with an expiry, granted by a request-and-approve flow' },
        {
          id: 'c',
          text: 'A quarterly access review that strips bindings nobody has used',
          whyWrong:
            'Detective and slow. The standing privilege is available for the whole quarter that sits between two reviews.',
        },
        {
          id: 'd',
          text: 'A log-based alert that fires when the admin role is actually used',
          whyWrong:
            'Detection after the fact. It tells you the privilege was exercised; it does not stop it from standing.',
        },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'f.landing_zone.what',
    mode: 'drill',
    nodeIds: ['gcp.landing_zone', 'gcp.hierarchy'],
    difficulty: 'core',
    explanation:
      'A landing zone is the opinionated baseline, folder structure, network topology, org policies, logging sinks, identity federation, that every workload inherits. Arriving as an FDE, the first question is whether one exists: deploying into a customer with a mature landing zone is a different engagement from being the first workload in a bare organization.',
    diagramId: 'landing-zone',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'What does a landing zone typically define before any workload lands? Pick all that apply.',
      choices: [
        { id: 'a', text: 'Folder and project hierarchy with inherited org policies' },
        { id: 'b', text: 'Network topology, including shared VPC and connectivity to on-premises' },
        { id: 'c', text: 'Centralised logging and monitoring sinks' },
        { id: 'd', text: 'Identity federation from the corporate IdP' },
        { id: 'e', text: 'The application architecture for each workload', whyWrong: 'That is the workload’s business. A landing zone that dictates application design is an obstacle rather than a platform.' },
      ],
      correctIds: ['a', 'b', 'c', 'd'],
    },
  },
  {
    id: 'f.interconnect.choice',
    mode: 'drill',
    nodeIds: ['gcp.interconnect'],
    difficulty: 'core',
    explanation:
      'The deciding factors are bandwidth, latency predictability and lead time. Dedicated Interconnect gives the best performance and takes weeks to provision; Cloud VPN is available the same afternoon over the public internet. On a 90-day engagement, the lead time is usually the constraint that decides it.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each hybrid connectivity option to when you would choose it.',
      pairs: [
        { left: 'Need connectivity this week for a pilot', right: 'Cloud VPN' },
        { left: '10 Gbps sustained, predictable latency', right: 'Dedicated Interconnect' },
        { left: 'Want private connectivity without your own cross-connect', right: 'Partner Interconnect' },
        { left: 'Reaching Google APIs privately from on-prem', right: 'Private Service Connect' },
      ],
    },
  },
  {
    id: 'f.compute.gke_autopilot',
    mode: 'drill',
    nodeIds: ['gcp.gke', 'gcp.compute_choice'],
    difficulty: 'core',
    explanation:
      'Autopilot removes node management: Google runs the node pool, and you pay for requested pod resources. It is the right default when a customer wants Kubernetes semantics without a platform team. It is the wrong choice when the workload needs privileged containers, host-level access or specific node tuning, because those are exactly the levers Autopilot takes away in exchange for running the nodes for you.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer wants GKE but has no platform engineers. What pushes you toward Standard rather than Autopilot?',
      choices: [
        {
          id: 'a',
          text: 'They want to pay only for the resources their pods actually request',
          whyWrong: 'That is Autopilot’s billing model. It is an argument for Autopilot, not against it.',
        },
        {
          id: 'b',
          text: 'Their traffic is bursty and the cluster sits near idle overnight',
          whyWrong:
            'Autopilot provisions node capacity to match pod demand, so a bursty, idle-heavy profile suits it particularly well.',
        },
        {
          id: 'c',
          text: 'They want Google to patch and upgrade the control plane',
          whyWrong:
            'GKE runs the control plane in both modes. This is not a difference between Standard and Autopilot.',
        },
        { id: 'd', text: 'They need privileged DaemonSets and node-level kernel tuning' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'f.datastore.choice',
    mode: 'drill',
    nodeIds: ['gcp.spanner', 'gcp.alloydb', 'gcp.firestore', 'gcp.bigquery'],
    difficulty: 'core',
    explanation:
      'Pick by access pattern, not by prestige. Spanner earns its cost when you genuinely need horizontal write scale with strong consistency across regions; most enterprise workloads are a Postgres shape with a relational schema and joins, and reaching for Spanner there buys complexity nobody needed.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each workload to the datastore you would default to.',
      pairs: [
        { left: 'Relational schema, joins, single region, needs pgvector', right: 'AlloyDB' },
        { left: 'Globally distributed writes with strong consistency', right: 'Spanner' },
        { left: 'Analytical scans over billions of event rows', right: 'BigQuery' },
        { left: 'High-throughput time-series keyed by device', right: 'Bigtable' },
      ],
    },
  },
  {
    id: 'f.bq.slots',
    mode: 'drill',
    nodeIds: ['gcp.bigquery', 'gcp.billing', 'del.tco'],
    difficulty: 'deep',
    explanation:
      'On-demand bills per byte scanned and suits spiky, unpredictable usage; capacity pricing bills for reserved slots and wins once query volume is high and steady enough to keep the reservation busy. A month-end spike with an idle remainder is the wrong shape for a reservation. Before changing pricing model at all, take the free win: partitioning, clustering and selecting fewer columns cut the bytes scanned that the on-demand bill is computed from.',
    citations: cite('bqPartition'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s BigQuery spend is high but extremely spiky, heavy month-end, near-idle otherwise. What do you recommend?',
      choices: [
        {
          id: 'a',
          text: 'Buy an annual slot commitment sized for the month-end peak',
          whyWrong:
            'You would pay for peak capacity every day while the reservation sits idle for most of the month. Reservations reward steady load.',
        },
        {
          id: 'b',
          text: 'Move the tables to Cloud Storage and read them as external tables',
          whyWrong:
            'External tables give up partition pruning and clustering, so most queries end up scanning more bytes rather than fewer.',
        },
        { id: 'c', text: 'Stay on-demand and cut the bytes scanned first' },
        {
          id: 'd',
          text: 'Materialize every dashboard query into a nightly summary table',
          whyWrong:
            'A second pipeline to own and monitor, adopted before the free wins of partitioning and column projection have been taken.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'f.pubsub.deadletter',
    mode: 'drill',
    nodeIds: ['gcp.pubsub', 'data.quality'],
    difficulty: 'core',
    explanation:
      'Without a dead-letter topic, a permanently un-processable message is redelivered forever, consuming quota and hiding behind a subscription backlog that never drains. Setting a maximum delivery attempt count moves the poison message aside after N failures, and an alert on dead-letter depth turns a silent stall into an actionable signal with the payload still available to inspect.',
    citations: cite('pubsubOrdering'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'One malformed message is stuck in a subscription and the backlog never drains. What is missing from the design?',
      choices: [
        { id: 'a', text: 'A dead-letter topic with a maximum delivery attempt count' },
        {
          id: 'b',
          text: 'A longer acknowledgment deadline so the subscriber can finish',
          whyWrong: 'The message is not slow to handle, it is impossible to handle. Extra time changes nothing.',
        },
        {
          id: 'c',
          text: 'Exactly-once delivery enabled on that subscription',
          whyWrong:
            'Exactly-once controls duplicate delivery, not poison messages. The malformed message would still redeliver forever.',
        },
        {
          id: 'd',
          text: 'More subscriber instances to drain the backlog faster',
          whyWrong:
            'Every instance fails on the same message. Parallelism multiplies the failed attempts instead of clearing them.',
        },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'f.dataflow.windowing',
    mode: 'drill',
    nodeIds: ['gcp.dataflow', 'data.batch_stream'],
    difficulty: 'deep',
    explanation:
      'Event time is when it happened; processing time is when your pipeline saw it. Telematics from vehicles that lose signal in rural areas arrives late by definition, so windowing on processing time silently attributes an event to the wrong hour. Windowing on the event timestamp, with watermarks and an allowed lateness that matches the observed delay, is how you handle it honestly.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Telematics events sometimes arrive twenty minutes late because vehicles lose signal. Your hourly aggregates are wrong. What is the cause?',
      choices: [
        {
          id: 'a',
          text: 'Too few workers to keep pace with the incoming event rate',
          whyWrong:
            'A throughput concern. Late arrivals would still land in the wrong hour on a pipeline with unlimited workers.',
        },
        { id: 'b', text: 'The windows are keyed on processing time, not event time' },
        {
          id: 'c',
          text: 'Duplicate events are being counted more than once per window',
          whyWrong: 'Duplicates inflate a bucket’s count. They do not move an event out of one hour into another.',
        },
        {
          id: 'd',
          text: 'Allowed lateness is so high that windows never finalize',
          whyWrong:
            'Generous lateness delays when a result is emitted. It does not misattribute an event to the wrong hour.',
        },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'f.dataplex.audit',
    mode: 'drill',
    nodeIds: ['gcp.dataplex', 'sec.audit'],
    difficulty: 'core',
    explanation:
      'When an auditor asks "where did this number come from?", the answer is lineage. Catalog and lineage tooling exists precisely so that question has a machine-generated answer, captured as the pipelines run and at column granularity, rather than an analyst reconstructing it from memory three weeks later.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An auditor asks which source systems feed a regulatory report and how each field was derived. What should already exist?',
      choices: [
        {
          id: 'a',
          text: 'A data dictionary the analytics team keeps in a spreadsheet',
          whyWrong:
            'Hand-maintained documentation drifts from the pipeline the first time someone ships a change without updating it.',
        },
        {
          id: 'b',
          text: 'Data access logs for every query run against the report',
          whyWrong: 'Those answer who read the data, not which upstream systems produced each field.',
        },
        { id: 'c', text: 'Catalogued datasets with column-level lineage captured automatically' },
        {
          id: 'd',
          text: 'The pipeline source code and its full commit history',
          whyWrong:
            'Ground truth, and unreadable as evidence. An auditor cannot trace a field through a repository at review speed.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'f.observability.slo',
    mode: 'drill',
    nodeIds: ['gcp.observability', 'del.slo'],
    difficulty: 'deep',
    explanation:
      'An SLI must be measurable from the user’s perspective and tied to something you control. "Model quality" is neither. It is not continuously measurable in production without labels. Availability and latency of the serving path are, and they are what an SLO can meaningfully commit to.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which of these make workable SLIs for an AI assistant in production? Pick all that apply.',
      choices: [
        { id: 'a', text: 'Fraction of requests served without error' },
        { id: 'b', text: 'p95 time to first token' },
        { id: 'c', text: 'Fraction of answers that included at least one citation' },
        { id: 'd', text: 'Answer correctness on live traffic', whyWrong: 'Not continuously measurable without ground-truth labels on live traffic. Track it on an offline eval set instead, and do not put it in an SLO.' },
        { id: 'e', text: 'Customer satisfaction with the product overall', whyWrong: 'Lagging, confounded by everything else in the product, and not attributable to the serving path.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'f.billing.quota',
    mode: 'drill',
    nodeIds: ['gcp.billing', 'del.pilot_to_prod'],
    difficulty: 'deep',
    explanation:
      'Quota is the failure mode that ambushes pilots. A configuration that works fine at demo volume hits a per-minute or per-region ceiling the day real traffic arrives, and quota increases are reviewed by people, so they take days rather than seconds. Checking the limits for the target region and filing the requests during scoping, not during load testing, is the difference between a smooth go-live and an embarrassing one.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are scoping a pilot that will ramp to 400 requests per second in week eight. What do you do in week one?',
      choices: [
        {
          id: 'a',
          text: 'Load test in week seven and raise quota if you hit a ceiling',
          whyWrong:
            'Quota increases are reviewed by humans and can take days. Discovering the ceiling a week out is how launches slip.',
        },
        {
          id: 'b',
          text: 'Throttle clients so the pilot stays under the default limit',
          whyWrong:
            'Degrading the product to avoid an administrative request that nobody has actually made yet.',
        },
        {
          id: 'c',
          text: 'Spread the traffic over three regions so no one limit is hit',
          whyWrong:
            'Adds latency and data residency questions in order to route around a limit you could simply have raised.',
        },
        { id: 'd', text: 'Check quotas for the target region and file increases now' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'f.scc.posture',
    mode: 'drill',
    nodeIds: ['gcp.scc', 'sec.audit'],
    difficulty: 'core',
    explanation:
      'Security Command Center surfaces misconfiguration and threat findings across the org, in the customer’s own console. For an FDE the practical value is a before-and-after comparison scoped to the projects you created: it answers the CISO with evidence from their tooling rather than a promise from yours.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'The customer’s CISO asks how they will know whether your deployment weakened their posture. What do you point at?',
      choices: [
        {
          id: 'a',
          text: 'Your team’s own security checklist, signed off at each milestone',
          whyWrong: 'Your assurance about your own work. The CISO needs a finding from their tooling, not from yours.',
        },
        { id: 'b', text: 'Security Command Center findings, compared before and after' },
        {
          id: 'c',
          text: 'The provider’s SOC 2 and ISO reports for the services in scope',
          whyWrong: 'Those cover the platform itself, not the configuration you deployed on top of it.',
        },
        {
          id: 'd',
          text: 'A penetration test booked for the month after you go live',
          whyWrong:
            'Valuable, and it arrives after every decision has been made. It answers nothing during the engagement.',
        },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'f.kms.rotation',
    mode: 'drill',
    nodeIds: ['gcp.kms'],
    difficulty: 'deep',
    explanation:
      'Rotating a key creates a new primary version used for new encryptions; existing data stays readable because its original version remains enabled for decryption. This surprises people who expect rotation to re-encrypt everything. It does not, and that is precisely what makes rotation cheap enough to run on a schedule instead of as a project.',
    citations: cite('cmek'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer asks what happens to existing data when their CMEK key rotates. What is correct?',
      choices: [
        { id: 'a', text: 'Existing ciphertext stays readable under its old key version' },
        {
          id: 'b',
          text: 'Everything is re-encrypted in the background with the new version',
          whyWrong:
            'Rotation adds a new primary version, it never rewrites existing ciphertext. At petabyte scale that would be ruinous.',
        },
        {
          id: 'c',
          text: 'Reads fail until the data is re-encrypted with the new primary',
          whyWrong: 'Older versions stay enabled for decryption. If this were true, nobody could afford to rotate at all.',
        },
        {
          id: 'd',
          text: 'Nothing changes until the old key version is disabled',
          whyWrong: 'New writes use the new primary version the moment rotation happens, whatever state the old one is in.',
        },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'f.orgpolicy.regions',
    mode: 'drill',
    nodeIds: ['gcp.hierarchy', 'sec.residency'],
    difficulty: 'core',
    explanation:
      'A resource-location constraint applied at the folder is evaluated when a resource is created, so a non-compliant deployment fails at the API rather than succeeding and being caught later. It inherits to every project underneath and applies whatever tool made the call. This is the difference between a residency commitment you can demonstrate and one you can only promise.',
    diagramId: 'landing-zone',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'How do you make an EU-only residency commitment technically enforced rather than merely documented?',
      choices: [
        {
          id: 'a',
          text: 'A Terraform module whose region variable accepts EU values only',
          whyWrong:
            'Sound hygiene, and trivially bypassed by anyone using the console, gcloud, or a module you did not write.',
        },
        {
          id: 'b',
          text: 'A monthly report listing each resource and the region it runs in',
          whyWrong: 'Detective. By the time anyone reads the report, non-EU resources have been holding data for weeks.',
        },
        { id: 'c', text: 'A resource-location org policy constraint on the folder' },
        {
          id: 'd',
          text: 'A data residency clause in the statement of work you signed',
          whyWrong: 'Contractual rather than technical. It is what you argue about after an incident, not what prevents one.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'f.iam.groups',
    mode: 'drill',
    nodeIds: ['gcp.iam', 'del.handover'],
    difficulty: 'intro',
    explanation:
      'Binding roles to groups rather than individuals means access changes happen in the customer’s existing identity system, where their joiner-mover-leaver process already lives. Membership is then maintained by the people who own it, forever, without touching a single IAM policy. Binding to individuals means every staffing change becomes a ticket for you, and after handover, one that nobody files.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are setting up access for the customer’s team, knowing you hand over in twelve weeks. What do you bind roles to?',
      choices: [
        {
          id: 'a',
          text: 'Individual user accounts, edited as people join and leave',
          whyWrong:
            'Every staffing change becomes a policy edit somebody has to make, and after handover it is one nobody makes.',
        },
        {
          id: 'b',
          text: 'A shared service account whose key the team keeps in a vault',
          whyWrong: 'Audit logs then show the service account rather than the person, and no single leaver can be revoked.',
        },
        {
          id: 'c',
          text: 'Domain-wide bindings covering everyone in the organization',
          whyWrong: 'Grants far more people access than the work needs, and inherits down to every project under the org.',
        },
        { id: 'd', text: 'Groups synced from their corporate directory by their existing IdP' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'f.firestore.model',
    mode: 'drill',
    nodeIds: ['gcp.firestore'],
    difficulty: 'core',
    explanation:
      'Document stores reward designing around the read you will perform most often, because there are no joins to rescue a poor layout. Keeping the line items inside or beneath the order document makes the screen one read. The classic mistake is normalising as though it were relational and then discovering the main screen needs a round trip per row.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are modeling data in Firestore for a screen that shows an order with its line items. What is the usual right instinct?',
      choices: [
        {
          id: 'a',
          text: 'Normalize orders and line items into separate top-level collections',
          whyWrong:
            'There are no server-side joins, so the screen costs one read for the order plus one for every line item.',
        },
        { id: 'b', text: 'Denormalize the line items into or under the order document' },
        {
          id: 'c',
          text: 'Keep every entity in one collection with a type field',
          whyWrong: 'It complicates queries, indexes and security rules while buying nothing on the read path.',
        },
        {
          id: 'd',
          text: 'Mirror the relational schema and add composite indexes to compensate',
          whyWrong: 'Indexes accelerate filtering and sorting; they never join two collections. The relational assumption is what fails.',
        },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'f.wif.trust',
    mode: 'drill',
    nodeIds: ['gcp.wif', 'sec.zero_trust'],
    difficulty: 'edge',
    explanation:
      'A workload identity pool provider must constrain which external identities may exchange a token, by repository, branch, subject or audience. Omitting the attribute condition means anyone holding a token from that issuer, including any other customer of the same CI provider, can impersonate your service account. That converts a keyless setup into something worse than keys.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You configure Workload Identity Federation for GitHub Actions. What must you not omit?',
      choices: [
        {
          id: 'a',
          text: 'A rotation schedule for the key used in the token exchange',
          whyWrong: 'Federation issues short-lived tokens and involves no key at all. There is nothing to rotate.',
        },
        {
          id: 'b',
          text: 'A downloaded service account key kept as a fallback secret',
          whyWrong: 'That puts back the long-lived credential federation exists to remove, and it will be the one that leaks.',
        },
        { id: 'c', text: 'An attribute condition pinning repository and branch' },
        {
          id: 'd',
          text: 'A firewall rule for GitHub’s published runner IP ranges',
          whyWrong: 'The token exchange is not IP-bound, and hosted runner ranges change without notice.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'f.cloudrun.concurrency',
    mode: 'drill',
    nodeIds: ['gcp.compute_choice', 'ai.latency', 'del.tco'],
    difficulty: 'deep',
    explanation:
      'Cloud Run bills for instance time, and a container that spends most of a request waiting on a model API is idle, not busy. Raising concurrency lets one instance hold many in-flight requests at once, so you rent far fewer instance-seconds for the same traffic. For LLM proxying this is often a several-fold cost reduction with no latency penalty, because the bottleneck was never local CPU.',
    citations: cite('cloudRun'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your Cloud Run service mostly waits on a model API. Costs are higher than expected. What is the first lever?',
      choices: [
        { id: 'a', text: 'Raise per-instance concurrency so one instance holds many requests' },
        {
          id: 'b',
          text: 'Increase the CPU allocation so each request completes sooner',
          whyWrong: 'The container is waiting on a network call, not computing. More CPU costs more and saves nothing.',
        },
        {
          id: 'c',
          text: 'Raise the minimum instance count to stop paying for cold starts',
          whyWrong: 'Minimum instances bill whether or not traffic arrives. That raises the bill rather than lowering it.',
        },
        {
          id: 'd',
          text: 'Move the service onto GKE Autopilot and pack the pods more densely there',
          whyWrong: 'A platform migration to reach a packing density that one Cloud Run setting already gives you.',
        },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'f.logging.sinks',
    mode: 'drill',
    nodeIds: ['gcp.observability', 'sec.audit'],
    difficulty: 'core',
    explanation:
      'Compliance regimes require audit logs to be retained beyond the default window and to be tamper-evident. A sink into a bucket whose retention policy is locked satisfies both: the retention outlives the requirement and, once locked, nobody, including a project owner, can shorten it or delete the objects early. Relying on default retention is how a customer discovers in month seven that the evidence they need has aged out.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Their compliance team needs seven years of admin activity logs, tamper-evident. What do you set up?',
      choices: [
        {
          id: 'a',
          text: 'Raise the retention setting on the default logging bucket',
          whyWrong: 'Default retention falls far short of seven years, and a retention setting on its own is not tamper-evident.',
        },
        {
          id: 'b',
          text: 'A scheduled job that copies logs into cold storage nightly',
          whyWrong: 'A job that can fail silently, producing an archive nobody can prove is complete.',
        },
        {
          id: 'c',
          text: 'Turn on Access Transparency and archive those logs for seven years',
          whyWrong: 'Access Transparency records provider access to customer content, not the customer’s own admin activity.',
        },
        { id: 'd', text: 'An aggregated sink to a bucket with a locked retention policy' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'f.hierarchy.blast',
    mode: 'drill',
    nodeIds: ['gcp.hierarchy', 'sec.tenancy'],
    difficulty: 'core',
    explanation:
      'The project is the unit of blast radius, quota and billing. Putting production and non-production in one project means a runaway job in dev consumes production quota, and a compromised dev credential reaches production data, because IAM inside a project is not a boundary you can rely on. It is a finding that shows up in every security review that bothers to look.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer proposes putting dev, staging and production in one project "to keep it simple". What is your strongest objection?',
      choices: [
        {
          id: 'a',
          text: 'The Terraform layout and its state files get harder to organize',
          whyWrong: 'A tooling inconvenience, not a risk argument, and it will not persuade anyone who wants fewer projects.',
        },
        {
          id: 'b',
          text: 'Environments cannot then run in different regions',
          whyWrong: 'Not true. Region is chosen per resource, so one project can hold resources in several.',
        },
        { id: 'c', text: 'A project is one quota pool, one billing scope and one blast radius' },
        {
          id: 'd',
          text: 'Billing reports lose the per-environment breakdown',
          whyWrong: 'Real, and labels recover most of it. Cost reporting is not the reason to separate environments.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'f.alloydb.vector',
    mode: 'drill',
    nodeIds: ['gcp.alloydb', 'gcp.vector_search', 'ai.hybrid_search'],
    difficulty: 'deep',
    explanation:
      'Keeping vectors in the same database as the relational data lets a single SQL statement filter by tenant, ACL and date while ranking by vector distance. That pre-filtering is what makes top-k meaningful for a multi-tenant application, and it is the argument that usually settles the "do we need a vector database?" debate.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'What does keeping embeddings in AlloyDB alongside your relational data buy you? Pick all that apply.',
      choices: [
        { id: 'a', text: 'Pre-filtering by tenant and ACL in the same query that ranks by distance' },
        { id: 'b', text: 'Transactional consistency between a document and its embedding' },
        { id: 'c', text: 'One system to back up, monitor and secure instead of two' },
        { id: 'd', text: 'Better recall than any dedicated vector index at any scale', whyWrong: 'Overclaim. Dedicated indexes win at large scale and high query volume; the trade is real.' },
        { id: 'e', text: 'Automatic re-embedding when a document changes', whyWrong: 'Nothing does this for you. Keeping embeddings fresh is your pipeline’s job.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'f.assured.tradeoff',
    mode: 'drill',
    nodeIds: ['gcp.assured', 'del.pilot_to_prod'],
    difficulty: 'edge',
    explanation:
      'Compliance-constrained environments deliberately restrict which services and regions are available, and new capabilities reach them later than they reach the general platform. Telling a customer up front that their Assured Workloads folder will lag on the newest model configuration is far better than discovering it halfway through their security review.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What should you warn a customer about before they place the AI workload inside an Assured Workloads folder?',
      choices: [
        {
          id: 'a',
          text: 'Latency rises, because traffic is inspected at the folder boundary',
          whyWrong: 'No inspection layer is inserted. Latency follows the region you pick, which is constrained but not slow.',
        },
        { id: 'b', text: 'Fewer services and regions are available, and new ones land later' },
        {
          id: 'c',
          text: 'CMEK is unavailable, so keys stay under the provider’s control',
          whyWrong: 'The reverse: customer-managed encryption keys are among the controls such a folder can require.',
        },
        {
          id: 'd',
          text: 'Each project inside it needs a separate billing account',
          whyWrong: 'Billing is not partitioned by the folder. Those projects can use the existing billing account.',
        },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'f.psc.dns',
    mode: 'drill',
    nodeIds: ['gcp.psc', 'gcp.vpc'],
    difficulty: 'edge',
    explanation:
      'A private endpoint is only useful if the client resolves the service name to it. Without a private DNS zone overriding the public record, clients resolve the public address and traffic leaves the private path even though the endpoint exists and works. The failure is silent and looks like everything is fine until someone reads a flow log.',
    citations: cite('psc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You created a Private Service Connect endpoint but traffic still leaves via the public path. What did you most likely miss?',
      choices: [
        { id: 'a', text: 'A private DNS zone resolving the hostname to the endpoint' },
        {
          id: 'b',
          text: 'An egress firewall rule permitting traffic to the endpoint address',
          whyWrong: 'A blocked rule would drop the connection outright, not quietly reroute it over the public internet.',
        },
        {
          id: 'c',
          text: 'The consumer IAM permission on the published service attachment',
          whyWrong: 'A missing permission shows up as an authorisation error when connecting, not as a working public route.',
        },
        {
          id: 'd',
          text: 'A VPC Service Controls perimeter around the consumer project',
          whyWrong: 'A perimeter constrains data exfiltration. It does not change which address a client resolves.',
        },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'f.gke.workload_identity',
    mode: 'drill',
    nodeIds: ['gcp.gke', 'gcp.iam', 'sec.zero_trust'],
    difficulty: 'deep',
    explanation:
      'GKE Workload Identity binds a Kubernetes service account to a Google service account, so pods obtain short-lived credentials from the metadata server without a mounted key file, and each workload gets its own identity. Mounting a key as a secret is the pattern it replaces, and it is the one auditors find first.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'How should a pod in GKE authenticate to BigQuery?',
      choices: [
        {
          id: 'a',
          text: 'A service account key mounted into the pod as a Kubernetes secret',
          whyWrong: 'A long-lived credential sitting in etcd and readable by anything permitted to mount that secret.',
        },
        {
          id: 'b',
          text: 'The node’s default service account, scoped to the BigQuery API',
          whyWrong: 'Every pod on that node inherits the same identity, so per-workload least privilege is impossible.',
        },
        {
          id: 'c',
          text: 'An API key in an environment variable on the deployment',
          whyWrong: 'BigQuery does not authorise data access by API key, and env vars leak through logs and crash dumps.',
        },
        { id: 'd', text: 'Workload Identity, binding its KSA to a Google service account' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'f.bigtable.rowkey',
    mode: 'drill',
    nodeIds: ['gcp.firestore', 'data.batch_stream'],
    difficulty: 'edge',
    explanation:
      'Bigtable distributes by row key prefix, so a monotonically increasing key such as a timestamp sends every write to whichever tablet owns the current end of the key space. Leading with a well-distributed field, device id or a hashed tenant, spreads writes across tablets while keeping a per-device time range scannable. This is the single most common Bigtable design error.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A Bigtable table keyed by timestamp is hotspotting badly under write load. What is the fix?',
      choices: [
        {
          id: 'a',
          text: 'Add more nodes so the cluster can absorb the peak write rate',
          whyWrong: 'Every write still lands on the same tablet, served by one node. Capacity does not redistribute a key range.',
        },
        {
          id: 'b',
          text: 'Batch the writes into fewer, much larger mutations',
          whyWrong: 'Fewer round trips to the same hot tablet. The imbalance across tablets is unchanged.',
        },
        { id: 'c', text: 'Lead the row key with a distributed field, the device id' },
        {
          id: 'd',
          text: 'Reverse the timestamp so newest rows sort first',
          whyWrong: 'A reversed timestamp still produces one moving hotspot, simply at the other end of the key space.',
        },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'f.terraform.state',
    mode: 'drill',
    nodeIds: ['gcp.landing_zone', 'del.handover'],
    difficulty: 'core',
    explanation:
      'Infrastructure the customer cannot reproduce is infrastructure you can never leave. Checked-in configuration with remote state in their own project means handover is a repository transfer rather than an ongoing dependency on the person who clicked through the console and can no longer remember which checkbox mattered.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are three weeks in and moving fast. What is the strongest argument against configuring things in the console for now?',
      choices: [
        { id: 'a', text: 'Anything not in code is something the customer cannot reproduce later' },
        {
          id: 'b',
          text: 'Clicking through the console is slower than writing config',
          whyWrong: 'It is usually faster in the moment, which is exactly why the shortcut is tempting and the debt accrues.',
        },
        {
          id: 'c',
          text: 'Console changes are not captured in any audit log',
          whyWrong: 'They appear in admin activity logs. Auditability is not the gap here; reproducibility is.',
        },
        {
          id: 'd',
          text: 'Org policies cannot be applied from the console',
          whyWrong: 'They can. Org policy is fully manageable in the console, so this is not the reason to avoid it.',
        },
      ],
      correctId: 'a',
    },
  },
];
