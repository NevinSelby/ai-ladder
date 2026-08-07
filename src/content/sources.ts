import type { Citation } from '@shared/content';

/**
 * Named citations, so a doc URL lives in exactly one place. When the staleness
 * sweep learns a page moved, one edit here fixes every item that cites it.
 */
export const SRC = {
  vpcsc: {
    title: 'VPC Service Controls overview',
    url: 'https://cloud.google.com/vpc-service-controls/docs/overview',
  },
  psc: {
    title: 'Private Service Connect',
    url: 'https://cloud.google.com/vpc/docs/private-service-connect',
  },
  wif: {
    title: 'Workload Identity Federation',
    url: 'https://cloud.google.com/iam/docs/workload-identity-federation',
  },
  cmek: {
    title: 'Customer-managed encryption keys (CMEK)',
    url: 'https://cloud.google.com/kms/docs/cmek',
  },
  assured: {
    title: 'Assured Workloads overview',
    url: 'https://cloud.google.com/assured-workloads/docs/overview',
  },
  pubsubOrdering: {
    title: 'Pub/Sub message ordering',
    url: 'https://cloud.google.com/pubsub/docs/ordering',
  },
  bqPartition: {
    title: 'BigQuery partitioned tables',
    url: 'https://cloud.google.com/bigquery/docs/partitioned-tables',
  },
  cloudRun: {
    title: 'What is Cloud Run',
    url: 'https://cloud.google.com/run/docs/overview/what-is-cloud-run',
  },
  modelArmor: {
    title: 'Model Armor overview',
    url: 'https://cloud.google.com/security-command-center/docs/model-armor-overview',
  },
  genaiSecurity: {
    title: 'Generative AI security controls on Vertex',
    url: 'https://cloud.google.com/vertex-ai/generative-ai/docs/security-controls',
  },
  agentEngine: {
    title: 'Vertex AI Agent Engine overview',
    url: 'https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview',
  },
  adk: { title: 'Agent Development Kit docs', url: 'https://google.github.io/adk-docs/' },
  geap: {
    title: 'Introducing the Gemini Enterprise Agent Platform',
    url: 'https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise-agent-platform',
  },
  waf: {
    title: 'Google Cloud Well-Architected Framework',
    url: 'https://cloud.google.com/architecture/framework',
  },
  mcp: { title: 'Model Context Protocol', url: 'https://modelcontextprotocol.io/introduction' },
  mcpArchitecture: {
    title: 'MCP architecture overview: primitives and scope',
    url: 'https://modelcontextprotocol.io/docs/learn/architecture',
  },
  a2a: {
    title: 'Agent2Agent (A2A) Protocol Specification',
    url: 'https://a2a-protocol.org/latest/specification/',
  },
  modelGarden: {
    title: 'Overview of Model Garden',
    url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-garden/explore-models',
  },
  auditLogs: {
    title: 'Cloud Audit Logs overview',
    url: 'https://docs.cloud.google.com/logging/docs/audit',
  },
  awsWaf: {
    title: 'AWS Well-Architected Framework',
    url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html',
  },
  awsIam: {
    title: 'AWS IAM User Guide',
    url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html',
  },
  awsPrivatelink: {
    title: 'What is AWS PrivateLink?',
    url: 'https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html',
  },
  awsBedrock: {
    title: 'What is Amazon Bedrock?',
    url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html',
  },
  awsBedrockGuardrails: {
    title: 'Amazon Bedrock Guardrails',
    url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html',
  },
} satisfies Record<string, Citation>;

export type SourceKey = keyof typeof SRC;

export const cite = (...keys: SourceKey[]): Citation[] => keys.map((key) => SRC[key]);
