import type { DrillItem } from '@shared/content';

import { cite } from '../sources';

/**
 * Client engineering and identity/access.
 *
 * The two areas that most often decide whether an AI feature ships. Client work
 * is where users meet the non-determinism, and identity is where enterprise
 * deals stall, an agent that cannot answer "on whose behalf are you calling?"
 * does not reach production regardless of how good the model is.
 */
export const DRILL_CLIENT_IDENTITY: DrillItem[] = [
  // ── Client engineering ───────────────────────────────────────────────────
  {
    id: 'cl.stream.transport',
    mode: 'drill',
    nodeIds: ['client.streaming_ui', 'ai.latency'],
    difficulty: 'core',
    explanation:
      'Server-sent events is the default transport for token delivery across the major providers: one-directional, plain HTTP, works through proxies, and reconnects on its own. WebSockets buy bidirectional messaging you do not need for a response stream, at the cost of an upgrade handshake that corporate proxies frequently mangle. Long polling pays a full request round trip for every chunk, and WebTransport rides QUIC over UDP, which corporate egress filtering blocks far more often than ordinary HTTP.',
    diagramId: 'sse-fanout',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are streaming model output to a browser inside a customer’s corporate network. What transport do you reach for first?',
      choices: [
        { id: 'a', text: 'WebSockets, upgrading the connection after the handshake', whyWrong: 'Bidirectional framing you do not need for a one-way stream, and the upgrade is what corporate proxies most often strip.' },
        { id: 'b', text: 'Server-sent events over an ordinary HTTP response' },
        { id: 'c', text: 'Long polling, reopening the request after every chunk', whyWrong: 'Pays a full request round trip per chunk, which is the overhead streaming exists to remove.' },
        { id: 'd', text: 'WebTransport over HTTP/3, opened from the browser', whyWrong: 'Rides QUIC over UDP, which corporate egress filters block far more often than plain HTTP.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'cl.stream.cancel',
    mode: 'drill',
    nodeIds: ['client.cancellation', 'ai.cost', 'ai.observability'],
    difficulty: 'edge',
    explanation:
      'When a stream is canceled mid-flight the terminating usage event often never reaches the client, so the tokens already generated go unrecorded. Left unhandled this quietly undercounts spend, and the gap grows with every impatient user who hits stop. The fix is to count from the deltas you have already received rather than waiting for a terminal event, then reconcile against the provider’s own usage export. Note the direction of the error: double counting retries or missing a cache discount would move your number the other way.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Users often stop a long answer halfway. Your reported token spend is lower than the provider’s invoice. What is the likely cause?',
      choices: [
        { id: 'a', text: 'The provider bills the full completion it started to generate', whyWrong: 'Providers meter the tokens actually emitted, so a stopped stream costs them less, not more.' },
        { id: 'b', text: 'Your client counts each retried call twice in its own ledger', whyWrong: 'Double counting would push your total above the invoice. The gap runs the other way.' },
        { id: 'c', text: 'Canceled streams never deliver their final usage event' },
        { id: 'd', text: 'Prompt caching discounts are not reaching your cached prefix', whyWrong: 'Caching lowers your recorded cost and their charge together, so it cannot open a gap between them.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'cl.token.storage',
    mode: 'drill',
    nodeIds: ['client.token_storage', 'idp.oidc'],
    difficulty: 'deep',
    explanation:
      'Anything reachable from JavaScript is reachable from injected JavaScript. A refresh token in localStorage survives a page reload and an XSS payload equally well, so a single injection becomes durable account access rather than a one-time session theft. Httponly, secure, same-site cookies keep it out of script reach; a public client should use authorization code with PKCE and hold nothing long-lived. Note that localStorage is scoped per origin, so the problem is not cross-subdomain sharing, it is that any script on that origin can read the value.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A single-page app stores its refresh token in localStorage. Why is that the finding in every review?',
      choices: [
        { id: 'a', text: 'localStorage is readable from every subdomain of the site', whyWrong: 'localStorage is scoped per origin, and origin scope is not what makes this a finding.' },
        { id: 'b', text: 'It is cleared when the tab closes, so sessions break', whyWrong: 'That is sessionStorage. localStorage persists, which is what makes the exposure durable.' },
        { id: 'c', text: 'It is not attached automatically to same-origin requests', whyWrong: 'True, and that is a property of cookies rather than a security argument against localStorage.' },
        { id: 'd', text: 'Any injected script can read it and reuse it later' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'cl.pkce.why',
    mode: 'drill',
    nodeIds: ['client.token_storage', 'idp.oidc'],
    difficulty: 'deep',
    explanation:
      'A public client cannot keep a secret. The code ships to the device. PKCE replaces the client secret with a per-request verifier, so an intercepted authorization code is useless without the verifier that only the initiating client holds. Everything else about the flow is unchanged: the redirect still happens, the exact redirect URI is still registered and checked, and TLS still protects the code in transit. PKCE adds proof of possession, not confidentiality or a longer token life.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Why does a mobile or single-page app need PKCE rather than a client secret?',
      choices: [
        { id: 'a', text: 'It binds the code exchange to the client that started it' },
        { id: 'b', text: 'It encrypts the authorization code on the redirect back', whyWrong: 'The redirect already travels over TLS. PKCE proves possession of the verifier instead.' },
        { id: 'c', text: 'It lets the app skip registering an exact redirect URI', whyWrong: 'Exact redirect URI registration still applies and is still checked at the authorization server.' },
        { id: 'd', text: 'It lengthens the refresh token lifetime for public clients', whyWrong: 'Lifetimes are set by provider policy. PKCE changes nothing about how long a token lives.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'cl.optimistic.rollback',
    mode: 'drill',
    nodeIds: ['client.optimistic', 'client.state'],
    difficulty: 'core',
    explanation:
      'Optimistic UI is a bet that the write will succeed. The part teams skip is the losing branch: snapshot before applying, and restore that snapshot when the server disagrees. Without it a failed write leaves the interface confidently showing something that is not true.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the steps of a correct optimistic update.',
      steps: [
        'Snapshot the current state before touching anything',
        'Apply the change locally and render immediately',
        'Send the write and await the server response',
        'On failure, restore the snapshot and surface what went wrong',
      ],
    },
  },
  {
    id: 'cl.error.retry',
    mode: 'drill',
    nodeIds: ['client.error_states', 'scale.timeouts'],
    difficulty: 'deep',
    explanation:
      'The classes of failure need different handling. A rate limit should back off and retry; a context-length error will fail identically forever; and a call that already triggered a side effect must never be retried blindly, because the second attempt sends the second email.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each failure to the right client behavior.',
      pairs: [
        { left: 'Rate limited (429)', right: 'Back off with jitter, retry' },
        { left: 'Context length exceeded', right: 'Do not retry; reduce input' },
        { left: 'Timeout after a tool already sent an email', right: 'Do not retry; reconcile' },
        { left: 'Provider 503 overload', right: 'Retry, then fail over' },
      ],
    },
  },
  {
    id: 'cl.offline.outbox',
    mode: 'drill',
    nodeIds: ['client.offline', 'data.idempotency'],
    difficulty: 'deep',
    explanation:
      'An outbox lets a user keep working through a dead connection, and it guarantees the server will eventually see some requests twice. A client-generated idempotency key on each queued write is what stops a flaky tunnel from creating duplicate records: the server stores the key with the result and returns that same result on a replay. Sequence numbers order the flush but say nothing about whether a write already applied, and no client-held lease survives the partition that made the outbox necessary.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your app queues writes locally while offline and flushes on reconnect. What must the server contract include?',
      choices: [
        { id: 'a', text: 'A monotonic sequence number so the server can order the flush', whyWrong: 'Ordering tells the server which write came first, not whether it has already applied this one.' },
        { id: 'b', text: 'A longer request timeout on the endpoint receiving writes', whyWrong: 'Timeouts change how long the client waits. The duplicate still arrives on the retry.' },
        { id: 'c', text: 'A client-generated idempotency key on every queued write' },
        { id: 'd', text: 'A lease the client holds while it drains the outbox', whyWrong: 'A client cannot hold a meaningful lease across a partition, which is exactly when the outbox fills.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'cl.a11y.stream',
    mode: 'drill',
    nodeIds: ['client.a11y', 'client.streaming_ui'],
    difficulty: 'edge',
    explanation:
      'Text that arrives token by token into an assertive live region makes a screen reader interrupt itself continuously, which is unusable. Announcing on completion, with a brief status while generating, is both usable and what accessibility reviewers expect to see.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'How should streamed answer text be exposed to a screen reader?',
      choices: [
        { id: 'a', text: 'Announce a generating status, then the finished answer' },
        { id: 'b', text: 'Put the streaming text into an assertive live region', whyWrong: 'The reader interrupts itself on every token, which is unusable in practice.' },
        { id: 'c', text: 'Expose only the final answer, hidden while generating', whyWrong: 'Leaves the user with no signal that anything is happening for several seconds.' },
        { id: 'd', text: 'Mark the container aria-hidden and print a summary', whyWrong: 'Hides the content from exactly the users who depend on assistive technology.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'cl.perf.rerender',
    mode: 'drill',
    nodeIds: ['client.perf', 'client.streaming_ui'],
    difficulty: 'deep',
    explanation:
      'Appending a token to state that a large tree depends on re-renders that tree many times per second. Isolating the streaming text into its own leaf component, or batching appends on an animation frame, keeps the rest of the interface still.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'The whole page stutters while an answer streams in. What is the fix?',
      choices: [
        { id: 'a', text: 'Lower the token emission rate on the server side', whyWrong: 'Degrades the experience for everyone to work around a client rendering problem.' },
        { id: 'b', text: 'Isolate the streaming text in a leaf and batch per frame' },
        { id: 'c', text: 'Disable streaming entirely on lower-end devices', whyWrong: 'Removes the feature that makes the product feel fast, for the users who need it most.' },
        { id: 'd', text: 'Move the render work to a web worker off the main thread', whyWrong: 'Workers cannot touch the DOM, so the re-render cost stays exactly where it was.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'cl.state.invalidate',
    mode: 'drill',
    nodeIds: ['client.state'],
    difficulty: 'core',
    explanation:
      'A cached list that is not invalidated after a mutation shows the user their own change missing, which reads as data loss. Invalidating the affected queries on success is the smallest correct fix; refetching everything is the sledgehammer that makes the app feel slow.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'After a user submits a record, the list still shows the old data until they pull to refresh. What is wrong?',
      choices: [
        { id: 'a', text: 'The cache TTL on the list query is set far too long', whyWrong: 'Time-based expiry is the wrong tool for a change the client already knows about.' },
        { id: 'b', text: 'The backing store is eventually consistent across replicas', whyWrong: 'Possible, and the far more common cause is a missing client-side invalidation.' },
        { id: 'c', text: 'The list should not be cached on the client at all', whyWrong: 'Throws away the caching that makes navigation feel instant, to fix one stale view.' },
        { id: 'd', text: 'The mutation never invalidates the queries it changed' },
      ],
      correctId: 'd',
    },
  },

  // ── Identity & access ────────────────────────────────────────────────────
  {
    id: 'id.obo.exchange',
    mode: 'drill',
    nodeIds: ['idp.token_exchange', 'idp.agent_identity'],
    difficulty: 'deep',
    explanation:
      'OAuth 2.0 Token Exchange (RFC 8693) lets a service trade a token it holds for a new, narrowly scoped one. In the on-behalf-of pattern the resulting token still names the user as subject while identifying the agent as the actor, so downstream systems can enforce the user’s permissions and still see which agent made the call.',
    diagramId: 'oauth-obo',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agent must call a downstream API as the user who asked. What is the correct pattern?',
      choices: [
        { id: 'a', text: 'Pass the user’s original access token through unchanged', whyWrong: 'Hands the agent a credential with the user’s full scope, far wider than the call needs, and erases the user versus agent distinction in the audit log.' },
        { id: 'b', text: 'Call with a service account that can read everything', whyWrong: 'The permission-bleed design. The user’s own restrictions simply stop applying.' },
        { id: 'c', text: 'Exchange for a scoped token naming the user as subject' },
        { id: 'd', text: 'Have the user authenticate to each downstream system', whyWrong: 'Correct in security terms and unusable. Delegation exists to avoid exactly this.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'id.agent.actor',
    mode: 'drill',
    nodeIds: ['idp.agent_identity', 'sec.audit'],
    difficulty: 'edge',
    explanation:
      'Identity providers now model agents as first-class actors: the token keeps the user as subject and adds actor claims identifying the agent. That distinction is what makes an audit answerable. You can say a specific agent acted for a specific user, rather than seeing a service account and shrugging.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Why does an agent-issued token keep the user as `sub` and add separate actor claims?',
      choices: [
        { id: 'a', text: 'User permissions still apply, and the audit names the agent' },
        { id: 'b', text: 'It keeps the encoded token small enough for a header', whyWrong: 'Actor claims make the token larger, not smaller. Size is not the motivation.' },
        { id: 'c', text: 'It lets the agent keep acting after the user signs out', whyWrong: 'The opposite of the intent. A delegated token should not outlive the session it rests on.' },
        { id: 'd', text: 'Resource servers cannot parse custom claims reliably', whyWrong: 'They can, and they are expected to. Actor claims are read by the resource server.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'id.multihop',
    mode: 'drill',
    nodeIds: ['idp.agent_identity', 'idp.scopes'],
    difficulty: 'edge',
    explanation:
      'Every delegation hop should narrow, never widen. If agent A delegates to agent B, B’s token must be scoped at or below A’s. Without that rule, a chain of well-meaning services quietly reassembles full access at the far end.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A planning agent delegates a subtask to a specialist agent, which calls a third service. What invariant must hold?',
      choices: [
        { id: 'a', text: 'Each agent presents its own dedicated service account', whyWrong: 'Loses the user context entirely, so nobody can tell who the work was actually for.' },
        { id: 'b', text: 'Each hop is scoped at or below the hop before it' },
        { id: 'c', text: 'The final service re-authenticates the original user', whyWrong: 'Breaks the automation that delegation exists to enable in the first place.' },
        { id: 'd', text: 'One token is cached and reused across all three hops', whyWrong: 'Widens exposure and lengthens the lifetime of the most privileged credential.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'id.dpop',
    mode: 'drill',
    nodeIds: ['idp.dpop', 'sec.zero_trust'],
    difficulty: 'edge',
    explanation:
      'A bearer token is exactly that, whoever bears it may use it. Sender-constraining binds the token to a key the client proves it holds on every request, so an exfiltrated token is useless without the private key. This is the mitigation that matters once tokens are flowing between agents.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What does a sender-constrained (DPoP or mTLS-bound) access token protect against that a bearer token does not?',
      choices: [
        { id: 'a', text: 'A token lifetime that has been set far too generously', whyWrong: 'Lifetime is a separate control. Binding the token does nothing to shorten it.' },
        { id: 'b', text: 'A user consenting to a much wider scope than needed', whyWrong: 'Scope is fixed at issue time, and is unaffected by sender constraining.' },
        { id: 'c', text: 'Replay of a captured TLS session against the same host', whyWrong: 'TLS already prevents session replay. The threat here is the token leaving the channel.' },
        { id: 'd', text: 'Use of a stolen token by a caller without the bound key' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'id.jwt.checks',
    mode: 'drill',
    nodeIds: ['idp.jwt'],
    difficulty: 'deep',
    explanation:
      'Validating the signature alone is the classic half-check. A correctly signed token from a different issuer, or minted for a different audience, is still a valid token, just not for you. Audience is the check people skip, and it is what makes token confusion attacks work.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'What must a resource server verify on an incoming JWT? Pick all that apply.',
      choices: [
        { id: 'a', text: 'Signature against the issuer’s current published keys' },
        { id: 'b', text: 'Issuer matches the one you trust' },
        { id: 'c', text: 'Audience names this service' },
        { id: 'd', text: 'Expiry and not-before, allowing for small clock skew' },
        { id: 'e', text: 'That the algorithm header says what to use', whyWrong: 'Never trust the token to name its own algorithm. That is the alg-confusion attack. Pin the expected algorithm server-side.' },
      ],
      correctIds: ['a', 'b', 'c', 'd'],
    },
  },
  {
    id: 'id.rebac',
    mode: 'drill',
    nodeIds: ['idp.rbac_abac', 'ai.rag_failure'],
    difficulty: 'deep',
    explanation:
      'Roles answer "what kind of user is this". Per-document AI retrieval needs "may this specific person see this specific document", which is a relationship question. Relationship-based authorisation models that directly, and it is the model that scales to a corpus where access is granted per file.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Retrieval must respect per-document sharing that users set themselves. Which authorization model fits?',
      choices: [
        { id: 'a', text: 'Relationship-based, derived from who is related to what' },
        { id: 'b', text: 'Role-based, with one role created per shared document', whyWrong: 'Role explosion. A hundred thousand documents becomes a hundred thousand roles.' },
        { id: 'c', text: 'Attribute-based on the user’s department and job function', whyWrong: 'Cannot express an individual share that deliberately ignores department.' },
        { id: 'd', text: 'Let the model judge access from the document metadata', whyWrong: 'Asks a language model to enforce authorization. This is the finding that ends the pilot.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'id.rls',
    mode: 'drill',
    nodeIds: ['idp.rls', 'sec.tenancy'],
    difficulty: 'deep',
    explanation:
      'Row-level security moves the tenant predicate from every query into the database itself, so a developer who forgets a WHERE clause gets no rows rather than everyone’s rows. In a multi-tenant system it converts a whole class of leak from likely to impossible.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What is the strongest argument for row-level security in a multi-tenant application?',
      choices: [
        { id: 'a', text: 'It performs better than an application-side WHERE clause', whyWrong: 'It is a WHERE clause, applied by the database. Performance is not the argument.' },
        { id: 'b', text: 'It removes the need for application-level authorization', whyWrong: 'A backstop, not a replacement. It enforces isolation, never business rules.' },
        { id: 'c', text: 'A forgotten filter returns nothing, not another tenant' },
        { id: 'd', text: 'It encrypts each tenant’s rows under a separate key', whyWrong: 'Unrelated to encryption. Row-level security is an access predicate, not a key policy.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'id.revocation',
    mode: 'drill',
    nodeIds: ['idp.revocation'],
    difficulty: 'edge',
    explanation:
      'A self-contained token cannot be un-issued; it stays valid until it expires. That is why access tokens are short-lived and revocation acts on the refresh token, with continuous access evaluation signaling resource servers to re-check when something material changes, a user disabled, a device lost.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A user is offboarded. Their access token has 40 minutes left. What actually happens?',
      choices: [
        { id: 'a', text: 'It is invalidated immediately across every resource server', whyWrong: 'Only if each of them calls the provider on every request, which defeats a self-contained token.' },
        { id: 'b', text: 'It stays valid until expiry, absent revocation signals' },
        { id: 'c', text: 'It dies the moment the refresh token is revoked', whyWrong: 'Revoking refresh stops renewal. The outstanding access token is entirely unaffected.' },
        { id: 'd', text: 'It ends only once the user signs out of the session', whyWrong: 'A departing user will not cooperate, which is exactly why this cannot be the mechanism.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 'id.scopes.audience',
    mode: 'drill',
    nodeIds: ['idp.scopes', 'sec.zero_trust'],
    difficulty: 'core',
    explanation:
      'One token that every downstream service accepts means any one of them can replay it against all the others. Per-audience tokens with narrow scope contain the blast radius of a single compromised service, and cost nothing but a token exchange.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your agent holds one token accepted by five internal services. What is the risk?',
      choices: [
        { id: 'a', text: 'The encoded token grows past the header size limit', whyWrong: 'A packaging concern, and not a reason to narrow the audience of a token.' },
        { id: 'b', text: 'Rate limits end up shared across all five services', whyWrong: 'An operational side effect, not the security reason to scope per audience.' },
        { id: 'c', text: 'Refresh will fail once any one service rotates its own keys', whyWrong: 'Key rotation at a resource server does not break refresh at the provider.' },
        { id: 'd', text: 'Any one of the five can replay it against the other four' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 'id.saml.tax',
    mode: 'drill',
    nodeIds: ['idp.saml', 'del.pilot_to_prod'],
    difficulty: 'core',
    explanation:
      'Enterprise SSO is rarely hard technically and is reliably slow organisationally: their identity team has a queue, a change window and a test plan. Raising it in week one is the difference between it landing quietly and it becoming the reason go-live slips.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer requires SAML SSO before go-live. When do you start?',
      choices: [
        { id: 'a', text: 'Week one: their identity team owns a queue you do not' },
        { id: 'b', text: 'After the pilot has demonstrated value to the sponsor', whyWrong: 'Puts a multi-week organizational dependency directly in front of the launch date.' },
        { id: 'c', text: 'Once the final architecture has been signed off', whyWrong: 'The SSO integration barely depends on the rest of the architecture.' },
        { id: 'd', text: 'During hardening, alongside the other controls', whyWrong: 'Hardening is already the phase everyone underestimates. This is what overruns it.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'id.service_auth',
    mode: 'drill',
    nodeIds: ['idp.service_auth', 'gcp.wif'],
    difficulty: 'core',
    explanation:
      'A shared secret between services is a credential that must be distributed, rotated and eventually leaked. Workload identity issues short-lived credentials from the platform based on what the workload is, so there is nothing to distribute and nothing to rotate.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Two internal services need to authenticate to each other. What do you propose?',
      choices: [
        { id: 'a', text: 'A shared secret placed in both services’ configuration', whyWrong: 'Must be distributed and rotated, and rotation across two deploys is where it gets pinned open.' },
        { id: 'b', text: 'An API key checked against an allowlist at the edge', whyWrong: 'The same distribution problem, with worse auditability than a shared secret.' },
        { id: 'c', text: 'Workload identity issuing short-lived credentials' },
        { id: 'd', text: 'Network trust: anything inside the VPC may call anything', whyWrong: 'The flat-network assumption that zero trust exists specifically to remove.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 'id.impersonation',
    mode: 'drill',
    nodeIds: ['idp.impersonation', 'sec.audit'],
    difficulty: 'edge',
    explanation:
      'Support impersonation is genuinely useful and is also the most abusable capability in any product. Making it consented, time-bounded, distinctly logged and visible to the user is what turns it from a liability into a control an auditor accepts.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Support needs to view the product as a specific customer user. What must the design include? Pick all that apply.',
      choices: [
        { id: 'a', text: 'A time bound after which the session ends by itself' },
        { id: 'b', text: 'Audit entries recording both the support identity and the impersonated user' },
        { id: 'c', text: 'Read-only by default, with writes requiring separate approval' },
        { id: 'd', text: 'Visibility to the customer that impersonation occurred' },
        { id: 'e', text: 'The same token the user holds, so behavior matches exactly', whyWrong: 'Erases the distinction between the user and support in every downstream log. The one thing this design must preserve.' },
      ],
      correctIds: ['a', 'b', 'c', 'd'],
    },
  },
  {
    id: 'id.mcp.authz',
    mode: 'drill',
    nodeIds: ['ai.mcp', 'idp.agent_identity', 'idp.scopes'],
    difficulty: 'edge',
    explanation:
      'An MCP server is a set of tools the model can invoke, so its credentials become the agent’s effective permissions. If it holds one admin credential, every user of the agent inherits admin. Per-user delegated tokens keep the caller’s own limits intact.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s MCP server authenticates to their CRM with a single admin service account. What do you raise?',
      choices: [
        { id: 'a', text: 'Admin credentials in an MCP server expire too quickly', whyWrong: 'They typically do not expire quickly at all, which is part of what makes this dangerous.' },
        { id: 'b', text: 'Every agent user inherits admin reach into the CRM' },
        { id: 'c', text: 'The model may misread the tool description and misfire', whyWrong: 'A real concern, at a different layer. It is not what a shared admin account causes.' },
        { id: 'd', text: 'MCP has no way to authenticate to a downstream system', whyWrong: 'It does. The issue is which identity the server presents, not whether it can present one.' },
      ],
      correctId: 'b',
    },
  },
];
