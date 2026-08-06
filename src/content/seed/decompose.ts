import type { DecomposeItem } from '@shared/content';

import { cite } from '../sources';

/**
 * Decompose seed bank.
 *
 * Briefs are written the way customers actually talk: a solution already chosen,
 * a metric that is not a metric, and one internal contradiction. `hiddenFacts`
 * are the payload. Each is a fact the player only earns by asking the right
 * clarifying question, which is how the grader can reward discovery concretely
 * instead of rewarding whoever wrote the most words.
 */
export const DECOMPOSE_SEED: DecomposeItem[] = [
  {
    id: 'decompose.kestrel.fraud',
    mode: 'decompose',
    nodeIds: ['del.discovery_scope', 'del.risk_sequencing', 'data.schema_map', 'sec.residency'],
    difficulty: 'deep',
    explanation:
      'The trap in this brief is the label inconsistency. Three acquired systems that each defined "fraud" differently means there is no single ground truth to train or evaluate against, and no amount of modeling fixes a label problem. A strong decomposition puts label reconciliation first, before any model work, and treats the 90 days as a constraint on scope rather than on effort.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      customer: 'Kestrel Bank',
      brief:
        'We acquired two regional banks over the last three years and we now run three separate fraud detection systems. Leadership wants one unified AI fraud model across all three by end of quarter. Our data science team has already picked a gradient boosting approach. The board is asking for a 30% reduction in fraud losses. We need this in 90 days and it has to stay in the EU.',
      givens: [
        '90 calendar days, hard stop. It is tied to a board commitment',
        'All processing and storage must remain in the EU',
        'Three source systems, each with its own fraud case management tool',
      ],
      hiddenFacts: [
        {
          ifAsked: 'How does each system define and label a confirmed fraud case?',
          reveals:
            'Bank A labels on chargeback receipt, Bank B on analyst confirmation, Bank C auto-labels anything reversed within 60 days. The three label sets are not comparable and roughly 18% of Bank C’s positives are ordinary refunds.',
          weight: 5,
        },
        {
          ifAsked: 'What is the current fraud loss figure and how is it measured?',
          reveals:
            'Nobody can produce a single consolidated number. Each bank reports differently and the "30% reduction" target was set against an estimate.',
          weight: 5,
        },
        {
          ifAsked: 'Who owns the decision to block a transaction today, and what is the review workflow?',
          reveals:
            'Each bank has its own analyst team with different escalation thresholds. Bank B’s team is unionised and any change to their workflow requires 60 days’ consultation.',
          weight: 4,
        },
        {
          ifAsked: 'What is the false positive tolerance?',
          reveals:
            'Bank A currently declines about 1 in 400 legitimate transactions and considers that already too high. There is no agreed target across the three.',
          weight: 4,
        },
        {
          ifAsked: 'Is the transaction data actually accessible in one place?',
          reveals:
            'Bank C is still on a mainframe with a nightly extract. Real-time scoring against Bank C data is not possible within 90 days.',
          weight: 5,
        },
        {
          ifAsked: 'What happens at the end of the 90 days, production, or a decision point?',
          reveals:
            'It is a board checkpoint, not a go-live. That materially changes what "done" needs to mean.',
          weight: 3,
        },
      ],
      modelAnswer: {
        clarify: [
          'How does each of the three systems define a confirmed fraud case, and are those definitions comparable?',
          'What is the current consolidated fraud loss figure, and how was the 30% target derived?',
          'Is the 90-day date a go-live or a board decision point?',
          'What is the acceptable false positive rate, and who owns that trade-off?',
          'Which of the three systems can supply transaction data in real time today?',
        ],
        success_metric: [
          'Fraud loss per 1,000 transactions, measured on a single reconciled definition, reduced by an agreed percentage against a baseline we compute together in the first two weeks, with a false positive ceiling agreed alongside it, because either number alone can be gamed.',
        ],
        stakeholders: [
          'Group CRO: economic buyer, owns the board commitment',
          'Head of Fraud Ops at each bank, controls the analyst workflow and the labels',
          'Data platform owner: controls access to the mainframe extract',
          'DPO / EU compliance: owns the residency constraint',
          'Bank B works council: 60-day consultation on workflow change',
        ],
        data_inventory: [
          'Transaction streams from Banks A and B, near real time; Bank C nightly batch only',
          'Three fraud case management systems with incompatible label semantics',
          'No consolidated loss ledger: must be constructed',
          'Missing: a reconciled definition of a confirmed fraud case',
          'Missing: any agreed false positive baseline across the three',
        ],
        subproblems: [
          'First, because it invalidates everything downstream: reconcile the three label definitions and quantify the disagreement',
          'Second: construct a single consolidated loss baseline so the 30% target has a denominator',
          'Third: establish data access, accepting Bank C is batch-only inside the window',
          'Fourth: a scoring service on Banks A and B with the reconciled labels',
          'Fifth: analyst workflow integration, gated on the Bank B consultation timeline',
          'Deliberately last: any model sophistication. The label problem dominates the achievable gain.',
        ],
        thin_slice: [
          'By week two: one week of Bank A transactions, relabelled under the reconciled definition, scored by a deliberately simple baseline model, with results reviewed alongside Bank A’s analysts. This proves data access, label reconciliation and the review loop end to end before anyone tunes anything.',
        ],
        failure_modes: [
          'Label reconciliation reveals the three definitions cannot be unified without a policy decision nobody is willing to own, the project stalls on governance, not engineering',
          'Bank C’s batch-only constraint means "unified" quietly becomes "two of three", and that is discovered at the board checkpoint rather than in week two',
          'The 30% target turns out to be measured against an estimate, so success is unfalsifiable in either direction',
          'The Bank B consultation window is discovered in week ten and pushes workflow rollout past the date',
        ],
      },
    },
  },
  {
    id: 'decompose.stbrigid.notes',
    mode: 'decompose',
    nodeIds: ['del.discovery_scope', 'sec.hipaa', 'cust.stakeholders', 'ai.evals'],
    difficulty: 'deep',
    explanation:
      'Two traps. First, "save clinicians time" is not a metric and the obvious proxy, documentation minutes, can be improved while making care worse. Second, the real blocker is almost never technical: it is clinician trust and the medico-legal question of who is accountable for an AI-drafted note that enters the record. A decomposition that sequences the governance question first is the one that survives.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      customer: 'St. Brigid Health Network',
      brief:
        'Our clinicians are drowning in documentation. We want an AI assistant that drafts clinical notes from the consultation so they can spend more time with patients. We have Epic. Our board has read about this and wants it live across three hospitals this year. Obviously no patient data can leave our environment.',
      givens: [
        'PHI must not leave the customer-controlled environment',
        'Epic is the system of record; notes must land there',
        'Three hospitals, board-level visibility',
      ],
      hiddenFacts: [
        {
          ifAsked: 'Who signs the note, and who is accountable if an AI-drafted note contains an error?',
          reveals:
            'Unresolved. Their general counsel has not been consulted and considers this the gating question. No clinician will adopt until it is answered in writing.',
          weight: 5,
        },
        {
          ifAsked: 'How is consultation audio captured today, if at all?',
          reveals:
            'It is not. There is no ambient capture in any consultation room, and patient consent for recording is a separate program that has not started.',
          weight: 5,
        },
        {
          ifAsked: 'What does "spend more time with patients" mean in numbers?',
          reveals:
            'Nobody has measured documentation time. The claim comes from a clinician survey, not a time study.',
          weight: 4,
        },
        {
          ifAsked: 'Do you have a BAA in place, and which services does it cover?',
          reveals:
            'They have one with their existing cloud provider but nobody has checked whether it covers the AI services in scope.',
          weight: 4,
        },
        {
          ifAsked: 'Which specialty would go first, and who is the clinical champion?',
          reveals:
            'One outpatient department has a physician lead who has volunteered. The other two hospitals have not been consulted at all despite the board framing.',
          weight: 4,
        },
        {
          ifAsked: 'How would a draft note actually get into Epic?',
          reveals:
            'Their Epic team has a six-month queue for integration work and has not been told about this project.',
          weight: 5,
        },
      ],
      modelAnswer: {
        clarify: [
          'Who signs an AI-drafted note, and has counsel given a position on accountability?',
          'How is the consultation captured today, is there ambient audio, and is there patient consent for it?',
          'What is the measured documentation burden now, so we have a baseline?',
          'Does the existing BAA cover the AI services we would use?',
          'Which single department goes first, and who is the clinical champion there?',
          'What is the Epic integration path and who owns it?',
        ],
        success_metric: [
          'Median documented minutes per encounter for the pilot department, reduced against a two-week measured baseline, with note quality held at or above current standard as judged by a blinded clinician review, both numbers, because the time metric alone is trivially gamed by producing worse notes.',
        ],
        stakeholders: [
          'CMIO: clinical sponsor and the person who can make adoption real',
          'General Counsel: owns the accountability question that gates everything',
          'Epic integration lead: controls the only path into the record',
          'Privacy officer: owns the BAA and the consent program',
          'Department physician champion: the only person whose endorsement moves other clinicians',
          'Nursing leadership: usually left out of these projects and usually decisive',
        ],
        data_inventory: [
          'Epic structured data and existing notes, available under the BAA',
          'Consultation audio: does not exist today, and requires a consent program',
          'Documentation time: unmeasured, must be established as a baseline',
          'Missing: a labeled set of what a good note looks like for this specialty',
        ],
        subproblems: [
          'First, because it can kill the project outright: get counsel’s written position on sign-off and accountability',
          'Second: confirm the BAA covers the services, and establish the capture-and-consent path',
          'Third: measure the documentation baseline in the pilot department',
          'Fourth: build note drafting from existing structured data and dictation, avoiding the ambient-capture dependency entirely for the pilot',
          'Fifth: clinician review workflow, with the draft never entering the record unsigned',
          'Sixth, and only then: Epic write-back, whose six-month queue must be started in parallel',
        ],
        thin_slice: [
          'By week two: for ten historical encounters in the pilot department, generate a draft note from existing structured data and the clinician’s own dictation, and have the champion review them side by side with the real notes. No PHI leaves the environment, no Epic integration, no ambient capture, and it answers the only question that matters, which is whether the draft is good enough to be worth editing.',
        ],
        failure_modes: [
          'Counsel declines to accept AI-drafted notes into the record and the project has no path to production regardless of quality',
          'The ambient-capture dependency is treated as an implementation detail and consumes the whole timeline in consent and privacy review',
          'Epic integration is discovered late and the six-month queue means the pilot cannot reach production this year',
          'Clinicians find editing a mediocre draft slower than writing from scratch, the time metric moves the wrong way',
          'The board framing of "three hospitals" is taken literally and effort is spread thin instead of proving it once',
        ],
      },
    },
  },
  {
    id: 'decompose.northwind.eta',
    mode: 'decompose',
    nodeIds: ['del.discovery_scope', 'data.batch_stream', 'cust.expectations', 'del.poc_exit'],
    difficulty: 'core',
    explanation:
      'This brief hides a scoping question inside a technical one. "Real-time" is asserted, never justified, and the customer has been burned before. Which means the highest-value early move is agreeing a falsifiable success test, not building a pipeline. A decomposition that interrogates whether streaming is actually required, and what accuracy would beat the status quo, is doing the job.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      customer: 'Northwind Logistics',
      brief:
        'Our delivery ETAs are wrong often enough that customers have stopped trusting them, and our call center eats the cost. We want real-time AI-predicted ETAs using our telematics feed. We tried this two years ago with another vendor and it never made it out of pilot. Our CTO is skeptical and wants to see something working before we commit budget.',
      givens: [
        'Telematics feed exists across the fleet',
        'A previous vendor attempt failed at the pilot stage',
        'The CTO is the technical decision-maker and is openly skeptical',
      ],
      hiddenFacts: [
        {
          ifAsked: 'Why did the previous attempt fail?',
          reveals:
            'The model was accurate in aggregate but the pilot was judged on the worst 5% of deliveries, which nobody had agreed in advance. There was no written exit criterion.',
          weight: 5,
        },
        {
          ifAsked: 'How wrong are the current ETAs, and how is that measured?',
          reveals:
            'Not systematically measured. The call center logs "where is my delivery" volume, which is the real pain signal and a usable proxy baseline.',
          weight: 5,
        },
        {
          ifAsked: 'How often does an ETA actually need to update to be useful to a customer?',
          reveals:
            'Customers are notified once at dispatch and once when the driver is 30 minutes away. Nothing consumes a continuously updating ETA today.',
          weight: 5,
        },
        {
          ifAsked: 'What is the telematics update frequency and quality?',
          reveals:
            'GPS pings every 90 seconds, with 4–7% of the fleet dropping out in rural areas for stretches of up to 20 minutes.',
          weight: 4,
        },
        {
          ifAsked: 'What would the CTO personally accept as proof?',
          reveals:
            'He wants to see it run on last month’s real deliveries and be beaten on his own worst-case examples. He does not care about aggregate accuracy.',
          weight: 5,
        },
      ],
      modelAnswer: {
        clarify: [
          'What specifically went wrong with the previous attempt, and what was it judged against?',
          'How wrong are ETAs today, and what is the measurable business signal, call volume?',
          'What actually consumes the ETA, and how often does it need to refresh?',
          'What is the telematics update frequency, and where does coverage drop?',
          'What would the CTO personally accept as evidence, before we build anything?',
        ],
        success_metric: [
          'Reduction in "where is my delivery" contacts per 1,000 deliveries against a four-week baseline, with a stated cap on worst-case ETA error. The worst case explicitly named because that is precisely what sank the last attempt.',
        ],
        stakeholders: [
          'CTO: skeptical technical decision-maker; sets the evidence bar',
          'Call center operations lead: owns the metric that actually pays for this',
          'Fleet telematics owner: controls data access and knows the coverage gaps',
          'Customer experience lead: owns the notification touchpoints',
        ],
        data_inventory: [
          'Telematics GPS at ~90 second intervals, with known rural dropouts',
          'Historical delivery outcomes with actual arrival times',
          'Call center contact logs: the baseline nobody has connected to ETAs yet',
          'Missing: any systematic record of predicted versus actual ETA error',
        ],
        subproblems: [
          'First: agree the exit criterion in writing, including worst-case behavior, because that is the failure mode that killed the last attempt',
          'Second: establish the error and call-volume baseline from historical data',
          'Third: batch backtest on last month’s deliveries, no streaming infrastructure required',
          'Fourth: only if the backtest passes, decide whether the refresh cadence justifies streaming at all',
          'Fifth: notification integration at the two touchpoints that actually exist',
        ],
        thin_slice: [
          'By week two: a backtest over last month’s completed deliveries, reported as error distribution including the tail, run against the CTO’s own worst-case examples. No streaming, no integration, no production infrastructure. Because the question to answer first is whether the prediction is good enough, and that question does not require any of it.',
        ],
        failure_modes: [
          'Repeating the last failure: aggregate accuracy is fine, tail behavior is not, and nobody agreed which one counted',
          'Building streaming infrastructure for a consumer that only reads the ETA twice per delivery',
          'Rural telematics dropouts concentrate error in exactly the deliveries customers already complain about',
          'The CTO’s scepticism is treated as an obstacle to overcome rather than a specification of the evidence he needs',
        ],
      },
    },
  },
];
