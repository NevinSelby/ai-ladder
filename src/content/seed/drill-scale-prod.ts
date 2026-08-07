import type { DrillItem } from '@shared/content';

import { cite } from '../sources';

/**
 * Scaling, reliability and productionizing.
 *
 * The gap between a working pilot and a system on call. Almost none of it is
 * model quality, and almost all of it is what an FDE is actually asked to fix
 * once the demo has already gone well.
 */
export const DRILL_SCALE_PROD: DrillItem[] = [
  // ── Scaling & reliability ────────────────────────────────────────────────
  {
    id: 'sc.load.peak',
    mode: 'drill',
    nodeIds: ['scale.load_shape', 'scale.capacity'],
    difficulty: 'core',
    explanation:
      'Averages hide the shape. Twelve thousand agents starting at 09:00 in one timezone is a different system from the same daily volume spread evenly. Ask for the peak-to-average ratio and when the peak falls, because that pair sizes everything downstream.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer says "about 200,000 requests a day". What do you ask next?',
      choices: [
        { id: 'a', text: 'What the monthly total across all of their tenants comes to', whyWrong: 'The same number at a coarser resolution, which hides the shape even further.' },
        { id: 'b', text: 'How many named users the system has in total', whyWrong: 'Useful context, and it says nothing about the concurrency you have to survive.' },
        { id: 'c', text: 'What the peak minute looks like, and when it falls' },
        { id: 'd', text: 'What latency their current system delivers today', whyWrong: 'A different question, and one you answer after you know the shape of the load.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'sc.pooling.serverless',
    mode: 'drill',
    nodeIds: ['scale.pooling', 'gcp.alloydb'],
    difficulty: 'deep',
    explanation:
      'Each serverless instance opening its own pool multiplies connections by instance count, and Postgres exhausts its connection limit long before the compute tier breaks a sweat. A pooler in front of the database is the standard fix; raising max_connections trades one failure for memory pressure.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Under load your serverless service starts failing with "too many connections" to Postgres. What is the fix?',
      choices: [
        { id: 'a', text: 'Raise max_connections on the Postgres instance', whyWrong: 'Each connection costs memory. You trade a connection error for an out-of-memory one.' },
        { id: 'b', text: 'Add a read replica and route queries to it', whyWrong: 'Splits read load and does nothing about connection count from the write path.' },
        { id: 'c', text: 'Cap the maximum number of concurrent service instances', whyWrong: 'Caps your own throughput to work around a pooling problem you have not fixed.' },
        { id: 'd', text: 'A connection pooler, with a small pool per instance' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'sc.hotkey',
    mode: 'drill',
    nodeIds: ['scale.hotspots', 'sec.tenancy'],
    difficulty: 'deep',
    explanation:
      'In a shared multi-tenant system the largest tenant becomes a hot partition, and their traffic degrades everyone. Isolating them, a dedicated shard, a separate pool, or their own deployment, is the usual answer, and it is a commercial conversation as much as a technical one.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'One tenant is 60% of your traffic and their spikes degrade everyone else. What do you propose?',
      choices: [
        { id: 'a', text: 'Rate limit them down to the average tenant’s quota', whyWrong: 'Punishes your largest customer for being large. That conversation goes badly.' },
        { id: 'b', text: 'Isolate them on dedicated capacity, and price it' },
        { id: 'c', text: 'Scale the shared tier to absorb their peak traffic', whyWrong: 'Everyone pays for one tenant’s peak, permanently, including tenants who never spike.' },
        { id: 'd', text: 'Put a cache in front of the shared read path', whyWrong: 'Helps only if their traffic is cacheable, and leaves the noisy-neighbor structure intact.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'sc.retry.storm',
    mode: 'drill',
    nodeIds: ['scale.timeouts', 'data.rate_limits'],
    difficulty: 'edge',
    explanation:
      'When a dependency slows down, synchronised retries multiply load on the thing that is already struggling and convert a slowdown into an outage. Jitter, a retry budget capping the fraction of traffic that may be retries, and a circuit breaker that stops calling a dead dependency are the three that matter.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A dependency degrades and your service makes it worse. Which controls prevent that? Pick all that apply.',
      choices: [
        { id: 'a', text: 'Exponential backoff with jitter' },
        { id: 'b', text: 'A retry budget capping retries as a share of total traffic' },
        { id: 'c', text: 'A circuit breaker that stops calling a failing dependency' },
        { id: 'd', text: 'Retrying more aggressively so requests eventually get through', whyWrong: 'The behavior that turns a slowdown into an outage.' },
        { id: 'e', text: 'Removing timeouts so calls are never abandoned', whyWrong: 'Threads pile up waiting and the service exhausts its own capacity.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'sc.degradation',
    mode: 'drill',
    nodeIds: ['scale.degradation', 'client.error_states'],
    difficulty: 'deep',
    explanation:
      'A degraded answer usually beats no answer. When the reranker is unavailable, serving unranked retrieval with a visible note is better than a 500, and it is a decision to make deliberately at design time, not one to improvise during an incident.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your reranker is down but retrieval and generation work. What should the system do?',
      choices: [
        { id: 'a', text: 'Serve unranked results with a visible quality note' },
        { id: 'b', text: 'Return an error until the reranker recovers', whyWrong: 'Withholds a usable answer over what is only a quality optimization.' },
        { id: 'c', text: 'Skip reranking silently and serve as normal', whyWrong: 'Users get unexplained worse answers and lose trust in the whole system.' },
        { id: 'd', text: 'Retry the reranker until it eventually responds', whyWrong: 'Turns a degraded feature into a hung request the user cannot escape.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'sc.cache.what',
    mode: 'drill',
    nodeIds: ['scale.caching', 'ai.cost'],
    difficulty: 'deep',
    explanation:
      'Caching a full answer keyed on the question text is tempting and mostly useless, real questions are near-unique, and a stale hit serves outdated policy. The layers that pay are embeddings, retrieval results for identical queries, and the model provider’s own prompt cache on the stable prefix.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which caching layers genuinely pay off in a RAG system? Pick all that apply.',
      choices: [
        { id: 'a', text: 'Embeddings for unchanged documents' },
        { id: 'b', text: 'Provider-side prompt caching on the stable prefix' },
        { id: 'c', text: 'Retrieval results for exactly repeated queries, with a short TTL' },
        { id: 'd', text: 'Final answers keyed on question text', whyWrong: 'Hit rate is near zero because real questions are unique, and a hit risks serving a stale answer after the source changed.' },
        { id: 'e', text: 'The system prompt in application memory', whyWrong: 'Not a cost or latency cost worth caching; it is a string you already have.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'sc.n_plus_one',
    mode: 'drill',
    nodeIds: ['scale.n_plus_one', 'ai.agents'],
    difficulty: 'core',
    explanation:
      'The agent equivalent of N+1 is a loop that calls a tool once per item. Ten items in testing is fine; four hundred in production is four hundred sequential round trips. A batch tool that takes a list turns the loop into one call.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your agent looks up each of 400 order ids with a separate tool call. What do you change?',
      choices: [
        { id: 'a', text: 'Run the 400 tool calls in parallel batches', whyWrong: 'Better wall-clock, and still 400 calls hammering the customer’s API quota.' },
        { id: 'b', text: 'Raise the agent step limit to cover the loop', whyWrong: 'Permits the problem to continue rather than removing it.' },
        { id: 'c', text: 'A batch tool that accepts a list of ids' },
        { id: 'd', text: 'Switch to a faster model for the loop step', whyWrong: 'The time is spent in the tool calls, not in generation.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'sc.coldstart',
    mode: 'drill',
    nodeIds: ['scale.autoscaling', 'del.tco'],
    difficulty: 'core',
    explanation:
      'Scale-to-zero is cheapest and makes the first user after an idle period wait for a cold start. A small minimum instance count buys away the worst of that; whether it is worth it depends entirely on whether the traffic is interactive.',
    citations: cite('cloudRun'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An internal tool used a few times an hour has a slow first request. What is the proportionate fix?',
      choices: [
        { id: 'a', text: 'Move the service onto always-on virtual machines', whyWrong: 'Overcorrects, and adds patching and capacity management for a low-traffic tool.' },
        { id: 'b', text: 'Have the client retry once on the first timeout', whyWrong: 'Makes the user wait twice for the same result.' },
        { id: 'c', text: 'Ping the service on a schedule to keep it warm', whyWrong: 'The hack that predates minimum instances, and it breaks silently when the schedule stops.' },
        { id: 'd', text: 'A minimum instance count of one, idle cost priced' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'sc.queue.leveling',
    mode: 'drill',
    nodeIds: ['scale.queueing', 'scale.degradation'],
    difficulty: 'deep',
    explanation:
      'A queue converts a spike you cannot serve into a delay you can. It is the right answer when the work tolerates latency, batch document processing, re-indexing, and the wrong answer for an interactive request, where the user is waiting and a queue just hides the wait.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Nightly document ingestion spikes to ten times your steady rate. What do you do?',
      choices: [
        { id: 'a', text: 'Autoscale the workers to meet the nightly spike', whyWrong: 'You pay for peak capacity, and push the spike onto every downstream dependency.' },
        { id: 'b', text: 'Queue the work and drain at a sustainable rate' },
        { id: 'c', text: 'Reject anything above the steady ingestion rate', whyWrong: 'Drops the customer’s data to protect your own capacity.' },
        { id: 'd', text: 'Process it synchronously with a very long timeout', whyWrong: 'Ties up capacity for hours and fails as a single unit if anything goes wrong.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'sc.multiregion.residency',
    mode: 'drill',
    nodeIds: ['scale.multiregion', 'sec.residency'],
    difficulty: 'edge',
    explanation:
      'The usual disaster-recovery instinct, replicate to a second region, can breach a residency commitment in one configuration change. For an EU-only customer the failover region must also be in the EU, and that constrains which regions and which service configurations are available.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An EU-residency customer asks for multi-region failover. What constrains the design?',
      choices: [
        { id: 'a', text: 'The failover region must be in the EU as well' },
        { id: 'b', text: 'DR replication is exempt from residency rules', whyWrong: 'It is not exempt. A replica is a copy of the data, sitting in another place.' },
        { id: 'c', text: 'Only backups have to stay inside the EU boundary', whyWrong: 'Replicas are live copies and are squarely in scope, backups or not.' },
        { id: 'd', text: 'Encryption in transit between regions is sufficient', whyWrong: 'Residency is about where data rests and is processed, not how it travels.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'sc.horizontal.state',
    mode: 'drill',
    nodeIds: ['scale.horizontal', 'ai.memory'],
    difficulty: 'core',
    explanation:
      'The moment a second instance exists, anything held in process memory becomes a coin flip. Conversation state, rate-limit counters and session data all have to move to a shared store before horizontal scaling means anything.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'You are adding a second instance of an agent service. What must leave process memory first? Pick all that apply.',
      choices: [
        { id: 'a', text: 'Conversation and session state' },
        { id: 'b', text: 'Rate-limit counters' },
        { id: 'c', text: 'In-flight job tracking' },
        { id: 'd', text: 'The compiled prompt templates', whyWrong: 'Immutable and identical on every instance, no reason to externalise it.' },
        { id: 'e', text: 'The loaded configuration', whyWrong: 'Same config on every instance; it is read at startup, not mutated.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Productionizing ──────────────────────────────────────────────────────
  {
    id: 'pr.migration.expand',
    mode: 'drill',
    nodeIds: ['prod.migrations', 'prod.rollback'],
    difficulty: 'deep',
    explanation:
      'Expand and contract keeps every intermediate state deployable: add the new column, write both, backfill, switch reads, then remove the old one in a later release. Renaming in one step means the old code and the new schema are never simultaneously valid, so there is no rollback.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the steps for renaming a column with zero downtime.',
      steps: [
        'Add the new column alongside the old one',
        'Deploy code that writes both and reads the old one',
        'Backfill the new column and verify they agree',
        'Deploy code that reads the new column, then drop the old one in a later release',
      ],
    },
  },
  {
    id: 'pr.rollback.reversible',
    mode: 'drill',
    nodeIds: ['prod.rollback', 'prod.migrations'],
    difficulty: 'deep',
    explanation:
      'Rollback plans quietly assume everything is reversible. Code usually is; a destructive schema change, a consumed message, a sent email and a rotated key are not. Knowing which parts of a release are one-way is what makes the plan real.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which parts of a release are genuinely NOT reversible by rolling back the deployment? Pick all that apply.',
      choices: [
        { id: 'a', text: 'A dropped column' },
        { id: 'b', text: 'Emails already sent to customers' },
        { id: 'c', text: 'Messages consumed and acknowledged from a queue' },
        { id: 'd', text: 'A container image version', whyWrong: 'Redeploy the previous tag: this is the reversible part everyone thinks of.' },
        { id: 'e', text: 'A feature flag turned on', whyWrong: 'Turn it off. Flags exist precisely to be reversible.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'pr.progressive.canary',
    mode: 'drill',
    nodeIds: ['prod.progressive', 'ai.evals'],
    difficulty: 'deep',
    explanation:
      'For a non-deterministic system, percentage rollout is only half the story: you also need a metric that would actually reveal harm. Pair the canary with the offline eval as a gate and an online signal, thumbs-down rate, escalation rate, that you watch during the ramp.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are rolling out a new prompt to 5% of traffic. What makes that a real canary rather than theatre?',
      choices: [
        { id: 'a', text: 'Waiting a full 24 hours before increasing the share', whyWrong: 'Time without a metric is just delay. Nothing about waiting reveals harm.' },
        { id: 'b', text: 'A pre-agreed online signal with a rollback threshold' },
        { id: 'c', text: 'Rolling out to internal users before real customers', whyWrong: 'Useful, and not representative of real traffic or the questions real users ask.' },
        { id: 'd', text: 'Having the rollback procedure written down first', whyWrong: 'Necessary, and it only helps if something tells you when to use it.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'pr.model.pin',
    mode: 'drill',
    nodeIds: ['prod.model_release', 'ai.nondeterminism'],
    difficulty: 'deep',
    explanation:
      'A floating model alias means the provider can change your system’s behavior without you deploying anything. Pinning a specific version and upgrading deliberately, behind the eval set, keeps model changes inside your release process where they can be reviewed and reverted.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Why pin a specific model version rather than using a floating "latest" alias in production?',
      choices: [
        { id: 'a', text: 'A pinned version is billed at a lower rate', whyWrong: 'Pricing is per model, not per pinning strategy. There is no discount for pinning.' },
        { id: 'b', text: 'Floating aliases are less reliably available', whyWrong: 'Availability is the same. What differs is the predictability of the behavior.' },
        { id: 'c', text: 'Pinning shaves measurable latency off each call', whyWrong: 'No relationship. Routing to a pinned version is not faster than routing to an alias.' },
        { id: 'd', text: 'The provider could change behavior with no deploy' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'pr.secrets.rotation',
    mode: 'drill',
    nodeIds: ['prod.config'],
    difficulty: 'core',
    explanation:
      'A rotation procedure that requires simultaneous change everywhere gets deferred until it is skipped. Supporting two valid credentials during an overlap window makes rotation a routine, non-scary operation. Which is the only way it actually happens on schedule.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What makes credential rotation something a team will actually do on schedule?',
      choices: [
        { id: 'a', text: 'A calendar reminder that fires every 90 days', whyWrong: 'Reminds you to do the scary thing. It does not make the thing any less scary.' },
        { id: 'b', text: 'A thoroughly documented rotation procedure', whyWrong: 'A long document describing a risky simultaneous change still gets deferred.' },
        { id: 'c', text: 'Both old and new credentials valid in an overlap' },
        { id: 'd', text: 'Doing the rotation inside a planned maintenance window', whyWrong: 'Makes it a bigger event, so it happens less often rather than more.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'pr.oncall.alerts',
    mode: 'drill',
    nodeIds: ['prod.oncall', 'del.slo'],
    difficulty: 'deep',
    explanation:
      'Every page should correspond to something a human must do now. Alerting on symptoms users feel, error rate, latency, budget burn, keeps that true. Alerting on causes like CPU produces pages for conditions that are often fine and trains people to ignore the pager.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What should page a human at 3am?',
      choices: [
        { id: 'a', text: 'Error budget burning fast enough to breach SLO' },
        { id: 'b', text: 'CPU utilization sustained above eighty percent', whyWrong: 'Often entirely healthy. Pages for this teach people to ignore the pager.' },
        { id: 'c', text: 'Any unhandled error appearing in the log stream', whyWrong: 'Guarantees alert fatigue inside a week, and the real page gets missed with it.' },
        { id: 'd', text: 'A production deployment finishing successfully', whyWrong: 'Information, not an incident. Nothing here needs a human awake at 3am.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'pr.incident.comms',
    mode: 'drill',
    nodeIds: ['prod.incident', 'cust.bad_news'],
    difficulty: 'deep',
    explanation:
      'During an incident the customer needs to know you are aware, what is affected and when you will next update, not a root cause you do not have yet. Committing to a next-update time is what stops the anxious hourly chase and buys the team room to work.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Twenty minutes into a customer-visible outage with no root cause yet. What do you send?',
      choices: [
        { id: 'a', text: 'Wait until you actually understand the root cause', whyWrong: 'Silence during an outage is read as absence, and they will escalate past you.' },
        { id: 'b', text: 'A preliminary cause you are fairly confident about', whyWrong: 'Early theories are usually wrong, and retracting one costs more trust than not knowing.' },
        { id: 'c', text: 'What is affected, what you are doing, and when' },
        { id: 'd', text: 'An apology with an offer of a service credit', whyWrong: 'Premature, and it substitutes a commercial remedy for the information they need now.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'pr.cost.guardrail',
    mode: 'drill',
    nodeIds: ['prod.cost_monitoring', 'ai.cost'],
    difficulty: 'deep',
    explanation:
      'A monthly budget alert tells you about a runaway agent several days after it started. Per-tenant, per-feature spend tracked hourly with an anomaly threshold catches it the same afternoon, and a hard per-run token cap bounds the damage regardless.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agent loop burned $4,000 overnight. What would have caught it?',
      choices: [
        { id: 'a', text: 'A monthly budget alert on the project total', whyWrong: 'Fires days after the money is gone. Monthly granularity cannot catch an overnight loop.' },
        { id: 'b', text: 'A monthly review of the bill, line by line', whyWrong: 'A detective control at the worst possible latency.' },
        { id: 'c', text: 'Switching the agent loop onto a cheaper model tier', whyWrong: 'Makes the runaway cheaper per call and slower to notice, not less likely to happen.' },
        { id: 'd', text: 'Hourly spend anomalies plus a per-run token cap' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'pr.cutover.dual',
    mode: 'drill',
    nodeIds: ['prod.data_migration', 'data.quality'],
    difficulty: 'edge',
    explanation:
      'Dual-write plus shadow reads lets you compare the new system against the old on real traffic without anyone depending on it. The reconciliation report is the artefact that earns the cutover decision, big-bang switches are how you find the 3% discrepancy in production.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order a low-risk cutover from the legacy system to yours.',
      steps: [
        'Dual-write to both systems, with the legacy one still authoritative',
        'Shadow-read from the new system and compare results without serving them',
        'Reconcile the differences until the report is clean',
        'Switch reads to the new system, keeping the legacy write path for rollback',
      ],
    },
  },
  {
    id: 'pr.envs.parity',
    mode: 'drill',
    nodeIds: ['prod.envs', 'prod.cicd'],
    difficulty: 'core',
    explanation:
      'Staging never matches production, so the question is which differences can hide a defect. Data volume, data shape and identity configuration are the three that reliably do; a smaller machine size rarely is.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which staging-versus-production differences most often hide a real defect? Pick all that apply.',
      choices: [
        { id: 'a', text: 'Data volume: indexes and queries behave differently at scale' },
        { id: 'b', text: 'Data shape: synthetic data lacks the messy edge cases' },
        { id: 'c', text: 'Identity configuration: SSO and permissions differ' },
        { id: 'd', text: 'Smaller instance sizes', whyWrong: 'Affects capacity testing but rarely hides a correctness defect.' },
        { id: 'e', text: 'A different hostname', whyWrong: 'Only bites when something is hard-coded, which the other differences will surface first.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'pr.chaos.dependency',
    mode: 'drill',
    nodeIds: ['prod.chaos', 'scale.degradation'],
    difficulty: 'edge',
    explanation:
      'You will find out how the system behaves when the model API returns 503. The only choice is whether you find out on a Tuesday afternoon with a rollback ready, or at 3am during the customer’s peak. Injecting the failure deliberately is the cheap version.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Before go-live, what failure is most worth deliberately injecting?',
      choices: [
        { id: 'a', text: 'Sustained 503s from the model provider endpoint' },
        { id: 'b', text: 'A failover of the managed database instance mid-request', whyWrong: 'Worth testing, and the managed service already handles it. The AI path is far less exercised.' },
        { id: 'c', text: 'Loss of an entire cloud region during peak hours', whyWrong: 'Rarely in scope for a pilot, and expensive to rehearse convincingly.' },
        { id: 'd', text: 'A corrupted deployment artifact reaching production', whyWrong: 'Your pipeline should prevent it. The dependency failure is outside your control.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'pr.cicd.handover',
    mode: 'drill',
    nodeIds: ['prod.cicd', 'del.handover'],
    difficulty: 'core',
    explanation:
      'A pipeline only the FDE can run is a dependency the customer inherits. Running in their own CI, with their credentials, triggered by their team, is what makes the handover real rather than ceremonial.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What makes a deployment pipeline genuinely handed over?',
      choices: [
        { id: 'a', text: 'The pipeline definition is documented in their own wiki', whyWrong: 'Documentation of a thing their team has never actually run themselves.' },
        { id: 'b', text: 'It runs in their CI, and they have shipped with it' },
        { id: 'c', text: 'They have been granted access to your CI system', whyWrong: 'Leaves the dependency on your infrastructure and your billing account.' },
        { id: 'd', text: 'The whole deploy is reduced to a single command', whyWrong: 'Convenient, and it says nothing about who is actually able to run it.' },
      ],
      correctId: 'b',
    },
  },
];
