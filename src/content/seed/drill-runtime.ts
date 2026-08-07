import type { DrillItem } from '@shared/content';

import { cite } from '../sources';

/**
 * Runtime bank: the things that only bite once the system has real traffic,
 * a real release cadence and real users on real networks. Load shapes and what
 * they imply, cache stampedes, pool exhaustion, deadline arithmetic, circuit
 * breakers, expand-and-contract migrations, progressive delivery with metric
 * gates, on-call and incident order, and the client-side craft of streaming an
 * answer to somebody who might close the tab halfway through.
 *
 * Difficulty tags follow the honest rubric: `intro` is answerable cold from
 * fundamentals, `core` is the working knowledge the role assumes, `deep`
 * requires reasoning about a trade-off, `edge` separates people who have
 * shipped the thing from people who have read about it.
 */
export const DRILL_RUNTIME: DrillItem[] = [
  // ── Scaling: reading the load ────────────────────────────────────────────
  {
    id: 'r2.load.burstiness',
    mode: 'drill',
    nodeIds: ['scale.load_shape', 'scale.capacity'],
    difficulty: 'core',
    explanation:
      'An average rate is a summary, and summaries hide arrival patterns. The same 100 requests per second can arrive smoothly or as a burst of four hundred every four seconds, and only the second one queues. Ask for the shape, not the total, before you size anything.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s dashboard shows a flat 100 requests per second all day. Your load test at a steady 100 rps passes cleanly. Production still queues. What did the average hide?',
      choices: [
        { id: 'a', text: 'The load test ramped virtual users too gently to queue', whyWrong: 'The harness reproduced the mean faithfully, which is exactly what made it useless. Ramp shape is not the missing variable.' },
        { id: 'b', text: 'Production hardware is slower than the test fleet', whyWrong: 'Slower hardware raises service time on every request. It does not produce queueing that appears and clears within seconds.' },
        { id: 'c', text: 'The same mean arrives in bursts, so concurrency spikes' },
        { id: 'd', text: 'The latency objective is stricter than the test asserted', whyWrong: 'Moving the target does not explain why an identical average rate behaves differently in two places.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.load.littles',
    mode: 'drill',
    nodeIds: ['scale.load_shape', 'scale.capacity'],
    difficulty: 'deep',
    explanation:
      'Concurrency equals arrival rate multiplied by how long each request is held, which is Little’s Law and the single most useful piece of arithmetic in capacity work. Streaming makes it vivid: slow generation does not change requests per second, it changes how many connections you are holding at once.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An assistant receives 20 requests per second and each response streams for an average of 30 seconds. Roughly how many connections is the service holding open at steady state?',
      choices: [
        { id: 'a', text: 'About 20, one open connection per second of arrivals', whyWrong: 'That is the arrival rate. It only equals concurrency when every request completes inside a second.' },
        { id: 'b', text: 'About 600, the arrival rate times the hold time' },
        { id: 'c', text: 'About 30, matching the average response duration', whyWrong: 'Duration alone is not a count. Two per second held 30 seconds and two hundred per second held 30 seconds differ hugely.' },
        { id: 'd', text: 'It depends on instance count, not on hold time', whyWrong: 'Instance count sets how much concurrency you can serve. It does not set how much arrives.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.load.shapes',
    mode: 'drill',
    nodeIds: ['scale.load_shape'],
    difficulty: 'core',
    explanation:
      'The shape of the load picks the architecture, not the total volume. Learning to hear the shape in how a customer describes their traffic saves you a design round trip, because each shape has an obvious first move and an expensive wrong move.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each load shape to the design decision it forces.',
      pairs: [
        { left: 'Sharp daily peak at 9am, near zero overnight', right: 'Autoscale, and pre-warm ahead of a peak you can predict from a calendar' },
        { left: 'Steady rate with unpredictable ten-fold spikes', right: 'Put the work behind a queue and drain at a rate the downstream sustains' },
        { left: 'A few requests an hour, all interactive', right: 'Scale to zero, and pay for a minimum instance only if first-request latency matters' },
        { left: 'Large nightly batch, quiet during the day', right: 'Give batch its own capacity so it cannot starve interactive traffic' },
      ],
    },
  },
  {
    id: 'r2.load.mix',
    mode: 'drill',
    nodeIds: ['scale.load_shape', 'scale.capacity'],
    difficulty: 'deep',
    explanation:
      'Requests are only interchangeable if they cost the same. When a small share of traffic carries a hundred times the context, requests per second stops describing the load and you have to plan in the unit the system is actually consumed in. Serving capacity is spent on tokens processed, not on requests admitted, so tokens per second is the number that both predicts saturation and maps onto the provider quota you are billed against.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Five percent of requests carry a very large context; the rest are small. Planning by requests per second keeps under-provisioning the service. What unit should you plan in?',
      choices: [
        { id: 'a', text: 'Requests per second, with a safety factor for the tail', whyWrong: 'A factor big enough to cover the heavy tail wastes capacity all day, and it still guesses at the mix.' },
        { id: 'b', text: 'Concurrent users, measured at the daily peak hour', whyWrong: 'Two users can differ by two orders of magnitude in what they cost. This is the same averaging mistake one level up.' },
        { id: 'c', text: 'Peak network bandwidth across the serving fleet', whyWrong: 'Bandwidth is rarely the binding constraint for text generation; compute time and provider quota are.' },
        { id: 'd', text: 'Tokens processed per second across the whole fleet' },
      ],
      correctId: 'd',
    },
  },

  // ── Scaling: horizontal ──────────────────────────────────────────────────
  {
    id: 'r2.horiz.sticky',
    mode: 'drill',
    nodeIds: ['scale.horizontal', 'client.streaming_ui'],
    difficulty: 'core',
    explanation:
      'Session affinity for in-progress generations is a reasonable choice, and it makes every instance briefly stateful. That shows up not as a scaling limit but as an operations limit: you cannot drain or replace an instance without deciding what happens to the streams it is holding.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your streaming assistant uses session affinity so a reconnecting browser returns to the instance holding its in-progress generation. What does that actually cost you?',
      choices: [
        { id: 'a', text: 'Instances cannot be drained without abandoning streams' },
        { id: 'b', text: 'Nothing structural: affinity is how streaming is done', whyWrong: 'It is common, and it still turns each instance into a small stateful server. That is a trade to make on purpose.' },
        { id: 'c', text: 'Cross-zone balancing charges apply to every sticky flow', whyWrong: 'Affinity is a routing setting, not a pricing tier. The cost lands in operations, not on the bill.' },
        { id: 'd', text: 'TLS can no longer be terminated at the edge proxy', whyWrong: 'Affinity and TLS termination are unrelated; the edge is exactly where the affinity cookie is usually set.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'r2.horiz.scheduler',
    mode: 'drill',
    nodeIds: ['scale.horizontal', 'prod.cicd'],
    difficulty: 'core',
    explanation:
      'An in-process scheduler is a singleton hiding inside a service you intend to replicate. The moment there are N instances there are N schedulers, and the fix is to move the trigger outside the replica set or to elect one owner with a lease.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'After scaling from one instance to four, a nightly reconciliation job runs four times and customers get duplicate emails. What is the fix?',
      choices: [
        { id: 'a', text: 'Stagger the cron offset per instance so only one fires', whyWrong: 'Instances are interchangeable and created by the autoscaler. There is no stable identity to hang per-instance config on.' },
        { id: 'b', text: 'Trigger it externally, or gate it behind a leader lease' },
        { id: 'c', text: 'Make the job idempotent and let all four instances run', whyWrong: 'Idempotency is worth having, and it still leaves four workers doing four times the work and racing on the same rows.' },
        { id: 'd', text: 'Have each instance skip unless it holds the lowest id', whyWrong: 'That is leader election with no lease and no fencing, so two instances can both believe they are lowest during a scale event.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.horiz.local',
    mode: 'drill',
    nodeIds: ['scale.horizontal', 'scale.caching'],
    difficulty: 'core',
    explanation:
      'Going from one instance to many breaks anything whose correctness depends on all requests reaching the same process. The tell is mutable state that outlives a single request. Immutable data replicated to every instance is harmless, which is why config files and lookup tables are fine and in-process caches of decisions are not.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'You are moving a service from one instance to many. Which of these stop behaving correctly as written? Select all that apply.',
      choices: [
        { id: 'a', text: 'Uploaded files written to the local filesystem and processed by a later request' },
        { id: 'b', text: 'An in-process cache of authorization decisions with a ten-minute TTL' },
        { id: 'c', text: 'A registry of open WebSocket connections held in a module-level map' },
        { id: 'd', text: 'A read-only lookup table loaded from a config file at startup', whyWrong: 'Identical on every instance and never mutated, so replicating it changes nothing.' },
        { id: 'e', text: 'Structured logs written to stdout', whyWrong: 'Each instance writes its own stream and the collector merges them. This is the pattern that already assumes many processes.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Scaling: autoscaling ─────────────────────────────────────────────────
  {
    id: 'r2.auto.metric',
    mode: 'drill',
    nodeIds: ['scale.autoscaling', 'ai.latency'],
    difficulty: 'core',
    explanation:
      'Autoscale on whatever the workload actually exhausts. A service waiting on a model provider is IO-bound, so CPU never moves and CPU-based scaling never fires; a queue worker is measured by backlog age; and a workload bounded by a token quota has to be scaled against the quota, because adding instances cannot buy capacity you were never granted.',
    citations: cite('cloudRun'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each workload to the signal its autoscaler should actually watch.',
      pairs: [
        { left: 'A proxy that spends its time waiting on a model provider', right: 'Concurrent in-flight requests per instance' },
        { left: 'A CPU-bound document parsing service', right: 'CPU utilization' },
        { left: 'A worker pool draining an asynchronous job queue', right: 'Queue backlog, measured as the age of the oldest message' },
        { left: 'A service whose limit is an embedding model quota', right: 'Tokens per minute consumed against the granted quota' },
      ],
    },
  },
  {
    id: 'r2.auto.flap',
    mode: 'drill',
    nodeIds: ['scale.autoscaling'],
    difficulty: 'deep',
    explanation:
      'An autoscaler is a control loop, and a control loop with too little damping oscillates. Every scale-in throws away warm instances and every scale-out pays cold start again, so the churn itself becomes the latency problem. Scale up fast, scale down slowly, and evaluate over a window longer than one boot cycle.',
    citations: cite('cloudRun'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Instance count oscillates between four and twelve every couple of minutes, and p99 latency is worse than it was before autoscaling was turned on. What do you change?',
      choices: [
        { id: 'a', text: 'Raise the maximum instance count to give scale-out headroom', whyWrong: 'The problem is oscillation, not a ceiling. A higher ceiling only gives the oscillation more room to swing.' },
        { id: 'b', text: 'Lower the target utilization so instances stay ahead', whyWrong: 'Runs more instances all day and damps nothing. A lower target usually makes the loop twitchier, not calmer.' },
        { id: 'c', text: 'Pin a fixed instance count sized for the daily peak', whyWrong: 'A legitimate fallback, and it pays for peak around the clock to avoid tuning a control loop once.' },
        { id: 'd', text: 'Damp the loop: fast scale-out, slow scale-in, long window' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.auto.max_instances',
    mode: 'drill',
    nodeIds: ['scale.autoscaling', 'scale.pooling'],
    difficulty: 'edge',
    explanation:
      'An instance ceiling is admission control wearing a cost-control hat. It bounds how much concurrent work can reach every downstream dependency, and removing it moves the failure from a place that sheds gracefully to a place that does not. Raise a cap only after you know what protects the database.',
    citations: cite('cloudRun'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team removed the maximum instance cap to stop shedding traffic during a spike. Shedding stopped and the database fell over. What had the cap been doing?',
      choices: [
        { id: 'a', text: 'Bounding concurrent load on every downstream dependency' },
        { id: 'b', text: 'Holding the monthly compute bill inside its approved budget', whyWrong: 'A side effect people notice on the invoice. The outage showed its real job was limiting concurrency downstream.' },
        { id: 'c', text: 'Keeping cold starts rare by reusing already warm instances', whyWrong: 'A maximum has no effect on how cold a new instance is. A minimum instance count is the setting that does.' },
        { id: 'd', text: 'Enforcing the latency objective during traffic spikes', whyWrong: 'It did the opposite: capping instances is precisely what produced the shedding they were trying to remove.' },
      ],
      correctId: 'a',
    },
  },

  // ── Scaling: caching ─────────────────────────────────────────────────────
  {
    id: 'r2.cache.stampede',
    mode: 'drill',
    nodeIds: ['scale.caching', 'scale.timeouts'],
    difficulty: 'deep',
    explanation:
      'A cache is load-bearing infrastructure the moment the origin cannot serve full traffic. When many requests miss the same key at once, they all recompute it, and the origin sees a multiple of its normal load. Single-flight the recomputation so one request does the work and the rest wait or serve stale.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You flushed the cache as part of a deploy. The database saturated instantly and stayed down until you rolled back. What prevents this next time?',
      choices: [
        { id: 'a', text: 'Raise the TTL so entries survive longer between rebuilds', whyWrong: 'Irrelevant to an empty cache, and it makes staleness worse for every hour the cache is working normally.' },
        { id: 'b', text: 'Provision a larger cache so fewer entries are evicted', whyWrong: 'Capacity was never the constraint. The cache was empty, not full, so more room stores nothing extra.' },
        { id: 'c', text: 'Single-flight per key, so one request rebuilds and others wait' },
        { id: 'd', text: 'Retry the failed database calls with exponential backoff', whyWrong: 'Adds load to a saturated database. This is the retry storm that turns a slow recovery into an outage.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.cache.tenant_key',
    mode: 'drill',
    nodeIds: ['scale.caching', 'sec.tenancy'],
    difficulty: 'edge',
    explanation:
      'Any cache in front of an authorized read is an authorization decision. If the identity that scoped the query is not part of the key, two principals asking the same question share an entry and the cache becomes a cross-tenant channel. Make the key include everything the answer depends on, including who is asking.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A support engineer sees another customer’s data in a cached response. The code caches by query string. What is the defect?',
      choices: [
        { id: 'a', text: 'The TTL let the entry outlive the session that made it', whyWrong: 'A shorter TTL narrows the window and leaks just as thoroughly inside it. The entry was never scoped to a session.' },
        { id: 'b', text: 'The cache store is not encrypted at rest in that region', whyWrong: 'Encryption stops someone reading the cache store directly. It does not stop the app handing an entry to the wrong user.' },
        { id: 'c', text: 'The two tenants were issued the same internal user id', whyWrong: 'That would be a separate identity defect. Here the key contained no identity at all, so no collision was needed.' },
        { id: 'd', text: 'The key omits the identity that scoped the query' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.cache.semantic',
    mode: 'drill',
    nodeIds: ['scale.caching', 'ai.cost'],
    difficulty: 'deep',
    explanation:
      'A semantic cache returns a stored answer when a new question embeds close enough to an old one. It saves real money and it introduces a failure exact-match caching cannot have: two questions can be semantically adjacent and factually opposite. Set the threshold conservatively, scope the key by tenant and permissions, and log every hit so you can audit them.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team proposes a semantic cache that serves a stored answer when the incoming question is similar enough. What is the risk you raise?',
      choices: [
        { id: 'a', text: 'It cannot cut provider spend enough to justify building it', whyWrong: 'Cost reduction is exactly what it delivers, which is why teams are willing to take the correctness risk at all.' },
        { id: 'b', text: 'Near misses: adjacent questions can need opposite answers' },
        { id: 'c', text: 'It requires retaining full prompts, which policy forbids', whyWrong: 'Most designs already log or retain prompts. Retention policy is a separate decision from whether the cache is correct.' },
        { id: 'd', text: 'Embedding each query costs more than generating the answer', whyWrong: 'An embedding call is orders of magnitude cheaper than a generation, which is what makes the pattern viable at all.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.cache.invalidate_order',
    mode: 'drill',
    nodeIds: ['scale.caching', 'client.state'],
    difficulty: 'intro',
    explanation:
      'The classic cache bug is repopulating from a value that was true a moment ago. Commit before you touch the cache, and delete the entry rather than writing your local copy into it, because a write races with every other writer while a delete forces the next reader back to the committed row. Be honest about what this buys: it shrinks the race, it does not close it. A reader that loaded the old value before your commit can still land its write after your delete. Closing it entirely takes versioned entries, a short lock on the key, or accepting a bounded staleness window on purpose. Delete-after-commit is the cheap default, not a proof.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the safe sequence for updating a record that is also held in a shared cache.',
      steps: [
        'Write the new value to the database inside a transaction',
        'Commit the transaction so the new value is visible to every reader',
        'Delete the cache entry rather than overwriting it with your local copy',
        'Let the next read repopulate the entry from the committed database state',
      ],
    },
  },

  // ── Scaling: connection pooling ──────────────────────────────────────────
  {
    id: 'r2.pool.symptom',
    mode: 'drill',
    nodeIds: ['scale.pooling', 'scale.timeouts'],
    difficulty: 'deep',
    explanation:
      'Pool exhaustion looks nothing like a slow database. Query times are unchanged and the database is bored, because the time is spent queueing for a connection before any query is issued. The distinguishing evidence is the gap between application-measured call duration and database-measured query duration.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Under load, request latency climbs to seconds. Database CPU is eight percent, slow-query times are unchanged, and application threads sit in a waiting state. What is the diagnosis?',
      choices: [
        { id: 'a', text: 'The database instance class is too small for this profile', whyWrong: 'It is nearly idle at eight percent. The work is not reaching it, so more capacity there changes nothing.' },
        { id: 'b', text: 'The hot queries lack an index and are scanning the table', whyWrong: 'Query times did not move, and a missing index moves exactly that number and raises database CPU with it.' },
        { id: 'c', text: 'Requests are waiting for a connection from an exhausted pool' },
        { id: 'd', text: 'The network between application and database is saturated', whyWrong: 'That would inflate the round trip of queries that do run, not stall threads before they issue one.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.pool.txn_mode',
    mode: 'drill',
    nodeIds: ['scale.pooling'],
    difficulty: 'edge',
    explanation:
      'Transaction-mode pooling hands your connection back to the pool at every commit, so the next statement may land on a different backend. Anything that lives on the session rather than in the transaction therefore evaporates: session-level SET, temporary tables, advisory locks, LISTEN and NOTIFY, and server-side prepared statements unless the pooler explicitly tracks them. Note that this is a behavioral change and not a transparent optimization, which is why it reads as an intermittent bug: the failure only shows when a request happens to be handed a backend that did not run the earlier statement.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You put a pooler in transaction mode in front of Postgres and a previously working feature starts failing intermittently. What class of code breaks?',
      choices: [
        { id: 'a', text: 'Code relying on session state between statements' },
        { id: 'b', text: 'Code that wraps several statements in one transaction', whyWrong: 'The transaction is the unit the pooler pins a connection to, so transactional code is precisely what keeps working.' },
        { id: 'c', text: 'Read-only queries issued outside any transaction', whyWrong: 'Single-statement reads are the easiest case for transaction pooling; they neither need nor keep session state.' },
        { id: 'd', text: 'Any client that connects to the pooler using TLS 1.3', whyWrong: 'Transport encryption is negotiated per connection and is orthogonal to whether the pooler pins that connection for a session or for a transaction.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'r2.pool.http',
    mode: 'drill',
    nodeIds: ['scale.pooling', 'ai.latency'],
    difficulty: 'core',
    explanation:
      'Pooling is not only a database concern. An HTTP client that does not reuse keep-alive connections pays a TCP and TLS handshake on every call, which is a fixed tax on latency and on the provider’s connection budget. Long-lived clients with a shared connection pool are the fix, and creating a fresh client per request is the common defect.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Traces show a consistent extra delay before each call to the model provider leaves your service, on every single request. What do you check first?',
      choices: [
        { id: 'a', text: 'Whether the provider has started throttling your project', whyWrong: 'Throttling shows up as 429s or as delayed responses, not as a fixed cost paid before the request is even sent.' },
        { id: 'b', text: 'Whether the prompt is too large to serialize quickly', whyWrong: 'Serializing a prompt is cheap, and the cost would scale with prompt size rather than appear on every request alike.' },
        { id: 'c', text: 'Whether the model endpoint is cold on its first call', whyWrong: 'Managed endpoints have no per-call warm-up, and a model-side delay lands after the request left you, not before.' },
        { id: 'd', text: 'Whether a new HTTP client is built for each request' },
      ],
      correctId: 'd',
    },
  },

  // ── Scaling: queueing ────────────────────────────────────────────────────
  {
    id: 'r2.q.unbounded',
    mode: 'drill',
    nodeIds: ['scale.queueing', 'scale.degradation'],
    difficulty: 'deep',
    explanation:
      'A queue converts a throughput failure into a latency failure, which is usually a good trade and never a free one. Without a bound on depth or age, the system happily accepts work it will finish long after anybody cares. Bound the wait, shed beyond it, and tell the user what they are waiting for.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your queue absorbed a spike without dropping anything. Users complained anyway: their jobs finished forty minutes late with no indication of the delay. What was missing?',
      choices: [
        { id: 'a', text: 'Add consumer instances until the backlog drains inside the SLO', whyWrong: 'Buys throughput and tells a user sitting behind forty minutes of backlog nothing at all about what is happening.' },
        { id: 'b', text: 'Move to a queue technology with higher publish throughput', whyWrong: 'The queue was never the bottleneck. The consumers were, deliberately, because that is the point of levelling.' },
        { id: 'c', text: 'A bound on queue age, with shedding and a wait estimate' },
        { id: 'd', text: 'Raise the visibility timeout so retries stop competing', whyWrong: 'Visibility governs redelivery of in-flight messages, not how long fresh work waits before anyone picks it up.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.q.dlq',
    mode: 'drill',
    nodeIds: ['scale.queueing', 'prod.oncall'],
    difficulty: 'intro',
    explanation:
      'A message that always fails and is always redelivered is a stuck queue wearing a retry costume. A maximum delivery count plus a dead-letter destination turns an outage into a small pile of messages somebody can inspect, and the alert on dead-letter arrivals is what makes it a real control instead of a quiet data loss.',
    citations: cite('pubsubOrdering'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'One malformed message fails, is redelivered, fails again, and the consumer makes no progress on anything behind it. What do you add?',
      choices: [
        { id: 'a', text: 'A delivery cap, a dead-letter queue, and an alert on arrivals' },
        { id: 'b', text: 'Catch the exception, log it, and acknowledge the message', whyWrong: 'Unblocks the queue by silently discarding customer data, and nobody finds out until someone asks where a record went.' },
        { id: 'c', text: 'Run more consumer instances so the backlog keeps moving', whyWrong: 'Every consumer fails on the same message. You now fail in parallel and burn more quota doing it.' },
        { id: 'd', text: 'Increase the retry backoff so the message is retried later', whyWrong: 'Delays an identical failure indefinitely, and everything queued behind it waits out the longer backoff too.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'r2.q.ordering',
    mode: 'drill',
    nodeIds: ['scale.queueing', 'scale.hotspots'],
    difficulty: 'deep',
    explanation:
      'Ordering guarantees are per key, and a key is a serialization point. Choosing tenant id as the ordering key gives you clean per-tenant sequencing and caps that tenant’s throughput at one message at a time, no matter how many consumers you run. Pick the narrowest key the business actually requires ordering on.',
    citations: cite('pubsubOrdering'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You enable ordered delivery keyed by tenant id so each tenant’s events process in sequence. Throughput for your largest tenant collapses. Why?',
      choices: [
        { id: 'a', text: 'There is a hard ceiling on distinct ordering keys per topic', whyWrong: 'Key cardinality is not the issue here. The collapse is concentrated on one key, not spread thinly across many.' },
        { id: 'b', text: 'Ordering serializes every message sharing that one key' },
        { id: 'c', text: 'Ordered delivery disables batched publishes entirely', whyWrong: 'Messages sharing a key can still be published in batches. Sequential processing per key is the constraint, not batch size.' },
        { id: 'd', text: 'That tenant sends larger payloads than the others do', whyWrong: 'Payload size would slow things proportionally, not produce a collapse the moment ordering is switched on.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.q.age',
    mode: 'drill',
    nodeIds: ['scale.queueing', 'prod.oncall'],
    difficulty: 'core',
    explanation:
      'Queue depth is the metric everyone graphs and the one that lies most. A deep queue draining fast is healthy, and a shallow queue with one message stuck for an hour is an incident. Alert on the age of the oldest unacknowledged message, because that is the number a user would recognize as their wait.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each queue observation to what it actually tells you.',
      pairs: [
        { left: 'Oldest unacknowledged message is 40 minutes old', right: 'Consumers are not keeping up: this is the number a user would recognize as their wait' },
        { left: 'Queue depth is high and falling steadily', right: 'A backlog that is draining, which is the queue doing its job' },
        { left: 'Depth is near zero but one message keeps reappearing', right: 'A poison message being redelivered: it needs a delivery cap and a dead-letter path' },
        { left: 'Publish rate is healthy and consumer CPU is low', right: 'Nothing conclusive: a consumer blocked on a lock looks exactly like an idle one' },
      ],
    },
  },

  // ── Scaling: hot keys and skew ───────────────────────────────────────────
  {
    id: 'r2.hot.partition_key',
    mode: 'drill',
    nodeIds: ['scale.hotspots', 'scale.capacity'],
    difficulty: 'deep',
    explanation:
      'A monotonically increasing key, including a timestamp, puts every new write at the same end of the key space. One partition takes all the write traffic while the rest of the cluster idles, and adding nodes does not help because the problem is the key, not the capacity. Hash or prefix the key so writes spread.',
    citations: cite('bqPartition'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your event table is partitioned by an auto-incrementing event id. Under heavy write load one partition runs at capacity while the rest of the cluster idles, and adding nodes changes nothing. Why?',
      choices: [
        { id: 'a', text: 'Sequential keys consume more storage than hashed ones do', whyWrong: 'Sequential integers are among the most compact and compressible keys you can choose. Storage is not the pressure here.' },
        { id: 'b', text: 'Sequential keys prevent efficient time-range scans', whyWrong: 'They make time-range scans efficient, which is exactly why teams reach for them in the first place.' },
        { id: 'c', text: 'A distributed store cannot index a monotonic key', whyWrong: 'It indexes them fine. The distribution of writes across partitions is the problem, not indexability.' },
        { id: 'd', text: 'Every new write lands at the same end of the key space' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.hot.celebrity',
    mode: 'drill',
    nodeIds: ['scale.hotspots', 'scale.caching'],
    difficulty: 'intro',
    explanation:
      'A single popular key cannot be split by adding shards, because it is already the smallest unit of placement. The only real answer for a read-hot key is replication: cache it in front, or keep copies on multiple replicas so reads fan out.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'One document in your knowledge base is retrieved by nearly every query. Its shard is saturated while the others idle. What do you do?',
      choices: [
        { id: 'a', text: 'Re-shard the index so the hot key lands somewhere quieter', whyWrong: 'Rebalancing relocates the key. A single key still lives in one place, so the hotspot moves rather than disappears.' },
        { id: 'b', text: 'Split the document into chunks spread across the shards', whyWrong: 'Every query still needs the same content, so all the chunks go hot together and you add a gather step.' },
        { id: 'c', text: 'Replicate it: cache in front, or copy across replicas' },
        { id: 'd', text: 'Rate limit the queries that retrieve that document', whyWrong: 'Throttles your most valuable content in order to protect the storage layer, which is exactly backwards.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.hot.fairness',
    mode: 'drill',
    nodeIds: ['scale.hotspots', 'sec.tenancy'],
    difficulty: 'deep',
    explanation:
      'A single global limit protects the dependency and guarantees nothing about who gets to use it. Whoever arrives fastest wins the whole budget. Per-tenant quotas over a shared limit, with fair-share scheduling, make starvation structurally impossible rather than a matter of timing.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A global rate limit protects your model quota. One tenant’s morning batch consumes the entire limit and everyone else gets 429s until it finishes. What is the structural fix?',
      choices: [
        { id: 'a', text: 'Raise the global limit so the batch and the rest both fit', whyWrong: 'The same tenant consumes the larger limit at the same speed. Fairness is not a capacity problem.' },
        { id: 'b', text: 'Per-tenant quotas with fair-share over the shared limit' },
        { id: 'c', text: 'Ask that tenant to move their batch to an overnight window', whyWrong: 'Leans on a customer’s cooperation for a property the platform should guarantee, and it fails the day they forget.' },
        { id: 'd', text: 'Have starved clients retry with exponential backoff', whyWrong: 'Makes starved tenants wait politely while the batch wins every race. Backoff without fairness rewards the aggressive caller.' },
      ],
      correctId: 'b',
    },
  },

  // ── Scaling: N+1 and chatty calls ────────────────────────────────────────
  {
    id: 'r2.np.trace',
    mode: 'drill',
    nodeIds: ['scale.n_plus_one', 'ai.observability'],
    difficulty: 'core',
    explanation:
      'The signature of an N+1 in a trace is a large number of sibling spans that are individually fast and identical in shape. Making the individual call faster is a rounding error; collapsing the calls is the fix. Learn to read the span count before you read the span duration.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A trace for one request shows the handler span plus 312 sibling spans, each a four millisecond call to the same endpoint, totalling about 1.3 seconds. What is your finding?',
      choices: [
        { id: 'a', text: 'The endpoint is too slow at four milliseconds per call', whyWrong: 'Four milliseconds is healthy. Three hundred of them serialized inside one request is the defect.' },
        { id: 'b', text: 'The tracing library is emitting duplicate sibling spans', whyWrong: 'The wall-clock total matches the span count, so the work is genuinely happening rather than being double counted.' },
        { id: 'c', text: 'The handler is CPU starved and cannot keep up with it', whyWrong: 'The time goes on waiting for round trips, which is exactly what a CPU profile would fail to explain.' },
        { id: 'd', text: 'A per-item fetch inside a loop, so batch it into one call' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.np.rerank',
    mode: 'drill',
    nodeIds: ['scale.n_plus_one', 'ai.rerank'],
    difficulty: 'deep',
    explanation:
      'Per-document reranking calls are an N+1 with a model attached: fifty candidates become fifty round trips, fifty billing events and fifty chances to hit a rate limit. Score the candidate set in one call, or use a reranking model designed to take the whole set, and keep the recall you added reranking to protect.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your reranker makes one model call per candidate document, fifty per query, and end-to-end latency is six seconds. What is the right restructuring?',
      choices: [
        { id: 'a', text: 'Score the whole candidate set in one call' },
        { id: 'b', text: 'Retrieve twenty candidates instead of fifty', whyWrong: 'Buys latency by cutting recall, which is the exact quality you added reranking to recover.' },
        { id: 'c', text: 'Issue the fifty calls in parallel instead', whyWrong: 'Improves wall clock and still spends fifty calls of quota and cost on every single query.' },
        { id: 'd', text: 'Cache each document relevance score by id', whyWrong: 'Relevance depends on the query and document together, so a per-document score does not transfer to the next query.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'r2.np.tool_design',
    mode: 'drill',
    nodeIds: ['scale.n_plus_one', 'ai.tool_calling'],
    difficulty: 'core',
    explanation:
      'Tool surface design decides whether an agent can be efficient. If the only way to express "these forty records" is forty calls, the model will make forty calls, each one a round trip, a token cost and another opportunity to drift. Give it list and batch operations alongside the single-record ones.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are designing the tool surface for an agent that routinely works with dozens of records at a time. What follows from that?',
      choices: [
        { id: 'a', text: 'Expose single-record tools only and raise the step limit', whyWrong: 'Every extra step is a round trip, a token cost and another chance for the model to lose the thread.' },
        { id: 'b', text: 'Let the agent write SQL against the database directly', whyWrong: 'Trades a chatty interface for an unbounded one, and now model output is a query running against production data.' },
        { id: 'c', text: 'Add list and batch operations beside single-record ones' },
        { id: 'd', text: 'Return the whole table so no further calls are needed', whyWrong: 'Fills the context window with data the model never asked for and mostly cannot use, hurting both cost and accuracy.' },
      ],
      correctId: 'c',
    },
  },

  // ── Scaling: timeouts, retries, breakers ─────────────────────────────────
  {
    id: 'r2.to.retry_budget_math',
    mode: 'drill',
    nodeIds: ['scale.timeouts'],
    difficulty: 'deep',
    explanation:
      'Retries multiply your timeout, and the product has to fit inside the deadline your caller is willing to wait. Three attempts at ten seconds cannot fit in a fifteen-second budget, so on a bad day every retry is load added to a struggling dependency for a response nobody is still listening for. Compute the total, or propagate the remaining deadline so each hop knows how much time is left.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your caller times out at fifteen seconds. Your client calls a dependency with a ten-second timeout and retries twice. What happens on a bad day?',
      choices: [
        { id: 'a', text: 'The retries usually succeed inside the caller budget', whyWrong: 'Three attempts at ten seconds is thirty seconds. That arithmetic does not fit in fifteen, which is the whole point.' },
        { id: 'b', text: 'The caller has given up before the retries finish' },
        { id: 'c', text: 'The dependency sheds the surplus retries on its own', whyWrong: 'Nothing in the design gives the dependency admission control. Assuming somebody else has it is how retry storms happen.' },
        { id: 'd', text: 'The caller retries too, so the work completes late', whyWrong: 'Caller-level retries multiply the same wasted load rather than rescuing it. That amplification turns a slowdown into an outage.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.to.breaker_states',
    mode: 'drill',
    nodeIds: ['scale.timeouts', 'scale.degradation'],
    difficulty: 'core',
    explanation:
      'The half-open state is the part of a circuit breaker people forget, and it is the part that protects recovery. After a cooldown the breaker admits a trickle of trial requests and only closes if they succeed, so a dependency coming back up is not immediately buried under the full load that knocked it over.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A circuit breaker has tripped open on a failing dependency. How should it decide to close again?',
      choices: [
        { id: 'a', text: 'Half-open after a cooldown, close only if probes pass' },
        { id: 'b', text: 'Close as soon as the cooldown timer has expired', whyWrong: 'Sends full traffic at a dependency that may still be down, so it re-trips and buries the recovery under the load that broke it.' },
        { id: 'c', text: 'Close when the dependency health endpoint returns 200', whyWrong: 'Health endpoints frequently stay green while the code path you actually call is broken. Probe the real path instead.' },
        { id: 'd', text: 'Wait for an on-call operator to close it manually', whyWrong: 'Useful as an override, and a breaker that needs a human at 3am is not doing the job you added it for.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'r2.to.stream_idle',
    mode: 'drill',
    nodeIds: ['scale.timeouts', 'client.streaming_ui'],
    difficulty: 'edge',
    explanation:
      'A total-duration timeout is the wrong control for a stream, because a healthy long answer and a hung connection look identical to it. Time out on inactivity instead: if no bytes have flowed for N seconds the connection is dead, and if bytes are flowing the request is working no matter how long it takes.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A sixty-second request timeout at the load balancer is cutting long streamed answers off halfway through. What is the correct control?',
      choices: [
        { id: 'a', text: 'Raise the total request timeout to ten minutes', whyWrong: 'Makes room for the longest answer, and lets genuinely hung connections hold resources for ten minutes each.' },
        { id: 'b', text: 'Return the entire answer in one response at the end', whyWrong: 'Abandons streaming, which is the feature, and makes the timeout exposure worse rather than better.' },
        { id: 'c', text: 'Have the client reconnect and re-ask when it is cut off', whyWrong: 'Pays for the entire generation twice and shows the user their answer restarting from nothing.' },
        { id: 'd', text: 'Idle timeout: fail when no bytes flow for N seconds' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.to.match',
    mode: 'drill',
    nodeIds: ['scale.timeouts', 'data.rate_limits'],
    difficulty: 'core',
    explanation:
      'Not every failure deserves a retry, and treating them uniformly is how a dependency’s bad minute becomes your bad hour. Read the signal: an explicit backoff instruction, a hard connection failure, a transient blip and a permanent client error each call for a different response.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each failure signal to the control that belongs on it.',
      pairs: [
        { left: '429 carrying a Retry-After header', right: 'Wait the interval the server named, then retry' },
        { left: 'Connection refused on every attempt for a minute', right: 'Open the circuit breaker and stop calling until a trial probe succeeds' },
        { left: 'An occasional timeout under otherwise normal load', right: 'Retry once with jittered backoff, within the caller’s remaining deadline' },
        { left: '400 describing a malformed request body', right: 'Do not retry: the identical request will fail identically' },
      ],
    },
  },

  // ── Scaling: graceful degradation ────────────────────────────────────────
  {
    id: 'r2.deg.shed',
    mode: 'drill',
    nodeIds: ['scale.degradation', 'scale.capacity'],
    difficulty: 'core',
    explanation:
      'Shedding is a prioritization decision you should make in advance, in daylight, not at 3am. Classify traffic by value first so that when you are over capacity the system drops prefetches and batch work before it drops a customer waiting on a screen.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'You are over capacity and must shed load. Which traffic should go first? Select all that apply.',
      choices: [
        { id: 'a', text: 'Speculative prefetches and background refreshes nobody is waiting on' },
        { id: 'b', text: 'Batch and scheduled work that can run an hour later without harm' },
        { id: 'c', text: 'Retries that have already exceeded a sensible retry budget' },
        { id: 'd', text: 'A random percentage of all requests', whyWrong: 'Fair and blunt: it degrades your most important customer exactly as readily as a prefetch.' },
        { id: 'e', text: 'The largest requests', whyWrong: 'Sometimes right by cost, and large requests are frequently the highest-value ones, so this sheds precisely the wrong traffic.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'r2.deg.fallback_labeled',
    mode: 'drill',
    nodeIds: ['scale.degradation', 'ai.observability'],
    difficulty: 'edge',
    explanation:
      'A silent fallback is two systems reported as one. Every downstream metric becomes a blend of whichever path happened to serve each request, and your quality numbers turn into noise you cannot attribute. Stamp the serving path onto the telemetry so every metric can be split by it.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your system quietly falls back to a smaller model when the primary is slow. Two weeks later the quality metrics are mysteriously noisy. What did you skip?',
      choices: [
        { id: 'a', text: 'A larger and more representative evaluation set', whyWrong: 'A better eval would still be averaging over two different systems it has no way to tell apart.' },
        { id: 'b', text: 'Pinning the fallback model to a fixed version', whyWrong: 'Worth doing for reproducibility, and it still leaves you unable to attribute any given response to a path.' },
        { id: 'c', text: 'Recording which serving path handled each request' },
        { id: 'd', text: 'Alerting whenever the primary model errors', whyWrong: 'Tells you the fallback fired at some point. It does not tell you which responses it went on to produce.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.deg.order',
    mode: 'drill',
    nodeIds: ['scale.degradation', 'scale.capacity'],
    difficulty: 'deep',
    explanation:
      'Degradation should be a staircase you designed, not a cliff you discover. Give up the cheapest things first, in an order agreed before the incident, so that each step buys headroom while the user-visible core keeps working for as long as possible.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Load is climbing past what you can serve. Order these degradations from first to last.',
      steps: [
        'Pause background and scheduled work that is not user-visible',
        'Disable optional enrichment such as reranking and suggestion generation',
        'Serve cached or slightly stale results wherever correctness allows',
        'Shed low-priority requests at the edge with a clear retry signal',
        'Fail fast on the remaining traffic rather than queueing it indefinitely',
      ],
    },
  },

  // ── Scaling: multi-region ────────────────────────────────────────────────
  {
    id: 'r2.mr.active_active',
    mode: 'drill',
    nodeIds: ['scale.multiregion'],
    difficulty: 'deep',
    explanation:
      'Active-active is not a checkbox on a database, it is a promise that your application knows what to do when the same record is written in two places within the replication window. Most organizations asking for it want fast, tested failover, which active-passive delivers for a fraction of the design cost.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer asks for active-active across two regions "for availability". What do you make sure they understand before agreeing?',
      choices: [
        { id: 'a', text: 'It roughly doubles the monthly infrastructure bill', whyWrong: 'True, and the least interesting cost. The design and testing burden is what actually derails these projects.' },
        { id: 'b', text: 'Writes in both regions means designing for conflicts' },
        { id: 'c', text: 'Active-active is always slower than a single region would be', whyWrong: 'It is usually faster for reads, since users hit the nearer region. Write coordination is where the cost lands.' },
        { id: 'd', text: 'It needs a global load balancer they may not have', whyWrong: 'Global routing is widely available and the easy part. What happens to the data is the hard part.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.mr.data_gravity',
    mode: 'drill',
    nodeIds: ['scale.multiregion', 'scale.n_plus_one'],
    difficulty: 'deep',
    explanation:
      'Failing over compute without failing over data leaves every query crossing a continent, and the penalty multiplies by however many queries a page makes. This is where a latent N+1 becomes an outage: ten queries at one millisecond is invisible, and ten queries at eighty milliseconds is a broken product.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You failed the application tier over to region B. It came up healthy and every page now takes four seconds. What is the most likely cause?',
      choices: [
        { id: 'a', text: 'The data stayed in region A, so every query crosses' },
        { id: 'b', text: 'Region B is running slower instance types than region A', whyWrong: 'That slows computation roughly uniformly. It does not add a penalty proportional to round trips per page.' },
        { id: 'c', text: 'Caches are cold in region B after the failover', whyWrong: 'Contributes for the first few minutes. A sustained four seconds points squarely at where the data lives.' },
        { id: 'd', text: 'DNS has not finished propagating to region B', whyWrong: 'Propagation decides which region a user reaches, not how long a request takes once it has arrived there.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'r2.mr.rpo_rto',
    mode: 'drill',
    nodeIds: ['scale.multiregion', 'del.slo'],
    difficulty: 'core',
    explanation:
      'RPO is how much data you can lose and RTO is how long you can be down, and together they select the architecture and therefore the bill. When a customer has not stated them, every design discussion is guesswork, so getting the numbers agreed is the first deliverable, not the last.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each recovery target to the approach that actually meets it.',
      pairs: [
        { left: 'RPO near zero, RTO in minutes', right: 'Synchronous or near-synchronous replication with a warm standby holding reserved capacity' },
        { left: 'RPO in minutes, RTO in an hour', right: 'Asynchronous replication to a standby you scale up during failover' },
        { left: 'RPO and RTO of about a day', right: 'Cross-region backups with a restore procedure somebody has actually rehearsed' },
        { left: 'No stated targets', right: 'Get the targets agreed first, because every option above is a different order of magnitude of cost' },
      ],
    },
  },
  {
    id: 'r2.mr.model_region',
    mode: 'drill',
    nodeIds: ['scale.multiregion', 'prod.model_release'],
    difficulty: 'edge',
    explanation:
      'Regional failover plans are usually written by people thinking about compute and databases. The AI dependency has its own regional story: model versions, tuned or deployed endpoints and quota are all granted per region, so a failover region can be perfectly healthy and unable to serve your pinned model.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your failover plan moves the application to a second region. What should you verify about the AI dependency specifically?',
      choices: [
        { id: 'a', text: 'That the API credentials are valid in both of the regions', whyWrong: 'Usually true and the least likely thing to bite. Regional availability and quota are granted separately from authentication.' },
        { id: 'b', text: 'That latency from the second region is comparable', whyWrong: 'Worth measuring, and a model you cannot call at all is a far harder failure than a model that answers slowly.' },
        { id: 'c', text: 'That the second region supports streaming responses', whyWrong: 'Streaming is a property of the API surface, not something that varies from one region to the next.' },
        { id: 'd', text: 'That the pinned model and its quota exist in that region' },
      ],
      correctId: 'd',
    },
  },

  // ── Scaling: capacity planning ───────────────────────────────────────────
  {
    id: 'r2.cap.quota',
    mode: 'drill',
    nodeIds: ['scale.capacity', 'ai.cost'],
    difficulty: 'core',
    explanation:
      'For AI workloads the binding constraint is usually not your instances, it is the provider-side quota for the model in that region. Quota increases are a request with a lead time, so the capacity conversation has to happen weeks before launch day, not on it.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'You have sized instances for launch peak. Which ceilings sit outside your instance count and need checking in advance? Select all that apply.',
      choices: [
        { id: 'a', text: 'Provider quota for the model in that region, measured in tokens or requests per minute' },
        { id: 'b', text: 'Database connection limits, which a higher instance ceiling will reach first' },
        { id: 'c', text: 'Rate limits on the third-party systems your tools call' },
        { id: 'd', text: 'Disk throughput on the application instances', whyWrong: 'A stateless request path barely touches disk, so this is rarely the binding constraint for a generation workload.' },
        { id: 'e', text: 'Container registry pull rate', whyWrong: 'It can bite during a mass rollout and it fails visibly at deploy time, not under production traffic.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'r2.cap.loadtest',
    mode: 'drill',
    nodeIds: ['scale.capacity', 'prod.envs'],
    difficulty: 'deep',
    explanation:
      'A load test that replays one prompt measures the cached path at every layer, including provider-side prompt caching, and reports numbers you will never see again. Replay a realistic distribution of prompts, contexts and tenants, or accept that the test is measuring your cache rather than your system.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your load test replays the same prompt at high volume and reports excellent throughput. Production is far slower. What did the test get wrong?',
      choices: [
        { id: 'a', text: 'The test ran from a region far away from the service', whyWrong: 'Adds a roughly constant network cost, which would depress the reported numbers rather than flatter them.' },
        { id: 'b', text: 'One repeated prompt hits cached paths everywhere' },
        { id: 'c', text: 'The run was too short to reach a steady state', whyWrong: 'A longer run of unrepresentative traffic just produces more confident wrong numbers.' },
        { id: 'd', text: 'It drove too few virtual users to saturate anything', whyWrong: 'Concurrency was high enough to report throughput. The traffic mix, not the volume, is what was unrealistic.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.cap.headroom',
    mode: 'drill',
    nodeIds: ['scale.capacity', 'scale.multiregion'],
    difficulty: 'core',
    explanation:
      'Redundancy only counts if the survivors can carry the load. Three zones at eighty-five percent utilization have no N-1 headroom at all: lose one and the other two need fifty percent more each. Size for the failure you have architected for, not for the steady state.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You run three zones, each at eighty-five percent utilization. One zone is lost. What happens?',
      choices: [
        { id: 'a', text: 'Nothing, because autoscaling adds instances quickly', whyWrong: 'Only if quota, connection pools and boot time all cooperate, and none of that is instantaneous during a zone loss.' },
        { id: 'b', text: 'Traffic drops by a third along with the lost capacity', whyWrong: 'Users do not live in the zone that failed. Demand stays exactly where it was while capacity fell.' },
        { id: 'c', text: 'The two survivors each absorb fifty percent more load' },
        { id: 'd', text: 'The balancer queues the difference until capacity returns', whyWrong: 'Queueing fifty percent excess load converts a capacity shortfall into a latency collapse.' },
      ],
      correctId: 'c',
    },
  },

  // ── Productionizing: CI/CD ───────────────────────────────────────────────
  {
    id: 'r2.ci.build_once',
    mode: 'drill',
    nodeIds: ['prod.cicd', 'prod.envs'],
    difficulty: 'core',
    explanation:
      'Build once and promote the identical artifact by digest through every environment. Rebuilding per environment means the thing you tested in staging is not the thing running in production, and the difference is usually a transitive dependency that moved between two builds.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the promotion of a single build artifact from commit to production.',
      steps: [
        'Build the image once from the commit and record its content digest',
        'Run tests and the eval suite against that exact digest',
        'Deploy the digest to staging and exercise it with integration and smoke tests',
        'Promote the identical digest to production, changing only environment configuration',
        'Record the digest as the current release so the rollback target is unambiguous',
      ],
    },
  },
  {
    id: 'r2.ci.eval_gate',
    mode: 'drill',
    nodeIds: ['prod.cicd', 'ai.evals'],
    difficulty: 'deep',
    explanation:
      'For an AI feature the unit tests pass whatever the prompt says, so the pipeline needs a gate that measures behavior. Running the eval set as a required check with an agreed threshold is what turns "we have evals" into "we cannot ship a regression".',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team has a good eval set and still ships prompt regressions. What is missing from the pipeline?',
      choices: [
        { id: 'a', text: 'The eval set needs considerably more cases', whyWrong: 'More cases raise sensitivity and change nothing while the result stays advisory and everybody merges anyway.' },
        { id: 'b', text: 'The evals should run nightly rather than per change', whyWrong: 'Nightly finds the regression after it shipped and after several other changes have landed on top of it.' },
        { id: 'c', text: 'They need a stronger judge model for scoring', whyWrong: 'Improves measurement quality, and it still does not make the measurement block anything.' },
        { id: 'd', text: 'The eval run is advisory, not a blocking check' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.ci.creds',
    mode: 'drill',
    nodeIds: ['prod.cicd', 'prod.config'],
    difficulty: 'core',
    explanation:
      'A long-lived service account key stored in CI is the most commonly leaked credential in any organization, and it usually has more permission than the pipeline needs. Federating the CI provider’s own workload identity removes the stored key entirely, and per-environment identities keep a staging pipeline from touching production.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your customer’s CI system holds a downloaded service account key with broad project permissions. What do you propose?',
      choices: [
        { id: 'a', text: 'Workload identity federation, scoped per environment' },
        { id: 'b', text: 'Rotate the key automatically every thirty days', whyWrong: 'Shortens the exposure window on a secret that should not exist, and rotation of an awkward key quietly stops happening.' },
        { id: 'c', text: 'Store the key in a secret manager and inject at build', whyWrong: 'Better hygiene around a credential that is still long-lived and still lands in the build environment every run.' },
        { id: 'd', text: 'Restrict the key to the CI provider IP ranges', whyWrong: 'Hosted runners have no stable egress addresses, and IP restriction is not a substitute for having no key at all.' },
      ],
      correctId: 'a',
    },
  },

  // ── Productionizing: progressive delivery ────────────────────────────────
  {
    id: 'r2.pg.bucketing',
    mode: 'drill',
    nodeIds: ['prod.progressive', 'client.state'],
    difficulty: 'edge',
    explanation:
      'Percentage rollouts routed per request put the same user on both versions within one session, which produces incoherent behavior and unreadable metrics. Bucket on a stable identifier so a user gets one consistent experience and your comparison is between two populations rather than two coin flips.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'During a ten percent rollout, users report the assistant behaving inconsistently within a single conversation. What is wrong with the rollout mechanism?',
      choices: [
        { id: 'a', text: 'Ten percent is too small a sample to be coherent', whyWrong: 'Sample size affects how confident your metrics are, not whether one user sees two versions in a row.' },
        { id: 'b', text: 'Traffic is split per request, not by stable bucket' },
        { id: 'c', text: 'The two variants were built from two different commits', whyWrong: 'That is the intent of a canary. The defect is that a single user experiences both of them in one session.' },
        { id: 'd', text: 'The load balancer is not using session affinity', whyWrong: 'Close, and affinity to an instance is not assignment to a variant. You want deterministic bucketing, not machine stickiness.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.pg.blue_green_db',
    mode: 'drill',
    nodeIds: ['prod.progressive', 'prod.migrations'],
    difficulty: 'deep',
    explanation:
      'Blue-green gives you an instant switch for the compute tier and does nothing for the shared database underneath it. Both colors read and write the same schema at once, so every schema change in a blue-green world has to be backward and forward compatible, which is expand and contract by another name.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team runs blue-green deployments against a single shared database. What constraint does that put on their schema changes?',
      choices: [
        { id: 'a', text: 'Schema changes must run inside the deployment step itself', whyWrong: 'Coupling schema and code into one step is exactly the practice expand and contract exists to break.' },
        { id: 'b', text: 'They need a separate database instance per color', whyWrong: 'Two databases means splitting the data, so the switch becomes a data migration rather than a routing change.' },
        { id: 'c', text: 'Each schema state must serve old and new code at once' },
        { id: 'd', text: 'Blue-green does not work with a relational database', whyWrong: 'It is used with relational databases constantly. The compatibility discipline is what makes it work.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.pg.flag_debt',
    mode: 'drill',
    nodeIds: ['prod.progressive', 'prod.envs'],
    difficulty: 'core',
    explanation:
      'Feature flags are cheap to add and expensive to keep. Each surviving flag doubles the number of code paths, and after a dozen of them no environment is running the combination your customer is running. Give every flag an owner and a removal date at the moment it is created.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A codebase has forty long-lived feature flags. What is the concrete harm?',
      choices: [
        { id: 'a', text: 'Production runs a combination nobody has tested' },
        { id: 'b', text: 'Flag evaluation slows down every request measurably', whyWrong: 'Evaluation is a local lookup measured in microseconds. Performance is not what makes flag debt painful.' },
        { id: 'c', text: 'Flags make a rollback harder to reason about', whyWrong: 'Flags are among the few genuinely reversible controls you have. Reversibility is the reason to use them.' },
        { id: 'd', text: 'The flag service becomes a single point of failure', whyWrong: 'A real operational concern, handled with local defaults and caching, and independent of how many flags exist.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'r2.pg.drain',
    mode: 'drill',
    nodeIds: ['prod.progressive', 'scale.horizontal'],
    difficulty: 'deep',
    explanation:
      'Rolling a deployment terminates instances that are holding live work. Without a graceful shutdown sequence, every deploy cuts in-flight requests, and with streaming responses users see an answer stop mid-sentence. Stop accepting new work, finish or hand off what you hold, then exit.',
    citations: cite('cloudRun'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order a graceful instance shutdown during a rolling deploy of a service that holds long streaming responses.',
      steps: [
        'Fail the readiness probe so the load balancer stops sending new requests',
        'Continue serving the requests and streams already in flight',
        'Stop consuming from queues and let in-flight messages finish or return unacknowledged',
        'Close pooled connections and flush telemetry buffers',
        'Exit before the platform’s termination grace period expires',
      ],
    },
  },

  // ── Productionizing: rollback ────────────────────────────────────────────
  {
    id: 'r2.rb.forward_fix',
    mode: 'drill',
    nodeIds: ['prod.rollback', 'prod.migrations'],
    difficulty: 'deep',
    explanation:
      'Rollback is the default and it is not always available. Once the new version has written data the old version cannot read, going backwards corrupts or hides records, and a narrow forward fix is the lower-risk path. The decision hinges on what has already been written, which is why you work it out before the release, not during it.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'When is forward-fixing genuinely the safer choice over rolling back?',
      choices: [
        { id: 'a', text: 'When the team believes the fix is small and safe', whyWrong: 'Confidence during an incident is unreliable, and a small fix still crosses a pipeline while the outage continues.' },
        { id: 'b', text: 'When rolling back would look bad to the customer', whyWrong: 'Optics are the worst input to a recovery decision. Customers value fast restoration over a clean release history.' },
        { id: 'c', text: 'When the previous version also had known bugs', whyWrong: 'A known previous state that mostly worked beats an unknown one you are still in the middle of debugging.' },
        { id: 'd', text: 'When new data exists that the old code cannot read' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.rb.criteria',
    mode: 'drill',
    nodeIds: ['prod.rollback', 'prod.incident'],
    difficulty: 'core',
    explanation:
      'The expensive part of a rollback is the twenty minutes of debate about whether to do it. Agreeing the trigger metric, the threshold and the time box before the release converts that debate into a decision anybody on call can make alone at 3am.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What most reduces time to recovery after a bad release?',
      choices: [
        { id: 'a', text: 'A faster deployment and rollback pipeline overall', whyWrong: 'Helps once the decision is made, and the delay is almost always in deciding rather than in deploying.' },
        { id: 'b', text: 'A rollback trigger agreed before the release' },
        { id: 'c', text: 'More senior people on the incident call', whyWrong: 'More participants usually lengthens the debate. Recovery speed comes from a pre-agreed rule, not a quorum.' },
        { id: 'd', text: 'Better structured logging on the new path', whyWrong: 'Valuable for diagnosis afterwards. Mitigation should not wait for you to understand the cause first.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.rb.downstream',
    mode: 'drill',
    nodeIds: ['prod.rollback', 'scale.caching'],
    difficulty: 'edge',
    explanation:
      'Rolling back the deployment reverts your code and not the effects your code had. Bad values sitting in caches, malformed events already published, and rows written in the new shape all survive the rollback and keep producing the symptom you thought you had fixed.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'You rolled the deployment back and the errors continue. Which leftovers commonly outlive a rollback? Select all that apply.',
      choices: [
        { id: 'a', text: 'Malformed values already written into shared caches' },
        { id: 'b', text: 'Events published in the new format that consumers are still reading' },
        { id: 'c', text: 'Rows written by the new code in a shape the old code mishandles' },
        { id: 'd', text: 'The container image tag serving traffic', whyWrong: 'That is precisely what the rollback reverted, and it is why people expect a rollback to be sufficient.' },
        { id: 'e', text: 'Environment variables set by the deployment', whyWrong: 'These revert with the revision in any sane deployment system, since they are part of the deployed configuration.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Productionizing: schema migrations ───────────────────────────────────
  {
    id: 'r2.mig.backfill',
    mode: 'drill',
    nodeIds: ['prod.migrations', 'prod.data_migration'],
    difficulty: 'core',
    explanation:
      'A backfill is a long-running write against a live database, so it needs the same care as any other production load: bounded batches, a throttle you can turn down, a resumable cursor and a verification pass. A single large UPDATE holds locks and cannot be paused when it starts hurting.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the steps for backfilling a new column across a very large live table.',
      steps: [
        'Add the nullable column and deploy code that writes it for new and updated rows',
        'Backfill historical rows in bounded batches with a throttle and a resumable cursor',
        'Verify completeness by sampling and by counting rows still missing a value',
        'Switch reads to the new column once the backfill is verified complete',
        'Apply the not-null constraint and remove the old write path',
      ],
    },
  },
  {
    id: 'r2.mig.contract_timing',
    mode: 'drill',
    nodeIds: ['prod.migrations', 'prod.rollback'],
    difficulty: 'deep',
    explanation:
      'The contract step is the irreversible one, so its timing is a risk decision rather than a cleanup chore. Dropping the old column while a rollback to the previous release is still plausible removes your ability to go back, which is the one thing you wanted the expand phase to preserve.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'In an expand and contract migration, when is it safe to run the contract step that drops the old column?',
      choices: [
        { id: 'a', text: 'Immediately after the new code is deployed everywhere', whyWrong: 'The new code being live is not the same as never needing the old code again. You have just removed your rollback path.' },
        { id: 'b', text: 'In the same release as the code change, to stay atomic', whyWrong: 'Atomicity across code and schema is what expand and contract gives up on purpose, since the two cannot deploy together.' },
        { id: 'c', text: 'Once no code reads it and the rollback window closes' },
        { id: 'd', text: 'Once the column is no longer in the ORM model class', whyWrong: 'The model reflects one codebase. Reporting jobs, replicas and other services frequently still read the column.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.mig.lock',
    mode: 'drill',
    nodeIds: ['prod.migrations'],
    difficulty: 'edge',
    explanation:
      'Migrations fail in production for reasons that never appear on a small development database, where nothing else is running. The mechanism to know by name, and it is the same in Postgres and in MySQL: the DDL waits behind one open transaction for its exclusive lock, and every query that arrives afterward queues behind the waiting DDL rather than overtaking it. One idle-in-transaction session therefore stalls the whole table, and the migration itself may have been instant. Set a short lock timeout, in Postgres lock_timeout and in MySQL lock_wait_timeout, so a blocked migration fails fast and retries instead of taking the application down with it. Note also that the concurrent index build that avoids this cannot run inside a transaction, which is exactly what many migration tools wrap everything in.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A migration that ran in under a second locally took the production database down for four minutes. What is the most likely mechanism?',
      choices: [
        { id: 'a', text: 'Production hardware is slower than a developer laptop', whyWrong: 'Production hardware is usually larger, not smaller. Concurrency, not capacity, is what differs between the two.' },
        { id: 'b', text: 'It waited on a lock and queued every query behind' },
        { id: 'c', text: 'The migration tool version differs in production', whyWrong: 'Possible, and it would normally produce an error rather than a four-minute stall of unrelated queries.' },
        { id: 'd', text: 'The production table simply has far more rows', whyWrong: 'Often true, and it makes the migration itself slow. The outage came from what was blocked behind it.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.mig.embedding_dim',
    mode: 'drill',
    nodeIds: ['prod.migrations', 'gcp.vector_search'],
    difficulty: 'deep',
    explanation:
      'Changing embedding model is a schema migration for your vector store. Vectors from two models are not comparable even at identical dimensionality, so you cannot mix them in one index. Build the new index alongside the old, re-embed the corpus, evaluate retrieval quality, then cut reads over: expand and contract, applied to embeddings.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are upgrading to a better embedding model. What does that require of the vector index?',
      choices: [
        { id: 'a', text: 'Re-embed new documents and leave old vectors in place', whyWrong: 'Mixed vector spaces make distances meaningless, so retrieval silently degrades in a way no error ever surfaces.' },
        { id: 'b', text: 'Nothing at all, provided the dimensionality matches', whyWrong: 'Matching dimensions makes vectors storable together, not comparable. Different models place meaning in different directions.' },
        { id: 'c', text: 'Rebuild the index in place while still serving traffic', whyWrong: 'Leaves you serving from a half-migrated index with no way to compare quality or to roll back.' },
        { id: 'd', text: 'A full re-embed into a separate index, then cut reads' },
      ],
      correctId: 'd',
    },
  },

  // ── Productionizing: config and secrets ──────────────────────────────────
  {
    id: 'r2.cfg.leak',
    mode: 'drill',
    nodeIds: ['prod.config'],
    difficulty: 'core',
    explanation:
      'Secrets in environment variables are fine until something dumps the environment: a crash handler, a debug endpoint, a container inspection command or an error reporter attaching process context. Fetch secrets from a manager at startup, keep them out of anything that serializes state, and scrub them in the logging layer rather than trusting every caller.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'An API key set only as an environment variable turns up in your error tracking tool. Which routes could have put it there? Select all that apply.',
      choices: [
        { id: 'a', text: 'An error reporter that attaches process context, including the environment, to captured exceptions' },
        { id: 'b', text: 'A diagnostic or health endpoint that dumps configuration for debugging' },
        { id: 'c', text: 'A crash handler or container inspection output captured into logs' },
        { id: 'd', text: 'The secret manager pushing the value to the tracker', whyWrong: 'Secret managers do not send values to third parties. Every real leak path runs through your own process.' },
        { id: 'e', text: 'TLS interception on the outbound connection', whyWrong: 'A proxy could read traffic in transit, and it would not explain a value appearing attached to your own stack trace.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'r2.cfg.where',
    mode: 'drill',
    nodeIds: ['prod.config', 'prod.envs'],
    difficulty: 'core',
    explanation:
      'Most config pain comes from putting a value in the wrong tier. Secrets belong in a manager with audit and rotation, environment-varying values belong in deployment config, runtime-toggleable behavior belongs behind a flag, and constants belong in code where they get reviewed like code.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each value to where it belongs.',
      pairs: [
        { left: 'The model provider API key', right: 'Secret manager, fetched at startup, with rotation and access audit' },
        { left: 'The database hostname, which differs per environment', right: 'Deployment configuration, versioned alongside the environment definition' },
        { left: 'Whether the new retrieval path is enabled', right: 'A feature flag with an owner and a removal date' },
        { left: 'The retry backoff multiplier', right: 'Code, reviewed and released like any other behavior change' },
      ],
    },
  },
  {
    id: 'r2.cfg.hot_reload',
    mode: 'drill',
    nodeIds: ['prod.config', 'prod.rollback'],
    difficulty: 'deep',
    explanation:
      'Runtime config changes are production changes that skip the pipeline. If they are not versioned, attributed and revertible, you have created a way to break production with no review, no history and nothing to roll back to. Treat the config store as a deployment surface with the same controls.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A platform lets operators change runtime behavior by editing values in a config store, with no deploy. What do you insist on before that is acceptable?',
      choices: [
        { id: 'a', text: 'Versioned changes with an author and a one-step revert' },
        { id: 'b', text: 'Restricting write access to two named senior engineers', whyWrong: 'Reduces frequency, not blast radius. A senior engineer with no revert path still cannot undo a mistake.' },
        { id: 'c', text: 'Requiring every change during business hours only', whyWrong: 'A scheduling convention. It does not tell you what changed, who changed it, or how to put it back.' },
        { id: 'd', text: 'Validating each value against a schema on write', whyWrong: 'Catches malformed values, not wrong ones, and wrong-but-valid is the failure that causes the incident.' },
      ],
      correctId: 'a',
    },
  },

  // ── Productionizing: environments ────────────────────────────────────────
  {
    id: 'r2.env.prod_data',
    mode: 'drill',
    nodeIds: ['prod.envs', 'sec.pii'],
    difficulty: 'deep',
    explanation:
      'Copying production data to a lower environment gives you realistic shape and quietly extends your regulated data perimeter to a place with weaker access control. Masked or synthetically generated data that preserves distributions and edge cases gets you most of the fidelity without the finding.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team wants a nightly copy of production data in staging so their tests are realistic. What is your position?',
      choices: [
        { id: 'a', text: 'Fine, since staging is an internal-only environment', whyWrong: 'Internal access is broader than production access almost everywhere, which is the entire reason this is a finding.' },
        { id: 'b', text: 'Fine as long as the copy is encrypted at rest', whyWrong: 'Encryption addresses storage theft. It does nothing about every engineer with staging access reading the data.' },
        { id: 'c', text: 'Not raw: mask or synthesize, keeping distributions' },
        { id: 'd', text: 'Never use production-like data below production', whyWrong: 'Overcorrects into the parity problem: synthetic data with no real messiness hides the defects you want to catch.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.env.shared_dep',
    mode: 'drill',
    nodeIds: ['prod.envs', 'prod.chaos'],
    difficulty: 'core',
    explanation:
      'Environment parity is not only about your own services. A staging deployment pointing at a production third-party account will send real emails, charge real cards or mutate a real CRM the first time somebody runs a load test. Every external dependency needs its own non-production identity or a stub.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You find staging configured with the production credentials for the customer’s CRM, "because they do not have a sandbox". What do you do?',
      choices: [
        { id: 'a', text: 'Leave it and rely on the team being careful', whyWrong: 'Carefulness is not a control, and the first automated test run against staging will not be careful.' },
        { id: 'b', text: 'Use a read-only production credential in staging', whyWrong: 'Better, and it still leaks production data into a lower environment while leaving every write path untestable.' },
        { id: 'c', text: 'Block staging from reaching the CRM at the network', whyWrong: 'Prevents the damage and leaves the integration untested until it runs in production for the first time.' },
        { id: 'd', text: 'Stub the CRM in staging and record contract tests' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.env.model_parity',
    mode: 'drill',
    nodeIds: ['prod.envs', 'prod.model_release'],
    difficulty: 'deep',
    explanation:
      'Using a cheaper model in staging saves money and invalidates every behavioral test you run there. Prompts that work on one model routinely fail on another, so a staging pass tells you the code runs, not that the feature works. Keep the model, temperature and safety settings identical and control cost by controlling volume instead.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'To control cost, a team configures staging to use a smaller model than production. What does that break?',
      choices: [
        { id: 'a', text: 'Nothing at all, provided the API surface matches', whyWrong: 'An identical API is what makes this so easy to do and so misleading. Behavior is the thing under test.' },
        { id: 'b', text: 'Behavioral tests, since behavior is model-specific' },
        { id: 'c', text: 'Only the latency measurements taken from staging', whyWrong: 'Latency is the least of it. Tool-call correctness and output format both move between models.' },
        { id: 'd', text: 'Only the tests that assert on exact output wording', whyWrong: 'Exact-wording tests are brittle anyway. What breaks is which tool gets called and whether the output parses.' },
      ],
      correctId: 'b',
    },
  },

  // ── Productionizing: on-call ─────────────────────────────────────────────
  {
    id: 'r2.oc.runbook',
    mode: 'drill',
    nodeIds: ['prod.oncall', 'del.handover'],
    difficulty: 'core',
    explanation:
      'A runbook is judged by whether a tired person who did not build the system can follow it. That means exact commands rather than descriptions, explicit decision points with the criteria for each branch, and a named escalation path. The test is simple: somebody outside the authoring team executes it during a game day.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'What makes a runbook usable by a tired person who did not build the system? Select all that apply.',
      choices: [
        { id: 'a', text: 'Exact commands to run, not descriptions of what to do' },
        { id: 'b', text: 'Explicit decision points with the criteria for taking each branch' },
        { id: 'c', text: 'Evidence that somebody outside the authoring team has executed it end to end' },
        { id: 'd', text: 'Background on how the system was designed', whyWrong: 'Valuable in onboarding and the wrong thing to be reading at 3am while customers are affected.' },
        { id: 'e', text: 'Storage in the same repository as the code', whyWrong: 'Helps keep it current. Proximity says nothing about whether the person on call can execute it.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'r2.oc.symptom_alerts',
    mode: 'drill',
    nodeIds: ['prod.oncall', 'del.slo'],
    difficulty: 'core',
    explanation:
      'Alert on symptoms users can feel, and put causes on dashboards. Cause-based alerts fire when a component misbehaves in ways the system absorbs, which trains people to ignore the pager, and they stay silent for user-visible failures nobody predicted a cause for.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your alerting is a long list of component-level conditions. Half of them fire without any user impact, and last month’s real outage produced no alert. What is the principle you are missing?',
      choices: [
        { id: 'a', text: 'Alert on user-visible symptoms and error budget burn' },
        { id: 'b', text: 'Raise the thresholds on the noisiest component alerts', whyWrong: 'Tunes the noise down and still leaves you blind to the failure mode nobody wrote a cause alert for.' },
        { id: 'c', text: 'Route the low-severity alerts to a chat channel', whyWrong: 'Moves the noise somewhere quieter. The outage that produced no alert still produces no alert.' },
        { id: 'd', text: 'Add an alert for last month’s failure mode', whyWrong: 'Fights the last war. The next outage will have a cause nobody enumerated in advance either.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'r2.oc.ai_runbook',
    mode: 'drill',
    nodeIds: ['prod.oncall', 'prod.model_release'],
    difficulty: 'deep',
    explanation:
      'On-call for an AI feature needs procedures that do not exist for ordinary services: how to confirm the provider is degraded rather than your code, how to switch to a fallback model, and how to revert a prompt independently of a code deploy. Without those, the only lever the responder has is a full rollback.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'What belongs in the on-call runbook for an AI feature that would not appear in a standard service runbook? Select all that apply.',
      choices: [
        { id: 'a', text: 'How to check the provider’s status and confirm degradation is upstream rather than yours' },
        { id: 'b', text: 'How to switch traffic to the fallback model, and what quality change to expect' },
        { id: 'c', text: 'How to revert to the previous prompt version without a code deployment' },
        { id: 'd', text: 'How to restart the service', whyWrong: 'Standard practice for every service and not specific to the AI path.' },
        { id: 'e', text: 'How to scale up instances', whyWrong: 'Ordinary capacity response. It is the same lever you would pull for any other workload.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Productionizing: incident response ───────────────────────────────────
  {
    id: 'r2.inc.order',
    mode: 'drill',
    nodeIds: ['prod.incident'],
    difficulty: 'core',
    explanation:
      'The order that keeps incidents short is: get a structure, stop the bleeding, then understand it. Teams that diagnose first stay in the outage while they debate, because the interesting question and the useful action are rarely the same thing in the first fifteen minutes.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the first phase of handling a customer-visible production incident.',
      steps: [
        'Declare the incident and name an incident lead and a communications owner',
        'Establish blast radius: who is affected, which surfaces, since when',
        'Mitigate with the fastest safe lever, usually reverting the most recent change',
        'Send the first customer update with impact, action and time of the next update',
        'Diagnose root cause once the bleeding has stopped',
        'Write the blameless follow-up with owned, dated actions',
      ],
    },
  },
  {
    id: 'r2.inc.what_changed',
    mode: 'drill',
    nodeIds: ['prod.incident', 'prod.rollback'],
    difficulty: 'core',
    explanation:
      'Most incidents are caused by a change, so the first diagnostic question is what changed and when, correlated against when the symptom started. That includes deploys, config edits, flag flips, migrations, quota adjustments and changes made by your providers, not just your own releases.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Error rate jumped at 14:07 with no obvious pattern in the logs. Order your diagnosis.',
      steps: [
        'List every change around 14:07: deploys, config edits, flag flips, migrations, provider notices',
        'Check whether the symptom is correlated with any of them, by variant, region or tenant',
        'Pull a sample of failing requests and read the full trace for one of them',
        'Follow that trace to the first component where the behavior diverges from healthy requests',
        'Confirm the hypothesis by making it appear and disappear, then mitigate',
      ],
    },
  },
  {
    id: 'r2.inc.correlation',
    mode: 'drill',
    nodeIds: ['prod.incident', 'prod.progressive'],
    difficulty: 'edge',
    explanation:
      'A deploy that coincides with a symptom is a hypothesis, not a conclusion, and acting on the wrong one costs you the remaining time. The cheap test is whether the symptom follows the change: does it track the canary percentage, does it appear only in the buckets receiving the new version, does it move when you revert.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Errors began four minutes after a canary went to ten percent. The team is certain the deploy is the cause. How do you test that cheaply before spending the incident on it?',
      choices: [
        { id: 'a', text: 'Roll back and see whether the errors stop', whyWrong: 'A reasonable mitigation and a slow, ambiguous experiment: if the real cause is transient, recovery looks like proof.' },
        { id: 'b', text: 'Read the diff of the deployed change line by line', whyWrong: 'Confirms what changed, not whether it explains the symptom, and it occupies the people who could be measuring.' },
        { id: 'c', text: 'Split the error rate by canary and stable variant' },
        { id: 'd', text: 'Check whether previous deploys caused the same errors', whyWrong: 'Historical base rates are useful in the follow-up and far too slow to settle the question mid-incident.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.inc.postmortem',
    mode: 'drill',
    nodeIds: ['prod.incident', 'prod.chaos'],
    difficulty: 'core',
    explanation:
      'A follow-up is only worth writing if it changes the system. Actions phrased as intentions, "be more careful", "add documentation", "review before deploying", are the ones that never get done and would not have prevented anything. Every action needs an owner, a date and a change to a control.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A postmortem lists five action items. Which one is actually worth tracking?',
      choices: [
        { id: 'a', text: '"Engineers will review migrations far more carefully"', whyWrong: 'An intention, not a change. The same tired person will make the same call under the same pressure next time.' },
        { id: 'b', text: '"Add a pre-deploy check for migration and code coupling"' },
        { id: 'c', text: '"Document the migration process in the team wiki"', whyWrong: 'A document nobody reads at the moment of the mistake changes no outcome. Encode the rule in a check instead.' },
        { id: 'd', text: '"Investigate whether this could happen in other services"', whyWrong: 'Unbounded and unassignable, so it stays open forever. Make it a specific audit with a scope, an owner and a date.' },
      ],
      correctId: 'b',
    },
  },

  // ── Productionizing: failure testing ─────────────────────────────────────
  {
    id: 'r2.chaos.gameday',
    mode: 'drill',
    nodeIds: ['prod.chaos'],
    difficulty: 'core',
    explanation:
      'A game day without a hypothesis is an outage you scheduled. State what you expect to happen, bound the blast radius, agree the abort criteria and have the rollback ready before you inject anything. The value is in the gap between what you predicted and what happened.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the steps of a game day that is an experiment rather than an unscheduled outage.',
      steps: [
        'Write the hypothesis: which failure, and what the system is expected to do about it',
        'Bound the blast radius and agree the abort criteria and who can call it',
        'Confirm the observability you will judge the result by is actually in place',
        'Inject the single failure and observe against the hypothesis',
        'Stop the injection and verify the system returns to its normal state',
        'Record the gap between expectation and behavior as owned, dated actions',
      ],
    },
  },
  {
    id: 'r2.chaos.latency',
    mode: 'drill',
    nodeIds: ['prod.chaos', 'scale.timeouts'],
    difficulty: 'deep',
    explanation:
      'Error injection tests your error handling, which most teams have written. Latency injection tests everything they have not: timeout values, pool exhaustion, queue growth, retry amplification and whether the user sees anything at all while a dependency is merely slow. Slow is the failure mode that takes systems down.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each injected failure to the behavior it actually puts under test.',
      pairs: [
        { left: 'Added latency on a dependency', right: 'Timeout values, connection pool sizing, queue growth and retry amplification' },
        { left: 'Sustained 503s from a dependency', right: 'The circuit breaker, the fallback path and what the user is told' },
        { left: 'A network partition isolating one zone', right: 'Failover routing and whether the survivors have N-1 capacity' },
        { left: 'An expired credential on a background job', right: 'Rotation handling and whether the failure alerts anybody' },
      ],
    },
  },
  {
    id: 'r2.chaos.untested_path',
    mode: 'drill',
    nodeIds: ['prod.chaos', 'scale.degradation'],
    difficulty: 'edge',
    explanation:
      'Prioritize injection by where you have the least evidence. A dependency with a fallback that has never fired is a fallback you do not know works, and the code most likely to be wrong is the code that has never run in production. Look for handlers with no telemetry proving they have executed.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You have time to inject one failure before go-live. How do you choose which?',
      choices: [
        { id: 'a', text: 'The dependency whose failure path has never executed' },
        { id: 'b', text: 'The dependency that fails most often in production today', whyWrong: 'Its failure path runs regularly, so it is the one piece of degradation logic you already have evidence for.' },
        { id: 'c', text: 'The slowest dependency in the critical request path', whyWrong: 'Slow is a performance property. It says nothing about whether your handling of its failure actually works.' },
        { id: 'd', text: 'The dependency the customer is most worried about', whyWrong: 'Worth addressing in conversation, and customer intuition about which component is fragile is frequently wrong.' },
      ],
      correctId: 'a',
    },
  },

  // ── Productionizing: cost ────────────────────────────────────────────────
  {
    id: 'r2.cost.attribution',
    mode: 'drill',
    nodeIds: ['prod.cost_monitoring', 'ai.observability'],
    difficulty: 'core',
    explanation:
      'You cannot reconstruct per-tenant AI cost from an invoice, because the provider bills you for tokens and knows nothing about your tenants. Attribution has to be captured at call time: tenant, feature and request id recorded alongside the token counts, so cost becomes a dimension you can group by.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Finance asks which customers are driving your model spend. What determines whether you can answer?',
      choices: [
        { id: 'a', text: 'Whether billing export to the warehouse is enabled', whyWrong: 'Gives you accurate totals per project and per SKU, with no idea at all which tenant produced them.' },
        { id: 'b', text: 'Whether each tenant runs in its own cloud project', whyWrong: 'One way to get attribution, and a heavy one that multiplies quota, deployment and operational overhead per customer.' },
        { id: 'c', text: 'Whether you standardized on one single model version', whyWrong: 'Simplifies unit pricing and tells you nothing whatsoever about who consumed the tokens.' },
        { id: 'd', text: 'Whether tenant and token counts are logged per call' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.cost.unit',
    mode: 'drill',
    nodeIds: ['prod.cost_monitoring', 'del.tco'],
    difficulty: 'deep',
    explanation:
      'Cost per token is a supplier metric. The number that decides whether a feature survives is cost per resolved task, because a cheaper model that needs three attempts and an escalation is more expensive than an accurate one. Optimizing the token price while the resolution rate falls is how teams save money into a failed product.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team reduced cost per thousand tokens by forty percent and the AI feature’s total cost went up. What are they measuring wrong?',
      choices: [
        { id: 'a', text: 'They forgot to include the embedding call cost', whyWrong: 'Worth including in the model, and it would not usually reverse a forty percent cut in unit price on its own.' },
        { id: 'b', text: 'Their token counting is inaccurate downstream', whyWrong: 'That biases the numbers in one direction consistently. It does not turn a unit-cost win into a total-cost loss.' },
        { id: 'c', text: 'They optimized per token, not per resolved task' },
        { id: 'd', text: 'They ignored the cheaper model price rising later', whyWrong: 'Provider prices move slowly and usually downward. Retry behavior moves the moment you swap the model.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.cost.idle',
    mode: 'drill',
    nodeIds: ['prod.cost_monitoring', 'scale.autoscaling'],
    difficulty: 'core',
    explanation:
      'A budget alert that emails a distribution list is a notification, not a guardrail. A guardrail is something that acts: a per-run token ceiling, an automatic disable on a runaway job, or a named owner with an agreed action. The test is whether anything happens when nobody reads their email.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s only cost control is a monthly budget alert that emails the platform team. What do you add?',
      choices: [
        { id: 'a', text: 'Controls that act: per-run token ceilings and hard caps' },
        { id: 'b', text: 'A second budget alert at fifty percent of the monthly spend', whyWrong: 'Two notifications sharing one failure mode, which is that nobody has to do anything when either arrives.' },
        { id: 'c', text: 'A weekly cost review meeting with the platform team', whyWrong: 'Useful for trends and far too slow for a runaway loop that spends a month of budget overnight.' },
        { id: 'd', text: 'More granular cost labels on every deployed workload', whyWrong: 'Improves attribution after the fact. It does not stop a single dollar of the spend as it happens.' },
      ],
      correctId: 'a',
    },
  },

  // ── Productionizing: model and prompt releases ───────────────────────────
  {
    id: 'r2.mrel.artifact',
    mode: 'drill',
    nodeIds: ['prod.model_release', 'prod.cicd'],
    difficulty: 'core',
    explanation:
      'A prompt is production behavior, so it needs the properties of a release: a version identifier, review before it changes, and a record on each request of which version produced the output. Without that, the answer to "why did it behave differently last Tuesday" is unavailable.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Prompts live in a database table anyone with admin access can edit in place. Which properties must a prompt gain to count as a release artifact? Select all that apply.',
      choices: [
        { id: 'a', text: 'An immutable version identifier, so a given text can never change under an id' },
        { id: 'b', text: 'Review before a new version becomes active, like any other production change' },
        { id: 'c', text: 'The active version id recorded on every request, so an output can be traced to a prompt' },
        { id: 'd', text: 'Storage inside the application binary', whyWrong: 'Gets you history and couples every wording change to a full deploy, which is what pushes teams back to editing in place.' },
        { id: 'e', text: 'Restricted edit access for two named people', whyWrong: 'Reduces how often it happens and provides no version, no history and no traceability.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'r2.mrel.overfit',
    mode: 'drill',
    nodeIds: ['prod.model_release', 'ai.evals'],
    difficulty: 'deep',
    explanation:
      'Iterating on a prompt against a fixed eval set eventually tunes the prompt to that set rather than to the task. Hold out cases the authors never see, refresh the set from production failures, and treat a suspiciously large jump as evidence of leakage rather than of genius.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'After twenty rounds of prompt iteration, the eval score is 94 percent and users report no improvement. What is the most likely explanation?',
      choices: [
        { id: 'a', text: 'The eval set is too small to be representative', whyWrong: 'Contributes, and it is not the mechanism. Even a large set becomes a training target once you optimize against it.' },
        { id: 'b', text: 'The judge model has grown too lenient over time', whyWrong: 'That inflates the score from the start. It does not create a widening gap between score and user experience.' },
        { id: 'c', text: 'Users are measuring something the eval never covers', whyWrong: 'Possible, and if the eval tracked what users care about, twenty rounds of gains should surface somewhere.' },
        { id: 'd', text: 'The prompt is tuned to the eval set, not the task' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.mrel.shadow',
    mode: 'drill',
    nodeIds: ['prod.model_release', 'prod.progressive'],
    difficulty: 'deep',
    explanation:
      'Shadow running sends real production traffic to the candidate model without showing anyone its output, so you compare on the real distribution of questions at zero user risk. It costs double inference on the shadowed slice and it is the only way to see how a model behaves on the inputs your evals never imagined.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You want evidence about a new model on real traffic before any user sees it. What do you set up?',
      choices: [
        { id: 'a', text: 'A one percent canary behind a metric gate', whyWrong: 'A good next step, and it does expose real users to the candidate, which is the thing you wanted to avoid first.' },
        { id: 'b', text: 'Shadow the candidate on sampled live requests' },
        { id: 'c', text: 'A larger and more varied offline eval set', whyWrong: 'Still your imagination of the traffic. Shadowing gets the real distribution, including questions nobody would write down.' },
        { id: 'd', text: 'Internal dogfooding for two weeks before launch', whyWrong: 'Cheap and unrepresentative: employees ask systematically different questions from the ones customers ask.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.mrel.deprecation',
    mode: 'drill',
    nodeIds: ['prod.model_release', 'prod.rollback'],
    difficulty: 'core',
    explanation:
      'Model versions are deprecated on the provider’s schedule, not yours, and a pinned version is a dated commitment. Treat the notice as a project: re-run evals on the successor, shadow or canary it, and complete the migration before the retirement date rather than discovering it through a sudden behavior change.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Your provider announces that the model version you pinned retires in three months. Order the migration.',
      steps: [
        'Run the existing eval suite against the successor version to size the behavior gap',
        'Fix the prompts and tool descriptions the evals show have regressed',
        'Shadow the successor on sampled live traffic and compare against the current version',
        'Canary it on a small share of real users behind a metric gate',
        'Ramp to full traffic and re-pin the configuration to the new version',
      ],
    },
  },

  // ── Productionizing: cutover and data migration ──────────────────────────
  {
    id: 'r2.dm.dual_write',
    mode: 'drill',
    nodeIds: ['prod.data_migration', 'data.idempotency'],
    difficulty: 'deep',
    explanation:
      'Dual writing to two stores from application code is not atomic: the second write can fail after the first succeeded, and the systems diverge invisibly. Write once and derive the second copy from the first, via an outbox or change data capture, so there is one source of truth and a replayable log.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'During a migration the application writes each record to both the old and the new store. What is the flaw?',
      choices: [
        { id: 'a', text: 'It roughly doubles the write latency on every record', whyWrong: 'True, and usually acceptable for the length of a migration. Silent divergence is what you cannot accept.' },
        { id: 'b', text: 'The new store may have a different schema shape', whyWrong: 'Expected, and handled by the mapping. Schema difference is the reason for the migration, not a flaw in it.' },
        { id: 'c', text: 'The two writes are not atomic, so stores diverge' },
        { id: 'd', text: 'It doubles storage cost for the whole dataset', whyWrong: 'The intended and temporary cost of running two systems side by side during a cutover.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.dm.reconcile',
    mode: 'drill',
    nodeIds: ['prod.data_migration', 'data.quality'],
    difficulty: 'deep',
    explanation:
      'Row counts prove nothing about content, and full comparison of a large dataset is often impractical. Content hashes over stable key ranges catch mismatched values at reasonable cost, and targeted sampling of the classes most likely to be mistranslated, nulls, dates, encodings, catches the transformation bugs a hash will confirm but not explain.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'You have migrated 40 million rows and must demonstrate the copy is correct. Which checks are real evidence? Select all that apply.',
      choices: [
        { id: 'a', text: 'Content hashes compared over matching key ranges on both sides' },
        { id: 'b', text: 'Targeted sampling of the classes most likely to be mistranslated: nulls, dates, encodings and outliers' },
        { id: 'c', text: 'Aggregate invariants that must hold, such as per-account balances or per-tenant totals' },
        { id: 'd', text: 'Matching row counts', whyWrong: 'Equal counts are consistent with every value being wrong. Necessary, and not evidence of correctness.' },
        { id: 'e', text: 'The migration tool reporting success', whyWrong: 'It reports that the transfer completed, not that the transformation preserved meaning.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'r2.dm.decommission',
    mode: 'drill',
    nodeIds: ['prod.data_migration', 'prod.rollback'],
    difficulty: 'deep',
    explanation:
      'The old system is your rollback plan, and turning it off is the point where the migration stops being reversible. Keep it readable, and keep the reverse sync running, until you have covered the full business cycle: month-end, the quarterly report, the annual job that nobody remembered.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'The new system has served all traffic for two weeks with no issues. When do you decommission the old one?',
      choices: [
        { id: 'a', text: 'After the longest business cycle has run on the new one' },
        { id: 'b', text: 'Now, since two weeks of clean traffic is convincing enough', whyWrong: 'Two weeks of daily traffic says nothing about the month-end job or the annual reconciliation not yet run.' },
        { id: 'c', text: 'After a fixed ninety days from the cutover date', whyWrong: 'An arbitrary number, far too short for an annual process and needlessly long for a simple one.' },
        { id: 'd', text: 'Once the team is confident the migration is done', whyWrong: 'Confidence is not a criterion anybody else can check, which is why that decision drifts in both directions.' },
      ],
      correctId: 'a',
    },
  },

  // ── Client: streaming UI ─────────────────────────────────────────────────
  {
    id: 'r2.cui.resume',
    mode: 'drill',
    nodeIds: ['client.streaming_ui', 'client.offline'],
    difficulty: 'deep',
    explanation:
      'Mobile networks drop connections mid-answer routinely. If the server holds the generation and assigns each chunk a sequence id, a reconnecting client can say where it got to and receive the rest. Without that, the only recovery is regenerating from scratch, which costs the tokens twice and shows the user their answer restarting.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Users on mobile lose the connection partway through a streamed answer and see it restart from the beginning. What is the design change?',
      choices: [
        { id: 'a', text: 'Increase the client-side retry count and backoff', whyWrong: 'Retrying the request restarts the generation. The problem is that there is no way to resume an existing one.' },
        { id: 'b', text: 'Buffer the whole answer and send it in one response', whyWrong: 'Removes streaming, so the user stares at nothing for the whole generation and a drop still loses everything.' },
        { id: 'c', text: 'Keep the connection alive with periodic heartbeats', whyWrong: 'Helps against idle-timeout proxies and does nothing at all when the radio itself drops the connection.' },
        { id: 'd', text: 'Sequence each chunk and buffer it on the server' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.cui.first_token',
    mode: 'drill',
    nodeIds: ['client.streaming_ui', 'ai.latency'],
    difficulty: 'intro',
    explanation:
      'The gap before the first token is where users decide whether the product is broken. Filling it with a specific, truthful signal, that the request was received, that retrieval is running, that a tool is being called, buys far more patience than a spinner, because a spinner is indistinguishable from a hang.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Time to first token is around two seconds because retrieval runs first. What should the interface show in that window?',
      choices: [
        { id: 'a', text: 'An indeterminate spinner until the tokens arrive', whyWrong: 'Indistinguishable from a frozen client, which is exactly why users start pressing the button again.' },
        { id: 'b', text: 'A truthful progress signal naming the current step' },
        { id: 'c', text: 'A fake typing animation until real tokens arrive', whyWrong: 'Fabricates activity, and the moment real tokens appear the transition reveals the first part was theater.' },
        { id: 'd', text: 'Nothing at all until the first token lands', whyWrong: 'Two seconds of unchanged screen after a click reads as a click that did not register.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.cui.midstream_fail',
    mode: 'drill',
    nodeIds: ['client.streaming_ui', 'client.error_states'],
    difficulty: 'core',
    explanation:
      'A stream that fails after three paragraphs leaves the user holding a truncated answer that looks complete. Keep the partial text, mark it explicitly as incomplete, and offer a continue or retry action, because silently discarding it wastes the tokens and silently keeping it invites someone to act on half an answer.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A streamed answer fails after three paragraphs have rendered. What should the client do with the partial text?',
      choices: [
        { id: 'a', text: 'Discard the partial text and show an error', whyWrong: 'Throws away tokens the user already paid for, plus content that may already have answered the question.' },
        { id: 'b', text: 'Keep the partial text as if it were complete', whyWrong: 'A truncated answer that looks finished is worse than an error, because somebody will act on it.' },
        { id: 'c', text: 'Keep it, mark it incomplete, offer retry' },
        { id: 'd', text: 'Automatically regenerate the answer from scratch', whyWrong: 'Doubles cost and latency unasked, and the second answer differs from the first, which is disorienting.' },
      ],
      correctId: 'c',
    },
  },

  // ── Client: tokens in the client ─────────────────────────────────────────
  {
    id: 'r2.tok.native',
    mode: 'drill',
    nodeIds: ['client.token_storage', 'idp.oidc'],
    difficulty: 'intro',
    explanation:
      'On a mobile device the equivalent of localStorage is ordinary app storage: readable on a rooted or jailbroken device and often included in device backups. Refresh tokens belong in the platform keystore, which is hardware backed and can require device unlock, and access tokens should stay in memory.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A React Native app keeps its refresh token in the standard async key-value store. What do you recommend?',
      choices: [
        { id: 'a', text: 'Move it into the platform keystore or the keychain' },
        { id: 'b', text: 'Encrypt it before writing it to the same store', whyWrong: 'The encryption key has to live on the device too, so you have moved the problem rather than solved it.' },
        { id: 'c', text: 'Shorten the refresh token lifetime to an hour', whyWrong: 'Reduces the value of a stolen token and does nothing to stop it being readable in the meantime.' },
        { id: 'd', text: 'Obfuscate the storage key name in the bundle', whyWrong: 'Security by naming convention. Anyone who can read the store can enumerate all of it anyway.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'r2.tok.bff',
    mode: 'drill',
    nodeIds: ['client.token_storage', 'idp.scopes'],
    difficulty: 'deep',
    explanation:
      'The backend-for-frontend pattern keeps tokens entirely out of the browser: the server holds them and the browser carries an httpOnly, SameSite session cookie it cannot read. It costs you a stateful server component and it removes an entire class of token theft, which is why enterprise reviews increasingly expect it.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A security review objects to any OAuth token being reachable from JavaScript in your web app. What architecture satisfies that?',
      choices: [
        { id: 'a', text: 'Keep the token in a JavaScript closure held in memory', whyWrong: 'Better than localStorage against a stray storage read, and still reachable by any code executing in the page.' },
        { id: 'b', text: 'Store the token in a cookie without httpOnly set', whyWrong: 'A cookie readable by JavaScript is precisely what the reviewer objected to, with request forgery risk added.' },
        { id: 'c', text: 'Use a service worker to hold the token for you', whyWrong: 'A real mitigation, and it does not satisfy this reviewer: injected script cannot read the worker’s memory but can still ask it to make authenticated calls, and the worker can be unregistered or evicted.' },
        { id: 'd', text: 'A backend for frontend holding an httpOnly cookie' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.tok.telemetry',
    mode: 'drill',
    nodeIds: ['client.token_storage', 'sec.audit'],
    difficulty: 'deep',
    explanation:
      'Client observability tools capture more than teams expect: full URLs, request headers, breadcrumb logs and sometimes session replay. A token in a query string or an unfiltered Authorization header ends up in a third-party system with a long retention period and a different access model. Redact at the SDK boundary and never put credentials in a URL.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which client-side practices routinely put access tokens somewhere you did not intend? Select all that apply.',
      choices: [
        { id: 'a', text: 'Passing the token as a query parameter, so it lands in URLs captured by analytics and server access logs' },
        { id: 'b', text: 'Error reporting SDKs that attach request headers to captured exceptions by default' },
        { id: 'c', text: 'Session replay tools recording network activity without a redaction rule' },
        { id: 'd', text: 'Sending the token in an Authorization header over TLS', whyWrong: 'This is the correct transport. The risk comes from what else copies the header, not from the header itself.' },
        { id: 'e', text: 'Refreshing the token on a timer before expiry', whyWrong: 'Ordinary session maintenance with no bearing on where the token gets copied.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Client: error and empty states ───────────────────────────────────────
  {
    id: 'r2.err.three_states',
    mode: 'drill',
    nodeIds: ['client.error_states'],
    difficulty: 'intro',
    explanation:
      'Loading, empty and error are three different states and users respond to each differently. Collapsing them, most often by showing an empty list while a request is still running or has failed, teaches people that the product loses their data. Name the state and give each one an appropriate action.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each state to what the interface should show.',
      pairs: [
        { left: 'The request is still in flight', right: 'A skeleton or progress indicator that says work is happening' },
        { left: 'The request succeeded and returned nothing', right: 'An empty state explaining why it is empty and what to do next' },
        { left: 'The request failed', right: 'What failed, whether it is retryable, and a retry control' },
        { left: 'The user has not searched yet', right: 'A prompt or examples, not an empty-results message' },
      ],
    },
  },
  {
    id: 'r2.err.retry_affordance',
    mode: 'drill',
    nodeIds: ['client.error_states', 'client.cancellation'],
    difficulty: 'core',
    explanation:
      'Retry means different things depending on where the failure happened. Before any output, retrying the same request is safe and obvious. After partial output, the user needs to know whether they will be charged again and whether the answer restarts, so offer continue and regenerate as distinct actions rather than one ambiguous button.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your streaming answer failed halfway. What is wrong with offering a single "Retry" button?',
      choices: [
        { id: 'a', text: 'Retry buttons let users hammer a failing service', whyWrong: 'A rate-limited button that disables while a request is pending handles that. The ambiguity is the real defect.' },
        { id: 'b', text: 'It hides whether you continue or start from scratch' },
        { id: 'c', text: 'Retries at this point should always be automatic', whyWrong: 'Automatic regeneration spends tokens without consent and swaps the user’s partial answer for a different one.' },
        { id: 'd', text: 'The button should carry the upstream error code', whyWrong: 'Error codes belong in diagnostics and support tooling, not in the label of the primary action.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.err.upstream_429',
    mode: 'drill',
    nodeIds: ['client.error_states', 'data.rate_limits'],
    difficulty: 'core',
    explanation:
      'Provider rate limits are your problem, not the user’s. Surface them as a short, honest wait with an automatic retry after the interval the provider named, and keep the request queued rather than making the user re-enter it. Leaking the upstream status code teaches nothing and blames the wrong party.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your model provider returns a 429 with a Retry-After of eight seconds. What should the user see?',
      choices: [
        { id: 'a', text: 'An error saying you were rate limited, with a button', whyWrong: 'Pushes an eight-second wait you already know about onto the user, and blames them for load they did not cause.' },
        { id: 'b', text: 'The raw provider error message and status code', whyWrong: 'Exposes a vendor implementation detail that means nothing to the user and reads as your product being broken.' },
        { id: 'c', text: 'A brief busy state that retries after the interval' },
        { id: 'd', text: 'A generic failure so they try again much later', whyWrong: 'Discards a request you could satisfy in eight seconds, and generic failures are what make people distrust a product.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.err.no_end',
    mode: 'drill',
    nodeIds: ['client.error_states', 'scale.timeouts'],
    difficulty: 'intro',
    explanation:
      'Any spinner that can spin forever is a bug. If the request has no client-side deadline, a dropped connection or a silently discarded response leaves the interface waiting for something that will never come. Every pending state needs a timeout and a defined terminal state.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A tester reports that the app "sometimes just spins forever". What is the structural defect?',
      choices: [
        { id: 'a', text: 'The pending state has no client-side deadline' },
        { id: 'b', text: 'The server is simply too slow under this load', whyWrong: 'Even a fast server drops connections sometimes. A client that cannot handle a missing response is broken anyway.' },
        { id: 'c', text: 'The spinner animation is misleading to testers', whyWrong: 'The animation is honest about waiting. The problem is that the waiting has no defined end condition.' },
        { id: 'd', text: 'The request should be retried automatically here', whyWrong: 'A retry with no deadline gives you two requests that can both hang forever instead of one.' },
      ],
      correctId: 'a',
    },
  },

  // ── Client: optimistic updates ───────────────────────────────────────────
  {
    id: 'r2.opt.when_not',
    mode: 'drill',
    nodeIds: ['client.optimistic'],
    difficulty: 'core',
    explanation:
      'Optimistic updates work when you can predict the server result. You cannot predict a model’s output, a server-assigned identifier or the outcome of a payment, so rendering a guess means retracting it in front of the user. Reserve optimism for operations whose success is near certain and whose result you already know.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each operation to the right rendering strategy.',
      pairs: [
        { left: 'Toggling a favorite on a list item', right: 'Optimistic: the client already knows the result and rollback is cheap' },
        { left: 'Sending a message the user just typed', right: 'Optimistic, with a visible failed state that keeps the text recoverable' },
        { left: 'Generating a model answer', right: 'Never optimistic: stream the real output, because the result cannot be predicted' },
        { left: 'Taking a payment', right: 'Pending state until the server confirms, because retracting a success is unacceptable' },
      ],
    },
  },
  {
    id: 'r2.opt.rollback_ux',
    mode: 'drill',
    nodeIds: ['client.optimistic', 'client.error_states'],
    difficulty: 'intro',
    explanation:
      'Rolling back an optimistic update is a data problem and a communication problem. Silently reverting looks like the app lost the user’s work, so keep the failed item visible with its failure marked and its content recoverable, and let the user retry or edit rather than retype.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An optimistically rendered message fails to send. What is the right behavior?',
      choices: [
        { id: 'a', text: 'Remove it and show a toast about the failure', whyWrong: 'The user watches their text vanish, and the toast disappears again before they can act on it.' },
        { id: 'b', text: 'Leave it looking sent and retry in background', whyWrong: 'Shows a false success. The user believes something was delivered when nothing ever was.' },
        { id: 'c', text: 'Remove it and restore the text into the input', whyWrong: 'Better than losing it, and it breaks the conversation position and discards anything typed since.' },
        { id: 'd', text: 'Keep it, mark it failed, offer retry or edit' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.opt.reconcile',
    mode: 'drill',
    nodeIds: ['client.optimistic', 'client.state'],
    difficulty: 'deep',
    explanation:
      'The subtle optimistic bug is reconciliation by identity: the server assigns a real id, and if the client cannot match it to the temporary one the item appears twice. Carry a client-generated key through the request and use it, or the server echo of it, to replace rather than append.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'After an optimistic create succeeds, the new item briefly appears twice in the list. What is the cause?',
      choices: [
        { id: 'a', text: 'The list is not sorted deterministically anymore', whyWrong: 'That would change the order the items appear in. It would not create a second copy of one of them.' },
        { id: 'b', text: 'It merges on server id, so the entry gets appended' },
        { id: 'c', text: 'The create request was actually sent twice over', whyWrong: 'That produces two records that both persist, not a duplicate that resolves itself on the next refresh.' },
        { id: 'd', text: 'The client cache TTL is far too long for this', whyWrong: 'Stale data shows you an old value. It does not manufacture an extra row that then disappears.' },
      ],
      correctId: 'b',
    },
  },

  // ── Client: offline and flaky networks ───────────────────────────────────
  {
    id: 'r2.off.conflict',
    mode: 'drill',
    nodeIds: ['client.offline', 'client.state'],
    difficulty: 'deep',
    explanation:
      'Offline editing guarantees that two versions of a record will eventually meet. Last-write-wins is simple and silently destroys work, so decide per field or per entity: merge where the data structure allows it, and surface a genuine conflict to the user where it does not.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Two devices edited the same record while offline and both are now syncing. Three of these policies are defensible. Which one is not?',
      choices: [
        { id: 'a', text: 'Field-level merge, with conflicts surfaced where edits overlap', whyWrong: 'Defensible: it preserves non-conflicting work and asks the user only about genuine collisions.' },
        { id: 'b', text: 'A server version check that rejects a stale write', whyWrong: 'Defensible: this is standard optimistic concurrency, and it never destroys data without someone deciding to.' },
        { id: 'c', text: 'Last write wins by client clock, applied silently' },
        { id: 'd', text: 'Keep both versions and ask the user to choose one', whyWrong: 'Defensible: clumsy for frequent edits, and nothing is lost without a person making the call.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.off.outbox_order',
    mode: 'drill',
    nodeIds: ['client.offline', 'client.optimistic'],
    difficulty: 'core',
    explanation:
      'An outbox flush is a small distributed system in the client. Operations have to keep their order, carry a stable idempotency key so a retry after an ambiguous failure does not duplicate work, and stop on a permanent error instead of blocking the queue behind an operation that will never succeed.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the steps of a correct outbox flush when connectivity returns.',
      steps: [
        'Read queued operations in the order they were created',
        'Send the oldest operation with its stable idempotency key',
        'On success, mark it applied and reconcile the local record with the server response',
        'On a retryable failure, back off with jitter and keep the operation queued in place',
        'On a permanent rejection, move it aside, surface it to the user, and continue with the rest',
      ],
    },
  },
  {
    id: 'r2.off.stale_read',
    mode: 'drill',
    nodeIds: ['client.offline', 'client.error_states'],
    difficulty: 'intro',
    explanation:
      'Serving cached content offline is right; serving it as though it were live is not. Showing what you have with an honest "as of" marker lets people judge whether the data is fresh enough for the decision they are making, which is a judgement only they can make.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'The device is offline and you have yesterday’s cached data for the screen the user opened. What do you show?',
      choices: [
        { id: 'a', text: 'The cached data, marked with when it was updated' },
        { id: 'b', text: 'The cached data with no freshness indication at all', whyWrong: 'Users decide on stale data believing it is current, which is the failure mode that erodes trust fastest.' },
        { id: 'c', text: 'An offline error screen with a retry button', whyWrong: 'Withholds information you already hold, and that information is very likely still correct.' },
        { id: 'd', text: 'A blocking dialog offering the cached data', whyWrong: 'Interrupts to ask a question a label already answers, every single time they open the screen.' },
      ],
      correctId: 'a',
    },
  },

  // ── Client: cancellation and abort ───────────────────────────────────────
  {
    id: 'r2.can.propagate',
    mode: 'drill',
    nodeIds: ['client.cancellation', 'prod.cost_monitoring'],
    difficulty: 'deep',
    explanation:
      'Closing a connection in the browser does not stop anything upstream by itself. Unless your server observes the client disconnect and aborts its own request to the provider, generation continues to completion: you pay for the tokens and you hold the capacity for an answer nobody will read.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A user hits stop. The client aborts the fetch and the UI updates instantly. What still has to happen server side?',
      choices: [
        { id: 'a', text: 'Nothing: closing the socket cancels it automatically', whyWrong: 'A closed socket is a hint your server must notice and act on. Nothing upstream is cancelled by a browser hanging up.' },
        { id: 'b', text: 'The server must abort its own upstream request' },
        { id: 'c', text: 'The server should finish and cache it for later reuse', whyWrong: 'Defensible on cost only if you genuinely reuse it, and it holds serving capacity for a speculative benefit.' },
        { id: 'd', text: 'The server should log the cancellation and continue', whyWrong: 'Records the event and keeps burning tokens and concurrency on work nobody is going to read.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.can.late_response',
    mode: 'drill',
    nodeIds: ['client.cancellation', 'client.state'],
    difficulty: 'edge',
    explanation:
      'A cancelled or superseded request whose response still arrives will happily write itself into your state. The result is a flash of the previous answer over the current one, and it is a race that only shows up under real latency. Tag each request and discard any response that is not from the current one.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A user asks a second question before the first finishes. Occasionally the first answer overwrites the second. What is the fix?',
      choices: [
        { id: 'a', text: 'Disable the input until the first answer completes', whyWrong: 'Fixes the race by removing a feature users want, and it does not help when they navigate or edit instead.' },
        { id: 'b', text: 'Debounce the submit handler by a few hundred ms', whyWrong: 'Debouncing addresses rapid duplicate submits, not a response arriving after a newer one has started.' },
        { id: 'c', text: 'Tag requests and ignore responses from stale ones' },
        { id: 'd', text: 'Increase the abort timeout on the fetch call', whyWrong: 'Timeouts govern how long you are willing to wait, not which response your state agrees to accept.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'r2.can.cleanup',
    mode: 'drill',
    nodeIds: ['client.cancellation', 'client.perf'],
    difficulty: 'core',
    explanation:
      'Every stream owns resources that outlive the component rendering it: a reader, an event source, timers, subscriptions. If teardown does not close them, a user navigating between conversations accumulates live readers that keep writing into state nobody is showing, which is both a leak and a source of ghost updates.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A user navigates away from a conversation while an answer is streaming. What must the client tear down? Select all that apply.',
      choices: [
        { id: 'a', text: 'The stream reader or event source, so the connection actually closes' },
        { id: 'b', text: 'Any timers or animation frames driving the incremental render' },
        { id: 'c', text: 'State subscriptions that would otherwise write into an unmounted view' },
        { id: 'd', text: 'The conversation history already persisted locally', whyWrong: 'That is the data the user expects to find when they come back. Navigation is not a reason to discard it.' },
        { id: 'e', text: 'The authentication session', whyWrong: 'Session lifetime has nothing to do with leaving one screen.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Client: accessibility ────────────────────────────────────────────────
  {
    id: 'r2.a11y.politeness',
    mode: 'drill',
    nodeIds: ['client.a11y', 'client.streaming_ui'],
    difficulty: 'deep',
    explanation:
      'A live region that announces every token makes a screen reader unusable, because each update interrupts the previous announcement. Announce at meaningful boundaries, keep the region polite rather than assertive, and make sure the final answer is reachable as ordinary readable content once generation ends.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A screen reader user says your streaming answer is "a stutter of half words". The text is in an assertive live region updated on every token. What do you change?',
      choices: [
        { id: 'a', text: 'Remove the live region from the answer entirely', whyWrong: 'Then nothing is announced at all, and the user has no idea an answer is even arriving.' },
        { id: 'b', text: 'Announce only the final answer once it has completed', whyWrong: 'Leaves the user in silence for the whole generation, unable to tell whether anything is happening.' },
        { id: 'c', text: 'Keep it assertive but update every five tokens', whyWrong: 'Assertive still interrupts the previous announcement, so the stutter is slower rather than gone.' },
        { id: 'd', text: 'Make it polite and announce at sentence boundaries' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.a11y.stop_control',
    mode: 'drill',
    nodeIds: ['client.a11y', 'client.cancellation'],
    difficulty: 'intro',
    explanation:
      'Stop generation is a primary action and it appears mid-interaction, which is exactly when keyboard and screen reader users are most likely to lose it. It needs to be a real focusable button in a predictable position, labelled, and reachable without hunting through a region whose content is changing under the cursor.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What does a keyboard-only user need from the stop-generation control?',
      choices: [
        { id: 'a', text: 'A focusable, labeled button in a stable position' },
        { id: 'b', text: 'A keyboard shortcut documented in the help center', whyWrong: 'Undiscoverable at the moment it is needed, and shortcuts collide with assistive technology bindings.' },
        { id: 'c', text: 'The escape key, since that is the convention', whyWrong: 'Escape conventionally dismisses overlays. Nobody can know it also cancels generation unless something says so.' },
        { id: 'd', text: 'A button that appears on hover over the message', whyWrong: 'Hover-only controls are unreachable by keyboard and unreachable by touch, which is two audiences excluded.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'r2.a11y.not_color',
    mode: 'drill',
    nodeIds: ['client.a11y'],
    difficulty: 'intro',
    explanation:
      'Anything conveyed only by color is invisible to a substantial share of users and to anyone in bright sunlight. Status, provenance and confidence all need a text or shape cue in addition to color, which is one of the cheapest accessibility fixes and one of the most commonly skipped.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your interface marks unverified AI-generated content with a subtle amber tint on the message background. What is the problem?',
      choices: [
        { id: 'a', text: 'Amber is the wrong color to use for this warning', whyWrong: 'Color choice is a design preference. Relying on any color as the sole carrier is the accessibility failure.' },
        { id: 'b', text: 'Color alone carries the whole meaning' },
        { id: 'c', text: 'Background tints reduce the text contrast ratio', whyWrong: 'A real and separate contrast concern, and you can fix it completely while the signal stays color-only.' },
        { id: 'd', text: 'Users are unlikely to notice such a subtle tint', whyWrong: 'Close, and subtlety is not the point: even a vivid tint says nothing to someone who cannot distinguish it.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'r2.a11y.focus',
    mode: 'drill',
    nodeIds: ['client.a11y', 'client.error_states'],
    difficulty: 'core',
    explanation:
      'When content appears or an error occurs, focus has to go somewhere deliberate. Leaving focus on a button that has been disabled or removed drops the user to the top of the document, and they have to navigate the whole page again to find out what happened.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Submitting the form disables the submit button while the request runs. A screen reader user reports being "thrown back to the top of the page". What happened?',
      choices: [
        { id: 'a', text: 'The page reloaded and reset the document position', whyWrong: 'A reload would lose the form state too, and the reported symptom happens with no navigation at all.' },
        { id: 'b', text: 'The live region took focus when it announced', whyWrong: 'Live regions announce without taking focus. That is the whole distinction between a live region and a focus change.' },
        { id: 'c', text: 'Focus was on the button that the handler disabled' },
        { id: 'd', text: 'The screen reader lost its virtual cursor position', whyWrong: 'Restates the symptom rather than naming the cause, which is the focused element leaving the tab order.' },
      ],
      correctId: 'c',
    },
  },

  // ── Client: performance ──────────────────────────────────────────────────
  {
    id: 'r2.perf.token_render',
    mode: 'drill',
    nodeIds: ['client.perf', 'client.streaming_ui'],
    difficulty: 'core',
    explanation:
      'Re-rendering the whole conversation on every token turns an eighty-token-per-second stream into eighty full renders a second. Batch incoming tokens to the frame rate, isolate the streaming message so only it re-renders, and do not re-parse the entire markdown document on every chunk.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A long conversation becomes unusable while a new answer streams in. Which changes address it? Select all that apply.',
      choices: [
        { id: 'a', text: 'Batch arriving tokens and commit them once per animation frame instead of once per token' },
        { id: 'b', text: 'Isolate the streaming message so the rest of the conversation does not re-render' },
        { id: 'c', text: 'Parse markdown incrementally, or only for the portion that changed' },
        { id: 'd', text: 'Reduce the model’s output length', whyWrong: 'Changes the product to work around a rendering defect, and a shorter answer still stutters on every token.' },
        { id: 'e', text: 'Move the request to a web worker', whyWrong: 'The network call was never the bottleneck. The cost is in the render, which happens on the main thread regardless.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'r2.perf.virtualize',
    mode: 'drill',
    nodeIds: ['client.perf'],
    difficulty: 'core',
    explanation:
      'Rendering every message in a long conversation costs memory and layout time proportional to history length, which is why the product feels fine in a demo and terrible for a heavy user. Virtualize the list so only what is near the viewport is mounted, and be careful to preserve scroll position when items above resize.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A conversation with 800 messages takes several seconds to open and scrolls poorly. Each individual message renders quickly. What is the fix?',
      choices: [
        { id: 'a', text: 'Memoize each individual message component', whyWrong: 'Stops needless re-renders of mounted items and still mounts all 800 on open, which is the cost being measured.' },
        { id: 'b', text: 'Load the conversation in pages of fifty messages', whyWrong: 'Helps initial load, turns scrollback into a series of waits, and the mounted count still grows without bound.' },
        { id: 'c', text: 'Compress the message payloads over the wire', whyWrong: 'Reduces transfer size. The time goes on constructing and laying out DOM, not on downloading text.' },
        { id: 'd', text: 'Virtualize the list, keeping scroll stable' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'r2.perf.bundle',
    mode: 'drill',
    nodeIds: ['client.perf', 'scale.n_plus_one'],
    difficulty: 'intro',
    explanation:
      'On a slow mobile connection the bundle is the first latency the user experiences, and heavy formatting libraries, syntax highlighters and icon sets are the usual culprits. Split them out and load them when a message actually needs them, so the first meaningful paint is not waiting on a highlighter most conversations never use.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'First load on a mid-range phone over a poor connection takes nine seconds before anything renders. Where do you look first?',
      choices: [
        { id: 'a', text: 'The size of the initial JavaScript bundle' },
        { id: 'b', text: 'The API response time on a poor connection', whyWrong: 'The screen is blank long before any API call matters. Nothing renders until the bundle has downloaded and parsed.' },
        { id: 'c', text: 'Image sizes and formats on the first screen', whyWrong: 'Worth optimizing, and images load after the first paint rather than blocking it from happening.' },
        { id: 'd', text: 'The number of components mounted on the page', whyWrong: 'Component count moves render time by milliseconds, not the seconds spent downloading and parsing code.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'r2.perf.scroll_anchor',
    mode: 'drill',
    nodeIds: ['client.perf', 'client.streaming_ui'],
    difficulty: 'core',
    explanation:
      'Auto-scrolling to the bottom on every chunk is correct until the user scrolls up to read something, at which point it becomes a fight they lose. Track whether the user is pinned to the bottom, keep following only while they are, and offer an explicit jump-to-latest control when they are not.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Users complain they cannot read earlier messages while an answer is streaming, because the view keeps jumping down. What is the correct behavior?',
      choices: [
        { id: 'a', text: 'Stop auto-scrolling during streaming altogether', whyWrong: 'Then the common case, watching your own answer arrive, needs constant manual scrolling to keep up.' },
        { id: 'b', text: 'Follow only while the user sits at the bottom' },
        { id: 'c', text: 'Auto-scroll once, when the answer completes', whyWrong: 'Produces one large jump at the end, which is more disorienting than continuous following was.' },
        { id: 'd', text: 'Scroll smoothly rather than jumping instantly', whyWrong: 'Makes the same unwanted movement prettier while still dragging the user off what they are reading.' },
      ],
      correctId: 'b',
    },
  },

  // ── Client: state and caching ────────────────────────────────────────────
  {
    id: 'r2.st.boundary',
    mode: 'drill',
    nodeIds: ['client.state'],
    difficulty: 'intro',
    explanation:
      'Most client state bugs come from putting a value in the wrong place. Server data belongs in a cache that owns refetching and invalidation, drafts and transient input belong in local state, anything that should survive a reload or be shareable belongs in the URL, and credentials should be as close to nowhere as you can manage.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each piece of state to where it should live in a client application.',
      pairs: [
        { left: 'Records fetched from the API', right: 'A server-state cache that owns fetching, staleness and invalidation' },
        { left: 'Text the user has typed but not submitted', right: 'Local component state, discarded or drafted explicitly' },
        { left: 'Which conversation is currently selected', right: 'The URL, so the view is shareable and survives a reload' },
        { left: 'The access token', right: 'Memory only, or nowhere in the client at all if a backend for frontend holds it' },
      ],
    },
  },
  {
    id: 'r2.st.invalidate_scope',
    mode: 'drill',
    nodeIds: ['client.state', 'scale.caching'],
    difficulty: 'deep',
    explanation:
      'After a mutation, the question is which cached views the change could have affected, not just the record you edited. Renaming a project changes the project detail, the project list, the breadcrumb and probably a search index, so invalidation has to be scoped by relationship rather than by the id you happened to have.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A project rename updates the detail page while the sidebar keeps the old name until reload. Which cached views should the mutation have invalidated? Select all that apply.',
      choices: [
        { id: 'a', text: 'The project list that the sidebar renders from' },
        { id: 'b', text: 'Any search or filter results that include the project by name' },
        { id: 'c', text: 'Breadcrumbs and recent-items lists that embed the project label' },
        { id: 'd', text: 'The user’s profile record', whyWrong: 'Unrelated to the project entity. Invalidating it costs a request and fixes nothing.' },
        { id: 'e', text: 'The entire cache', whyWrong: 'Works, and throws away every unrelated entry, producing a burst of refetches on a slow connection.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 'r2.st.multitab',
    mode: 'drill',
    nodeIds: ['client.state', 'client.token_storage'],
    difficulty: 'edge',
    explanation:
      'Multiple tabs of the same app share cookies and storage but not memory. Without coordination they each refresh the session independently, and with rotating refresh tokens the second tab presents a token the first tab already consumed, which logs everyone out. Elect one tab to perform the refresh and broadcast the result.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Users with several tabs open are randomly logged out. The app uses refresh token rotation. What is happening?',
      choices: [
        { id: 'a', text: 'Tabs each refresh, reusing a token already rotated' },
        { id: 'b', text: 'The refresh token lifetimes are far too short', whyWrong: 'Short lifetimes make refreshes more frequent and the collision more likely. The race is the cause, not the interval.' },
        { id: 'c', text: 'Cookies are not shared between browser tabs', whyWrong: 'Cookies are shared across tabs of the same origin, which is precisely why the tabs collide with each other.' },
        { id: 'd', text: 'The clock is skewed between client and server', whyWrong: 'Skew causes consistently early or late expiry, not randomness that scales with the number of open tabs.' },
      ],
      correctId: 'a',
    },
  },
];
