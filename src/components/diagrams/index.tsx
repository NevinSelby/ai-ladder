import type { ComponentType } from 'react';
import { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme';
import { isDiagramId, type DiagramId } from '@shared/diagrams';

import {
  Blocked,
  Boundary,
  Caption,
  DiagramFrame,
  Edge,
  Node,
  VB,
  type DiagramProps,
} from './primitives';

/**
 * Concept diagrams.
 *
 * These exist because a handful of ideas in this curriculum are re-derived
 * wrongly from prose every single time, perimeter versus private path, who
 * holds the token in a delegated call, where a thin slice actually cuts. A
 * picture settles those in a way a paragraph does not.
 *
 * All inline SVG: no assets, no network, and every color comes from the live
 * palette so a diagram never fights the page it sits on.
 */

// ── Networking: the perimeter/path confusion ───────────────────────────────

function VpcScVsPsc({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="Private Service Connect changes the path. VPC Service Controls changes what may leave. A credentialed insider is stopped only by the perimeter.">
      <Boundary x={8} y={22} w={196} h={150} label="VPC-SC perimeter" tone="accent" theme={t} />
      <Node x={22} y={46} w={78} h={32} label="Your VPC" sub="workloads" theme={t} />
      <Node x={22} y={112} w={78} h={32} label="BigQuery" sub="in perimeter" tone="accent" theme={t} />
      <Node x={120} y={79} w={72} h={32} label="PSC" sub="private path" tone="good" theme={t} />

      <Edge from={[61, 78]} to={[61, 110]} theme={t} />
      <Edge from={[100, 62]} to={[118, 88]} tone="accent" theme={t} />
      <Edge from={[120, 103]} to={[100, 118]} tone="accent" theme={t} />

      <Node x={244} y={79} w={82} h={32} label="Personal" sub="project" tone="bad" theme={t} />
      <Edge from={[204, 95]} to={[240, 95]} tone="bad" theme={t} />
      <Blocked x={222} y={95} theme={t} />
      <Caption x={285} y={128} text="copy denied" theme={t} anchor="middle" tone="bad" />
      <Caption x={106} y={188} text="valid credentials, still blocked" theme={t} anchor="middle" tone="faint" />
    </DiagramFrame>
  );
}

// ── Retrieval ──────────────────────────────────────────────────────────────

function RagPipeline({ width }: DiagramProps) {
  const t = useTheme();
  const y = 44;
  return (
    <DiagramFrame
      width={width}
      caption="Retrieve wide and cheap, then rerank narrow and expensive. The reranker sees query and passage together, which an independently computed embedding never does.">
      <Node x={6} y={y} w={58} h={30} label="Chunk" sub="+ metadata" theme={t} />
      <Node x={78} y={y} w={58} h={30} label="Embed" theme={t} />
      <Node x={150} y={y} w={62} h={30} label="Index" sub="hybrid" tone="accent" theme={t} />
      <Node x={226} y={y} w={58} h={30} label="Rerank" tone="accent" theme={t} />
      <Node x={6} y={132} w={58} h={30} label="Answer" tone="good" theme={t} />
      <Node x={92} y={132} w={72} h={30} label="Generate" theme={t} />
      <Node x={190} y={132} w={94} h={30} label="Top-k passages" theme={t} />

      <Edge from={[64, y + 15]} to={[76, y + 15]} theme={t} />
      <Edge from={[136, y + 15]} to={[148, y + 15]} theme={t} />
      <Edge from={[212, y + 15]} to={[224, y + 15]} theme={t} />
      <Edge from={[255, y + 30]} to={[255, 130]} theme={t} />
      <Edge from={[190, 147]} to={[166, 147]} theme={t} />
      <Edge from={[92, 147]} to={[66, 147]} tone="good" theme={t} />

      <Caption x={170} y={100} text="lexical + vector fusion" theme={t} anchor="middle" tone="faint" />
      <Caption x={145} y={186} text="every claim carries a citation back to its passage" theme={t} anchor="middle" tone="faint" />
    </DiagramFrame>
  );
}

// ── Agents ─────────────────────────────────────────────────────────────────

function AgentLoop({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="Retrieved content is data, never authority. Consequential tool calls sit behind a gate regardless of what the context appears to instruct.">
      <Node x={16} y={78} w={72} h={34} label="Model" sub="plans" tone="accent" theme={t} />
      <Node x={132} y={26} w={80} h={30} label="Retrieval" sub="untrusted" tone="warn" theme={t} />
      <Node x={132} y={132} w={80} h={30} label="Read tools" tone="good" theme={t} />
      <Node x={244} y={78} w={82} h={34} label="Write tools" sub="gated" tone="bad" theme={t} />
      <Node x={132} y={78} w={80} h={34} label="Policy gate" sub="human approval" tone="accent" theme={t} />

      <Edge from={[88, 88]} to={[130, 48]} theme={t} />
      <Edge from={[88, 95]} to={[130, 95]} tone="accent" theme={t} />
      <Edge from={[88, 104]} to={[130, 142]} theme={t} />
      <Edge from={[212, 95]} to={[242, 95]} tone="bad" label="approve" theme={t} />

      <Caption x={172} y={18} text="prompt injection arrives here" theme={t} anchor="middle" tone="bad" />
      <Caption x={172} y={186} text="step cap · wall clock · token budget · loop detection" theme={t} anchor="middle" tone="faint" />
    </DiagramFrame>
  );
}

// ── Identity: delegated access ─────────────────────────────────────────────

function OauthObo({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="Token exchange (RFC 8693) trades the agent's own token for a scoped, short-lived one that still names the user as subject. The agent never holds the user's credential.">
      <Node x={8} y={30} w={70} h={32} label="User" theme={t} />
      <Node x={8} y={120} w={70} h={32} label="Agent" sub="actor" tone="accent" theme={t} />
      <Node x={126} y={74} w={92} h={34} label="Auth server" sub="token exchange" tone="accent" theme={t} />
      <Node x={254} y={30} w={78} h={32} label="Resource A" tone="good" theme={t} />
      <Node x={254} y={120} w={78} h={32} label="Resource B" tone="bad" theme={t} />

      <Edge from={[78, 46]} to={[124, 78]} label="consent" theme={t} />
      <Edge from={[78, 136]} to={[124, 104]} label="own token" tone="accent" theme={t} />
      <Edge from={[218, 82]} to={[252, 50]} tone="good" label="scoped" theme={t} />
      <Edge from={[218, 100]} to={[248, 130]} tone="bad" theme={t} />
      <Blocked x={236} y={118} theme={t} />

      <Caption x={170} y={176} text="sub = user · act = agent · aud = one resource · short TTL" theme={t} anchor="middle" tone="faint" />
      <Caption x={293} y={168} text="out of scope" theme={t} anchor="middle" tone="bad" />
    </DiagramFrame>
  );
}

// ── Data: cutover ordering ─────────────────────────────────────────────────

function CdcCutover({ width }: DiagramProps) {
  const t = useTheme();
  const lane = (y: number) => (
    <Line x1={16} y1={y} x2={324} y2={y} stroke={t.border} strokeWidth={1} />
  );
  return (
    <DiagramFrame
      width={width}
      caption="Capture first, then snapshot, then replay. Snapshot-then-stream leaves a gap containing exactly the rows that changed during the snapshot, the busiest and most noticed records.">
      {lane(58)}
      {lane(112)}
      <Caption x={16} y={44} text="RIGHT" theme={t} tone="good" />
      <Caption x={16} y={98} text="WRONG" theme={t} tone="bad" />

      <Rect x={16} y={48} width={128} height={20} rx={5} fill={t.positiveSoft} stroke={t.positive} strokeWidth={1} />
      <SvgText x={80} y={62} fill={t.text} fontSize={8.5} fontWeight="600" textAnchor="middle">
        capture stream
      </SvgText>
      <Rect x={152} y={48} width={84} height={20} rx={5} fill={t.surface} stroke={t.borderStrong} strokeWidth={1} />
      <SvgText x={194} y={62} fill={t.text} fontSize={8.5} textAnchor="middle">
        snapshot
      </SvgText>
      <Rect x={244} y={48} width={80} height={20} rx={5} fill={t.accentSoft} stroke={t.accent} strokeWidth={1} />
      <SvgText x={284} y={62} fill={t.text} fontSize={8.5} textAnchor="middle">
        replay
      </SvgText>

      <Rect x={16} y={102} width={84} height={20} rx={5} fill={t.surface} stroke={t.borderStrong} strokeWidth={1} />
      <SvgText x={58} y={116} fill={t.text} fontSize={8.5} textAnchor="middle">
        snapshot
      </SvgText>
      <Rect x={108} y={102} width={54} height={20} rx={5} fill={t.negativeSoft} stroke={t.negative} strokeWidth={1} strokeDasharray="4 3" />
      <SvgText x={135} y={116} fill={t.negative} fontSize={8} fontWeight="700" textAnchor="middle">
        gap
      </SvgText>
      <Rect x={170} y={102} width={154} height={20} rx={5} fill={t.surface} stroke={t.borderStrong} strokeWidth={1} />
      <SvgText x={247} y={116} fill={t.text} fontSize={8.5} textAnchor="middle">
        capture stream
      </SvgText>

      <Caption x={170} y={150} text="every write must be idempotent on a business key, not on a message id" theme={t} anchor="middle" tone="faint" />
      <Caption x={170} y={168} text="query-based CDC cannot see deletes. The row is simply absent" theme={t} anchor="middle" tone="faint" />
    </DiagramFrame>
  );
}

// ── Tenancy ────────────────────────────────────────────────────────────────

function TenancyModels({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="Tenancy trades unit cost against blast radius. Regulated customers routinely pay for isolation, knowing which model you are selling is a scoping decision, not a deployment detail.">
      <Boundary x={8} y={26} w={100} h={116} label="Shared" theme={t} />
      <Node x={20} y={48} w={76} h={22} label="one database" theme={t} />
      <Node x={20} y={76} w={76} h={22} label="row-level ACL" tone="warn" theme={t} />
      <Node x={20} y={104} w={76} h={22} label="one runtime" theme={t} />
      <Caption x={58} y={158} text="cheapest" theme={t} anchor="middle" />
      <Caption x={58} y={172} text="widest blast radius" theme={t} anchor="middle" tone="bad" />

      <Boundary x={120} y={26} w={100} h={116} label="Per tenant" tone="accent" theme={t} />
      <Node x={132} y={48} w={76} h={22} label="own project" tone="accent" theme={t} />
      <Node x={132} y={76} w={76} h={22} label="own keys" tone="accent" theme={t} />
      <Node x={132} y={104} w={76} h={22} label="own runtime" tone="accent" theme={t} />
      <Caption x={170} y={158} text="strong isolation" theme={t} anchor="middle" tone="good" />
      <Caption x={170} y={172} text="higher unit cost" theme={t} anchor="middle" />

      <Boundary x={232} y={26} w={100} h={116} label="Their cloud" tone="good" theme={t} />
      <Node x={244} y={48} w={76} h={22} label="their account" tone="good" theme={t} />
      <Node x={244} y={76} w={76} h={22} label="their perimeter" tone="good" theme={t} />
      <Node x={244} y={104} w={76} h={22} label="you operate it" tone="bad" theme={t} />
      <Caption x={282} y={158} text="their controls" theme={t} anchor="middle" tone="good" />
      <Caption x={282} y={172} text="hardest to run" theme={t} anchor="middle" tone="bad" />
    </DiagramFrame>
  );
}

// ── Delivery: the thin slice ───────────────────────────────────────────────

function ThinSlice({ width }: DiagramProps) {
  const t = useTheme();
  const layers = ['Interface', 'Orchestration', 'Retrieval', 'Ingestion', 'Source system'];
  return (
    <DiagramFrame
      width={width}
      caption="Narrow in scope, complete in depth. One real record traveling the whole path, through the layer you are least sure about, beats four finished layers that prove nothing.">
      {layers.map((label, i) => {
        const y = 24 + i * 30;
        return (
          <G key={label}>
            <Rect x={16} y={y} width={230} height={24} rx={5} fill={t.surface} stroke={t.border} strokeWidth={1} />
            <SvgText x={26} y={y + 16} fill={t.textMuted} fontSize={9}>
              {label}
            </SvgText>
            <Rect x={182} y={y} width={64} height={24} rx={5} fill={t.accentSoft} stroke={t.accent} strokeWidth={1.3} />
          </G>
        );
      })}
      <Caption x={214} y={18} text="thin slice" theme={t} anchor="middle" tone="good" />
      <Caption x={100} y={190} text="broad and shallow proves nothing by week ten" theme={t} anchor="middle" tone="faint" />
      <Node x={262} y={72} w={68} h={38} label="Riskiest" sub="unknown" tone="bad" theme={t} />
      <Edge from={[248, 91]} to={[260, 91]} tone="bad" theme={t} />
    </DiagramFrame>
  );
}

// ── Scaling: streaming fan-out ─────────────────────────────────────────────

function SseFanout({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="SSE is the default transport for token delivery. The ceiling is memory per connection, so buffers must be bounded. An unbounded buffer turns a slow consumer into an out-of-memory crash.">
      <Node x={8} y={82} w={72} h={34} label="Model API" tone="accent" theme={t} />
      <Node x={112} y={82} w={92} h={34} label="Bounded queue" sub="backpressure" tone="warn" theme={t} />
      <Node x={244} y={22} w={82} h={26} label="Client 1" tone="good" theme={t} />
      <Node x={244} y={58} w={82} h={26} label="Client 2" tone="good" theme={t} />
      <Node x={244} y={130} w={82} h={26} label="Client N" tone="good" theme={t} />

      <Edge from={[80, 99]} to={[110, 99]} tone="accent" theme={t} />
      <Edge from={[204, 92]} to={[242, 40]} theme={t} />
      <Edge from={[204, 99]} to={[242, 72]} theme={t} />
      <Edge from={[204, 108]} to={[242, 138]} theme={t} />

      <Caption x={285} y={104} text="slow consumer" theme={t} anchor="middle" tone="bad" />
      <Caption x={158} y={140} text="drop or block, never grow unbounded" theme={t} anchor="middle" tone="bad" />
      <Caption x={170} y={186} text="a canceled stream may never send its usage event: undercounted spend" theme={t} anchor="middle" tone="faint" />
    </DiagramFrame>
  );
}

// ── Platform: resource hierarchy ───────────────────────────────────────────

function LandingZone({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="Constraints applied at the folder are evaluated when a resource is created, so a non-compliant deployment fails rather than succeeding and being caught in a report later.">
      <Node x={126} y={16} w={88} h={28} label="Organization" sub="org policy" tone="accent" theme={t} />
      <Node x={22} y={78} w={88} h={30} label="Prod folder" sub="EU only · CMEK" tone="good" theme={t} />
      <Node x={126} y={78} w={88} h={30} label="Non-prod" theme={t} />
      <Node x={230} y={78} w={92} h={30} label="Regulated" sub="Assured Workloads" tone="accent" theme={t} />

      <Edge from={[160, 44]} to={[80, 76]} theme={t} />
      <Edge from={[170, 44]} to={[170, 76]} theme={t} />
      <Edge from={[180, 44]} to={[262, 76]} theme={t} />

      <Node x={22} y={140} w={40} h={24} label="proj" theme={t} />
      <Node x={70} y={140} w={40} h={24} label="proj" theme={t} />
      <Node x={230} y={140} w={40} h={24} label="proj" theme={t} />
      <Node x={278} y={140} w={44} h={24} label="proj" tone="bad" theme={t} />
      <Edge from={[52, 108]} to={[42, 138]} theme={t} />
      <Edge from={[76, 108]} to={[90, 138]} theme={t} />
      <Edge from={[262, 108]} to={[250, 138]} theme={t} />
      <Blocked x={300} y={124} theme={t} />
      <Caption x={300} y={182} text="us-central1 create denied" theme={t} anchor="middle" tone="bad" />
    </DiagramFrame>
  );
}

// ── Latency budget ─────────────────────────────────────────────────────────

function LatencyBudget({ width }: DiagramProps) {
  const t = useTheme();
  const stages: [string, number, string][] = [
    ['retrieve', 60, t.accent],
    ['rerank', 45, t.warning],
    ['call 1', 95, t.negative],
    ['call 2', 95, t.negative],
  ];
  let x = 16;
  return (
    <DiagramFrame
      width={width}
      caption="Budgets are additive, and each sequential model call spends from the same pot. Write the per-stage budget before building, not after someone has promised the number.">
      <Rect x={16} y={54} width={300} height={30} rx={6} fill={t.elevated} stroke={t.border} strokeWidth={1} />
      {stages.map(([label, w, color]) => {
        const el = (
          <G key={label}>
            <Rect x={x} y={54} width={w} height={30} rx={6} fill={color + '33'} stroke={color} strokeWidth={1.1} />
            <SvgText x={x + w / 2} y={73} fill={t.text} fontSize={8.5} fontWeight="600" textAnchor="middle">
              {label}
            </SvgText>
          </G>
        );
        x += w;
        return el;
      })}
      <Line x1={316} y1={44} x2={316} y2={94} stroke={t.negative} strokeWidth={1.6} strokeDasharray="4 3" />
      <Caption x={316} y={38} text="2s p95" theme={t} anchor="end" tone="bad" />
      <Caption x={166} y={112} text="two sequential model calls have a floor you cannot optimize past" theme={t} anchor="middle" tone="faint" />
      <Caption x={166} y={140} text="Streaming does not reduce total time, it changes what the user perceives," theme={t} anchor="middle" tone="faint" />
      <Caption x={166} y={154} text="which is why time-to-first-token is the number worth defending." theme={t} anchor="middle" tone="faint" />
    </DiagramFrame>
  );
}

// ── Registry ───────────────────────────────────────────────────────────────

/**
 * Typed by `DiagramId`, so adding an id to shared/diagrams.ts without drawing it
 *, or drawing one without registering the id, is a compile error rather than a
 * blank space where a diagram should be.
 */
export const DIAGRAMS: Record<DiagramId, ComponentType<DiagramProps>> = {
  'vpcsc-vs-psc': VpcScVsPsc,
  'rag-pipeline': RagPipeline,
  'agent-loop': AgentLoop,
  'oauth-obo': OauthObo,
  'cdc-cutover': CdcCutover,
  'tenancy-models': TenancyModels,
  'thin-slice': ThinSlice,
  'sse-fanout': SseFanout,
  'landing-zone': LandingZone,
  'latency-budget': LatencyBudget,
  'retry-backoff': RetryBackoff,
  'cache-stampede': CacheStampede,
  'hot-partition': HotPartition,
  'eval-harness': EvalHarness,
  'expand-contract': ExpandContract,
  'injection-blast': InjectionBlast,
};


// ── Reliability: the three controls people conflate ────────────────────────

function RetryBackoff({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="Deadlines shrink inward, so nobody works for a caller who has already left. Retries need jitter or every client returns together. The breaker exists for the case where retrying at all is the problem.">
      <Node x={6} y={30} w={72} h={32} label="Edge" sub="10s budget" tone="accent" theme={t} />
      <Node x={104} y={30} w={72} h={32} label="Service B" sub="8s left" theme={t} />
      <Node x={202} y={30} w={78} h={32} label="Service C" sub="6s left" theme={t} />

      <Edge from={[78, 46]} to={[102, 46]} theme={t} label="deadline" />
      <Edge from={[176, 46]} to={[200, 46]} theme={t} label="deadline" />

      <Caption x={144} y={82} text="each hop passes the time that remains" theme={t} anchor="middle" tone="faint" />

      <Node x={6} y={104} w={96} h={32} label="Retry" sub="backoff + jitter" tone="good" theme={t} />
      <Node x={126} y={104} w={92} h={32} label="Breaker" sub="open on failure" tone="warn" theme={t} />
      <Node x={238} y={104} w={62} h={32} label="Shed" tone="bad" theme={t} />

      <Edge from={[102, 120]} to={[124, 120]} theme={t} />
      <Edge from={[218, 120]} to={[236, 120]} tone="bad" theme={t} />
      <Caption x={150} y={166} text="retrying into an overloaded service adds load to the fire" theme={t} anchor="middle" tone="faint" />
    </DiagramFrame>
  );
}

function CacheStampede({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="One TTL expiry releases every waiting request at once, so the cache becomes the cause of the outage. Single-flight lets one request rebuild while the rest wait or read stale.">
      <Node x={6} y={26} w={78} h={30} label="Requests" sub="all concurrent" theme={t} />
      <Node x={112} y={26} w={78} h={30} label="Cache" sub="key expired" tone="warn" theme={t} />
      <Node x={222} y={26} w={78} h={30} label="Database" tone="bad" theme={t} />

      <Edge from={[84, 41]} to={[110, 41]} theme={t} />
      <Edge from={[190, 34]} to={[220, 34]} tone="bad" theme={t} />
      <Edge from={[190, 41]} to={[220, 41]} tone="bad" theme={t} />
      <Edge from={[190, 48]} to={[220, 48]} tone="bad" theme={t} />
      <Caption x={205} y={70} text="N misses" theme={t} anchor="middle" tone="bad" />

      <Node x={6} y={112} w={78} h={30} label="Requests" theme={t} />
      <Node x={112} y={112} w={78} h={30} label="Single flight" sub="one rebuilds" tone="good" theme={t} />
      <Node x={222} y={112} w={78} h={30} label="Database" tone="good" theme={t} />

      <Edge from={[84, 127]} to={[110, 127]} theme={t} />
      <Edge from={[190, 127]} to={[220, 127]} tone="good" theme={t} />
      <Caption x={205} y={156} text="1 miss, others serve stale" theme={t} anchor="middle" tone="faint" />
    </DiagramFrame>
  );
}

function HotPartition({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="Throughput is provisioned for the table but spent per partition. One popular key saturates its own shard while the others idle, and the table-level metric looks healthy throughout.">
      <Node x={10} y={34} w={64} h={30} label="Shard 1" sub="4%" theme={t} />
      <Node x={88} y={34} w={64} h={30} label="Shard 2" sub="96%" tone="bad" theme={t} />
      <Node x={166} y={34} w={64} h={30} label="Shard 3" sub="6%" theme={t} />
      <Node x={244} y={34} w={64} h={30} label="Shard 4" sub="3%" theme={t} />

      <Caption x={120} y={84} text="one celebrity key" theme={t} anchor="middle" tone="bad" />
      <Edge from={[120, 90]} to={[120, 66]} tone="bad" theme={t} />

      <Node x={70} y={116} w={178} h={32} label="Table metric: 27% used" sub="nothing looks wrong" tone="warn" theme={t} />
      <Caption x={159} y={170} text="fix by spreading the key, not by raising the ceiling" theme={t} anchor="middle" tone="faint" />
    </DiagramFrame>
  );
}

function EvalHarness({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="The gate is the point. Without a threshold that can block a release, an eval is a dashboard nobody reads, and production failures are what feed the golden set back.">
      <Node x={6} y={30} w={80} h={32} label="Golden set" sub="from real traffic" tone="accent" theme={t} />
      <Node x={112} y={30} w={70} h={32} label="Candidate" sub="prompt + model" theme={t} />
      <Node x={208} y={30} w={92} h={32} label="Judge" sub="fixed criteria" theme={t} />

      <Edge from={[86, 46]} to={[110, 46]} theme={t} />
      <Edge from={[182, 46]} to={[206, 46]} theme={t} />

      <Node x={112} y={106} w={70} h={32} label="Gate" sub="threshold" tone="warn" theme={t} />
      <Node x={6} y={106} w={80} h={32} label="Ship" tone="good" theme={t} />
      <Node x={208} y={106} w={92} h={32} label="Block" tone="bad" theme={t} />

      <Edge from={[254, 62]} to={[254, 104]} theme={t} />
      <Edge from={[208, 122]} to={[184, 122]} tone="bad" theme={t} />
      <Edge from={[110, 122]} to={[88, 122]} tone="good" theme={t} />
      <Caption x={150} y={166} text="production failures rejoin the golden set" theme={t} anchor="middle" tone="faint" />
    </DiagramFrame>
  );
}

function ExpandContract({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="Never ship a change that requires code and schema to deploy in the same instant. Add the new shape, write to both, backfill, move reads, and only then drop the old one.">
      <Node x={6} y={32} w={68} h={30} label="Expand" sub="add column" tone="good" theme={t} />
      <Node x={88} y={32} w={68} h={30} label="Dual write" theme={t} />
      <Node x={170} y={32} w={62} h={30} label="Backfill" theme={t} />
      <Node x={246} y={32} w={58} h={30} label="Read new" tone="accent" theme={t} />

      <Edge from={[74, 47]} to={[86, 47]} theme={t} />
      <Edge from={[156, 47]} to={[168, 47]} theme={t} />
      <Edge from={[232, 47]} to={[244, 47]} theme={t} />

      <Node x={88} y={112} w={140} h={32} label="Contract" sub="drop old column" tone="warn" theme={t} />
      <Edge from={[275, 62]} to={[275, 112]} theme={t} />
      <Edge from={[246, 128]} to={[230, 128]} theme={t} />
      <Caption x={158} y={168} text="every step is independently reversible" theme={t} anchor="middle" tone="faint" />
    </DiagramFrame>
  );
}

function InjectionBlast({ width }: DiagramProps) {
  const t = useTheme();
  return (
    <DiagramFrame
      width={width}
      caption="A system prompt is a request, not a control. Assume the model can be persuaded, then bound what it is able to reach: the blast radius is the union of its tools' permissions.">
      <Node x={6} y={30} w={78} h={32} label="Hostile input" sub="in a ticket" tone="bad" theme={t} />
      <Node x={112} y={30} w={78} h={32} label="Agent" theme={t} />
      <Edge from={[84, 46]} to={[110, 46]} tone="bad" theme={t} />

      <Node x={216} y={22} w={88} h={28} label="Admin token" tone="bad" theme={t} />
      <Node x={216} y={62} w={88} h={28} label="Scoped, read" tone="good" theme={t} />
      <Edge from={[190, 40]} to={[214, 36]} tone="bad" theme={t} />
      <Edge from={[190, 52]} to={[214, 76]} tone="good" theme={t} />

      <Caption x={260} y={106} text="deletes everything vs reads one ticket" theme={t} anchor="middle" tone="faint" />

      <Boundary x={104} y={124} h={44} w={200} label="what the grant allows" tone="accent" theme={t} />
      <Caption x={204} y={152} text="the only boundary that holds" theme={t} anchor="middle" tone="good" />
    </DiagramFrame>
  );
}

export function Diagram({ id, width }: { id: string; width: number }) {
  if (!isDiagramId(id)) return null;
  const Component = DIAGRAMS[id];
  return <Component width={width} />;
}

export { VB };
