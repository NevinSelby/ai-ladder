import type { Lesson } from '@shared/lessons';

import { cite } from '../sources';

/** Delivery, customer craft, identity, data, scaling and productionizing. */
export const LESSONS_DELIVERY: Lesson[] = [
  {
    id: 'l.decomposition',
    nodeIds: ['del.discovery_scope', 'del.risk_sequencing'],
    title: 'Decomposition',
    hook: 'The round with the lowest pass rate, and almost no code in it.',
    essence:
      'Decomposition is turning a vague customer brief into a sequenced plan. Clarify the objective and its success metric, map stakeholders and who owns which data, inventory what exists and what is missing, break the work into subproblems ordered by risk, and propose a thin slice.',
    inPractice:
      'Sequence by what could kill the project, not by what is comfortable. If data access depends on people you do not control, that goes first, not the interface, however much more visible progress it would show.',
    gotcha:
      'Jumping to a solution before clarifying is the single most common rejection. Interviewers score the method, not the answer, and a confident architecture built on an unexamined brief scores worse than an incomplete plan that surfaced the right unknowns.',
    keyPoints: [
      'Clarify, measure, map, inventory, sequence, slice',
      'Risk order beats comfort order every time',
      'Proposing before clarifying is the classic failure',
    ],
    diagramId: 'thin-slice',
    citations: cite('waf'),
  },
  {
    id: 'l.thin_slice',
    nodeIds: ['del.thin_slice'],
    title: 'The thin slice',
    hook: 'Narrow in scope, complete in depth.',
    essence:
      'A thin slice is the smallest end-to-end path that exercises every layer, run on one real record. It is not a prototype of the interface and not the full ingestion pipeline. It is one thing traveling the whole way through.',
    inPractice:
      'By week two of a ninety-day engagement you want one real record to have gone from the customer’s source system, through parsing and retrieval and the model, to a reviewed answer. That proves data access, the integration and the model quality together.',
    gotcha:
      'The test of a slice is whether it could fail. A slice that cannot possibly fail has proven nothing, which is why a polished interface on mocked data is worse than useless, it consumes the two weeks and raises expectations while reducing no uncertainty.',
    keyPoints: [
      'One real record, every layer, end to end',
      'It must pass through the part you are least sure about',
      'If it cannot fail, it is not telling you anything',
    ],
    diagramId: 'thin-slice',
    citations: cite('waf'),
  },
  {
    id: 'l.poc_exit',
    nodeIds: ['del.poc_exit', 'cust.expectations'],
    title: 'POC exit criteria',
    hook: 'A pilot without a written bar cannot be passed, only extended.',
    essence:
      'An exit criterion names a specific metric, a numeric threshold, the dataset it is measured on, and who decides. Agreed before you build, it converts "is it good enough?" from an argument into a check.',
    inPractice:
      'Write down the worst-case bound, not just the average. Vendors fail pilots that were accurate on average because the customer was silently judging the worst five percent, and nobody had agreed which number counted.',
    gotcha:
      'A list of features is not an exit criterion. You can ship every feature and still fail the customer’s actual bar, because the bar was about behavior under conditions nobody wrote down.',
    keyPoints: [
      'Metric, threshold, dataset, decision-maker, all four',
      'State the tail, not only the average',
      'A scope list is not a success test',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.bad_news',
    nodeIds: ['cust.bad_news', 'cust.ownership'],
    title: 'Delivering bad news',
    hook: 'Bad news degrades with age.',
    essence:
      'Told early, with a cause and a revised date, a slip is a managed event. Told late, it is a trust failure that outlives the schedule problem entirely.',
    inPractice:
      'Bring two costed options: hold the date and descope, or hold scope and move the date. That turns the conversation from a complaint into a decision the customer gets to make, which is a fundamentally different meeting.',
    gotcha:
      'Waiting until you fully understand the problem guarantees they hear it from someone else, and that is the version that damages the relationship. Ownership language matters too: "I will have a fix in staging by Thursday" lands where "we are looking into it" is heard as an absence of a plan.',
    keyPoints: [
      'Early, owned, with the cause and a revised date',
      'Two costed options, not one outcome',
      'Never let them hear it from somebody else first',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.saying_no',
    nodeIds: ['cust.saying_no', 'cust.pushback'],
    title: 'Saying no',
    hook: 'Decline the request, keep the relationship and the governance.',
    essence:
      'The pattern that works has three beats: acknowledge the legitimate need behind the request, name the specific constraint it would breach, then offer a path that meets the need without crossing it.',
    inPractice:
      'It matters most when the asker is your champion. Explain the constraint plainly and hand them a narrower version they can announce on their date. They will usually take the governance conversation internally on your behalf, which is far more effective than you having it.',
    gotcha:
      'A flat refusal makes you an obstacle; silent compliance makes you the reason their audit fails. Both are worse than the middle path, and both are easier in the moment, which is why people take them.',
    keyPoints: [
      'Acknowledge the valid part before you push back',
      'Name the specific constraint, not "policy"',
      'Always leave a path that meets the underlying need',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.explaining_ai',
    nodeIds: ['cust.explaining_ai', 'ai.nondeterminism'],
    title: 'Explaining AI limits',
    hook: 'They need a decision, not a mechanism.',
    essence:
      'A non-technical stakeholder asking "how accurate is it?" is really asking whether they can rely on it. A number without conditions will be repeated in a board meeting, verbatim and unqualified.',
    inPractice:
      'Reframe from "how accurate" to "what happens on the ones it gets wrong, and how would you know". That gives them something they can act on, and quietly introduces the review workflow the design needed anyway.',
    gotcha:
      'A demo sets an expectation whether or not you meant it to. Naming the gap between demo conditions and production conditions costs nothing at the time and saves a difficult conversation later. Variance is inherent too. The same question can produce two different answers, and saying so before they notice is much cheaper than after.',
    keyPoints: [
      'Answer with the failure case, not a single number',
      'Any figure you say will be quoted without its caveats',
      'Name demo-versus-production conditions at the demo',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.discovery',
    nodeIds: ['cust.discovery_q', 'cust.stakeholders'],
    title: 'Discovery',
    hook: 'The one question that changes the architecture.',
    essence:
      'Discovery is finding the constraints that reshape the design before you commit to one. Open questions surface what you did not know to ask; closed ones only confirm what you already suspected.',
    inPractice:
      'Find whoever can say no later: security, legal, the works council, the platform team with a six-month queue. Meeting them in week one is cheap; meeting them in week ten is a schedule event. And when you ask an open question, wait: most of the useful information arrives in the sentence after the pause you were tempted to fill.',
    gotcha:
      'The highest-value question is usually about an unstated hard constraint, residency, an immovable date, a system nobody may touch. Those reshape the architecture and they rarely appear in the brief, because the customer assumes you already know.',
    keyPoints: [
      'Open before closed; you are most wrong at the start',
      'Find the people who can block, not just the sponsor',
      'Ask what constraint has not been mentioned yet',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.napkin',
    nodeIds: ['del.napkin'],
    title: 'Napkin math',
    hook: 'Knowing in two minutes whether an idea is affordable.',
    essence:
      'Estimating token spend, index memory, QPS and egress out loud, to one significant figure. The point is not precision, it is catching an order-of-magnitude error before it reaches a proposal.',
    inPractice:
      'Twelve thousand agents at forty conversations a day, twenty-two working days, ten thousand tokens each is about a hundred billion tokens a month. A 768-dimension float32 vector is roughly 3 KB, so four million chunks is about 12 GB before index overhead. Both are arithmetic you can do while someone is still describing the requirement.',
    gotcha:
      'The failure is always a factor-of-ten slip, and it is always in the direction that makes the idea look viable. Sanity-check by asking whether the answer is per day or per month before you say it, that catches most of them.',
    keyPoints: [
      'One significant figure is enough to make the decision',
      'Do it in the room, not in a spreadsheet afterwards',
      'Check the time unit before you quote the number',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.pilot_to_prod',
    nodeIds: ['del.pilot_to_prod', 'prod.oncall'],
    title: 'The pilot-to-production gap',
    hook: 'Almost none of it is model quality.',
    essence:
      'Between a working pilot and a live system sit a security review and its findings, agreed SLOs with someone on call, behavior at real data volume, and access management for the real user population.',
    inPractice:
      'Teams estimate this as a couple of weeks of hardening and it routinely takes longer than the pilot did. Put it in the plan as its own phase with its own duration, or it will eat the launch date.',
    gotcha:
      'The blockers are non-functional, which is why they are underestimated. Nothing about them is visible in a demo. "Better accuracy" is rarely what stops a working pilot from shipping.',
    keyPoints: [
      'Security review, SLOs, on-call, volume, access',
      'It is a phase, not a fortnight of tidying',
      'Model quality is usually not the blocker',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.handover',
    nodeIds: ['del.handover', 'prod.cicd'],
    title: 'Handover',
    hook: 'Leaving without the thing rotting behind you.',
    essence:
      'A handover has succeeded when the receiving team can deploy a change and resolve an incident without you. Documentation is necessary and is not sufficient. An untested runbook is a hypothesis.',
    inPractice:
      'The best predictor is that their team has already handled a real incident with you watching rather than doing. Aim for that two weeks out, while there is still time to fix what it exposes.',
    gotcha:
      'Anything configured by hand in a console is something they cannot reproduce or take over. Infrastructure in code, in their repository, running in their CI with their credentials, is what makes handover a transfer rather than a ceremony.',
    keyPoints: [
      'They must have run it, not read about it',
      'Console changes are handover debt',
      'Pipeline in their CI, with their credentials',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.token_exchange',
    nodeIds: ['idp.token_exchange', 'idp.agent_identity'],
    title: 'Delegated access for agents',
    hook: 'Acting for a user without holding their credential.',
    essence:
      'OAuth 2.0 Token Exchange lets a service trade a token it holds for a new, narrowly scoped one. In the on-behalf-of pattern the resulting token still names the user as subject while identifying the agent as the actor.',
    inPractice:
      'That distinction is what makes an audit answerable: you can say a specific agent acted for a specific user, rather than seeing a shared service account and shrugging. Downstream systems keep enforcing the user’s own permissions.',
    gotcha:
      'Passing the user’s original token through unchanged hands the agent everything that user can do, far beyond the call. Using one service account gives every user of the agent that account’s reach. The permission-bleed design. And every delegation hop must narrow, never widen, or a chain of well-meaning services reassembles full access at the far end.',
    keyPoints: [
      'Subject stays the user; the agent is the actor',
      'Never forward the user’s token unchanged',
      'Privilege narrows at every hop, never widens',
    ],
    diagramId: 'oauth-obo',
    citations: cite('waf'),
  },
  {
    id: 'l.rbac_rebac',
    nodeIds: ['idp.rbac_abac', 'idp.rls'],
    title: 'RBAC, ABAC and ReBAC',
    hook: 'Per-document access is a relationship question, not a role question.',
    essence:
      'Roles answer what kind of user this is. Attributes answer what is true about them. Relationships answer whether this specific person may see this specific document. Which is the question retrieval actually asks.',
    inPractice:
      'When users share documents individually, roles explode: a hundred thousand documents means a hundred thousand roles. Relationship-based authorisation models the share directly and is what scales.',
    gotcha:
      'Whatever the model, never ask a language model to enforce it. Putting the ACL in the chunk text so the model can "reason about" access is the finding that ends the pilot. Row-level security in the database is the backstop worth having underneath.',
    keyPoints: [
      'Per-document sharing needs relationships, not roles',
      'Authorisation is never the model’s job',
      'Row-level security makes a forgotten filter return nothing',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.cdc',
    nodeIds: ['data.cdc', 'data.idempotency'],
    title: 'Change data capture',
    hook: 'Capture first, then snapshot, then replay.',
    essence:
      'CDC keeps a target in step with a source by streaming changes. The cutover order matters: start capturing and buffering the change stream, then take a consistent snapshot, load it, and replay the buffered changes over the top.',
    inPractice:
      'Snapshot-then-stream leaves a gap containing exactly the rows that changed during the snapshot. Which are the busiest and most-noticed records in the system. Getting the order right costs nothing and is invisible if you do it correctly.',
    gotcha:
      'Query-based CDC polling an updated_at column cannot see deletes, because a deleted row is simply absent. That is an ordinary bug until an erasure request arrives, at which point it is a compliance failure. Every write also needs an idempotency key from the business event, not the message id, message ids change on redelivery.',
    keyPoints: [
      'Capture, snapshot, load, replay, in that order',
      'Query-based CDC misses deletes structurally',
      'Idempotency keys come from the event, not the delivery',
    ],
    diagramId: 'cdc-cutover',
    citations: cite('waf'),
  },
  {
    id: 'l.messy_data',
    nodeIds: ['data.messy', 'data.quality'],
    title: 'Messy data',
    hook: 'Quarantine what you cannot parse; never guess.',
    essence:
      'Real integrations arrive with mixed encodings, ragged rows, sentinel nulls and three date conventions from three acquired systems. The engineering question is what to do with rows you cannot confidently interpret.',
    inPractice:
      'Load the good rows, quarantine the bad ones with their raw payload and the reason, and alert on the rate. That keeps the business moving while keeping the decision reversible.',
    gotcha:
      'Failing the whole batch means one supplier’s typo halts everything, and someone will eventually disable the check to unblock a release. Dropping the rows silently is worse: two percent becomes fifteen and nobody notices until a compliance report. Coercing to defaults is worst of all, because it manufactures data that looks real.',
    keyPoints: [
      'Quarantine with the raw value and the reason',
      'Alert on the reject rate, not just on failures',
      'Never guess a convention to keep a load green',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.scaling_shape',
    nodeIds: ['scale.load_shape', 'scale.capacity'],
    title: 'Reading the load shape',
    hook: 'Averages hide the number that sizes the system.',
    essence:
      'Two hundred thousand requests a day says almost nothing. Twelve thousand agents all starting at nine in one timezone is a different system from the same volume spread evenly.',
    inPractice:
      'Ask what the peak minute looks like and when it falls. That pair sizes compute, connection pools, quota requests and cost, and it is one question.',
    gotcha:
      'Quota is the ambush. A configuration that works at demo volume hits a per-minute ceiling the day real traffic arrives, and quota increases are reviewed by humans over days. Check and request during scoping, not during load testing.',
    keyPoints: [
      'Peak-to-average ratio, and when the peak happens',
      'File quota increases in week one, not week seven',
      'Load test with the real traffic mix, not a uniform one',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.retries',
    nodeIds: ['scale.timeouts', 'client.error_states'],
    title: 'Retries and backpressure',
    hook: 'The naive retry is what turns a slowdown into an outage.',
    essence:
      'When a dependency degrades, synchronised retries multiply load on the thing already struggling. Exponential backoff with jitter, a retry budget capping retries as a share of traffic, and a circuit breaker are the three controls that matter.',
    inPractice:
      'Different failures need different handling. A rate limit should back off and retry. A context-length error will fail identically forever. A call that already triggered a side effect must never be retried blindly, because the second attempt sends the second email.',
    gotcha:
      'An unbounded in-memory buffer converts a downstream slowdown into an out-of-memory crash, losing everything buffered. A bounded queue that pushes back is less convenient and degrades predictably, which is what you want at three in the morning.',
    keyPoints: [
      'Backoff with jitter, a retry budget, a circuit breaker',
      'Classify the failure before deciding to retry',
      'Bounded buffers; unbounded ones crash and lose the data',
    ],
    diagramId: 'sse-fanout',
    citations: cite('waf'),
  },
  {
    id: 'l.migrations',
    nodeIds: ['prod.migrations', 'prod.rollback'],
    title: 'Expand and contract',
    hook: 'Every intermediate state has to be deployable.',
    essence:
      'To change a schema without downtime: add the new column, deploy code that writes both and reads the old, backfill and verify, deploy code that reads the new, and drop the old one in a later release.',
    inPractice:
      'Renaming in one step means old code and new schema are never simultaneously valid, so there is no rollback. The five-step version is slower and is the only one you can reverse at any point.',
    gotcha:
      'Rollback plans quietly assume everything is reversible. Code usually is. A dropped column, a consumed queue message, a sent email and a rotated key are not. Knowing which parts of a release are one-way is what makes the plan real rather than reassuring.',
    keyPoints: [
      'Add, dual-write, backfill, switch reads, drop later',
      'A one-step rename has no rollback path',
      'List what in the release is genuinely irreversible',
    ],
    citations: cite('waf'),
  },
  {
    id: 'l.incidents',
    nodeIds: ['prod.incident', 'prod.oncall'],
    title: 'Incidents and on-call',
    hook: 'Every page should mean a human must act now.',
    essence:
      'Alert on symptoms users feel, error rate, latency, error-budget burn, not on causes like CPU. A page for a condition that is often fine trains people to ignore the pager, which is the failure that matters.',
    inPractice:
      'Twenty minutes into a customer-visible outage, send what is affected, what you are doing, and when you will next update. Committing to a next-update time stops the anxious hourly chase and buys the team room to work.',
    gotcha:
      'Do not send an early root cause. Preliminary theories are usually wrong, and retracting one costs more trust than saying you do not know yet. Silence costs more than either, they escalate.',
    keyPoints: [
      'Page on user-visible symptoms, not on resource metrics',
      'Impact, action, next update time, in that order',
      'Never guess at cause in the first communication',
    ],
    citations: cite('waf'),
  },
];
