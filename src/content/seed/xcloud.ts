import type { DrillItem } from '@shared/content';

import { cite } from '../sources';

/**
 * Cross-cloud mapping.
 *
 * Only useful once more than one cloud exists in the bank, which is now. These
 * are tagged neutral on purpose: the translation layer is exactly what someone
 * needs when a customer runs a cloud they do not, and hiding it behind a cloud
 * preference would defeat the point.
 *
 * Mappings are deliberately about the shape of the control rather than feature
 * checklists, because the checklists drift and the shapes do not.
 */
export const DRILL_XCLOUD: DrillItem[] = [
  {
    id: 'xc.private.connectivity',
    mode: 'drill',
    nodeIds: ['xcloud.mapping'],
    difficulty: 'core',
    explanation:
      'All three clouds solved the same problem the same way: expose a service by private IP inside the consumer network, so nothing traverses a public endpoint. The names differ, the topology does not, and being able to translate on the spot is what makes you useful in a room that runs a different cloud than you do.',
    citations: cite('psc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each cloud to its private service connectivity offering.',
      pairs: [
        { left: 'Google Cloud', right: 'Private Service Connect' },
        { left: 'AWS', right: 'PrivateLink with interface endpoints' },
        { left: 'Azure', right: 'Private Link with Private Endpoints' },
      ],
    },
  },
  {
    id: 'xc.identity.federation',
    mode: 'drill',
    nodeIds: ['xcloud.mapping'],
    difficulty: 'core',
    explanation:
      'Every cloud eventually built the same escape from stored keys: trade an external OIDC token for short-lived cloud credentials. If a customer asks how to stop emailing you a key file, the answer has the same shape wherever they are.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match the keyless workload authentication mechanism to its cloud.',
      pairs: [
        { left: 'Google Cloud', right: 'Workload Identity Federation' },
        { left: 'AWS', right: 'IAM roles with OIDC federation' },
        { left: 'Azure', right: 'Managed identity and workload identity federation' },
      ],
    },
  },
  {
    id: 'xc.guardrails.policy',
    mode: 'drill',
    nodeIds: ['xcloud.mapping'],
    difficulty: 'deep',
    explanation:
      'Organization-level guardrails that a project owner cannot override are the control every enterprise security team asks for by the second meeting. All three exist; only the vocabulary changes.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each cloud to the control that constrains what a subordinate account may do.',
      pairs: [
        { left: 'Google Cloud', right: 'Organization Policy constraints' },
        { left: 'AWS', right: 'Service Control Policies' },
        { left: 'Azure', right: 'Azure Policy with deny effects' },
      ],
    },
  },
  {
    id: 'xc.managed.models',
    mode: 'drill',
    nodeIds: ['xcloud.mapping', 'ai.cost'],
    difficulty: 'core',
    explanation:
      'The commercial shape is identical everywhere: a managed endpoint serving third-party models on the cloud provider’s paper, so procurement does not have to onboard a new vendor. That is usually the deciding factor, not the model list.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each cloud to its managed catalog for third-party and first-party models.',
      pairs: [
        { left: 'Google Cloud', right: 'Model Garden on the Gemini Enterprise Agent Platform' },
        { left: 'AWS', right: 'Amazon Bedrock' },
        { left: 'Azure', right: 'Microsoft Foundry model catalog' },
      ],
    },
  },
  {
    id: 'xc.perimeter.shape',
    mode: 'drill',
    nodeIds: ['xcloud.mapping', 'sec.residency'],
    difficulty: 'edge',
    explanation:
      'This is the mapping that does not map cleanly, and knowing that is the point. VPC Service Controls draws a data-exfiltration perimeter around API surfaces themselves, which has no exact equivalent elsewhere; the closest approximations combine endpoint policies, resource policies and network controls, and a customer told otherwise will discover the gap during a design review.',
    citations: cite('vpcsc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer moving from Google Cloud asks for "the VPC Service Controls equivalent" on another cloud. What is the honest answer?',
      choices: [
        {
          id: 'a',
          text: 'There is no single equivalent; the same outcome is assembled from endpoint policies, resource policies and network controls',
        },
        {
          id: 'b',
          text: 'Security groups provide the same guarantee',
          whyWrong:
            'Security groups filter network traffic to instances. They say nothing about which identities may call a managed API, which is the property a perimeter provides.',
        },
        {
          id: 'c',
          text: 'A private endpoint alone is equivalent',
          whyWrong:
            'A private endpoint controls the path to a service, not whether data may leave it to another tenant or project. That is the exfiltration case the perimeter targets.',
        },
        {
          id: 'd',
          text: 'Encryption with customer managed keys is equivalent',
          whyWrong:
            'Key control governs decryption, not egress. Data can be read legitimately and still sent somewhere it should not go.',
        },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'xc.migration.framing',
    mode: 'drill',
    nodeIds: ['xcloud.mapping', 'cust.expectations'],
    difficulty: 'deep',
    explanation:
      'Multi-cloud is usually an acquisition artifact rather than a strategy, and treating it as a strategy leads to a lowest-common-denominator architecture that is worse on every cloud. The useful move is naming which workloads genuinely need portability and letting the rest be native.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer runs Azure from an acquisition and Google Cloud everywhere else, and asks you to design "cloud agnostic" so they are never locked in. What do you propose?',
      choices: [
        {
          id: 'a',
          text: 'Identify the few workloads that genuinely need portability, keep the rest native, and make the seam explicit',
        },
        {
          id: 'b',
          text: 'Build everything on Kubernetes so it runs anywhere',
          whyWrong:
            'Containers port; the managed data stores, identity model and AI services around them do not. This buys the appearance of portability at the price of running the platform yourself.',
        },
        {
          id: 'c',
          text: 'Standardize on the features both clouds share',
          whyWrong:
            'The intersection of two clouds is worse than either one. You pay for two clouds and get the capability of neither.',
        },
        {
          id: 'd',
          text: 'Consolidate onto one cloud before doing anything else',
          whyWrong:
            'Sometimes correct eventually, but a migration is not a prerequisite for the project they asked about, and proposing one is how a six-week engagement becomes an eighteen-month one.',
        },
      ],
      correctId: 'a',
    },
  },
];
