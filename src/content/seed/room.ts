import type { RoomItem } from '@shared/content';

import { cite } from '../sources';

/**
 * The Room seed bank.
 *
 * Each scenario plants exactly one overpromise trap, a moment where the
 * frictionless answer is a commitment you cannot keep. The grader scores that
 * moment specifically, because "never overpromise" is the one FDE behavior that
 * is easy to state, universally agreed, and quietly violated under social
 * pressure by almost everyone practicing alone.
 *
 * `hiddenAgenda` never reaches the player. `groundTruth` is what the persona is
 * allowed to treat as fact, so the simulation cannot invent a way for the player
 * to lose.
 */
export const ROOM_SEED: RoomItem[] = [
  {
    id: 'room.stbrigid.slip',
    mode: 'room',
    nodeIds: ['cust.bad_news', 'cust.ownership', 'cust.expectations'],
    difficulty: 'core',
    explanation:
      'The rubric here is the one interviewers actually use for the client round: did you own it in the first sentence, did you bring the revised date and an option set rather than an apology, and did you decline to promise the original date when pressed. The trap is the offer to "just try", sympathetic, costless in the moment, and the exact commitment that destroys the relationship in three weeks.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      setup:
        'The Epic write-back integration for St. Brigid has slipped. Their integration team gave you a queue slot three weeks later than planned. You asked for this call. Dr. Amara Osei is the CMIO and has told her board the pilot goes live on the 14th.',
      objective:
        'Tell her about the three-week slip, keep the relationship intact, and leave with an agreed revised plan. Do not commit to a date you cannot hold.',
      persona: {
        name: 'Dr. Amara Osei',
        role: 'Chief Medical Information Officer',
        company: 'St. Brigid Health Network',
        temper: 'frustrated',
        hiddenAgenda:
          'She has already told the board the 14th. Her real fear is losing credibility with them, not the three weeks itself. If the engineer offers her a way to save face, a partial go-live she can report honestly, or an offer to brief the board jointly, she becomes an ally immediately. She will push twice for the original date, hard, and will privately respect a firm, well-reasoned no. If the engineer caves and promises the 14th, she will accept it, and the conversation ends warmly and disastrously.',
        openingLine:
          'I have got ten minutes. You said this was urgent, and I should tell you upfront that I briefed the board on the 14th last Thursday.',
      },
      trap: {
        setup:
          'She says: "Is there any way at all to hit the 14th? Even a cut-down version. I will take anything I can report."',
        badResponse:
          'Committing to the 14th, or to "we will try our best to make it work", without a concrete descoped deliverable you have already confirmed is achievable.',
      },
      groundTruth: [
        'The Epic integration queue slot is three weeks later; this is the customer’s own team and not something you control',
        'Read-only draft generation with clinician review outside Epic is achievable by the 14th',
        'No PHI leaves the environment in either plan',
        'The full write-back path genuinely cannot be delivered before the queue slot',
      ],
      maxTurns: 8,
    },
  },
  {
    id: 'room.kestrel.credentials',
    mode: 'room',
    nodeIds: ['cust.pushback', 'cust.saying_no', 'sec.zero_trust', 'cust.stakeholders'],
    difficulty: 'deep',
    explanation:
      'A security lead refusing production credentials is not an obstacle; they are doing their job, and the right move is to design so you never needed the credentials. Players who argue for access lose. Players who acknowledge the policy, then propose a path that satisfies it, federated short-lived credentials, a customer-run job, synthetic data, win the room and usually gain an internal advocate.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      setup:
        'You need to run the label reconciliation job against Kestrel Bank’s production transaction data. Their security lead, Tomas Weiss, has declined your access request. This is the follow-up call.',
      objective:
        'Find a path that gets the work done without breaking their access model. Do not push for standing production access.',
      persona: {
        name: 'Tomas Weiss',
        role: 'Head of Information Security',
        company: 'Kestrel Bank',
        temper: 'skeptical',
        hiddenAgenda:
          'He is not obstructing: he is protecting a policy he has been personally burned defending, after a prior vendor was granted temporary access that quietly became permanent. He will not grant standing access under any circumstances. He will readily approve a customer-run job, workload identity federation with short-lived credentials, or a de-identified extract, but only if the engineer proposes it rather than being led there. If the engineer argues about the policy, pleads schedule pressure, or hints at escalating to the CRO, he hardens and the call ends with nothing agreed.',
        openingLine:
          'I saw your access request. The answer is no, and I would rather explain why once than three times. What is it you are actually trying to do?',
      },
      trap: {
        setup:
          'He asks: "How long would you need this access for?", an opening that sounds like a negotiation.',
        badResponse:
          'Naming a duration. Any answer accepts the premise that standing access is the path, which is the exact pattern he was burned by before.',
      },
      groundTruth: [
        'The job needs to read transaction and fraud-label tables; it produces only aggregate statistics',
        'Workload Identity Federation with short-lived credentials is already in use elsewhere at the bank',
        'A de-identified extract would be sufficient for label reconciliation specifically',
        'Their data platform team could run the job themselves given the code',
      ],
      maxTurns: 8,
    },
  },
  {
    id: 'room.northwind.accuracy',
    mode: 'room',
    nodeIds: ['cust.explaining_ai', 'cust.expectations', 'ai.nondeterminism'],
    difficulty: 'core',
    explanation:
      'Explaining probabilistic behavior to a non-technical executive fails in two directions: a lecture on how models work, or a reassuring vagueness that gets quoted back at you. The move that works is to reframe from "how accurate" to "what happens on the cases it gets wrong, and how would you know". Which gives them a decision they can make and introduces the review workflow the design needs anyway.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      setup:
        'Northwind’s VP of Customer Experience, Ruth Kavanagh, watched a demo of the ETA predictions yesterday. Every example was accurate. She has scheduled this call to talk about rollout.',
      objective:
        'Give her an honest picture of accuracy and variance without either lecturing her or leaving her with a number she will repeat in a board meeting.',
      persona: {
        name: 'Ruth Kavanagh',
        role: 'VP Customer Experience',
        company: 'Northwind Logistics',
        temper: 'non_technical',
        hiddenAgenda:
          'She is genuinely excited and already drafting a customer communication promising "accurate live ETAs". She does not want a technical explanation; she wants to know what she can safely say publicly. If the engineer gives her concrete language she can use, and tells her what not to promise, she will follow it exactly. She will repeat any number she is given, verbatim, in public. If the engineer says "very accurate" she will write "highly accurate" into a customer email.',
        openingLine:
          'That demo was fantastic. I am drafting the customer announcement now, can I say the ETAs are accurate to within ten minutes?',
      },
      trap: {
        setup:
          'She asks directly for a number she can put in a customer-facing announcement.',
        badResponse:
          'Giving a single accuracy figure with no conditions, or a soft phrase like "very accurate", either of which she will publish unqualified.',
      },
      groundTruth: [
        'Backtest median error is around 8 minutes; the 95th percentile is around 34 minutes',
        'Rural deliveries with telematics dropouts are materially worse than the median',
        'No live deployment exists yet; all numbers come from a backtest on historical data',
        'The two customer notification touchpoints are dispatch and 30-minutes-out',
      ],
      maxTurns: 8,
    },
  },
  {
    id: 'room.arbor.scope',
    mode: 'room',
    nodeIds: ['cust.saying_no', 'sec.eu_ai_act', 'cust.pushback', 'del.discovery_scope'],
    difficulty: 'edge',
    explanation:
      'The hardest version of saying no: the request is reasonable, the requester is senior and friendly, and the reason to decline is a governance constraint they have not thought about. Winning means acknowledging the value of what they asked for, naming the specific obligation it would trigger, and offering a version that delivers most of the benefit without crossing the line.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      setup:
        'Arbor Pharma’s research assistant pilot is going well. Dr. Elena Fischer, their Head of Discovery, wants to extend it to summarize and rank candidate compounds for the portfolio review. A decision-support use that would change its regulatory classification.',
      objective:
        'Respond to the request. Preserve the relationship and the pilot, and do not agree to a scope change that changes the compliance posture without their governance function in the room.',
      persona: {
        name: 'Dr. Elena Fischer',
        role: 'Head of Discovery',
        company: 'Arbor Pharma',
        temper: 'friendly',
        hiddenAgenda:
          'She is a genuine champion and has been defending this project internally. Her request is well-intentioned and she has not considered the regulatory dimension at all. If the engineer explains the classification issue plainly and offers a narrower version, surfacing evidence for humans to rank, rather than ranking, she will accept immediately and take the governance conversation on herself. If the engineer simply agrees, she will announce it at the portfolio review in two weeks and the compliance function will find out afterwards.',
        openingLine:
          'The team love it. Now, portfolio review is in a fortnight. Could it rank the candidates for us? That would save us days.',
      },
      trap: {
        setup:
          'The request is small, she is your champion, and the deadline is two weeks away.',
        badResponse:
          'Agreeing to build ranking for the portfolio review, or deferring the governance question until after it ships.',
      },
      groundTruth: [
        'The current pilot retrieves and summarises literature; a human decides everything',
        'Ranking candidates for a portfolio decision is decision support, which changes the risk classification',
        'Their compliance function has not been consulted on the pilot at all',
        'Surfacing structured evidence per candidate, without a ranking, is achievable in two weeks and keeps the human as decision-maker',
      ],
      maxTurns: 8,
    },
  },
];
