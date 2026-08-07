import type { DrillItem } from '@shared/content';

import { cite } from '../sources';

/**
 * GCP Foundations, second pass: identity, resource hierarchy, networking,
 * perimeters, compute choice, data stores, streaming, governance, keys,
 * observability and billing.
 *
 * The angles here are deliberately the ones the first pass left alone: failure
 * modes you only meet in production, the questions a security review actually
 * asks, cost traps that surface in month three, quota and limit reasoning, and
 * the cases where the obvious answer is the wrong one.
 */
export const DRILL_GCP_CORE: DrillItem[] = [
  // ── IAM and service accounts ─────────────────────────────────────────────
  {
    id: 'g2.iam.impersonation',
    mode: 'drill',
    nodeIds: ['gcp.iam'],
    difficulty: 'core',
    explanation:
      'Service account impersonation lets a human or workload mint a short-lived token for a service account without any key material existing. The caller holds roles/iam.serviceAccountTokenCreator on the target account, every mint lands in the audit log, and there is nothing on a laptop to leak. This is the default answer whenever someone asks you for a key file.',
    citations: cite('wif'),
    payload: {
      kind: 'mcq',
      stem: 'A data science team asks for the production service account’s JSON key so they can reproduce a pipeline locally. What do you set up instead?',
      choices: [
        { id: 'a', text: 'Grant their group Service Account Token Creator so they can impersonate it from gcloud' },
        { id: 'b', text: 'Issue the key but hold it in Secret Manager and rotate it every ninety days', whyWrong: 'The key still exists and still ends up cached on a laptop. Rotation shortens the window of a leak, it does not remove the leak.' },
        { id: 'c', text: 'Give each analyst the same roles on their own user account as the pipeline', whyWrong: 'Now humans hold production data-plane permissions permanently, and the audit trail no longer distinguishes pipeline activity from ad hoc analysis.' },
        { id: 'd', text: 'Route the work through a shared jump host that holds the key on disk', whyWrong: 'A shared host is a shared identity: you lose per-person attribution and you have built a single box everyone needs access to.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.iam.deny_policy',
    mode: 'drill',
    nodeIds: ['gcp.iam', 'gcp.hierarchy'],
    difficulty: 'deep',
    explanation:
      'IAM deny policies are evaluated before allow policies, so a denial holds even when a project owner grants themselves the role. They attach at the organization, folder or project and support exception principals, which is how you carve out a break-glass group. Allow policies alone cannot express "nobody, including owners".',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'Security wants a hard guarantee that nobody except a named break-glass group can mint access tokens for the production deployer service account, even if a project owner tries to grant it. What do you use?',
      choices: [
        { id: 'a', text: 'Remove the Token Creator binding and alert whenever it is added back', whyWrong: 'Detective, not preventive. A project owner can re-add the binding and use it before anyone reads the alert.' },
        { id: 'b', text: 'An IAM deny policy on the folder, with the break-glass group excepted' },
        { id: 'c', text: 'An org policy constraint restricting which service accounts may be used', whyWrong: 'Org policies govern how resources may be configured, not which principals may exercise a permission. There is no constraint that expresses this.' },
        { id: 'd', text: 'A custom role that omits iam.serviceAccounts.getAccessToken entirely', whyWrong: 'Custom roles only shape one role. Nothing stops someone from also being granted a predefined role that includes the permission.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.iam.recommender',
    mode: 'drill',
    nodeIds: ['gcp.iam'],
    difficulty: 'core',
    explanation:
      'IAM Recommender compares 90 days of observed API usage against what a binding actually grants and proposes a tighter role, which turns least privilege from an argument about intentions into a list of evidence-backed edits. The sequence matters as much as the tool: prove what you changed, move to groups so future edits happen once, and let non-production surface the denials before production does.',
    citations: cite('waf'),
    payload: {
      kind: 'order',
      stem: 'Six months in, a production project has roughly 140 role bindings nobody can justify. Order the cleanup so it does not become an outage.',
      steps: [
        'Export the current allow policy so every change is provable and reversible',
        'Read the IAM Recommender findings, which are grounded in ninety days of observed usage',
        'Replace individual bindings with group bindings so future changes happen in one place',
        'Apply the tighter roles in non-production first and watch for permission denied errors',
        'Apply the same changes in production with alerting on denials during the change window',
        'Re-run the recommender after a full business cycle to catch the quarterly jobs the first pass missed',
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.iam.service_agent',
    mode: 'drill',
    nodeIds: ['gcp.iam', 'gcp.kms'],
    difficulty: 'edge',
    explanation:
      'Managed services act on your resources through a Google-managed service agent, a per-project identity separate from both the human and the job’s own service account. CMEK, cross-project reads and Pub/Sub push subscriptions all fail with permission denied until the right service agent holds the right role, and the error names an account nobody on the team recognizes.',
    citations: cite('cmek'),
    payload: {
      kind: 'mcq',
      stem: 'A Dataflow job configured with a CMEK key fails at submit with a permission error on the key, even though the developer and the job’s own service account both have full access to it. What is missing?',
      choices: [
        { id: 'a', text: 'The key sits in a key ring in the wrong region for that Dataflow job', whyWrong: 'A key ring is an organizational container and location mismatches surface as a not-found or location error on the key name, not a permission denial.' },
        { id: 'b', text: 'CMEK is unsupported for Dataflow, so the setting is silently ignored', whyWrong: 'It is supported, and an unsupported setting would not produce a permission error on the key resource.' },
        { id: 'c', text: 'The Dataflow service agent needs Encrypter/Decrypter on the key' },
        { id: 'd', text: 'The developer needs the Owner role on the project holding the key', whyWrong: 'Handing out Owner to fix a service agent binding is the reflex you want to break. The human is not the caller here.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.iam.guardrail_match',
    mode: 'drill',
    nodeIds: ['gcp.iam', 'gcp.hierarchy'],
    difficulty: 'core',
    explanation:
      'Customers routinely ask for a control and name the wrong mechanism. Being crisp about which layer answers which question saves a week of building the wrong guardrail: permissions, resource configuration and caller context are three separate systems that happen to meet at the same resource.',
    citations: cite('waf'),
    payload: {
      kind: 'match',
      stem: 'Match each control to what it actually governs.',
      pairs: [
        { left: 'IAM allow policy', right: 'Which principals may call which APIs on a resource' },
        { left: 'IAM deny policy', right: 'Permissions no principal may exercise, evaluated before any allow' },
        { left: 'Org policy constraint', right: 'How resources may be configured, regardless of who is asking' },
        { left: 'IAM condition', right: 'Narrows one grant by time, resource name or request attribute' },
        { left: 'Access level', right: 'Caller context such as network origin and device posture required to reach the resource' },
      ],
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Workload Identity Federation ─────────────────────────────────────────
  {
    id: 'g2.wif.aws',
    mode: 'drill',
    nodeIds: ['gcp.wif'],
    difficulty: 'core',
    explanation:
      'Workload Identity Federation is not GitHub-specific: an AWS or OIDC provider in the pool exchanges the workload’s existing external identity for a short-lived Google token, with no Google key anywhere. The step people skip is the attribute condition, and skipping it means any principal the issuer will vouch for can assume the access, not just the one workload you had in mind.',
    citations: cite('wif'),
    payload: {
      kind: 'order',
      stem: 'A workload on EKS must query BigQuery with no Google key. Order the setup.',
      steps: [
        'Create a workload identity pool representing that external environment',
        'Add a provider to the pool that trusts the AWS account or OIDC issuer',
        'Map the external token claims to Google attributes',
        'Add an attribute condition restricting the exchange to the one role or workload you intend',
        'Grant BigQuery access to the resulting principal set, or to a service account it may impersonate',
        'Point the workload at a credential configuration so the client libraries perform the exchange',
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.wif.direct_principal',
    mode: 'drill',
    nodeIds: ['gcp.wif', 'gcp.iam'],
    difficulty: 'deep',
    explanation:
      'Federated identities can be granted IAM roles directly using a principal or principalSet member, with no service account in the path at all. Dropping the impersonation hop removes a resource to secure and a Token Creator binding to audit. Keep the service account only where a product genuinely requires a service account identity or where you want one place to attach quota and org policy.',
    citations: cite('wif'),
    payload: {
      kind: 'mcq',
      stem: 'A reviewer asks why your Workload Identity Federation design still creates a service account for the CI pipeline to impersonate. What is the accurate answer?',
      choices: [
        { id: 'a', text: 'A service account is mandatory: federated principals cannot hold IAM roles', whyWrong: 'They can. principal:// and principalSet:// members are first-class in allow policies, which is the whole point of direct resource access.' },
        { id: 'b', text: 'The service account is what keeps the resulting access token short-lived', whyWrong: 'Token lifetime comes from the STS exchange, not from the service account. Direct access tokens are equally short-lived.' },
        { id: 'c', text: 'Only service accounts can be constrained by IAM conditions on a binding', whyWrong: 'Conditions attach to the binding, not to the member type, and apply just as well to a federated principal.' },
        { id: 'd', text: 'Often unnecessary: roles bind directly to a principal or principalSet' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.wif.revocation',
    mode: 'drill',
    nodeIds: ['gcp.wif'],
    difficulty: 'edge',
    explanation:
      'When a CI runner is compromised the containment story is what security cares about. Tightening the provider’s attribute condition or removing the IAM binding stops the next token exchange immediately, but a token already issued remains valid for its remaining lifetime. Say that out loud rather than promising instant revocation, and note that the ceiling on that exposure is under an hour, versus forever for a leaked key.',
    citations: cite('wif'),
    payload: {
      kind: 'mcq',
      stem: 'A CI runner using Workload Identity Federation is compromised. You delete the pool provider. What is the honest description of what happens next?',
      choices: [
        { id: 'a', text: 'No new tokens can be minted; issued ones live out their lifetime' },
        { id: 'b', text: 'Every outstanding token is revoked the moment the pool provider is deleted', whyWrong: 'Access tokens are bearer credentials validated without a callback to the pool. Deleting the provider stops issuance, not use.' },
        { id: 'c', text: 'Nothing changes until the next attribute mapping refresh cycle completes', whyWrong: 'There is no refresh cycle to wait for. The exchange fails on the very next attempt.' },
        { id: 'd', text: 'The workload falls back to the underlying service account credentials', whyWrong: 'There is no fallback path. Federation either produces a token or returns an error.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.wif.workforce',
    mode: 'drill',
    nodeIds: ['gcp.wif', 'gcp.iam'],
    difficulty: 'intro',
    explanation:
      'Workload Identity Federation is for machines. Workforce Identity Federation is for people: employees sign in through the existing external IdP and get console and gcloud access without every human being provisioned as a Cloud Identity user first. Mixing the two up sends a customer down a directory-sync project they were explicitly trying to avoid.',
    citations: cite('wif'),
    payload: {
      kind: 'mcq',
      stem: 'A customer authenticates staff through Okta and wants engineers to use the Google Cloud console without provisioning a Cloud Identity user for each of them. Which product fits?',
      choices: [
        { id: 'a', text: 'Workload Identity Federation, mapping each engineer to a pool principal', whyWrong: 'That path federates machine workloads. It has no console sign-in flow for a human user.' },
        { id: 'b', text: 'Workforce Identity Federation, so engineers sign in through Okta directly' },
        { id: 'c', text: 'Directory sync from Okta into Cloud Identity, with SSO on top', whyWrong: 'This works and provisions exactly the per-user Cloud Identity accounts the customer said they did not want to manage.' },
        { id: 'd', text: 'A shared break-glass account per team, with Okta-managed passwords', whyWrong: 'Shared accounts destroy attribution, which is the first thing an auditor checks.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Resource hierarchy and org policy ────────────────────────────────────
  {
    id: 'g2.hierarchy.not_retroactive',
    mode: 'drill',
    nodeIds: ['gcp.hierarchy'],
    difficulty: 'deep',
    explanation:
      'Org policy constraints are enforced at admission: they evaluate create and update calls. Applying a location constraint to a folder full of running resources blocks new violations but leaves every existing one in place, still serving traffic and still out of policy. The honest plan is constraint plus an inventory sweep plus a remediation backlog, and customers need to hear that before they tell their regulator the control is live.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'You apply a resource-locations constraint restricting a folder to EU regions. The folder already contains production resources in us-central1. What happens?',
      choices: [
        { id: 'a', text: 'The out-of-region resources are deleted at the next policy evaluation', whyWrong: 'Org policy has no delete action. If it did, the first accidental scope error would be an outage.' },
        { id: 'b', text: 'They are migrated automatically to the nearest allowed region instead', whyWrong: 'There is no automatic relocation. Region is baked into most resources at creation.' },
        { id: 'c', text: 'Existing resources keep running: the constraint gates creates and updates' },
        { id: 'd', text: 'The constraint fails to apply at all, because the folder is already in violation', whyWrong: 'It applies immediately. Existing state does not block the policy from taking effect on future operations.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.hierarchy.custom_constraint',
    mode: 'drill',
    nodeIds: ['gcp.hierarchy'],
    difficulty: 'deep',
    explanation:
      'Custom org policy constraints let you write a CEL expression over the fields of a supported resource type and enforce it at admission, org-wide. That is the difference between a rule that cannot be violated and a rule that is violated for forty minutes until a scanner notices. Check the supported resource list first, because coverage is per service.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A platform team needs every Cloud Run service in the org to carry a cost-center label, enforced rather than requested. What do you build?',
      choices: [
        { id: 'a', text: 'A scheduled Cloud Run job that deletes services missing the label', whyWrong: 'Detective and destructive. It races real deployments and turns a metadata gap into a production outage.' },
        { id: 'b', text: 'An IAM condition permitting deploys only when the label is present', whyWrong: 'IAM conditions evaluate request attributes like resource name and time, not arbitrary fields in a resource body.' },
        { id: 'c', text: 'A Security Command Center custom module raising a finding on each service', whyWrong: 'That gets you a report, and reports do not stop the deploy. Use it as a backstop after the constraint, not instead of it.' },
        { id: 'd', text: 'A custom org policy constraint with a CEL rule, enforced at the folder' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.hierarchy.inherit_false',
    mode: 'drill',
    nodeIds: ['gcp.hierarchy'],
    difficulty: 'edge',
    explanation:
      'List constraints merge down the hierarchy only while inheritFromParent stays true. A project-level policy that sets it to false replaces the parent’s allowed values entirely instead of narrowing them, which is how a team quietly re-opens a control the org thought was locked. Auditing effective policy, not just the org-level policy, is the habit that catches it.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'The org allows only three regions via a list constraint, yet a project is running in a fourth. Nobody changed the org-level policy. What is the most likely explanation?',
      choices: [
        { id: 'a', text: 'The project set its own policy with inheritFromParent false' },
        { id: 'b', text: 'List constraints always take the union of the values set at every level', whyWrong: 'Inherited list constraints intersect while inheritance is on. Union semantics would make any org-level restriction meaningless.' },
        { id: 'c', text: 'The resource predates the constraint and was never brought into compliance', whyWrong: 'Possible in general, but the question says it is running in a region the policy forbids and the policy is what you are auditing. Check effective policy first.' },
        { id: 'd', text: 'Project policies cannot override org policies, so this is a console bug', whyWrong: 'They can, unless the org-level policy is enforced in a way that denies the override. That assumption is exactly the trap.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.hierarchy.folder_level',
    mode: 'drill',
    nodeIds: ['gcp.hierarchy', 'gcp.landing_zone'],
    difficulty: 'core',
    explanation:
      'The hierarchy exists so that policy and access are set once and inherited. Anything that describes an environment or a business unit belongs on the folder; anything that describes a running workload belongs on the project. Getting this split right is the difference between a landing zone that scales to 400 projects and one where every new project is a ticket.',
    citations: cite('waf'),
    payload: {
      kind: 'multi',
      stem: 'Which of these belong at the folder level rather than being repeated per project? Select all that apply.',
      choices: [
        { id: 'a', text: 'Org policy constraints that define an environment class, such as which regions production may use' },
        { id: 'b', text: 'IAM grants for the platform team that operates every project in a business unit' },
        { id: 'c', text: 'An aggregated log sink that captures the whole environment’s logs' },
        { id: 'd', text: 'The Shared VPC host project designation', whyWrong: 'A host project is a project, and service projects attach to it individually. There is no folder-level equivalent.' },
        { id: 'e', text: 'The per-service runtime service account for a workload', whyWrong: 'Runtime identities should be per workload and per project. A folder-wide runtime identity is a shared credential with extra steps.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── VPC and networking ───────────────────────────────────────────────────
  {
    id: 'g2.vpc.global',
    mode: 'drill',
    nodeIds: ['gcp.vpc'],
    difficulty: 'intro',
    explanation:
      'A VPC is a global resource and its subnets are regional. Two VMs in different regions of the same VPC route to each other over Google’s backbone with no VPN, peering or gateway, subject only to firewall rules. Engineers arriving from other clouds routinely build tunnels they do not need because they assume the network is regional.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A VM in a us-east1 subnet needs to reach a VM in a europe-west1 subnet of the same VPC. What connectivity work is required?',
      choices: [
        { id: 'a', text: 'A VPC network peering connection between the two regional subnets', whyWrong: 'Peering joins two separate VPC networks. There is only one network here, so there is nothing to peer.' },
        { id: 'b', text: 'None beyond firewall rules: a VPC spans regions and routes are automatic' },
        { id: 'c', text: 'A Cloud VPN tunnel between the two regions to carry the internal traffic', whyWrong: 'That would push internal traffic through a gateway and cap it at tunnel throughput, for no benefit.' },
        { id: 'd', text: 'A Cloud Router advertising each subnet into the other region over BGP sessions', whyWrong: 'Cloud Router handles dynamic routing to external networks over VPN or Interconnect, not routing inside one VPC.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.vpc.pga',
    mode: 'drill',
    nodeIds: ['gcp.vpc'],
    difficulty: 'intro',
    explanation:
      'A VM with no external IP cannot reach Google APIs by default because the API endpoints resolve to public addresses. Private Google Access is the subnet-level setting that lets those VMs reach Google APIs over internal paths without any internet route. Cloud NAT also makes the call succeed, but it sends the traffic out through the internet edge, which costs more and breaks the private-path story you promised the security team.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'VMs in a private subnet with no external IPs cannot reach storage.googleapis.com. What is the correct fix?',
      choices: [
        { id: 'a', text: 'Deploy Cloud NAT so the private VMs can egress to the API endpoint', whyWrong: 'It works, but you are now paying for NAT and routing Google-bound traffic through the internet edge, which undermines a private-access design.' },
        { id: 'b', text: 'Assign ephemeral external IP addresses to the VMs in that subnet', whyWrong: 'This directly contradicts the no-external-IP posture, and usually an org policy forbids it anyway.' },
        { id: 'c', text: 'Enable Private Google Access on the subnet and point DNS at the endpoint' },
        { id: 'd', text: 'Add an egress firewall rule allowing port 443 out to the internet', whyWrong: 'Firewall rules permit traffic that already has a route. With no external IP and no NAT there is no route to permit.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.vpc.restricted_vip',
    mode: 'drill',
    nodeIds: ['gcp.vpc', 'gcp.vpcsc'],
    difficulty: 'edge',
    explanation:
      'There are two private endpoints for Google APIs and the difference matters. The private endpoint reaches most Google APIs but does not enforce VPC Service Controls. The restricted endpoint resolves only services that VPC Service Controls supports, so an attempt to reach anything outside the perimeter simply fails to resolve. Choosing the convenient one quietly leaves an exfiltration path open.',
    citations: cite('vpcsc'),
    payload: {
      kind: 'mcq',
      stem: 'Your perimeter is enforced, yet a compromised VM can still call a Google API that sits outside it. DNS for googleapis.com in the VPC points at the private endpoint. What do you change?',
      choices: [
        { id: 'a', text: 'Add an egress rule to the perimeter authorizing that particular API', whyWrong: 'Egress rules widen a perimeter. You are trying to close a path, not authorize it.' },
        { id: 'b', text: 'Disable Private Google Access on the subnet where the VM sits', whyWrong: 'That breaks every legitimate API call from the subnet to fix one unwanted one.' },
        { id: 'c', text: 'Block the API with an egress firewall rule matching the VM’s network tag', whyWrong: 'Both endpoints live in Google-owned ranges shared across APIs, so a firewall rule cannot separate one API from another.' },
        { id: 'd', text: 'Repoint private DNS at the restricted endpoint, which resolves less' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.vpc.hierarchical_fw',
    mode: 'drill',
    nodeIds: ['gcp.vpc', 'gcp.hierarchy'],
    difficulty: 'deep',
    explanation:
      'Hierarchical firewall policies attach at the organization or folder and are evaluated before any VPC-level rule, so a project-level allow cannot override an inherited deny. This is the network equivalent of a deny policy: it lets the network team set floors that a product team cannot lower, while still leaving them free to write their own rules underneath.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A product team keeps adding a 0.0.0.0/0 ingress allow at priority 100 in their own VPC. The network team wants that to stop being effective without taking away the team’s ability to manage their own rules. What do you deploy?',
      choices: [
        { id: 'a', text: 'A hierarchical firewall policy at the folder, evaluated before VPC rules' },
        { id: 'b', text: 'A VPC firewall rule at priority 0 denying exactly the same traffic', whyWrong: 'It lives in the same policy the team administers, so whoever can add the allow can also delete or outrank your deny.' },
        { id: 'c', text: 'Remove the team’s compute.securityAdmin role on that project entirely', whyWrong: 'That takes away all rule management, which is exactly the outcome the question rules out.' },
        { id: 'd', text: 'An org policy constraint forbidding any firewall rule that opens 0.0.0.0/0', whyWrong: 'Org policy governs resource configuration in supported services, and there is no constraint that expresses arbitrary firewall rule shapes.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.vpc.ip_planning',
    mode: 'drill',
    nodeIds: ['gcp.vpc', 'gcp.gke'],
    difficulty: 'deep',
    explanation:
      'GKE assigns pod addresses from a secondary range on the subnet, and it reserves a block of pod addresses per node rather than allocating one address per pod. A subnet sized for VMs runs out of pod space long before it runs out of node space. Address planning is one of the few landing zone decisions that is genuinely expensive to reverse, so it belongs in week one.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer standardized on /24 subnets everywhere. Their first GKE cluster fails to scale past a handful of nodes. What is the underlying cause?',
      choices: [
        { id: 'a', text: 'The primary range is too small for the number of nodes they want', whyWrong: 'Nodes take one address each. A /24 holds plenty of nodes: the pressure is on the pod range.' },
        { id: 'b', text: 'Pods draw from a secondary range and each node reserves a block' },
        { id: 'c', text: 'Kubernetes Services need public addresses the subnet cannot supply', whyWrong: 'Services use the cluster’s service range or a load balancer address, not one subnet address per service.' },
        { id: 'd', text: 'GKE requires its own dedicated VPC network for every cluster created', whyWrong: 'Many clusters share a VPC routinely. The constraint is address space, not network count.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Private Service Connect ──────────────────────────────────────────────
  {
    id: 'g2.psc.flavors',
    mode: 'drill',
    nodeIds: ['gcp.psc', 'gcp.vpc'],
    difficulty: 'deep',
    explanation:
      'Private Service Connect is a family, not one feature, and customers say "PSC" while meaning any of them. Naming the right variant early saves a redesign: the endpoint models differ in who initiates, what gets published and whether a load balancer is in the path.',
    citations: cite('psc'),
    payload: {
      kind: 'match',
      stem: 'Match each private connectivity option to what it does.',
      pairs: [
        { left: 'PSC endpoint for Google APIs', right: 'A private IP inside your VPC that fronts Google API endpoints' },
        { left: 'PSC endpoint for a published service', right: 'A private IP fronting another org’s service attachment' },
        { left: 'PSC backend', right: 'Lets your own load balancer route to a producer’s published service' },
        { left: 'Private services access', right: 'The older peered-range model that managed services like Cloud SQL historically used' },
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.psc.nat_subnet',
    mode: 'drill',
    nodeIds: ['gcp.psc'],
    difficulty: 'edge',
    explanation:
      'A service attachment needs a dedicated NAT subnet in the producer VPC, and consumer connections draw addresses from it. Size it for the fleet you expect, because when it fills, new consumers simply fail to connect while every existing one keeps working, which makes it look like a consumer-side problem. This is the most common operational surprise for teams publishing a service to many customers.',
    citations: cite('psc'),
    payload: {
      kind: 'mcq',
      stem: 'You publish a service over Private Service Connect. Existing consumers are healthy, but new consumer endpoints have started failing to connect. Where do you look first?',
      choices: [
        { id: 'a', text: 'The consumer-side firewall rules governing the endpoint subnet', whyWrong: 'Possible for one consumer, but a failure that hits every new consumer while existing ones stay healthy points at shared producer-side state.' },
        { id: 'b', text: 'The load balancer’s backend health checks behind the attachment', whyWrong: 'Unhealthy backends would break existing consumers too. The symptom is specifically about new connections.' },
        { id: 'c', text: 'The producer-side NAT subnet for the attachment, which can exhaust' },
        { id: 'd', text: 'DNS propagation for the endpoint name in the consumer’s private zone', whyWrong: 'A DNS problem produces a name resolution failure on the consumer side, and it would not correlate with the number of consumers already attached.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.psc.unidirectional',
    mode: 'drill',
    nodeIds: ['gcp.psc'],
    difficulty: 'core',
    explanation:
      'A PSC endpoint carries traffic one way: consumer to producer. If the producer also needs to call back into the consumer, for example to post a webhook, that is a second connection in the opposite direction with its own service attachment, and it needs its own security review. Teams that assume PSC is a bidirectional tunnel discover this after the design has shipped.',
    citations: cite('psc'),
    payload: {
      kind: 'mcq',
      stem: 'Your service is consumed over PSC. Now it must post completion webhooks back into the consumer’s VPC. What is the correct design?',
      choices: [
        { id: 'a', text: 'Reuse the existing consumer endpoint in the reverse direction', whyWrong: 'The connection has a fixed direction. There is no reverse channel on a consumer endpoint.' },
        { id: 'b', text: 'Call the consumer over the public internet using mutual TLS', whyWrong: 'It works, but you just reintroduced the public path the customer adopted PSC to remove, and their egress review will bounce it.' },
        { id: 'c', text: 'Set up VPC peering between producer and consumer for the callback', whyWrong: 'Peering exposes both address spaces to each other and requires non-overlapping ranges across two organizations, which is precisely what PSC was designed to avoid.' },
        { id: 'd', text: 'The consumer publishes their receiver as a service attachment you connect to' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.psc.cloudsql_migration',
    mode: 'drill',
    nodeIds: ['gcp.psc', 'gcp.alloydb'],
    difficulty: 'deep',
    explanation:
      'Private services access reaches managed databases over VPC peering, which means it consumes an allocated range and inherits peering’s non-transitivity: an on-prem network or a second peered VPC cannot reach the instance without extra hops. PSC-based instances expose an endpoint in the consumer VPC instead, which removes both problems. It is the standard migration when a customer outgrows the peered model.',
    citations: cite('psc'),
    payload: {
      kind: 'mcq',
      stem: 'A customer’s Cloud SQL instances use private services access. A newly peered analytics VPC cannot reach them, and their allocated range is nearly full. What do you recommend?',
      choices: [
        { id: 'a', text: 'Move to PSC-based instances so each consumer VPC gets its own endpoint' },
        { id: 'b', text: 'Peer the analytics VPC directly to the managed service producer network', whyWrong: 'You do not own or control the producer network, and peerings to it are managed by the service, not by you.' },
        { id: 'c', text: 'Enlarge the allocated range and export custom routes over the peering', whyWrong: 'Range size was only half the problem. Peering still does not forward traffic from a network peered to your peer.' },
        { id: 'd', text: 'Stand up a TCP proxy in the original VPC for the analytics VPC to use', whyWrong: 'A workable stopgap, but you now own a proxy fleet, its availability and its audit story, to avoid a supported connectivity model.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── VPC Service Controls ─────────────────────────────────────────────────
  {
    id: 'g2.vpcsc.dry_run',
    mode: 'drill',
    nodeIds: ['gcp.vpcsc'],
    difficulty: 'core',
    explanation:
      'A perimeter denies calls it does not recognize, and no architecture diagram lists every call a mature estate actually makes. Dry-run mode logs what would have been blocked without blocking it, so the rules get written from observed traffic instead of from guesses. The full business cycle matters: month-end exports and quarterly jobs are exactly the traffic a two-week observation window misses.',
    citations: cite('vpcsc'),
    payload: {
      kind: 'order',
      stem: 'Order a VPC Service Controls rollout that does not take production down.',
      steps: [
        'Inventory the projects, services and known cross-boundary integrations that will sit inside the perimeter',
        'Create the perimeter in dry-run mode so violations are logged rather than blocked',
        'Observe through a full business cycle, month-end jobs included, and collect the would-be violations',
        'Write ingress rules, egress rules and access levels from the observed traffic rather than the diagram',
        'Enforce the perimeter, and keep a dry-run configuration ahead of it for every later change',
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.vpcsc.bridge',
    mode: 'drill',
    nodeIds: ['gcp.vpcsc'],
    difficulty: 'deep',
    explanation:
      'A perimeter has four ways to let something through and they are not interchangeable. Reaching for an access level when the requirement is an egress path, or merging two perimeters when a bridge would do, are the two mistakes that quietly widen a control far past what anyone asked for. A project belongs to exactly one regular perimeter, which is why the bridge exists at all.',
    citations: cite('vpcsc'),
    payload: {
      kind: 'match',
      stem: 'Match each VPC Service Controls mechanism to what it authorizes.',
      pairs: [
        { left: 'Access level', right: 'A caller outside the perimeter whose network origin or device posture meets a condition' },
        { left: 'Ingress rule', right: 'A named identity calling into the perimeter for specific services and resources' },
        { left: 'Egress rule', right: 'A workload inside the perimeter reaching a named resource outside it' },
        { left: 'Perimeter bridge', right: 'Projects in two separate perimeters reaching each other, without merging the perimeters' },
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.vpcsc.overclaim',
    mode: 'drill',
    nodeIds: ['gcp.vpcsc'],
    difficulty: 'deep',
    explanation:
      'A perimeter constrains which API calls succeed based on where the caller is and who they are. It does not inspect content, does not restrict what moves between projects inside the perimeter, and does not cover services it has no support for. When a CISO says the perimeter means data cannot leave, correcting the claim early is cheaper than having an auditor correct it later.',
    citations: cite('vpcsc'),
    payload: {
      kind: 'mcq',
      stem: 'A CISO summarizes your design as "the perimeter means our data physically cannot leave". What is the correction worth making in the room?',
      choices: [
        { id: 'a', text: 'Correct, provided every service in use sits inside the perimeter', whyWrong: 'Even then it is not true. Copying between two in-perimeter projects is unrestricted, and that is a real insider path.' },
        { id: 'b', text: 'It blocks API access by context and identity; it inspects no content' },
        { id: 'c', text: 'Correct, because the perimeter also encrypts the data while in transit', whyWrong: 'Transit encryption is unrelated and already happens. Attributing it to the perimeter muddles the control story.' },
        { id: 'd', text: 'Wrong, because perimeters only ever apply to Cloud Storage buckets', whyWrong: 'They cover a broad and growing list of services. The real caveat is that the list is not universal, not that it is one service.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.vpcsc.limits',
    mode: 'drill',
    nodeIds: ['gcp.vpcsc'],
    difficulty: 'edge',
    explanation:
      'The gaps in a perimeter are as important to know as the guarantees. Support is per service, so an unsupported API called from inside is unprotected; the perimeter is an API-layer control, so it says nothing about what a VM does with data once it holds it; and rules keyed on identity are only as good as the identity hygiene underneath them.',
    citations: cite('vpcsc'),
    payload: {
      kind: 'multi',
      stem: 'Which of these are genuine limits of VPC Service Controls that you should raise unprompted in a security review? Select all that apply.',
      choices: [
        { id: 'a', text: 'Protection is per service: an API without VPC Service Controls support is not covered by the perimeter' },
        { id: 'b', text: 'Movement of data between projects inside the same perimeter is not restricted' },
        { id: 'c', text: 'It is an API-layer control and does not inspect payloads for sensitive content' },
        { id: 'd', text: 'It cannot restrict access based on the caller’s network origin', whyWrong: 'Network origin is one of its core inputs, through access levels. That is a strength, not a limit.' },
        { id: 'e', text: 'It stops working once a project is added to a second perimeter', whyWrong: 'A project cannot be in two regular perimeters at once, so the situation does not arise.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.vpcsc.ci_break',
    mode: 'drill',
    nodeIds: ['gcp.vpcsc', 'gcp.landing_zone'],
    difficulty: 'core',
    explanation:
      'CI is the first thing a new perimeter breaks, because build runners live outside it and terraform reads state and resources inside it. The fix is a narrow ingress rule scoped to the deploy identity and the specific services, paired with an access level for the runner’s context, rather than widening the perimeter to whatever makes the pipeline green.',
    citations: cite('vpcsc'),
    payload: {
      kind: 'mcq',
      stem: 'The morning after a perimeter goes enforced, Terraform pipelines fail reading remote state and planning resources. What is the right remedy?',
      choices: [
        { id: 'a', text: 'An access level admitting the CI provider’s published egress IP ranges', whyWrong: 'Those ranges are shared by every customer of that CI provider, so you have admitted a very large population, not your pipeline.' },
        { id: 'b', text: 'Remove the Terraform state bucket’s project from the perimeter', whyWrong: 'Terraform state describes the entire estate. It is one of the last things you want outside the perimeter.' },
        { id: 'c', text: 'An ingress rule scoped to the deploy service account and its services' },
        { id: 'd', text: 'Run the pipeline as a user account that holds a perimeter exemption', whyWrong: 'Automation running as a human breaks attribution and leaves the pipeline dead whenever that person changes roles.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Hybrid connectivity ──────────────────────────────────────────────────
  {
    id: 'g2.interconnect.peering_confusion',
    mode: 'drill',
    nodeIds: ['gcp.interconnect'],
    difficulty: 'intro',
    explanation:
      'Direct and Carrier Peering connect your network to Google’s public edge: they improve the path to public Google services but give you no reach into your VPC’s internal addresses and carry no availability SLA. Interconnect and Cloud VPN are the products that extend your private address space. Customers conflate the two constantly because both involve a cross-connect at a colocation facility.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer already has Direct Peering with Google and asks whether that covers their private connectivity requirement to reach VMs by internal IP. What do you tell them?',
      choices: [
        { id: 'a', text: 'It does, once Private Google Access is enabled on those subnets', whyWrong: 'Private Google Access is about VMs reaching Google APIs outbound. It does not make VPC internal addresses reachable from on-prem.' },
        { id: 'b', text: 'It does, after adding a Cloud Router to advertise the subnets over BGP', whyWrong: 'Cloud Router runs BGP over VPN or Interconnect attachments. There is nothing for it to attach to on a peering link.' },
        { id: 'c', text: 'It does, but only for resources in the same region as the peering point', whyWrong: 'Regionality is not the issue. Peering simply does not carry traffic to RFC 1918 addresses inside a VPC.' },
        { id: 'd', text: 'No: peering reaches Google public services, not VPC internal addresses' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.interconnect.redundancy',
    mode: 'drill',
    nodeIds: ['gcp.interconnect'],
    difficulty: 'core',
    explanation:
      'A single Interconnect link carries no availability commitment no matter how much bandwidth it has. Availability comes from topology: redundant links terminating in separate edge availability domains for the standard tier, and links spread across two metros for the highest tier. Customers who bought one circuit and expected an SLA need this conversation before their first maintenance window, not during it.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer bought a single 10 Gbps Dedicated Interconnect and asks what availability commitment they now have. What is the accurate answer?',
      choices: [
        { id: 'a', text: 'None: a commitment needs redundant links in separate edge availability domains' },
        { id: 'b', text: 'The standard tier applies automatically to any Dedicated Interconnect', whyWrong: 'Bandwidth and product type do not create redundancy. A single circuit has a single failure domain.' },
        { id: 'c', text: 'It depends on whether they also run a Cloud VPN as a failover path', whyWrong: 'A VPN backup is genuinely good practice for graceful degradation, but it does not confer the Interconnect availability commitment.' },
        { id: 'd', text: 'The commitment applies once the VLAN attachments sit in two regions', whyWrong: 'Attachment region is not the redundancy axis. Edge availability domain, and then metro, is.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.interconnect.throughput',
    mode: 'drill',
    nodeIds: ['gcp.interconnect'],
    difficulty: 'deep',
    explanation:
      'HA VPN tunnels have a per-tunnel throughput ceiling, so scaling past it means many tunnels with ECMP across them, plus the CPU cost of encryption on the on-prem side. Beyond a few gigabits sustained that stops being a network design and starts being an ops burden, and Interconnect becomes both cheaper per bit and simpler to reason about.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer needs roughly 15 Gbps of sustained hybrid throughput for a data migration that then settles into steady replication. They already have HA VPN. What do you recommend?',
      choices: [
        { id: 'a', text: 'Add a second HA VPN gateway and split traffic by application', whyWrong: 'Manual traffic splitting is brittle and still leaves you scaling tunnel count as volume grows. It postpones the decision.' },
        { id: 'b', text: 'Move to Interconnect: per-tunnel VPN throughput is capped' },
        { id: 'c', text: 'Keep HA VPN and raise the MTU on the tunnels to cut overhead', whyWrong: 'MTU tuning shaves overhead at the margin. It does not move a link past its throughput ceiling by an order of magnitude.' },
        { id: 'd', text: 'Push the bulk migration over the public internet with signed URLs', whyWrong: 'Defensible for a one-off bulk load, but the question includes ongoing replication, and the customer would still be capped afterward.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.interconnect.custom_routes',
    mode: 'drill',
    nodeIds: ['gcp.interconnect', 'gcp.vpc'],
    difficulty: 'deep',
    explanation:
      'Cloud Router advertises the VPC’s own subnet ranges by default and nothing else. Ranges that arrive by peering, including the allocated range used by private services access for managed databases, are not advertised unless you add a custom route advertisement. The symptom is precise and confusing: VMs are reachable from on-prem, the managed database is not.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'Over a working Interconnect, on-prem hosts can reach VMs but time out connecting to a Cloud SQL instance on private services access. What is the fix?',
      choices: [
        { id: 'a', text: 'Add a firewall rule allowing the on-prem range to the database port', whyWrong: 'Firewall rules only matter once packets have a route. A timeout with no route is not a firewall symptom.' },
        { id: 'b', text: 'Give the instance a public IP and restrict it by authorized networks', whyWrong: 'It restores connectivity by abandoning the private-only posture the Interconnect exists to provide.' },
        { id: 'c', text: 'Add a custom route advertisement for the allocated range on Cloud Router' },
        { id: 'd', text: 'Recreate the Interconnect VLAN attachment in the same region as the instance', whyWrong: 'Attachment region affects path and cost, not whether a peered range is advertised at all.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.interconnect.onprem_apis',
    mode: 'drill',
    nodeIds: ['gcp.interconnect', 'gcp.vpc'],
    difficulty: 'deep',
    explanation:
      'Reaching Google APIs privately from on-prem is a three-part job: on-prem DNS must resolve googleapis.com to the chosen private endpoint range, the Cloud Router must advertise that range over the attachment, and routes must exist on the on-prem side to send it into the tunnel. Teams usually configure one of the three and then debug the other two under time pressure.',
    citations: cite('waf'),
    payload: {
      kind: 'multi',
      stem: 'On-prem hosts must reach BigQuery over Interconnect without traversing the internet. What has to be true? Select all that apply.',
      choices: [
        { id: 'a', text: 'On-prem DNS resolves the Google API name to the private or restricted endpoint range' },
        { id: 'b', text: 'The Cloud Router advertises that endpoint range to on-prem via a custom route advertisement' },
        { id: 'c', text: 'On-prem routing sends that range over the Interconnect rather than to the internet' },
        { id: 'd', text: 'Every on-prem host holds a service account key for BigQuery', whyWrong: 'Authentication is a separate concern and keys are the wrong answer to it. Use Workload Identity Federation for on-prem workloads.' },
        { id: 'e', text: 'The BigQuery dataset is recreated in a region adjacent to the Interconnect metro', whyWrong: 'Dataset region affects latency and cost, not whether the private path resolves and routes.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Landing zones ────────────────────────────────────────────────────────
  {
    id: 'g2.landing_zone.sequence',
    mode: 'drill',
    nodeIds: ['gcp.landing_zone', 'gcp.hierarchy'],
    difficulty: 'core',
    explanation:
      'Landing zone work has a dependency order, and skipping ahead is what produces the estates you later have to unpick. Identity has to exist before you can grant anything to a group, guardrails should be observed in dry run before they are enforced, and the first workload project should arrive through the pipeline rather than by hand so the pipeline is proven on something that matters.',
    citations: cite('waf'),
    payload: {
      kind: 'order',
      stem: 'Put the landing zone build in the order that avoids rework.',
      steps: [
        'Agree the resource hierarchy, naming and environment model',
        'Stand up identity: the directory, SSO and the groups roles will bind to',
        'Apply org-level guardrails in dry run and read what they would have blocked',
        'Build shared networking: host project, address plan and hybrid connectivity',
        'Wire org-level logging, billing export and Security Command Center',
        'Onboard the first workload project through the automated pipeline, not by hand',
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.landing_zone.blueprint_fork',
    mode: 'drill',
    nodeIds: ['gcp.landing_zone'],
    difficulty: 'deep',
    explanation:
      'Foundation blueprints encode a lot of hard-won structure, and starting from one beats starting from an empty directory. The failure mode is a two-person platform team inheriting several thousand lines of Terraform they did not write and cannot confidently change, so the honest move is to adopt the parts that match the customer’s actual requirements and delete the rest before go-live, while the team still remembers why.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A two-person platform team wants to fork the enterprise foundation blueprint wholesale. What is the advice that serves them?',
      choices: [
        { id: 'a', text: 'Fork it unchanged so that future upstream upgrades stay a clean merge', whyWrong: 'Nobody keeps a foundation unchanged past month two, and unread code you cannot modify is worse than less code you understand.' },
        { id: 'b', text: 'Write everything from scratch so the team owns every line of it', whyWrong: 'This spends months rediscovering the hierarchy, logging and network patterns the blueprint already got right.' },
        { id: 'c', text: 'Use the blueprint for networking only and click-ops the remainder', whyWrong: 'Split ownership between code and console is how drift starts, and the console half is the half nobody can reproduce after an incident.' },
        { id: 'd', text: 'Keep only the modules matching real requirements, delete the rest' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.landing_zone.project_factory',
    mode: 'drill',
    nodeIds: ['gcp.landing_zone'],
    difficulty: 'core',
    explanation:
      'When teams wait two weeks for a project, the bottleneck is not approval, it is that every project is assembled by hand. A project factory turns the request into a pipeline and the queue disappears because humans stop being in the assembly path. The consistency matters as much as the speed: hand-built projects each drift differently, and the remediation bill arrives a year later.',
    citations: cite('waf'),
    payload: {
      kind: 'multi',
      stem: 'Product teams wait two weeks for a new project and the platform team says they are overloaded. What should the automated project factory own? Select all that apply.',
      choices: [
        { id: 'a', text: 'Creating the project and linking it to the correct billing account' },
        { id: 'b', text: 'Applying baseline IAM by binding roles to groups rather than to individuals' },
        { id: 'c', text: 'Attaching the project to the Shared VPC and enabling the standard log sinks and APIs' },
        { id: 'd', text: 'Granting the requesting team Owner so they can finish setup themselves', whyWrong: 'That hands out the permission set the baseline exists to constrain, and every project then drifts in its own direction.' },
        { id: 'e', text: 'Maintaining a pool of pre-created empty projects for teams to claim', whyWrong: 'A queue of blank projects still needs per-team configuration, and it makes naming, labeling and ownership harder to reason about.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.landing_zone.aggregated_sink',
    mode: 'drill',
    nodeIds: ['gcp.landing_zone', 'gcp.observability'],
    difficulty: 'core',
    explanation:
      'A project-level log sink is administered by whoever administers the project, which means the person whose actions you are logging can also delete the sink. An aggregated sink at the organization or folder with child inclusion writes to a destination outside their control, so the evidence survives the incident. This is one of the few controls an auditor will specifically test.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'Compliance asks how you guarantee that a project admin cannot suppress their own audit trail. What do you point at?',
      choices: [
        { id: 'a', text: 'An aggregated sink at the org or folder, writing outside their control' },
        { id: 'b', text: 'A log sink in each project routing into one central logging bucket', whyWrong: 'The sink lives in the project, so the same admin can delete or filter it. The destination being central does not help.' },
        { id: 'c', text: 'Much longer retention configured on the _Default log bucket in each project', whyWrong: 'Retention preserves what arrives. It does nothing about someone stopping the arrival or excluding entries.' },
        { id: 'd', text: 'Removing the Logging Admin role from every project administrator', whyWrong: 'Reasonable hygiene, but Owner and several other roles still carry the permissions, so it is not a guarantee.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Compute choice ───────────────────────────────────────────────────────
  {
    id: 'g2.compute.jobs_vs_batch',
    mode: 'drill',
    nodeIds: ['gcp.compute_choice'],
    difficulty: 'core',
    explanation:
      'Cloud Run services are request-scoped and bounded by a request timeout, which makes them the wrong shape for work that runs for hours. Cloud Run jobs are the run-to-completion form of the same platform. Batch is for fleets of tasks needing specific machine shapes or accelerators, and a StatefulSet is what you use when the work needs stable identity and attached storage. Getting this mapping wrong usually shows up as a scheduler hack around a timeout.',
    citations: cite('cloudRun'),
    payload: {
      kind: 'match',
      stem: 'Match each unit of work to the compute shape that fits how it executes.',
      pairs: [
        { left: 'A six-hour nightly container that runs once and exits', right: 'A Cloud Run job' },
        { left: 'An HTTP API with spiky traffic and short requests', right: 'A Cloud Run service' },
        { left: 'Thousands of parallel tasks needing specific machine shapes or accelerators', right: 'Batch' },
        { left: 'A long-lived consumer needing stable identity and attached storage', right: 'A GKE StatefulSet' },
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.compute.cold_start',
    mode: 'drill',
    nodeIds: ['gcp.compute_choice'],
    difficulty: 'core',
    explanation:
      'Tail latency on a scale-to-zero service is dominated by container start plus application initialization, so the only structural fixes are keeping instances warm and making startup cheaper. Minimum instances trade an always-on cost for a predictable p99, and startup CPU boost helps initialization-heavy runtimes. The scheduled ping is the folk remedy: it warms one instance and leaves the rest of the fleet cold.',
    citations: cite('cloudRun'),
    payload: {
      kind: 'multi',
      stem: 'A Cloud Run service shows p99 spikes after idle periods while p50 is fine. Which changes meaningfully reduce cold-start impact? Select all that apply.',
      choices: [
        { id: 'a', text: 'Set a minimum instance count so the service does not scale to zero' },
        { id: 'b', text: 'Move initialization work out of the request path and reduce what the container loads at startup' },
        { id: 'c', text: 'Enable startup CPU boost so initialization gets more CPU than steady state' },
        { id: 'd', text: 'Raise maximum concurrency per instance', whyWrong: 'Fewer, busier instances usually means more requests land on a cold one. This tends to make tail latency worse.' },
        { id: 'e', text: 'Have Cloud Scheduler ping the service every minute', whyWrong: 'It warms whichever single instance answers. Real traffic arriving in parallel still starts cold instances.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.compute.functions_today',
    mode: 'drill',
    nodeIds: ['gcp.compute_choice'],
    difficulty: 'intro',
    explanation:
      'Cloud Run functions is the current shape of the functions product: it runs on the Cloud Run platform, so scaling, concurrency, networking and IAM behave the same way. The real question is no longer which platform but which packaging model you want, source-based with a handler signature or a container you build yourself, and how much per-instance concurrency the workload can use.',
    citations: cite('cloudRun'),
    payload: {
      kind: 'mcq',
      stem: 'A team asks whether to build a new event handler on Cloud Run or on functions. What is the useful framing today?',
      choices: [
        { id: 'a', text: 'Functions for event triggers, Cloud Run for HTTP-facing services', whyWrong: 'Cloud Run handles events through Eventarc and Pub/Sub push perfectly well. The trigger type is not the dividing line.' },
        { id: 'b', text: 'They share the Cloud Run platform, so decide on packaging and concurrency' },
        { id: 'c', text: 'Functions is cheaper, since only functions scales to zero when idle', whyWrong: 'Cloud Run scales to zero by default. Both bill on what they actually run.' },
        { id: 'd', text: 'Functions for anything under a few hundred lines of handler code', whyWrong: 'Line count is not an architectural property. Concurrency, dependency control and build reproducibility are.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.compute.stateful',
    mode: 'drill',
    nodeIds: ['gcp.compute_choice', 'gcp.gke'],
    difficulty: 'deep',
    explanation:
      'The instinct that in-memory shared state forces you onto Kubernetes is usually a design smell rather than a platform requirement. On any autoscaling platform an instance can vanish at any moment, so shared fan-out state belongs in a store both instances can reach. If the state genuinely cannot be externalized, that is when a StatefulSet with stable identity and attached storage earns its complexity.',
    citations: cite('cloudRun'),
    payload: {
      kind: 'mcq',
      stem: 'A team says they need GKE because their websocket fan-out service keeps subscriber state in memory and Cloud Run "cannot do stateful". How do you steer the conversation?',
      choices: [
        { id: 'a', text: 'Agree and move to GKE, since pods keep their memory across restarts', whyWrong: 'They do not. A rescheduled pod loses memory exactly like a recycled Cloud Run instance.' },
        { id: 'b', text: 'Use Cloud Run session affinity so a client always hits one instance', whyWrong: 'Affinity is best-effort and does not survive instance replacement, so it hides the problem until a deploy.' },
        { id: 'c', text: 'Move fan-out state to a shared store; any instance can disappear' },
        { id: 'd', text: 'Pin the service with minimum and maximum instances both set to one', whyWrong: 'You have built a single point of failure with no horizontal headroom, and it still restarts on deploy.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── GKE ──────────────────────────────────────────────────────────────────
  {
    id: 'g2.gke.hpa_vpa',
    mode: 'drill',
    nodeIds: ['gcp.gke'],
    difficulty: 'deep',
    explanation:
      'Horizontal and vertical autoscaling on the same signal fight each other: VPA raises the request, which lowers measured utilization, which makes HPA scale in, which raises utilization again. The workable combinations are HPA on CPU with VPA off, HPA on a custom or external metric with VPA managing requests, or VPA alone for workloads that scale by size rather than count.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A team enables HPA on CPU utilization and VPA in auto mode on the same Deployment. Replica count starts oscillating. What is happening?',
      choices: [
        { id: 'a', text: 'The cluster autoscaler is thrashing node pools underneath the pods', whyWrong: 'Node churn follows pod count. Here the pod count itself is unstable, so the cause is above the node layer.' },
        { id: 'b', text: 'The HPA stabilization window is set too long for this workload', whyWrong: 'A longer window damps oscillation. The problem is a feedback loop between two controllers, not the damping setting.' },
        { id: 'c', text: 'CPU limits are missing, so throttling behavior is inconsistent', whyWrong: 'Missing limits affect throttling behavior, not the arithmetic HPA uses, which is measured usage over the request.' },
        { id: 'd', text: 'VPA changes the CPU request HPA measures utilization against' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.gke.pdb_upgrade',
    mode: 'drill',
    nodeIds: ['gcp.gke'],
    difficulty: 'core',
    explanation:
      'Node upgrades drain nodes, and a drain respects PodDisruptionBudgets. Without a budget every replica can be evicted at once; with a badly written one allowing zero disruptions, the upgrade stalls instead. The answer to a bad upgrade is never to disable auto-upgrade, it is to make eviction safe, which is a handful of settings applied in the right order.',
    citations: cite('waf'),
    payload: {
      kind: 'order',
      stem: 'A GKE auto-upgrade took a service offline and the team wants to disable upgrades. Order the work that makes upgrades boring instead.',
      steps: [
        'Define PodDisruptionBudgets that keep a minimum number of replicas available during eviction',
        'Spread replicas across nodes and zones so one node is never all of a service',
        'Set a maintenance window, with exclusions around known business-critical periods',
        'Configure surge upgrades so replacement nodes come up before old ones drain',
        'Upgrade the control plane, then roll node pools one at a time, watching for drains blocked by a budget',
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.gke.private_control_plane',
    mode: 'drill',
    nodeIds: ['gcp.gke', 'gcp.vpc'],
    difficulty: 'edge',
    explanation:
      'A private cluster puts the control plane endpoint on a private address, so anything outside the VPC and its authorized networks cannot call the API server, including your CI. The clean answers are the Connect gateway, which brokers access through Google without opening the endpoint, or a runner inside the VPC. Adding the CI provider’s public ranges to authorized networks admits every tenant of that provider, which is not what anyone intended.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'After moving to a private GKE cluster, the hosted CI system can no longer run kubectl apply. What is the right fix?',
      choices: [
        { id: 'a', text: 'Deploy through the Connect gateway, or move the runner into the VPC' },
        { id: 'b', text: 'Add the CI provider’s published egress ranges to authorized networks', whyWrong: 'Those ranges are shared across that provider’s entire customer base, so you have authorized a very large and anonymous population.' },
        { id: 'c', text: 'Re-enable the public endpoint but require a strong kubeconfig token', whyWrong: 'It puts the API server back on the internet, which is the exact posture the private cluster was adopted to remove.' },
        { id: 'd', text: 'Grant the CI service account cluster-admin on the private cluster', whyWrong: 'Permissions do not create network reachability. The call still cannot reach a private address.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.gke.autopilot_limits',
    mode: 'drill',
    nodeIds: ['gcp.gke'],
    difficulty: 'deep',
    explanation:
      'Autopilot manages the nodes, which means it also constrains what pods may do to them: privileged containers, host namespaces and arbitrary node mutation are restricted. That is exactly why it is safe, and exactly why some third-party security and observability agents that expect a privileged DaemonSet will not install. Check the agent vendor’s Autopilot support before committing, because this surfaces late otherwise.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer standardized on Autopilot. Their mandated endpoint security vendor ships a privileged DaemonSet that needs host mount access. What is the accurate advice?',
      choices: [
        { id: 'a', text: 'Grant the DaemonSet a permissive PodSecurity label on its own namespace', whyWrong: 'Autopilot enforces its restrictions at the platform level. A namespace label does not unlock host access.' },
        { id: 'b', text: 'Autopilot restricts host access, so use a supported build or Standard' },
        { id: 'c', text: 'Run the security agent as a sidecar in every pod on the cluster', whyWrong: 'A sidecar cannot see host-level activity, so it does not deliver the control the mandate asks for.' },
        { id: 'd', text: 'Create a node pool that uses a custom node image for the agent', whyWrong: 'Autopilot does not expose node pools or node images for you to customize. That is the trade you accepted.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.gke.gateway',
    mode: 'drill',
    nodeIds: ['gcp.gke'],
    difficulty: 'core',
    explanation:
      'Gateway API is the successor to Ingress: routing lives in HTTPRoute resources that an application team owns, while the Gateway itself, with its addresses, certificates and policies, stays with the platform team. That split is the reason to migrate, more than any single feature, because Ingress forced both concerns into one annotation-heavy object.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A platform team wants app teams to manage their own HTTP routes without being able to change TLS certificates or the load balancer’s address. What do you use on GKE?',
      choices: [
        { id: 'a', text: 'Ingress with per-team namespaces and RBAC on the Ingress objects', whyWrong: 'Ingress bundles routing and load balancer configuration in one object, so an app team that can edit routes can usually edit the rest.' },
        { id: 'b', text: 'One Ingress and load balancer per team, isolated by namespace', whyWrong: 'It gets you isolation at the cost of an address, a certificate and a bill per team, plus a fragmented edge.' },
        { id: 'c', text: 'Gateway API: the platform owns the Gateway, app teams own HTTPRoutes' },
        { id: 'd', text: 'A service mesh with per-namespace VirtualService resources', whyWrong: 'A mesh governs east-west traffic policy. It does not by itself solve who may configure the external entry point.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.gke.node_pools',
    mode: 'drill',
    nodeIds: ['gcp.gke'],
    difficulty: 'intro',
    explanation:
      'Taints and tolerations are how you stop general workloads from landing on expensive or special-purpose nodes. Without a taint, the scheduler treats a GPU node as ordinary capacity and will happily place a stateless web pod there, leaving accelerators idle and billed. Node selectors alone attract the right pods but do nothing to repel the wrong ones.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A GPU node pool is running general web pods and the GPUs sit idle. What is missing?',
      choices: [
        { id: 'a', text: 'A node selector on the GPU workloads pointing at that node pool', whyWrong: 'A selector attracts GPU pods to those nodes but places no restriction on everything else, which is the actual problem.' },
        { id: 'b', text: 'Resource limits on the general web pods so they consume less', whyWrong: 'Limits bound consumption on whichever node the pod lands on. They do not influence placement.' },
        { id: 'c', text: 'A separate GKE cluster dedicated to the GPU workloads entirely', whyWrong: 'A second cluster is a heavy answer to a scheduling constraint that a taint expresses in two lines.' },
        { id: 'd', text: 'A taint on the GPU pool with a toleration on GPU workloads' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── BigQuery ─────────────────────────────────────────────────────────────
  {
    id: 'g2.bq.pruning_missed',
    mode: 'drill',
    nodeIds: ['gcp.bigquery'],
    difficulty: 'core',
    explanation:
      'Partition pruning only happens when the filter is on the partitioning column and is resolvable before the scan. Wrap the column in a function, compare it to an unresolvable subquery, or filter a correlated-but-different date column, and the query silently reads the whole table at full cost. Setting require_partition_filter turns that silent overspend into a loud error, which is why it belongs on every large table.',
    citations: cite('bqPartition'),
    payload: {
      kind: 'multi',
      stem: 'A table is partitioned by event_date but queries keep scanning the whole table. Which of these defeat partition pruning? Select all that apply.',
      choices: [
        { id: 'a', text: 'Wrapping the partition column in a function inside the WHERE clause' },
        { id: 'b', text: 'Filtering on a different date column that merely correlates with the partition column' },
        { id: 'c', text: 'Comparing the partition column to a subquery result the optimizer cannot resolve before the scan' },
        { id: 'd', text: 'Filtering with a literal date range directly on the partition column', whyWrong: 'That is the shape that prunes. It is what you are trying to get every query to look like.' },
        { id: 'e', text: 'Setting require_partition_filter on the table', whyWrong: 'That forces queries to carry a partition filter, so it protects pruning rather than defeating it.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.bq.storage_write',
    mode: 'drill',
    nodeIds: ['gcp.bigquery', 'gcp.pubsub'],
    difficulty: 'deep',
    explanation:
      'The Storage Write API is the current high-throughput ingestion path: it supports exactly-once semantics per stream through offsets, streams into a buffer that is queryable immediately, and costs less per row than the legacy streaming insert path. Teams still on legacy streaming inserts usually arrived there years ago and have been paying for it and deduplicating by hand ever since.',
    citations: cite('bqPartition'),
    payload: {
      kind: 'mcq',
      stem: 'A pipeline uses legacy streaming inserts into BigQuery, the bill is high, and downstream reports show duplicate rows after retries. What do you change?',
      choices: [
        { id: 'a', text: 'The Storage Write API with a stream using offsets for exactly-once' },
        { id: 'b', text: 'Add insertId values so the streaming inserts deduplicate on retry', whyWrong: 'Legacy best-effort deduplication is time-bounded and not a guarantee. It is the mechanism that is already failing them.' },
        { id: 'c', text: 'Batch the rows into hourly load jobs instead of streaming them', whyWrong: 'Load jobs are cheap and reliable but give up the freshness that motivated streaming in the first place. Only right if nobody needs sub-hour data.' },
        { id: 'd', text: 'Deduplicate downstream with a windowed ROW_NUMBER query at read time', whyWrong: 'You pay to store and scan the duplicates forever, and every consumer must remember to apply the pattern.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.bq.dashboard_layer',
    mode: 'drill',
    nodeIds: ['gcp.bigquery', 'gcp.billing'],
    difficulty: 'core',
    explanation:
      'Dashboards issue the same handful of aggregations thousands of times a day, so the fix is to compute them once. Materialized views refresh incrementally and are used automatically when a query matches, BI Engine caches hot data in memory for sub-second response, and result caching handles literally identical repeat queries for free. Reaching straight for more slots buys speed without removing the redundant work.',
    citations: cite('bqPartition'),
    payload: {
      kind: 'mcq',
      stem: 'A Looker dashboard refreshes for 300 users every fifteen minutes and dominates the BigQuery bill. Which change addresses the cause?',
      choices: [
        { id: 'a', text: 'Buy a larger slot reservation so the same queries all finish faster', whyWrong: 'It makes the same wasteful work finish faster at a higher committed cost. The redundant scanning is untouched.' },
        { id: 'b', text: 'Materialize the aggregations so each refresh reads a small result' },
        { id: 'c', text: 'Rely on BigQuery result caching across the dashboard’s refreshes', whyWrong: 'Caching only hits on identical queries, and dashboards parameterize by user, filter and time window, so most refreshes miss.' },
        { id: 'd', text: 'Cluster the base tables more aggressively on the filter columns', whyWrong: 'Clustering helps selective filters. A dashboard aggregating broad ranges still scans broadly.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.bq.fine_grained',
    mode: 'drill',
    nodeIds: ['gcp.bigquery', 'gcp.dataplex'],
    difficulty: 'core',
    explanation:
      'BigQuery has three separate mechanisms and picking the wrong one creates a maintenance problem. Policy tags from a taxonomy give column-level access enforced wherever the column appears, row access policies filter rows by a predicate on the caller, and authorized views or datasets let a consumer read a derived result without any access to the base table. Copying data into a redacted table is the answer that seems simplest and ages worst.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'Analysts need a customer table with the national ID column hidden, while the fraud team needs it. The table is written by an existing pipeline. What do you implement?',
      choices: [
        { id: 'a', text: 'A view that omits the column, with analysts granted only on the view', whyWrong: 'Workable, but it multiplies views for every combination and the base table is still one accidental grant away from exposure.' },
        { id: 'b', text: 'A second copy of the table without the column, refreshed nightly', whyWrong: 'Two copies drift, double the storage, and the sensitive column now exists in one more place for the auditor to track.' },
        { id: 'c', text: 'A policy tag on the column, with Fine-Grained Reader for fraud' },
        { id: 'd', text: 'A row access policy that filters out the sensitive customer records', whyWrong: 'Row policies filter rows, not columns. Every analyst still needs the full record, minus one field.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.bq.region_join',
    mode: 'drill',
    nodeIds: ['gcp.bigquery'],
    difficulty: 'core',
    explanation:
      'A BigQuery job runs in the location of the datasets it touches, and it cannot join a US dataset to an EU dataset. Getting them together means copying one side, which is a real cost, a real latency and, for regulated customers, a residency decision. This is worth catching in design rather than after a team has built a pipeline that will never run.',
    citations: cite('bqPartition'),
    payload: {
      kind: 'mcq',
      stem: 'A query joining a dataset in the US multi-region to one in europe-west1 fails. What is the correct response?',
      choices: [
        { id: 'a', text: 'Set the job location explicitly to US and run the query again', whyWrong: 'The job location must match the data. Naming a location does not relocate the EU dataset.' },
        { id: 'b', text: 'Create a federated external table pointing at the other region', whyWrong: 'External table location rules follow the same constraint. It does not create a cross-location join path.' },
        { id: 'c', text: 'Grant the job’s service account access in both of the projects', whyWrong: 'This is a location constraint, not a permission one. Full access in both places still fails.' },
        { id: 'd', text: 'Cross-location joins are unsupported: replicate one dataset deliberately' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.bq.not_oltp',
    mode: 'drill',
    nodeIds: ['gcp.bigquery', 'gcp.alloydb'],
    difficulty: 'intro',
    explanation:
      'BigQuery is an analytical engine: it is built for scanning large ranges, not for single-row reads and writes at request latency, and it has no notion of a row lock or a per-row transaction the way an OLTP database does. Serving an application’s reads from it produces latency and cost that both look wrong, and the fix is a transactional store in front with BigQuery downstream.',
    citations: cite('bqPartition'),
    payload: {
      kind: 'mcq',
      stem: 'A team proposes BigQuery as the primary store for their web application’s user profiles, read and updated on every request. What do you say?',
      choices: [
        { id: 'a', text: 'Serve from Cloud SQL, AlloyDB, Spanner or Firestore, stream to BigQuery' },
        { id: 'b', text: 'It works if they cluster the profile table on user_id for point lookups', whyWrong: 'Clustering reduces bytes scanned. It does not turn an analytical engine into a low-latency point-lookup store.' },
        { id: 'c', text: 'It works if they buy a slot reservation to fix query concurrency', whyWrong: 'Reservations fix concurrency and cost predictability, not the per-query latency floor of an analytical engine.' },
        { id: 'd', text: 'It works if profile updates are batched into an hourly load job', whyWrong: 'Batching the writes does not fix the per-request reads, and the application would be serving hour-old profiles.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── AlloyDB and Cloud SQL ────────────────────────────────────────────────
  {
    id: 'g2.alloydb.columnar',
    mode: 'drill',
    nodeIds: ['gcp.alloydb'],
    difficulty: 'core',
    explanation:
      'When analytical queries on a Postgres primary start hurting transactions, the usual answers are a read replica or a warehouse export. AlloyDB offers a third: a columnar engine that keeps a column-oriented copy of hot data in memory and lets the planner use it for scan-heavy queries, plus read pools that take the traffic off the primary. It is the shortest path when the customer wants faster reporting without a second data platform.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer’s reporting queries on their PostgreSQL primary have grown slow enough to affect transaction latency, but they do not want a separate warehouse yet. What do you propose?',
      choices: [
        { id: 'a', text: 'A Cloud SQL read replica dedicated entirely to the reporting queries', whyWrong: 'It removes the load from the primary but runs the same row-oriented plans, so the reports are no faster.' },
        { id: 'b', text: 'AlloyDB’s columnar engine plus a read pool for scan-heavy reports' },
        { id: 'c', text: 'A nightly export into BigQuery to carry all of the reporting work', whyWrong: 'A good long-term destination, but it is the second data platform the customer said they were not ready for, and it costs freshness.' },
        { id: 'd', text: 'Covering indexes designed for each individual reporting query', whyWrong: 'It helps a few queries and taxes every write. Ad hoc reporting outruns index design quickly.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.alloydb.connections',
    mode: 'drill',
    nodeIds: ['gcp.alloydb'],
    difficulty: 'core',
    explanation:
      'Postgres allocates a backend process per connection, so a few hundred idle connections cost real memory and the max_connections ceiling is a property of the engine rather than a sizing mistake. Autoscaled application tiers multiply connections by instance count, which is how a serverless front end takes down a database that was fine on VMs. A pooler in front is the structural fix.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A Cloud Run service scaled to 200 instances and the PostgreSQL database began rejecting connections. Each instance holds a small pool. What is the fix?',
      choices: [
        { id: 'a', text: 'Raise max_connections on the database instance to absorb the load', whyWrong: 'Each connection is a backend process with its own memory. Raising the ceiling moves the failure from rejections to memory pressure.' },
        { id: 'b', text: 'Lower the Cloud Run maximum instance count to cap connections', whyWrong: 'This caps the database problem by capping the application’s ability to serve traffic, which is not a fix.' },
        { id: 'c', text: 'Put a connection pooler between the application and the database' },
        { id: 'd', text: 'Add a read replica and send half of the query traffic to it', whyWrong: 'Read traffic can move, but writes and connection count from 200 instances still land on the primary.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.alloydb.dms',
    mode: 'drill',
    nodeIds: ['gcp.alloydb'],
    difficulty: 'deep',
    explanation:
      'Database Migration Service handles the continuous replication that makes a low-downtime cutover possible, but it moves data, not everything a database contains. Extensions, roles and grants, sequence positions and large objects need explicit handling, and the destination needs fresh statistics before it serves production traffic. Every migration that goes badly goes badly on one of those, not on the row copy.',
    citations: cite('waf'),
    payload: {
      kind: 'multi',
      stem: 'You are cutting a 4 TB self-managed PostgreSQL database over to Cloud SQL using Database Migration Service. What do you verify before cutover beyond row counts? Select all that apply.',
      choices: [
        { id: 'a', text: 'Required extensions exist and are supported on the destination version' },
        { id: 'b', text: 'Roles, grants and ownership are recreated, since they are not part of the data replication' },
        { id: 'c', text: 'Sequences are advanced past the highest existing key before writes are accepted' },
        { id: 'd', text: 'The destination has been given fresh statistics so the planner does not regress on day one' },
        { id: 'e', text: 'The source is upgraded to the same minor version as the destination first', whyWrong: 'Cross-version migration is supported within the documented pairs. Forcing a source upgrade adds an outage you did not need.' },
      ],
      correctIds: ['a', 'b', 'c', 'd'],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.alloydb.ha_reality',
    mode: 'drill',
    nodeIds: ['gcp.alloydb'],
    difficulty: 'intro',
    explanation:
      'Regional high availability keeps a synchronous standby in a second zone and promotes it automatically, which bounds the outage to tens of seconds rather than eliminating it. Every in-flight connection is dropped at failover, so the application must reconnect and retry idempotently. Customers who hear "HA" as "zero downtime" write no retry logic and then treat the failover as an incident.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer says enabling regional HA means their application will see no interruption if a zone fails. What do you correct?',
      choices: [
        { id: 'a', text: 'Correct, because the standby shares the same connection endpoint', whyWrong: 'A stable endpoint means clients do not need to change addresses. It does not keep the TCP sessions alive across a promotion.' },
        { id: 'b', text: 'Correct, provided the application uses the language connector', whyWrong: 'Connectors handle auth and encryption to the instance. They do not preserve in-flight transactions through a failover.' },
        { id: 'c', text: 'Wrong, because failover is manual and requires a support case', whyWrong: 'Regional HA failover is automatic. Overstating the pain is as unhelpful as understating it.' },
        { id: 'd', text: 'Failover takes tens of seconds and drops existing connections' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Spanner ──────────────────────────────────────────────────────────────
  {
    id: 'g2.spanner.hotspot',
    mode: 'drill',
    nodeIds: ['gcp.spanner'],
    difficulty: 'intro',
    explanation:
      'Spanner splits data by key range, so a monotonically increasing leading key sends every insert to the last split and pins throughput to one server no matter how much capacity you buy. Scattering the leading component spreads writes across splits. Teams migrating from a single-node database bring auto-increment keys with them and meet this in their first load test, then try to buy their way out of it.',
    citations: cite('waf'),
    payload: {
      kind: 'multi',
      stem: 'Which leading primary key components avoid write hotspots in Spanner? Select all that apply.',
      choices: [
        { id: 'a', text: 'A randomly generated UUID' },
        { id: 'b', text: 'A bit-reversed sequence value' },
        { id: 'c', text: 'A hash of a natural key' },
        { id: 'd', text: 'A monotonically increasing integer id', whyWrong: 'Every insert lands on the split holding the highest key, so throughput is pinned to one server regardless of provisioned capacity.' },
        { id: 'e', text: 'The insert timestamp', whyWrong: 'Timestamps increase monotonically, so this is the same hotspot wearing a different data type.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.spanner.interleave',
    mode: 'drill',
    nodeIds: ['gcp.spanner'],
    difficulty: 'deep',
    explanation:
      'Interleaving stores child rows physically next to their parent, so fetching an order with its line items is one local read instead of a distributed join, and the whole tree can be deleted atomically. The cost is rigidity: the child inherits the parent key prefix, the relationship cannot be changed later without a rewrite, and a parent with an unbounded number of children creates an oversized row group.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'When is interleaving a child table in Spanner the wrong call?',
      choices: [
        { id: 'a', text: 'When child count per parent is unbounded, or children are queried alone' },
        { id: 'b', text: 'When the tables are large, since interleaving suits small tables', whyWrong: 'Size is not the criterion. Locality of access is, and interleaving is used on very large tables routinely.' },
        { id: 'c', text: 'When the child table needs secondary indexes of its own', whyWrong: 'Interleaved tables can carry their own indexes, including interleaved indexes.' },
        { id: 'd', text: 'When parent and child rows are written by different services', whyWrong: 'Write ownership is an organizational concern. The physical layout question is about how the rows are read together.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.spanner.stale_reads',
    mode: 'drill',
    nodeIds: ['gcp.spanner', 'gcp.observability'],
    difficulty: 'edge',
    explanation:
      'Strong reads must confirm they have seen every committed write, which costs a round trip and can involve the leader. A read-only transaction with bounded or exact staleness can be served locally from a replica without locks, which both cuts latency and stops read traffic from interfering with writes. Dashboards and reports almost never need a strong read, and saying so is one of the highest-leverage Spanner tuning moves.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'Reporting queries against Spanner are adding latency to the transactional path. The reports tolerate data a few seconds old. What do you change?',
      choices: [
        { id: 'a', text: 'Move the reports onto a read replica in a different region', whyWrong: 'Spanner replicas are not addressable as a separate read endpoint the way a Postgres replica is. Staleness is how you choose where a read may be served.' },
        { id: 'b', text: 'Run them as read-only transactions with bounded staleness' },
        { id: 'c', text: 'Add processing units so the instance absorbs the reporting load', whyWrong: 'It buys headroom without removing the lock and coordination cost that strong reads impose on the write path.' },
        { id: 'd', text: 'Export nightly into BigQuery and run the reports from there', whyWrong: 'A fine long-term pattern, but it turns a seconds-fresh requirement into a day-old one to solve a tuning problem.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.spanner.overkill',
    mode: 'drill',
    nodeIds: ['gcp.spanner', 'gcp.billing'],
    difficulty: 'deep',
    explanation:
      'Spanner earns its price when you need horizontal write scale, multi-region strong consistency or five-nines availability. A 200 GB single-region database with modest write volume needs none of those, and the compute floor plus the storage-per-unit relationship means the bill and the operational learning curve both land before any benefit does. The right recommendation is often the boring one.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer wants to standardize on Spanner for everything, including a 200 GB single-region OLTP database with modest write volume. What is your recommendation?',
      choices: [
        { id: 'a', text: 'Standardize on Spanner, since one engine reduces operational surface', whyWrong: 'Standardization is real value, but paying a distributed database’s floor and rewriting for its key design on every small service is a poor trade.' },
        { id: 'b', text: 'Use Spanner at the smallest capacity so the bill stays small', whyWrong: 'Capacity also governs storage headroom and throughput, so the minimum is not a free tier and it will need to grow.' },
        { id: 'c', text: 'Keep it on Cloud SQL or AlloyDB: it needs none of what Spanner sells' },
        { id: 'd', text: 'Use Spanner with a Cloud SQL replica for cost-sensitive read traffic', whyWrong: 'Two engines, two schemas and a replication path between them is strictly more cost and more failure modes.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Firestore and Bigtable ───────────────────────────────────────────────
  {
    id: 'g2.firestore.composite_index',
    mode: 'drill',
    nodeIds: ['gcp.firestore'],
    difficulty: 'core',
    explanation:
      'Firestore indexes every field individually by default, so single-field queries just work. Any query combining an equality filter with a range or an order on a different field needs a composite index that you must create, and the error helpfully includes a link. The trap is that the link creates it in whichever project you were in, so the index exists in dev and is missing in production until someone deploys the index definition file.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A Firestore query filtering on status and ordering by created_at works in the dev project and fails in production. What is the cause?',
      choices: [
        { id: 'a', text: 'Production holds far more documents than the query planner can handle', whyWrong: 'Firestore query cost is proportional to results returned, not collection size. Volume does not cause this failure.' },
        { id: 'b', text: 'Security rules are blocking the ordered read in production only', whyWrong: 'A rules denial returns a permission error, not a missing-index error, and rules cannot evaluate ordering.' },
        { id: 'c', text: 'The production database was created in a different Firestore mode', whyWrong: 'Mode is fixed at creation and would break far more than one query. It is not a per-query symptom.' },
        { id: 'd', text: 'The composite index was clicked into dev and never added to source' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.firestore.counter',
    mode: 'drill',
    nodeIds: ['gcp.firestore'],
    difficulty: 'deep',
    explanation:
      'A single Firestore document has a sustained write ceiling of roughly one update per second, because each write is a transaction on that document. A global counter incremented on every event blows past it and shows up as contention errors under load. Sharding the counter across a set of documents and summing them on read is the standard pattern, and it is one of the first things to check when a Firestore app degrades under traffic.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A Firestore app increments a single "total_views" document on every page view. Under load, writes start failing with contention. What is the fix?',
      choices: [
        { id: 'a', text: 'Shard the counter across documents and sum the shards on read' },
        { id: 'b', text: 'Wrap the increment in an explicit transaction with retry on conflict', whyWrong: 'It is already effectively a transaction on that document. Retrying harder against a per-document write ceiling makes the contention worse.' },
        { id: 'c', text: 'Move the counter document into a subcollection under the page', whyWrong: 'The write still targets one document. Where it sits in the hierarchy does not change its throughput.' },
        { id: 'd', text: 'Add a composite index covering the counter field and timestamp', whyWrong: 'Indexes serve queries. They do nothing for write throughput, and extra indexes make writes slower.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.firestore.rules_scope',
    mode: 'drill',
    nodeIds: ['gcp.firestore', 'gcp.iam'],
    difficulty: 'deep',
    explanation:
      'Security rules protect the client SDK paths, where an untrusted device talks to Firestore directly. Server-side admin credentials bypass rules entirely by design, so a backend holding a service account identity is authorized by IAM, not by rules. Teams that put all their authorization in rules and then add a backend discover that half their model no longer applies.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A team has thorough Firestore security rules. They add a Cloud Run backend using the Admin SDK. What does the security review need to know?',
      choices: [
        { id: 'a', text: 'Rules apply to every client of the database, the Admin SDK included', whyWrong: 'They do not. Privileged server credentials are exempt, which is what makes admin operations possible at all.' },
        { id: 'b', text: 'The Admin SDK bypasses rules, so the backend must authorize in code' },
        { id: 'c', text: 'Rules apply unless the backend disables them per request', whyWrong: 'There is no per-request toggle. The exemption follows the credential type.' },
        { id: 'd', text: 'Rules govern writes only, so reads from the backend are open', whyWrong: 'Rules govern both. The dividing line is the credential, not the operation.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.bigtable.choice',
    mode: 'drill',
    nodeIds: ['gcp.firestore'],
    difficulty: 'core',
    explanation:
      'Bigtable is the answer for very high sustained write rates with range scans on a designed row key, which is exactly the shape of device telemetry. Firestore is a document store optimized for per-document reads and real-time listeners on modest write rates. The two get conflated because both are NoSQL, and the choice is decided by access pattern and throughput, not by that label.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'An IoT platform ingests around 200,000 writes per second and mostly queries the last 24 hours for one device. Which store fits?',
      choices: [
        { id: 'a', text: 'Firestore, with one document written per device reading', whyWrong: 'Firestore is not built for that sustained write rate, and a document per reading makes per-device range scans expensive.' },
        { id: 'b', text: 'Spanner, with the device id as the leading primary key column', whyWrong: 'It would work, but you are paying for global strong consistency that telemetry does not need, at a much higher cost per write.' },
        { id: 'c', text: 'Bigtable, keyed on device id plus a bucketed timestamp suffix' },
        { id: 'd', text: 'BigQuery streaming inserts, queried per device on demand', whyWrong: 'Fine as the analytics destination, wrong as the low-latency lookup path the application queries per device.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.bigtable.app_profile',
    mode: 'drill',
    nodeIds: ['gcp.firestore'],
    difficulty: 'edge',
    explanation:
      'Bigtable replication is eventually consistent between clusters, and an app profile with multi-cluster routing may send a read to a cluster that has not yet received your write. That breaks read-your-writes and, because Bigtable transactions are single-row and single-cluster, it also breaks read-modify-write operations. Single-cluster routing is what you use when correctness needs it, accepting that failover becomes a deliberate act.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'After enabling a second Bigtable cluster with multi-cluster routing, an application that reads back the row it just wrote starts seeing stale values. What is the correct response?',
      choices: [
        { id: 'a', text: 'Add a short retry loop until the read returns the expected value', whyWrong: 'It masks a consistency model with a timing assumption, and the loop fails whenever replication lag exceeds your patience.' },
        { id: 'b', text: 'Enable strong consistency on the cluster replication policy', whyWrong: 'There is no such setting. Cross-cluster replication is eventually consistent, and routing is the lever you have.' },
        { id: 'c', text: 'Move the read-modify-write into a multi-row transaction', whyWrong: 'Bigtable atomicity is per row. Widening the operation does not exist as an option and would not address routing.' },
        { id: 'd', text: 'Use an app profile with single-cluster routing for that workload' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Pub/Sub ──────────────────────────────────────────────────────────────
  {
    id: 'g2.pubsub.push_backlog',
    mode: 'drill',
    nodeIds: ['gcp.pubsub', 'gcp.compute_choice'],
    difficulty: 'core',
    explanation:
      'A push subscription is flow-controlled by the endpoint: Pub/Sub raises its push rate while the endpoint keeps returning success quickly and backs off on errors or slow responses. Behind a scale-to-zero service starting from one instance, the ramp is gradual by design, so a sudden backlog drains slowly. The levers are all on the subscriber side, or in moving to pull where the worker pool controls its own parallelism.',
    citations: cite('pubsubOrdering'),
    payload: {
      kind: 'multi',
      stem: 'A push subscription delivering to Cloud Run is draining a large backlog far slower than the service can process. Which changes increase throughput? Select all that apply.',
      choices: [
        { id: 'a', text: 'Raise the subscriber service’s maximum instance count so the push ramp has somewhere to go' },
        { id: 'b', text: 'Raise per-instance concurrency so each instance handles more messages at once' },
        { id: 'c', text: 'Switch to a pull subscription with a worker pool sized for the backlog' },
        { id: 'd', text: 'Increase the topic’s message retention', whyWrong: 'Retention decides how long undelivered messages survive, not how fast they are delivered.' },
        { id: 'e', text: 'Add more subscriptions to the topic', whyWrong: 'Each subscription receives its own full copy of the stream, so you have multiplied the work rather than split it.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.pubsub.exactly_once_scope',
    mode: 'drill',
    nodeIds: ['gcp.pubsub'],
    difficulty: 'deep',
    explanation:
      'Exactly-once delivery is a property of the delivery channel within a region: it prevents Pub/Sub from redelivering a message whose ack was accepted. It says nothing about what your handler already did before it acked, so a crash after writing to a database and before acking still produces a duplicate side effect. Idempotent handlers remain the load-bearing part of the design; the feature reduces how often they are exercised.',
    citations: cite('pubsubOrdering'),
    payload: {
      kind: 'mcq',
      stem: 'A team enables exactly-once delivery and proposes removing the idempotency keys from their payment handler. What do you tell them?',
      choices: [
        { id: 'a', text: 'Keep them: the guarantee covers redelivery, not a crash before ack' },
        { id: 'b', text: 'Agree, since exactly-once means the handler itself runs exactly once', whyWrong: 'It bounds delivery, not execution. Any failure after the effect and before the ack still replays the effect.' },
        { id: 'c', text: 'Agree, provided they also enable ordering on the subscription', whyWrong: 'Ordering constrains sequence within a key. It does not remove duplicate execution.' },
        { id: 'd', text: 'Keep them only for topics that are replicated across regions', whyWrong: 'The gap is between side effect and ack, which exists in every region equally.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.pubsub.ack_deadline',
    mode: 'drill',
    nodeIds: ['gcp.pubsub'],
    difficulty: 'intro',
    explanation:
      'If a subscriber does not ack or extend the lease before the ack deadline expires, Pub/Sub redelivers, and a handler that takes longer than the deadline will process the same message forever while never finishing. Client libraries extend the lease automatically up to a maximum; past that, the right shape is to ack quickly and hand the long work to a job, so the queue is not modeling a long-running task.',
    citations: cite('pubsubOrdering'),
    payload: {
      kind: 'mcq',
      stem: 'A subscriber takes about thirty minutes per message and the same messages keep being redelivered mid-processing. What is the durable fix?',
      choices: [
        { id: 'a', text: 'Set the ack deadline to its maximum and rely on automatic lease extension', whyWrong: 'It buys time and hides the shape problem. A single slow message still risks expiry, and the subscription now holds work for half an hour.' },
        { id: 'b', text: 'Ack quickly and hand the long work to a job, tracking state outside' },
        { id: 'c', text: 'Move the subscription to exactly-once delivery semantics', whyWrong: 'Exactly-once does not stop redelivery of a message that was never acked. The deadline still expires.' },
        { id: 'd', text: 'Add a dead-letter topic with a low delivery attempt limit', whyWrong: 'That routes healthy long-running work to the dead-letter queue, turning a latency problem into data loss.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.pubsub.bq_subscription',
    mode: 'drill',
    nodeIds: ['gcp.pubsub', 'gcp.dataflow'],
    difficulty: 'core',
    explanation:
      'When the pipeline between a topic and a table does no real transformation, a BigQuery subscription writes directly and removes an entire always-on Dataflow job, along with its workers, its upgrades and its on-call. Keep Dataflow for the cases that earn it: enrichment, joins, windowed aggregation or anything needing state. Reaching for Dataflow reflexively is one of the more common overspends in a streaming design.',
    citations: cite('pubsubOrdering'),
    payload: {
      kind: 'mcq',
      stem: 'A design has Pub/Sub feeding a streaming Dataflow job whose only job is to parse JSON and insert into BigQuery unchanged. What do you suggest?',
      choices: [
        { id: 'a', text: 'Keep Dataflow but move the job onto a smaller worker type', whyWrong: 'You are still paying for and operating always-on workers to do work the subscription performs for free.' },
        { id: 'b', text: 'Replace it with a Cloud Run push subscriber that inserts rows', whyWrong: 'Less infrastructure than Dataflow, but you own retry, batching and dead-lettering code that the managed subscription already handles.' },
        { id: 'c', text: 'Use a BigQuery subscription with a topic schema and delete the job' },
        { id: 'd', text: 'Write to Cloud Storage and load into BigQuery hourly instead', whyWrong: 'Cheap, but it converts a streaming requirement into an hourly one without anyone asking.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.pubsub.replay',
    mode: 'drill',
    nodeIds: ['gcp.pubsub'],
    difficulty: 'deep',
    explanation:
      'Seek lets a subscription rewind to a timestamp or a snapshot, but only over messages still retained, and retaining acked messages is a setting you must enable in advance. After a bug corrupts a day of downstream data, nobody can retroactively decide to have kept the messages. Deciding the replay window during design is what makes the recovery possible at all.',
    citations: cite('pubsubOrdering'),
    payload: {
      kind: 'mcq',
      stem: 'A bug corrupted yesterday’s downstream writes and the team wants to reprocess the events. What determines whether they can?',
      choices: [
        { id: 'a', text: 'Whether the subscription uses pull delivery rather than push', whyWrong: 'Seek works for both. Delivery mode is unrelated to what is retained.' },
        { id: 'b', text: 'Whether the topic has a message schema attached to it', whyWrong: 'A schema validates message structure at publish. It has nothing to do with retention or replay.' },
        { id: 'c', text: 'Whether a dead-letter topic was configured on the subscription', whyWrong: 'A dead-letter topic collects messages that failed repeatedly. Successfully processed messages never go there.' },
        { id: 'd', text: 'Whether the subscription was set to retain acked messages' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Dataflow and Dataproc ────────────────────────────────────────────────
  {
    id: 'g2.dataflow.vs_dataproc',
    mode: 'drill',
    nodeIds: ['gcp.dataflow'],
    difficulty: 'core',
    explanation:
      'A migration is not the moment to also change programming model. Two hundred tested PySpark jobs move to Dataproc, or Serverless for Apache Spark, largely as they are, and the customer gets the cloud benefits immediately. Rewriting them into Beam is a multi-quarter project justified only where a job genuinely needs unified streaming semantics, and it should be argued per job, not as a platform mandate.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer with 200 production PySpark jobs is moving off an on-prem Hadoop cluster. Their account team suggested rewriting everything in Beam for Dataflow. What do you advise?',
      choices: [
        { id: 'a', text: 'Move them to Dataproc or Serverless for Apache Spark first' },
        { id: 'b', text: 'Rewrite everything in Beam so all 200 jobs land on a single runner', whyWrong: 'It couples the migration to a rewrite of 200 tested jobs, which delays every benefit and multiplies the risk of the cutover.' },
        { id: 'c', text: 'Convert the whole set of jobs into BigQuery SQL instead', whyWrong: 'Right for some jobs and a bad fit for others. Deciding it wholesale before profiling the workloads is the same mistake in a different direction.' },
        { id: 'd', text: 'Lift the Hadoop cluster onto Compute Engine VMs unchanged', whyWrong: 'You inherit all the cluster operations you were trying to leave, and get none of the elasticity that pays for the move.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.dataflow.hot_key',
    mode: 'drill',
    nodeIds: ['gcp.dataflow'],
    difficulty: 'deep',
    explanation:
      'Grouping by key assigns all values for one key to one worker, so a key that carries a disproportionate share of traffic pins a whole stage to a single thread while autoscaling adds workers that have nothing to do. The fixes are structural: combine before the shuffle so less data moves, or add a salt to the key and aggregate in two stages. More workers is the intuitive response and the one that changes nothing.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A streaming Dataflow pipeline shows rising system lag, one very busy worker and many idle ones. Autoscaling has already added workers. What is going on?',
      choices: [
        { id: 'a', text: 'The workers are undersized and need more memory per worker', whyWrong: 'One saturated worker among many idle ones is a distribution problem. A bigger machine raises the ceiling on the same single thread.' },
        { id: 'b', text: 'A hot key: combine before the shuffle, or salt and aggregate twice' },
        { id: 'c', text: 'Streaming Engine is disabled, so shuffle state sits on the workers', whyWrong: 'Streaming Engine moves shuffle state off the workers and helps in general, but it does not redistribute a single key across workers.' },
        { id: 'd', text: 'The watermark advances slowly because of late-arriving data', whyWrong: 'Late data delays window firing. It does not produce a single hot worker while the rest sit idle.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.dataflow.update_vs_drain',
    mode: 'drill',
    nodeIds: ['gcp.dataflow'],
    difficulty: 'deep',
    explanation:
      'Update replaces a running streaming job in place and carries its state forward, which needs a compatible graph and, when transform names change, an explicit mapping. Drain stops ingestion and lets in-flight windows finish and emit. Cancel discards state outright. Choosing wrong is how a team loses an hour of windowed aggregates during what everyone called a routine deploy.',
    citations: cite('waf'),
    payload: {
      kind: 'match',
      stem: 'Match each way of stopping or replacing a streaming Dataflow job to the situation it fits.',
      pairs: [
        { left: 'Update in place', right: 'Deploying a compatible change while preserving in-flight windowed state' },
        { left: 'Drain', right: 'Retiring a pipeline for good, letting in-flight windows finish and emit first' },
        { left: 'Cancel', right: 'Stopping immediately when in-flight state does not matter or is already corrupt' },
        { left: 'Run the replacement in parallel, then stop the original', right: 'Cutting over when every sink is idempotent and duplicate output during the overlap is safe' },
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.dataflow.idle_cost',
    mode: 'drill',
    nodeIds: ['gcp.dataflow', 'gcp.billing'],
    difficulty: 'core',
    explanation:
      'A streaming pipeline bills for its workers continuously, whether or not messages are arriving. At a few dozen events a minute the fixed cost of always-on workers dwarfs the value of second-level freshness, and the customer is paying a streaming premium for a batch requirement. Ask what the freshness requirement actually is before defending the architecture.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer pays for a 24/7 streaming Dataflow job that processes roughly 40 events per minute into BigQuery, and the business reviews the data once a day. What do you propose?',
      choices: [
        { id: 'a', text: 'Reduce the job to a single small worker to trim the running cost', whyWrong: 'It trims the bill but keeps paying continuously for a pipeline whose output is consumed once a day.' },
        { id: 'b', text: 'Enable autoscaling so the workers scale to zero between messages', whyWrong: 'Streaming Dataflow autoscaling has a floor of at least one worker. It does not scale to zero between messages.' },
        { id: 'c', text: 'Match architecture to freshness: a scheduled batch job instead' },
        { id: 'd', text: 'Move the streaming job onto Spot workers for the discount', whyWrong: 'Preemption on a streaming job means repeated state recovery and lag spikes, for a discount on a cost you should not be paying at all.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Dataplex and governance ──────────────────────────────────────────────
  {
    id: 'g2.dataplex.discovery',
    mode: 'drill',
    nodeIds: ['gcp.dataplex'],
    difficulty: 'core',
    explanation:
      'Nobody can hand-classify 900 tables, and asking teams to self-declare produces an inventory that is wrong the week it is written. Sensitive Data Protection discovery profiles the data itself and tells you where the sensitive columns actually are, and those findings then drive policy tags and access controls. Automated discovery first, human curation second, is the order that finishes.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer must know which of roughly 900 BigQuery tables contain personal data before an audit in six weeks. What do you run?',
      choices: [
        { id: 'a', text: 'Ask each data owner to complete a classification questionnaire', whyWrong: 'It is slow, incomplete and stale on arrival, because owners describe the schema they intended rather than the data that landed.' },
        { id: 'b', text: 'Grep the column names for patterns such as email and ssn', whyWrong: 'It misses everything badly named, which is most of it, and flags columns that only look sensitive.' },
        { id: 'c', text: 'Enable Data Access audit logs and infer sensitivity from reads', whyWrong: 'Access patterns tell you what is popular, not what is sensitive, and you would need to wait for months of logs.' },
        { id: 'd', text: 'Sensitive Data Protection discovery, then drive policy tags from it' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.dataplex.quality',
    mode: 'drill',
    nodeIds: ['gcp.dataplex'],
    difficulty: 'core',
    explanation:
      'Data quality rules belong next to the asset, versioned, scheduled and emitting results that alerting and lineage can consume. Hand-rolled SQL checks in a scheduler give the same assertions with none of the reporting, and they rot because nobody owns the folder they live in. The value of a managed scan is that the results are a first-class signal rather than a job that quietly stopped running.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A team wants freshness and null-rate checks on 60 curated tables, with failures visible to data consumers rather than buried in a job log. What do you set up?',
      choices: [
        { id: 'a', text: 'Dataplex data quality scans on each asset, with published results' },
        { id: 'b', text: 'A set of scheduled queries that raise an error when assertions fail', whyWrong: 'Same assertions, no shared reporting surface, and a failing scheduled query is invisible to the people consuming the table.' },
        { id: 'c', text: 'A dbt test suite executed in the transformation build pipeline', whyWrong: 'Good for build-time checks on transformations, but it does not observe the production table between builds, which is where freshness fails.' },
        { id: 'd', text: 'A Looker alert configured on each dashboard using the tables', whyWrong: 'That detects quality problems only where a dashboard happens to surface them, and only for tables someone charted.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.dataplex.mesh',
    mode: 'drill',
    nodeIds: ['gcp.dataplex'],
    difficulty: 'deep',
    explanation:
      'A data mesh is an ownership model before it is a product choice. Cataloging three conflicting customer tables documents the disagreement rather than resolving it, and pushes the decision onto every consumer. Ownership and contract come first; the tooling then makes those decisions discoverable, and the competing tables can finally be retired instead of accumulating a fourth.',
    citations: cite('waf'),
    payload: {
      kind: 'order',
      stem: 'Three teams each publish a table called customer and disagree about what a customer is. Order the work of turning that into a data mesh.',
      steps: [
        'Agree the domains, and which domain owns the customer concept',
        'Name an accountable owner for each data product rather than for each table',
        'Write the contract for the published interface: schema, semantics, freshness and support expectations',
        'Publish the product in the catalog with lineage and quality scans attached',
        'Migrate consumers onto the contract and retire the competing tables',
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.dataplex.governance_match',
    mode: 'drill',
    nodeIds: ['gcp.dataplex', 'gcp.bigquery'],
    difficulty: 'core',
    explanation:
      'Governance requests arrive as sentences, not product names, and matching the sentence to the right mechanism is most of the job. Discovery finds sensitive data, taxonomies and policy tags control who sees which column, lineage answers where a number came from, and quality scans say whether it can be trusted.',
    citations: cite('waf'),
    payload: {
      kind: 'match',
      stem: 'Match each governance question to the capability that answers it.',
      pairs: [
        { left: '"Which of our tables hold personal data?"', right: 'Sensitive Data Protection discovery profiles' },
        { left: '"Only the fraud team may see this column"', right: 'A policy tag from a taxonomy, granted per principal' },
        { left: '"Where did this reported number come from?"', right: 'Column and table lineage' },
        { left: '"Is this table fresh and complete enough to use?"', right: 'A scheduled data quality scan with published results' },
      ],
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Cloud KMS and CMEK ───────────────────────────────────────────────────
  {
    id: 'g2.kms.vs_secret_manager',
    mode: 'drill',
    nodeIds: ['gcp.kms'],
    difficulty: 'intro',
    explanation:
      'KMS manages keys: it encrypts, decrypts and signs, and the key material never leaves. Secret Manager stores secret values with versioning, IAM, audit logging and rotation hooks. Encrypting an API key with KMS and committing the ciphertext to git is a pattern teams invent when they have only met one of the two products, and it leaves them hand-rolling versioning and rotation.',
    citations: cite('cmek'),
    payload: {
      kind: 'mcq',
      stem: 'A team stores third-party API keys as KMS-encrypted blobs committed to their repository. What do you recommend?',
      choices: [
        { id: 'a', text: 'Keep the pattern but move the ciphertext into a Cloud Storage bucket', whyWrong: 'It relocates the blob without adding versioning, per-secret access control or rotation, which is what they are missing.' },
        { id: 'b', text: 'Secret Manager: versioning, per-secret IAM, audit and rotation' },
        { id: 'c', text: 'Use one KMS key per secret so access is controlled per key', whyWrong: 'Key sprawl to emulate per-secret IAM, while still owning the storage, versioning and rotation yourself.' },
        { id: 'd', text: 'Inject the values as environment variables from CI at deploy', whyWrong: 'Then the CI system becomes the untracked secret store, and the values appear in deploy logs and revision history.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.kms.location',
    mode: 'drill',
    nodeIds: ['gcp.kms'],
    difficulty: 'core',
    explanation:
      'A CMEK key must live in a location compatible with the resource it protects: a regional key for a regional resource in the same region, and a multi-region or global key where the resource spans regions. This is a hard constraint, not a preference, and it surfaces as a create failure late in a Terraform run when the key ring was placed in whichever region someone typed first.',
    citations: cite('cmek'),
    payload: {
      kind: 'mcq',
      stem: 'A team creates a KMS key in us-central1 and tries to use it as CMEK for a BigQuery dataset in the EU multi-region. It fails. Why?',
      choices: [
        { id: 'a', text: 'BigQuery CMEK requires a key with the HSM protection level', whyWrong: 'Both software and HSM keys are usable. Protection level is a separate choice from location.' },
        { id: 'b', text: 'The dataset must exist before a CMEK key can be attached', whyWrong: 'CMEK can be set at dataset creation or changed later. Ordering is not the constraint here.' },
        { id: 'c', text: 'Key location must be compatible with the resource location' },
        { id: 'd', text: 'Cross-region key use needs VPC Service Controls turned off', whyWrong: 'Perimeters are unrelated. The location rule applies with or without them.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.kms.ekm',
    mode: 'drill',
    nodeIds: ['gcp.kms', 'gcp.assured'],
    difficulty: 'deep',
    explanation:
      'Cloud External Key Manager keeps the key material in the customer’s own external key manager, so Google calls out to it for every cryptographic operation and the customer can refuse. Key Access Justifications adds a machine-readable reason to each request, which is what lets them approve or deny by policy rather than by trust. The trade is a hard availability dependency: if the external manager is unreachable, the data is unreadable.',
    citations: cite('cmek'),
    payload: {
      kind: 'mcq',
      stem: 'A regulator requires that the customer can technically deny a specific access to their data rather than relying on contractual assurance. What do you propose, and what do you warn them about?',
      choices: [
        { id: 'a', text: 'CMEK with a rotation schedule plus Access Transparency logging enabled', whyWrong: 'That gives visibility after the fact. The requirement is the ability to deny in the moment, which needs the key outside Google.' },
        { id: 'b', text: 'HSM-protected keys held inside Cloud KMS in their own region', whyWrong: 'The key material is protected in hardware but still lives inside Google, so the customer cannot refuse a specific operation.' },
        { id: 'c', text: 'Assured Workloads with a data residency constraint applied', whyWrong: 'Residency controls where data sits and who may support it. It is not a per-request approval mechanism.' },
        { id: 'd', text: 'Cloud EKM with Key Access Justifications, and an availability risk' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.kms.destroy',
    mode: 'drill',
    nodeIds: ['gcp.kms'],
    difficulty: 'edge',
    explanation:
      'Destroying a key version makes everything encrypted under it permanently unreadable, backups included, after a scheduled waiting period that is your last chance to reverse the decision. Crypto-shredding is a recognized deletion technique but whether it satisfies a specific obligation is a legal question, not an engineering one. Disabling before destroying is what surfaces the resource nobody remembered was using that key.',
    citations: cite('cmek'),
    payload: {
      kind: 'order',
      stem: 'A customer wants to retire a CMEK key version. Order the steps so nothing becomes unreadable by accident.',
      steps: [
        'Confirm with legal what the obligation requires, since crypto-shredding is not universally accepted as deletion',
        'Inventory every resource still encrypted under that key version, backups included',
        'Re-encrypt anything that has to survive under a new key version',
        'Disable the version and watch for access failures across a full business cycle',
        'Schedule destruction, treating the waiting period as the last window to reverse it',
      ],
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Assured Workloads and sovereignty ────────────────────────────────────
  {
    id: 'g2.assured.tiers',
    mode: 'drill',
    nodeIds: ['gcp.assured'],
    difficulty: 'deep',
    explanation:
      'Sovereignty requirements come in tiers, and matching the tier to the actual obligation avoids paying for a level nobody asked for. Data residency org policy pins where resources may be created; Assured Workloads adds personnel and support controls for a compliance regime; partner-operated sovereign offerings put a local partner in the operational path; and an air-gapped distributed deployment runs disconnected from Google entirely.',
    citations: cite('assured'),
    payload: {
      kind: 'match',
      stem: 'Match each sovereignty requirement to the smallest control that satisfies it.',
      pairs: [
        { left: 'Resources must only be created in EU regions', right: 'A resource-locations org policy constraint' },
        { left: 'Support and administrative personnel must meet a regime’s requirements', right: 'An Assured Workloads folder for that compliance program' },
        { left: 'A local partner must control operational access', right: 'A partner-operated sovereign cloud offering' },
        { left: 'The environment must run with no connectivity to Google', right: 'An air-gapped Google Distributed Cloud deployment' },
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.assured.requirement_clarify',
    mode: 'drill',
    nodeIds: ['gcp.assured'],
    difficulty: 'core',
    explanation:
      'Customers say "data residency" for at least three different obligations: where the bytes are stored, who is able to access and administer them, and whether the service keeps running if the relationship with the provider ends. They carry very different price tags. Asking which one the regulation actually names is the single most valuable question in a sovereignty conversation.',
    citations: cite('assured'),
    payload: {
      kind: 'mcq',
      stem: 'A European customer says they need data sovereignty. What is the first question you ask?',
      choices: [
        { id: 'a', text: 'Which obligation applies: storage location, personnel access, or survival' },
        { id: 'b', text: 'Which specific regions they want their resources created in', whyWrong: 'That answers only the storage-location question, and it presumes the cheapest interpretation before you know the obligation.' },
        { id: 'c', text: 'Whether they need FedRAMP or a European equivalent program', whyWrong: 'Naming a US program to a European customer suggests you have not read the requirement they are working from.' },
        { id: 'd', text: 'Whether they are willing to pay for an Assured Workloads folder', whyWrong: 'Leading with the price of one product before establishing the requirement is how you sell the wrong tier.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.assured.retrofit',
    mode: 'drill',
    nodeIds: ['gcp.assured', 'gcp.hierarchy'],
    difficulty: 'deep',
    explanation:
      'Assured Workloads controls apply to a folder created for a compliance program, and the resources inside are expected to have been created under those controls. There is no switch that retrospectively brings a folder of running projects into scope, so the plan is rebuild plus migrate, not move. The service-support check belongs early, because discovering a dependency is unavailable inside the program after you have migrated is an expensive way to learn it.',
    citations: cite('assured'),
    payload: {
      kind: 'order',
      stem: 'A customer with 40 running projects must bring a subset under a regulated compliance program. Order the migration.',
      steps: [
        'Confirm which program applies and which workloads are genuinely in scope',
        'Check that every service those workloads depend on is supported inside that program',
        'Create the Assured Workloads folder and provision new projects inside it',
        'Rebuild the workloads there through the deployment pipeline rather than moving existing projects',
        'Migrate data deliberately, and decide what happens to copies created outside the folder',
        'Decommission the original projects once the regulated path is serving traffic',
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.assured.access_approval',
    mode: 'drill',
    nodeIds: ['gcp.assured', 'gcp.scc'],
    difficulty: 'intro',
    explanation:
      'Access Transparency logs what Google personnel did and why; Access Approval requires the customer to grant permission before that access happens. Customers usually describe the second and are sold the first, then discover during the audit that they have a record rather than a control. Say plainly which one answers the requirement.',
    citations: cite('assured'),
    payload: {
      kind: 'mcq',
      stem: 'A customer requires that no Google support engineer can touch their data without their explicit sign-off on each occasion. Which control do they need?',
      choices: [
        { id: 'a', text: 'Access Transparency logs recording what was accessed and why', whyWrong: 'It gives a log of what was accessed and the justification, after the fact. It is evidence, not consent.' },
        { id: 'b', text: 'Access Approval, which gates the request on their sign-off' },
        { id: 'c', text: 'CMEK on every resource holding the regulated data', whyWrong: 'Customer-managed keys change who controls the key, not whether a support access request proceeds.' },
        { id: 'd', text: 'VPC Service Controls drawn around the relevant projects', whyWrong: 'A perimeter governs API access from network contexts and identities. It does not gate provider support operations.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Security Command Center ──────────────────────────────────────────────
  {
    id: 'g2.scc.detective',
    mode: 'drill',
    nodeIds: ['gcp.scc'],
    difficulty: 'intro',
    explanation:
      'Security Command Center is a detection system: it tells you a bucket became public, minutes after it did. Prevention is a different layer, and for public buckets that is the public access prevention org policy constraint, which stops the configuration from being possible. A mature posture uses both, and knowing which one you are relying on for a given risk is the whole point.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'SCC raised a finding for a publicly readable bucket 40 minutes after it was made public. The customer asks how to make that impossible instead. What do you deploy?',
      choices: [
        { id: 'a', text: 'A faster SCC notification channel feeding into their SIEM', whyWrong: 'It shortens the window between exposure and awareness. The bucket is still public in the meantime.' },
        { id: 'b', text: 'An SCC custom module that detects public buckets sooner', whyWrong: 'Another detection, at best duplicating one that already fired. It cannot block the API call.' },
        { id: 'c', text: 'The public access prevention org policy constraint' },
        { id: 'd', text: 'Remove the storage.admin role from every user in the org', whyWrong: 'Overbroad, and several other roles carry the permission, so it is neither complete nor operable.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.scc.vs_cspm',
    mode: 'drill',
    nodeIds: ['gcp.scc'],
    difficulty: 'deep',
    explanation:
      'A third-party CSPM reads the same configuration APIs you do, so on misconfiguration detection the overlap is genuine. What it cannot replicate is detection sourced from inside the platform: threat detection over Cloud Logging and control plane activity, container runtime signals, and asset inventory that reflects the state Google itself holds. Frame the comparison there rather than claiming the customer must replace their tool.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer already runs a third-party CSPM and asks what Security Command Center adds. What is the honest answer?',
      choices: [
        { id: 'a', text: 'More complete misconfiguration coverage than any third party', whyWrong: 'Overclaiming on the one dimension where the tools genuinely overlap is the fastest way to lose credibility in the room.' },
        { id: 'b', text: 'It is required in order to use org policy constraints at all', whyWrong: 'Org policy is independent of SCC. Tying them together is simply inaccurate.' },
        { id: 'c', text: 'It replaces the need for a separate SIEM entirely', whyWrong: 'SCC findings usually flow into the SIEM. It is a source, not a substitute.' },
        { id: 'd', text: 'Platform-sourced threat detection and native asset inventory' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.scc.finding_fatigue',
    mode: 'drill',
    nodeIds: ['gcp.scc'],
    difficulty: 'core',
    explanation:
      'Four thousand open findings is the same as zero findings, because nobody triages a list that long. Ownership comes first, since a finding with no owner is not going to be fixed by better sorting. A backlog with named owners and written mute rationale is auditable; an untouched list is not, and the auditor notices the difference.',
    citations: cite('waf'),
    payload: {
      kind: 'order',
      stem: 'A customer has roughly 4,000 open Security Command Center findings and nobody works them. Order the recovery.',
      steps: [
        'Route findings to owners by folder, so every finding has someone accountable',
        'Mute the classes the customer has consciously accepted, each with a written rationale',
        'Rank what remains by exploitability and blast radius rather than severity label',
        'Fix the top of that list, converting each recurring class into a preventive org policy where one exists',
        'Alert only on new findings above an agreed bar, so the backlog cannot silently rebuild',
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.scc.log_dependency',
    mode: 'drill',
    nodeIds: ['gcp.scc', 'gcp.observability'],
    difficulty: 'edge',
    explanation:
      'Threat detection reads logs, and Data Access audit logs are off by default for most services because of their volume. A customer who never enabled them has no record of reads, so exfiltration patterns that depend on read activity simply cannot be detected, and the absence looks identical to an all-clear. Enabling them for the sensitive services, and budgeting for the log volume, is a prerequisite rather than a tuning step.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer with SCC enabled says it has never raised a data exfiltration finding, and concludes their posture is strong. What do you check?',
      choices: [
        { id: 'a', text: 'Whether Data Access audit logs are enabled: they are off by default' },
        { id: 'b', text: 'Whether the detectors are enabled at the organization level', whyWrong: 'Worth confirming, but detectors enabled over absent logs still produce silence, so the log configuration is the deeper cause.' },
        { id: 'c', text: 'Whether mute rules are filtering the findings out of view', whyWrong: 'Possible, and easy to check, but it would not explain a total absence across the entire detection class.' },
        { id: 'd', text: 'Whether the SCC service agent has permission to read every project in scope', whyWrong: 'SCC operates at the org level through its own service agent. A broad permission failure would break far more than one detection type.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Observability ────────────────────────────────────────────────────────
  {
    id: 'g2.observability.signals',
    mode: 'drill',
    nodeIds: ['gcp.observability'],
    difficulty: 'intro',
    explanation:
      'Under incident pressure people reach for whichever tool they know rather than the one that answers the question. Keeping the mapping crisp shortens every debugging session: logs for what happened in one request, metrics for how a population is behaving over time, traces for where the latency went across services, and profiling for where CPU or memory goes inside one process.',
    citations: cite('waf'),
    payload: {
      kind: 'match',
      stem: 'Match each question to the observability signal that answers it fastest.',
      pairs: [
        { left: '"What exactly happened in this one failed request?"', right: 'Cloud Logging' },
        { left: '"Is the error rate rising across the fleet?"', right: 'Cloud Monitoring metrics' },
        { left: '"Which service in the chain is adding the latency?"', right: 'Cloud Trace' },
        { left: '"What inside this process is burning the CPU?"', right: 'Cloud Profiler' },
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.observability.log_cost',
    mode: 'drill',
    nodeIds: ['gcp.observability', 'gcp.billing'],
    difficulty: 'core',
    explanation:
      'Logging bills on ingestion, so the lever is what you ingest, not how long you keep it. Exclusion filters drop high-volume debug and health-check entries before they are charged, and verbose logs can be sampled at the application before they are ever emitted. Admin Activity audit logs are free and cannot be disabled, which is the right default and worth saying before someone goes looking for them.',
    citations: cite('waf'),
    payload: {
      kind: 'multi',
      stem: 'Cloud Logging has become one of the largest lines on a customer’s bill, dominated by application debug logs and load balancer health checks. Which changes actually reduce it? Select all that apply.',
      choices: [
        { id: 'a', text: 'Exclusion filters so those entries are never ingested' },
        { id: 'b', text: 'Sampling verbose application logs before they are emitted' },
        { id: 'c', text: 'Routing logs that must be kept long-term to a cheaper storage destination rather than a log bucket' },
        { id: 'd', text: 'Reducing retention on the default log bucket to 30 days', whyWrong: 'Retention affects storage past the free period. This bill is dominated by ingestion, which retention does not touch.' },
        { id: 'e', text: 'Disabling Admin Activity audit logs', whyWrong: 'They are free and cannot be disabled, and they are the last logs you would want to lose.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.observability.log_metric_cardinality',
    mode: 'drill',
    nodeIds: ['gcp.observability'],
    difficulty: 'deep',
    explanation:
      'You cannot alert on a log query, so anything you want to page on becomes a log-based metric. The trap is labels: extracting a user id or a request id as a label creates a distinct time series per value, which explodes cardinality, costs real money and eventually gets the metric rejected. Labels should be low-cardinality dimensions you would actually group by.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A team creates a log-based metric for failed logins and adds the user id as a label so they can see who is affected. What goes wrong?',
      choices: [
        { id: 'a', text: 'The metric lags, because label extraction happens asynchronously', whyWrong: 'Extraction happens at ingestion. Latency is not the failure mode here.' },
        { id: 'b', text: 'Each user id becomes its own time series, so cardinality explodes' },
        { id: 'c', text: 'Log-based metrics are not permitted to carry labels at all', whyWrong: 'They can, and labels are the point. The constraint is on how many distinct values they may take.' },
        { id: 'd', text: 'The user id is redacted automatically as sensitive data', whyWrong: 'No automatic redaction happens. Keeping user identifiers out of metric labels is a decision you have to make.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.observability.burn_rate',
    mode: 'drill',
    nodeIds: ['gcp.observability'],
    difficulty: 'deep',
    explanation:
      'Alerting on a resource threshold pages people for conditions users never noticed and stays silent through outages that do not happen to move that resource. Burn-rate alerting on the SLO error budget fixes both: a fast window catches a sharp outage quickly, a slow window catches a steady drip that would exhaust the budget by month end, and both are expressed in terms of harm to users.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A team pages on CPU above 80 percent for five minutes. They get woken for non-events and missed a real outage last month. What do you move them to?',
      choices: [
        { id: 'a', text: 'Raise the CPU threshold to 90 percent and lengthen the window', whyWrong: 'Fewer false pages and even more missed outages. The signal is still not connected to user experience.' },
        { id: 'b', text: 'Alert on p99 latency crossing a fixed millisecond threshold', whyWrong: 'Closer to the user, but a static threshold has no notion of budget, so a brief spike and a week of degradation look identical.' },
        { id: 'c', text: 'Multi-window burn-rate alerts on the SLO error budget' },
        { id: 'd', text: 'Route the CPU alerts to a ticket queue instead of a page', whyWrong: 'It stops the noise waking anyone and does nothing about the outage class that was missed.' },
      ],
      correctId: 'c',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.observability.trace_propagation',
    mode: 'drill',
    nodeIds: ['gcp.observability', 'gcp.pubsub'],
    difficulty: 'edge',
    explanation:
      'Trace context travels in request headers, and a Pub/Sub message is not an HTTP request. Unless the publisher writes the trace context into message attributes and the subscriber reads it back into its context, the trace ends at publish and a new one begins at consume. The symptom is two short unconnected traces around the exact hop where the latency lives.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A request flows through two Cloud Run services with Pub/Sub between them. Traces show the first service and the second service separately, never joined. What is missing?',
      choices: [
        { id: 'a', text: 'The services sit in different projects, so the traces cannot join', whyWrong: 'Traces can span projects. The break here is the asynchronous hop, not the project boundary.' },
        { id: 'b', text: 'Sampling is dropping the second half of every trace', whyWrong: 'Sampling would drop whole traces at random, not consistently sever them at the same point.' },
        { id: 'c', text: 'Pub/Sub does not participate in distributed tracing at all', whyWrong: 'Instrumented clients do participate in tracing. The propagation still has to be carried in attributes.' },
        { id: 'd', text: 'Trace context is not written into the message attributes' },
      ],
      correctId: 'd',
    },
    origin: 'seed',
    criticScore: null,
  },

  // ── Billing, quotas and commitments ──────────────────────────────────────
  {
    id: 'g2.billing.budgets_not_caps',
    mode: 'drill',
    nodeIds: ['gcp.billing'],
    difficulty: 'intro',
    explanation:
      'A budget is an alerting construct: it notifies at thresholds and can trigger automation, but nothing about it stops spend. Real ceilings come from quotas on the resources that can run away and from service-level maximums such as instance counts and custom query quotas. The automation that disables billing on a project is a real pattern and a genuinely destructive one, so it belongs in sandboxes, not production.',
    citations: cite('waf'),
    payload: {
      kind: 'multi',
      stem: 'A customer asks you to make it impossible to spend more than $50,000 in a month. Which of these actually constrain spend? Select all that apply.',
      choices: [
        { id: 'a', text: 'Quota limits on the specific services that can run away, such as API request rates or accelerator counts' },
        { id: 'b', text: 'Service-level maximums such as a Cloud Run maximum instance count or a BigQuery custom query quota' },
        { id: 'c', text: 'A budget with alert thresholds at 50, 90 and 100 percent', whyWrong: 'Budgets notify. Nothing about a budget prevents the next API call from succeeding.' },
        { id: 'd', text: 'A committed use discount sized to the expected monthly amount', whyWrong: 'A commitment sets a floor you owe regardless of usage. It places no ceiling above it.' },
        { id: 'e', text: 'Billing account credits sized to the monthly limit', whyWrong: 'Credits reduce what is owed. Usage continues when they run out, and the charges land on the account.' },
      ],
      correctIds: ['a', 'b'],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.billing.discount_match',
    mode: 'drill',
    nodeIds: ['gcp.billing'],
    difficulty: 'core',
    explanation:
      'Discount mechanisms map to workload shapes, and mixing them up is how customers commit to the wrong thing for three years. Predictable always-on baseline is what commitments are for, interruption-tolerant work is what Spot is for, unpredictable bursts should stay on-demand, and long single-VM runs pick up sustained use discounts automatically.',
    citations: cite('waf'),
    payload: {
      kind: 'match',
      stem: 'Match each workload shape to the pricing mechanism that fits it.',
      pairs: [
        { left: 'Steady 24/7 baseline capacity for the next three years', right: 'A committed use discount' },
        { left: 'Batch rendering that can be interrupted and retried', right: 'Spot VMs' },
        { left: 'Unpredictable spiky traffic with no floor', right: 'On-demand pricing' },
        { left: 'A single VM that happens to run most of the month', right: 'Sustained use discounts, applied automatically' },
      ],
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.billing.cud_flexibility',
    mode: 'drill',
    nodeIds: ['gcp.billing'],
    difficulty: 'deep',
    explanation:
      'Resource-based commitments buy a specific amount of vCPU and memory in one region for one machine family, at the deepest discount, and they do not follow you if the architecture moves. Spend-based commitments trade some of that discount for portability across regions and machine types. Mid-migration, when the shape of the estate is still changing, the smaller portable discount is usually the better trade.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'A customer wants to commit for three years but is mid-migration and may change regions and machine families within the year. What do you recommend?',
      choices: [
        { id: 'a', text: 'A spend-based commitment: smaller discount, not pinned to a region' },
        { id: 'b', text: 'A resource-based commitment on the current region and machine family', whyWrong: 'It is the deeper discount on capacity they may stop using, in a region they may leave, with the commitment still owed.' },
        { id: 'c', text: 'A one-year resource-based commitment that they renew each year', whyWrong: 'Shorter, but still region and family locked for a year in which the question says both are expected to change.' },
        { id: 'd', text: 'No commitment at all until the migration has finished moving', whyWrong: 'Defensible if the timeline is short, but it forgoes a year or more of discount on the baseline that will exist regardless of where it runs.' },
      ],
      correctId: 'a',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.billing.showback_labels',
    mode: 'drill',
    nodeIds: ['gcp.billing'],
    difficulty: 'core',
    explanation:
      'Detailed billing export to BigQuery plus a consistent labeling scheme is the only durable way to answer who spent what. The trap is that labels are recorded on usage as it happens, so labeling resources in March does not retroactively attribute February. Enforce the labels at creation time, with an org policy or a pipeline check, before anyone asks for the first showback report.',
    citations: cite('waf'),
    payload: {
      kind: 'mcq',
      stem: 'Finance asks for per-team cost attribution going back six months. The estate has been labeled since last week. What is the accurate answer?',
      choices: [
        { id: 'a', text: 'Reprocess the billing export, joining the current labels by resource id', whyWrong: 'The mapping today does not tell you which team owned a resource six months ago, and resources have been created and deleted since.' },
        { id: 'b', text: 'Labels apply from when they were set, so use project or folder' },
        { id: 'c', text: 'Request a corrected historical billing export from Cloud support', whyWrong: 'The export reflects what was recorded at the time. There is no backfill of metadata that did not exist.' },
        { id: 'd', text: 'Use billing account credits to reallocate the historical spend', whyWrong: 'Credits adjust amounts owed. They are not an attribution mechanism.' },
      ],
      correctId: 'b',
    },
    origin: 'seed',
    criticScore: null,
  },
  {
    id: 'g2.billing.egress',
    mode: 'drill',
    nodeIds: ['gcp.billing', 'gcp.vpc'],
    difficulty: 'deep',
    explanation:
      'Compute and storage prices are easy to model, and network egress is the line that surprises people, because it is driven by traffic patterns nobody drew on the architecture diagram. Splitting chatty services across regions or zones puts a per-gigabyte charge on every internal call, and a data-heavy service serving users directly from another continent pays twice. Ask where the bytes flow before sizing anything.',
    citations: cite('waf'),
    payload: {
      kind: 'multi',
      stem: 'Which of these design choices commonly produce unpleasant network egress bills? Select all that apply.',
      choices: [
        { id: 'a', text: 'Two chatty microservices deployed in different regions, exchanging large payloads on every request' },
        { id: 'b', text: 'Serving large media files to global users directly from a bucket in one region, with no CDN in front' },
        { id: 'c', text: 'A data pipeline reading from a bucket in one region and writing to a warehouse in another' },
        { id: 'd', text: 'Two services in the same zone communicating over internal addresses', whyWrong: 'Traffic within a zone over internal addresses is the cheapest path there is. This is the pattern you want.' },
        { id: 'e', text: 'A VM reading from Cloud Storage in the same region through Private Google Access', whyWrong: 'Same-region access to Google services over a private path is not the source of surprise egress bills.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
    origin: 'seed',
    criticScore: null,
  },
];
