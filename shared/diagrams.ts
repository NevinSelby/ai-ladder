/**
 * Diagram ids.
 *
 * Kept as a plain list here rather than derived from the React registry so the
 * content validator (which runs in node, with no React Native) and the generator
 * prompt can both reference it. `src/components/diagrams` asserts that its
 * registry covers exactly this list, so the two cannot drift.
 */

export const DIAGRAM_IDS = [
  'vpcsc-vs-psc',
  'rag-pipeline',
  'agent-loop',
  'oauth-obo',
  'cdc-cutover',
  'tenancy-models',
  'thin-slice',
  'sse-fanout',
  'landing-zone',
  'latency-budget',
] as const;

export type DiagramId = (typeof DIAGRAM_IDS)[number];

export const DIAGRAM_TITLES: Record<DiagramId, string> = {
  'vpcsc-vs-psc': 'Perimeter versus private path',
  'rag-pipeline': 'Retrieval pipeline',
  'agent-loop': 'Agent loop and the policy gate',
  'oauth-obo': 'Delegated access by token exchange',
  'cdc-cutover': 'Zero-gap CDC cutover',
  'tenancy-models': 'Tenancy models',
  'thin-slice': 'The thin slice',
  'sse-fanout': 'Streaming fan-out',
  'landing-zone': 'Landing zone and org policy',
  'latency-budget': 'Latency budget',
};

export function isDiagramId(value: string): value is DiagramId {
  return (DIAGRAM_IDS as readonly string[]).includes(value);
}
