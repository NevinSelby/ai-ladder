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
        { id: 'a', text: 'Announce a brief generating status, then the completed answer once the stream ends' },
        { id: 'b', text: 'Put the streaming text in an assertive live region', whyWrong: 'The reader interrupts itself on every token. Unusable in practice.' },
        { id: 'c', text: 'Hide the answer from assistive technology entirely', whyWrong: 'Removes the content from the users who need it most.' },
        { id: 'd', text: 'Rely on the user re-reading the page manually', whyWrong: 'Puts the burden on the user to discover the answer arrived.' },
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
        { id: 'a', text: 'Isolate the streaming text in its own leaf component and batch appends per frame' },
        { id: 'b', text: 'Reduce the streaming rate from the server', whyWrong: 'Degrades the experience to work around a rendering problem.' },
        { id: 'c', text: 'Disable streaming on slower devices', whyWrong: 'Removes the feature that makes it feel fast.' },
        { id: 'd', text: 'Move rendering to a web worker', whyWrong: 'Workers cannot touch the DOM; the re-render cost stays where it was.' },
      ],
      correctId: 'a',
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
        { id: 'a', text: 'The mutation does not invalidate the queries whose results it changed' },
        { id: 'b', text: 'The cache TTL is too long', whyWrong: 'Time-based expiry is the wrong tool for a change you already know about.' },
        { id: 'c', text: 'The server is eventually consistent', whyWrong: 'Possible, and the far more common cause is client-side cache invalidation.' },
        { id: 'd', text: 'The list should not be cached', whyWrong: 'Throws away the caching that makes navigation feel instant.' },
      ],
      correctId: 'a',
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
        { id: 'a', text: 'Token exchange: swap the agent’s token for a scoped one that names the user as subject and the agent as actor' },
        { id: 'b', text: 'Pass the user’s original access token through unchanged', whyWrong: 'Hands the agent a credential with the user’s full scope, far wider than the call needs, and destroys the distinction between user and agent in the audit log.' },
        { id: 'c', text: 'Call with a service account that can read everything', whyWrong: 'The permission-bleed design. The user’s own restrictions stop applying.' },
        { id: 'd', text: 'Ask the user to authenticate to each downstream system', whyWrong: 'Correct in security terms and unusable, delegation exists to avoid exactly this.' },
      ],
      correctId: 'a',
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
        { id: 'a', text: 'So authorisation still applies the user’s permissions while the audit trail shows which agent acted' },
        { id: 'b', text: 'To make the token smaller', whyWrong: 'It makes the token larger.' },
        { id: 'c', text: 'To let the agent act after the user’s session ends', whyWrong: 'The opposite of the intent; delegated tokens should not outlive their basis.' },
        { id: 'd', text: 'Because the resource server cannot read custom claims', whyWrong: 'It can, and it is expected to.' },
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
        { id: 'a', text: 'Each hop is scoped at or below the previous one, privilege only ever narrows' },
        { id: 'b', text: 'Each agent uses its own service account', whyWrong: 'Loses the user context entirely, so nobody can tell who the work was for.' },
        { id: 'c', text: 'The final service re-authenticates the user', whyWrong: 'Breaks the automation delegation exists to enable.' },
        { id: 'd', text: 'Tokens are cached and reused across hops', whyWrong: 'Widens exposure and lengthens token lifetime.' },
      ],
      correctId: 'a',
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
        { id: 'a', text: 'Use of a stolen token, since the caller must also prove possession of the bound key' },
        { id: 'b', text: 'Token expiry being too long', whyWrong: 'Lifetime is a separate control.' },
        { id: 'c', text: 'The user granting too much scope', whyWrong: 'Scope is set at issue time and unaffected by binding.' },
        { id: 'd', text: 'Replay of the whole TLS session', whyWrong: 'TLS already prevents that.' },
      ],
      correctId: 'a',
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
      stem: 'Retrieval must respect per-document sharing that users set themselves. Which authorisation model fits?',
      choices: [
        { id: 'a', text: 'Relationship-based: permissions derive from who is related to which document how' },
        { id: 'b', text: 'Role-based with a role per document', whyWrong: 'Role explosion. A hundred thousand documents means a hundred thousand roles.' },
        { id: 'c', text: 'Attribute-based on the user’s department', whyWrong: 'Cannot express an individual share that ignores department.' },
        { id: 'd', text: 'Let the model decide from document metadata', whyWrong: 'Asking a language model to enforce authorisation. This is the finding that ends the pilot.' },
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
        { id: 'a', text: 'A forgotten tenant filter returns nothing instead of another tenant’s data' },
        { id: 'b', text: 'It performs better than a WHERE clause', whyWrong: 'It is a WHERE clause, applied by the database. Performance is not the argument.' },
        { id: 'c', text: 'It removes the need for application authorisation', whyWrong: 'It is a backstop, not a replacement, it enforces isolation, not business rules.' },
        { id: 'd', text: 'It encrypts each tenant separately', whyWrong: 'Unrelated to encryption.' },
      ],
      correctId: 'a',
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
        { id: 'a', text: 'It stays valid until expiry unless resource servers subscribe to revocation signals. Which is why access tokens are short-lived' },
        { id: 'b', text: 'It is invalidated immediately everywhere', whyWrong: 'Only if every resource server checks the provider on each call, which defeats the point of a self-contained token.' },
        { id: 'c', text: 'It is invalidated once the refresh token is revoked', whyWrong: 'Revoking refresh stops renewal; the outstanding access token is unaffected.' },
        { id: 'd', text: 'The user must sign out for it to take effect', whyWrong: 'A departing user will not cooperate, which is exactly why this cannot be the mechanism.' },
      ],
      correctId: 'a',
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
        { id: 'a', text: 'Any one of the five can replay it against the other four' },
        { id: 'b', text: 'The token will be too large', whyWrong: 'A packaging concern, not a security one.' },
        { id: 'c', text: 'Rate limits will be shared', whyWrong: 'Operational, and not the reason to narrow audience.' },
        { id: 'd', text: 'Refresh will fail', whyWrong: 'Unrelated.' },
      ],
      correctId: 'a',
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
        { id: 'a', text: 'Week one: their identity team has a queue and a change window you do not control' },
        { id: 'b', text: 'After the pilot proves value', whyWrong: 'Puts a multi-week organizational dependency directly in front of the launch date.' },
        { id: 'c', text: 'Once you know the final architecture', whyWrong: 'The SSO integration barely depends on the rest of the architecture.' },
        { id: 'd', text: 'During hardening', whyWrong: 'Hardening is already the phase everyone underestimates.' },
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
        { id: 'a', text: 'Workload identity issuing short-lived credentials, or mTLS with platform-managed certificates' },
        { id: 'b', text: 'A shared secret in both services’ config', whyWrong: 'Must be distributed and rotated, and rotation across two deploys is where it gets pinned open.' },
        { id: 'c', text: 'An API key checked against a list', whyWrong: 'Same distribution problem with worse auditability.' },
        { id: 'd', text: 'Network-level trust: anything inside the VPC is allowed', whyWrong: 'The flat-network assumption zero trust exists to remove.' },
      ],
      correctId: 'a',
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
        { id: 'a', text: 'Every user of the agent now has admin reach into the CRM. It must act with per-user delegated credentials' },
        { id: 'b', text: 'Admin credentials expire too quickly', whyWrong: 'They typically do not, which is part of the problem.' },
        { id: 'c', text: 'The model may misuse the tool description', whyWrong: 'A real concern about a different layer.' },
        { id: 'd', text: 'MCP does not support authentication', whyWrong: 'It does; the issue is which identity is being presented.' },
      ],
      correctId: 'a',
    },
  },
];
