import type { FlawItem } from '@shared/content';

import { cite } from '../sources';

/**
 * Spot the Flaw seed bank.
 *
 * Every item states the requirement openly, then shows a design where exactly
 * one line breaks it. The other lines are deliberately correct and often
 * good practice, because a review where the wrong answer is obvious teaches
 * nothing: the skill is noticing the one thing that does not belong among
 * things that do.
 */
export const FLAW_SEED: FlawItem[] = [
  {
    id: 'flaw.phi.logs',
    mode: 'flaw',
    nodeIds: ['sec.hipaa', 'gcp.observability', 'sec.pii'],
    difficulty: 'core',
    explanation:
      'Logging the full request body is the single most common way PHI escapes a compliant boundary. The pipeline itself is covered, the storage is covered, and then a debug log ships the patient record to a project nobody put in scope.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      requirement: 'No PHI may leave the BAA-covered services, in any form, including logs.',
      scenario:
        'A hospital is building a summarization service over clinical notes. Their platform team proposes this design and asks you to sanity check it before the security review.',
      lines: [
        'Notes land in a Cloud Storage bucket with CMEK, inside the covered project',
        'A Cloud Run service reads the note and calls a regional model endpoint',
        'The service logs the full request and response body at INFO for debugging',
        'Summaries are written back to the same bucket, encrypted with the same key',
        'Access is granted through a service account with object-level permissions',
      ],
      flawIndex: 2,
      fix: 'Logging full request and response bodies copies PHI into Cloud Logging, which is outside the boundary the rest of this design carefully maintains. Log identifiers and outcomes, never payloads, and if payload logging is genuinely needed for debugging, route it to a covered sink with the same controls and retention.',
    },
  },
  {
    id: 'flaw.key.in.repo',
    mode: 'flaw',
    nodeIds: ['gcp.wif', 'prod.config', 'idp.service_auth'],
    difficulty: 'intro',
    explanation:
      'Every other line here is sound, which is what makes the stored key easy to skim past. A long-lived credential in a CI secret is the thing an attacker looks for first, and rotation policies are the control people write down and never perform.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      requirement: 'No long-lived cloud credentials may be stored outside the cloud provider.',
      scenario:
        'A customer is setting up deployment from GitHub Actions into their production project. This is the pipeline they have written.',
      lines: [
        'The workflow runs only on the protected main branch',
        'A service account JSON key is stored as an encrypted repository secret',
        'The deploy step assumes least-privilege permissions scoped to one service',
        'Every deploy writes an audit entry with the commit SHA',
        'Failed deploys roll back automatically to the previous revision',
      ],
      flawIndex: 1,
      fix: 'An exported service account key is a long-lived bearer credential: whoever holds the JSON is that service account until somebody remembers to rotate it. Workload Identity Federation exchanges the pipeline’s own short-lived OIDC token for cloud credentials, so there is no stored secret to leak.',
    },
  },
  {
    id: 'flaw.residency.inference',
    mode: 'flaw',
    nodeIds: ['sec.residency', 'gcp.ai_residency'],
    difficulty: 'deep',
    explanation:
      'Storage residency is the easy half and it is the half everyone gets right. Inference is processing, and a globally routed endpoint can process a prompt containing personal data outside the region while every bucket sits compliantly at home.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      requirement: 'All personal data must be stored and processed within the EU.',
      scenario:
        'A German insurer is deploying a claims assistant. Their architect walks you through the design in the kickoff.',
      lines: [
        'Claim documents are stored in a europe-west3 bucket',
        'The application runs on Cloud Run in europe-west3',
        'Prompts containing policyholder details go to the global model endpoint',
        'Audit logs are retained in an EU-resident log bucket',
        'Backups replicate only to europe-west4',
      ],
      flawIndex: 2,
      fix: 'A prompt containing policyholder details is personal data in processing, and a global endpoint may process it outside the EU. Use a regional model endpoint with an ML-processing commitment. Everything else in this design is already correct, which is exactly why this line survives review so often.',
    },
  },
  {
    id: 'flaw.injection.tool',
    mode: 'flaw',
    nodeIds: ['ai.guardrails', 'ai.mcp', 'idp.scopes'],
    difficulty: 'deep',
    explanation:
      'The blast radius of a prompt-injected agent is exactly the union of its tools’ permissions. Telling the model what not to do is a suggestion; injection exists to make the model ignore that sentence.',
    citations: cite('modelArmor', 'mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      requirement:
        'A prompt-injected agent must not be able to destroy customer data.',
      scenario:
        'An agent triages support tickets for a customer. This is how the integration is wired.',
      lines: [
        'Incoming ticket text is screened for injection before it reaches the model',
        'The agent reaches the ticketing system through an MCP server',
        'That server authenticates with an admin API token, and the system prompt forbids deletion',
        'Every tool call is logged with its arguments and result',
        'Destructive operations require a confirmation step in the UI',
      ],
      flawIndex: 2,
      fix: 'Instructions are not authorization. Screening and logging are both good, and neither prevents a successful injection from using an admin token. Mint scoped credentials per tool, read-only where possible, so the worst case is bounded by the grant rather than by the model’s compliance.',
    },
  },
  {
    id: 'flaw.timeout.inversion',
    mode: 'flaw',
    nodeIds: ['scale.timeouts', 'scale.degradation'],
    difficulty: 'deep',
    explanation:
      'Timeouts must shrink as calls go deeper. An inner call allowed more time than its caller keeps working for a caller that has already given up, holding connections precisely when the system is under pressure.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      requirement: 'Under load, no service should do work whose caller has already given up.',
      scenario:
        'A three-tier service chain is being reviewed after a partial outage. These are the current settings.',
      lines: [
        'The edge service times out client requests at 10 seconds',
        'The edge calls the orchestration service with a 30 second timeout',
        'Orchestration calls the model provider with a 8 second timeout',
        'All three services emit traces with a shared correlation id',
        'Retries use exponential backoff with jitter',
      ],
      flawIndex: 1,
      fix: 'The inner timeout exceeds the outer one, so orchestration keeps working for up to 20 seconds after the edge has already returned an error to the user. Deadlines must propagate: each hop passes its remaining budget down, and no inner timeout may exceed the time its caller is still waiting.',
    },
  },
  {
    id: 'flaw.eval.gate',
    mode: 'flaw',
    nodeIds: ['ai.evals', 'prod.model_release'],
    difficulty: 'core',
    explanation:
      'A canary that cannot fail is decoration. Without a threshold defined before the rollout, promotion becomes a judgment call made by whoever is watching, under time pressure, wanting to ship.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      requirement: 'A model change that degrades quality must not reach all users.',
      scenario: 'A team describes how they ship prompt and model updates.',
      lines: [
        'Prompt and model versions are pinned together and released as one unit',
        'Changes go to 5% of traffic first',
        'The team watches the dashboard for an hour and promotes if it looks fine',
        'Rollback restores the previous pinned pair in one step',
        'Every release runs the eval suite in CI before deploy',
      ],
      flawIndex: 2,
      fix: '"Looks fine" is not a gate. Define the guardrail metrics and the rollback threshold before the canary starts, so promotion is a data check rather than a feeling at the end of a long day. Everything else here is already the right shape.',
    },
  },
  {
    id: 'flaw.tenancy.filter',
    mode: 'flaw',
    nodeIds: ['sec.tenancy', 'idp.rls'],
    difficulty: 'edge',
    explanation:
      'Application-layer tenant filtering is one forgotten WHERE clause away from a cross-tenant leak, and the forgotten clause is usually in the reporting query somebody added later. Row-level security enforces it in the database, where it cannot be skipped.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      requirement: 'No tenant may ever read another tenant’s rows, including through new code.',
      scenario:
        'A multi-tenant SaaS with about four thousand customers explains its isolation model.',
      lines: [
        'Every table carries a tenant_id column',
        'The application adds a tenant filter to each query in the data access layer',
        'Connections authenticate as a per-tenant database role',
        'Tenant context is derived from a validated JWT claim, never a request parameter',
        'Integration tests assert that a tenant cannot fetch another tenant’s record by id',
      ],
      flawIndex: 1,
      fix: 'Filtering in the application means every future query is a chance to forget. With per-tenant roles already in place, row-level security policies push the rule into the database so an unfiltered query returns nothing rather than everything.',
    },
  },
  {
    id: 'flaw.cdc.deletes',
    mode: 'flaw',
    nodeIds: ['data.cdc', 'data.quality'],
    difficulty: 'core',
    explanation:
      'Query-based change capture cannot see a row that no longer exists. The pipeline looks healthy, the counts look plausible, and deleted records quietly live forever downstream.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      requirement: 'The warehouse must reflect deletions in the source system.',
      scenario: 'A customer describes the sync from their operational Postgres into the warehouse.',
      lines: [
        'A job runs every fifteen minutes',
        'It selects rows where updated_at is greater than the last watermark',
        'Rows are upserted into the warehouse by primary key',
        'The watermark is stored transactionally with the load',
        'Row counts are reconciled against the source nightly',
      ],
      flawIndex: 1,
      fix: 'A timestamp query returns rows that exist. A deleted row has no updated_at to return, so deletions never propagate and the nightly count reconciliation is the only thing that will ever notice. Log-based capture reads the write-ahead log and sees inserts, updates and deletes in order.',
    },
  },
  {
    id: 'flaw.vpcsc.dryrun',
    mode: 'flaw',
    nodeIds: ['gcp.vpcsc', 'sec.audit'],
    difficulty: 'deep',
    explanation:
      'Dry-run mode is an excellent diagnostic and a terrible resting state. It logs what would have been blocked while blocking nothing, so the perimeter appears on the architecture diagram and enforces no boundary at all.',
    citations: cite('vpcsc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      requirement: 'Regulated data must be protected by an enforced service perimeter.',
      scenario:
        'A bank shows you their perimeter configuration after a previous integration broke and was hurriedly fixed.',
      lines: [
        'A perimeter surrounds the projects holding regulated datasets',
        'The perimeter is left in dry-run mode so the nightly export keeps working',
        'Egress rules exist for the two service accounts that legitimately export data',
        'Access levels restrict administrative access to corporate devices',
        'Violations are reviewed weekly from the audit logs',
      ],
      flawIndex: 1,
      fix: 'Dry run enforces nothing. The egress rules on the next line are exactly what would have let the nightly export work under enforcement, so the perimeter can be enforced today. Reviewing violations weekly from a perimeter that blocks nothing is auditing a door that was never shut.',
    },
  },
  {
    id: 'flaw.rag.stale',
    mode: 'flaw',
    nodeIds: ['ai.rag_failure', 'ai.chunking', 'data.quality'],
    difficulty: 'core',
    explanation:
      'Retrieval quality is bounded by ingestion. An index that only ever gains documents will confidently serve last year’s policy alongside this year’s, and the model has no way to know which is current.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      requirement: 'The assistant must not answer from superseded policy documents.',
      scenario: 'A retailer describes the retrieval pipeline behind their support assistant.',
      lines: [
        'Policy documents are chunked with overlap and embedded on upload',
        'New and updated documents are re-indexed within minutes of publication',
        'Deleted and superseded documents remain in the index for historical search',
        'Retrieved chunks are returned to the model with their source and date',
        'Answers cite the document they came from',
      ],
      flawIndex: 2,
      fix: 'Keeping superseded documents retrievable guarantees they will eventually be retrieved and answered from. If historical search is genuinely needed, it belongs in a separate index or behind a status filter that the assistant’s retriever excludes by default.',
    },
  },
];
