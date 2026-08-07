import type { DrillItem } from '@shared/content';

import { cite } from '../sources';

/**
 * Security, compliance and identity depth bank.
 *
 * These are the questions that decide whether an enterprise AI deal closes:
 * where regulated data may be processed, who the agent is acting as, what the
 * blast radius is when that agent is prompt-injected, and what evidence exists
 * six months later when an auditor asks. Nothing here is legal advice; every
 * item is framed as what an architect should design for.
 */
export const DRILL_SECID: DrillItem[] = [
  // ── HIPAA ────────────────────────────────────────────────────────────────
  {
    id: 's2.hipaa.deident_routes',
    mode: 'drill',
    nodeIds: ['sec.hipaa', 'sec.pii'],
    difficulty: 'deep',
    explanation:
      'The HIPAA Privacy Rule recognizes two routes to de-identified data: Safe Harbor, which removes an enumerated list of identifiers, and Expert Determination, where a qualified statistician documents that re-identification risk is very small. Safe Harbor is mechanical and cheap but strips fields analysts often want; Expert Determination keeps more signal and costs a review. A limited data set is the middle option people forget: it retains dates and some geography, but it remains PHI and travels under a data use agreement, so it does not answer a request for data that is no longer PHI. Knowing all three exist is what lets you offer a customer an option other than "no".',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A hospital wants to give your analytics team a dataset that is no longer PHI, but Safe Harbor would strip the date granularity their model needs. What do you propose?',
      choices: [
        { id: 'a', text: 'Expert Determination: an expert documents that re-identification risk is very small' },
        { id: 'b', text: 'Safe Harbor now, with the true dates re-attached after the file transfers', whyWrong: 'Re-attaching the identifiers you removed re-creates PHI. The de-identification has to hold in the dataset that actually leaves the covered entity.' },
        { id: 'c', text: 'A limited data set, which the Privacy Rule treats as no longer PHI', whyWrong: 'A limited data set keeps dates and some geography, so it stays PHI and needs a data use agreement. It is a useful middle option, not a de-identification route.' },
        { id: 'd', text: 'Keyed hashes replacing the patient identifiers, released as de-identified', whyWrong: 'A keyed hash is pseudonymization, a security control. The value still links back to the individual, so neither Privacy Rule route is satisfied.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.hipaa.subcontractor_chain',
    mode: 'drill',
    nodeIds: ['sec.hipaa'],
    difficulty: 'core',
    explanation:
      'When a covered entity hands PHI to you, you are a business associate. Any vendor you pass that PHI to, including a model provider, is your subcontractor and needs a BAA with you. The chain has to be unbroken, and "we just call an API" is not an exemption: the moment PHI crosses into that API you have brought a new party inside the boundary.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your SaaS has a BAA with a hospital. You want to route clinical text through a third-party model API for summarization. What has to be true first?',
      choices: [
        { id: 'a', text: 'Nothing extra: your BAA with the hospital already binds your whole supply chain', whyWrong: 'Your BAA obliges you to bind subcontractors yourself. It does not extend protection to a vendor that never signed anything.' },
        { id: 'b', text: 'A signed BAA with the model provider naming the specific service you call' },
        { id: 'c', text: 'The provider’s HIPAA compliance page plus an enterprise support agreement', whyWrong: 'A marketing page is not a contract, and a support agreement says nothing about permitted uses of PHI. Only the BAA and its enumerated service list matter.' },
        { id: 'd', text: 'Names stripped from the note before it leaves your service, so HIPAA drops out', whyWrong: 'Clinical narrative with names removed is usually still PHI. De-identification has a defined bar and casual name-stripping does not meet it.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 's2.hipaa.training_use',
    mode: 'drill',
    nodeIds: ['sec.hipaa', 'ai.evals'],
    difficulty: 'deep',
    explanation:
      'Default commercial AI terms often reserve a right to use customer content for service improvement. Under a BAA that permission has to be switched off or contractually excluded, because a business associate may only use PHI for the purposes the agreement permits. This is one of the first things a hospital security reviewer looks for, and one of the last things engineering teams check.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A health system asks whether their clinical notes will be used to improve your models. What is the architecturally honest answer to design toward?',
      choices: [
        { id: 'a', text: 'Yes, but only in aggregate, which is no longer identifiable to any patient', whyWrong: 'Aggregation is not de-identification, and a use the BAA does not permit stays impermissible regardless of the output shape.' },
        { id: 'b', text: 'Yes by default, with an opt-out the customer can exercise at any later point', whyWrong: 'Opt-out after the fact does not undo processing that already happened. Permitted use is settled before the first request, not after.' },
        { id: 'c', text: 'No: the BAA excludes training, and a vendor setting enforces that exclusion' },
        { id: 'd', text: 'Only the model provider can answer, since they own the training pipeline', whyWrong: 'You are the business associate the hospital contracted with. Passing the question upstream is not an answer you get to give.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 's2.hipaa.security_rule_safeguards',
    mode: 'drill',
    nodeIds: ['sec.hipaa', 'sec.audit'],
    difficulty: 'core',
    explanation:
      'The Security Rule technical safeguards are unglamorous and specific: unique identification of each user, access control, audit controls that record activity on systems holding PHI, integrity protection, and protection of PHI in transit. Every one of them has an obvious implementation and an obvious way to skip it during a pilot, which is why the pilot architecture becomes the finding.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A clinical assistant reads and summarizes PHI. Which of the following are technical safeguards you must be able to demonstrate, not just describe? Select all that apply.',
      choices: [
        { id: 'a', text: 'Unique user identification, so every action traces to one person' },
        { id: 'b', text: 'Audit controls that record activity in the systems holding PHI' },
        { id: 'c', text: 'Protection of PHI while it travels over a network' },
        { id: 'd', text: 'A published privacy policy on your marketing site', whyWrong: 'A public notice is a different obligation and does not implement any technical safeguard.' },
        { id: 'e', text: 'An annual penetration test report', whyWrong: 'Useful evidence for a security program, but it is not one of the technical safeguards and it proves nothing about day-to-day PHI access.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 's2.hipaa.data_forms',
    mode: 'drill',
    nodeIds: ['sec.hipaa', 'sec.pii'],
    difficulty: 'deep',
    explanation:
      'Health data is not binary. Full PHI, a limited data set shared under a data use agreement, and de-identified data each carry different obligations and each unlocks a different kind of work. Architects who know the middle option can often ship an analytics use case that would have stalled waiting for full-PHI approvals.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each form of health data to what it requires or permits.',
      pairs: [
        { left: 'Full PHI', right: 'BAA plus minimum-necessary limits on every use and disclosure' },
        { left: 'Limited data set', right: 'Direct identifiers removed, dates and some geography retained, shared under a data use agreement' },
        { left: 'Safe Harbor de-identified', right: 'Enumerated identifiers removed; no longer PHI, so the Privacy Rule stops applying' },
        { left: 'Expert Determination de-identified', right: 'Statistical assessment documenting very small re-identification risk for that dataset' },
      ],
    },
  },

  // ── GDPR ─────────────────────────────────────────────────────────────────
  {
    id: 's2.gdpr.transfer_mechanism',
    mode: 'drill',
    nodeIds: ['sec.gdpr', 'sec.residency'],
    difficulty: 'core',
    explanation:
      'Moving EU personal data outside the EEA needs a transfer mechanism: an adequacy decision for the destination, or standard contractual clauses backed by an assessment of whether local law undermines them. This is contract and assessment work, not an engineering setting, but it drives architecture because the cheapest way to avoid the question is to not transfer.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your EU customer’s data will be processed by a subprocessor headquartered outside the EEA. What has to be in place, and what should you propose in parallel?',
      choices: [
        { id: 'a', text: 'Encryption in transit and at rest, which removes the cross-border transfer question', whyWrong: 'Encryption is a safeguard, not a transfer mechanism. Data you can decrypt is still personal data you transferred.' },
        { id: 'b', text: 'Each end user’s consent to the transfer, captured in the product at sign-up time', whyWrong: 'Consent-based transfers are narrow and fragile, and consent gathered inside a B2B product rarely comes from the individuals whose data it is.' },
        { id: 'c', text: 'Nothing at all, because the subprocessor stores everything inside an EU region', whyWrong: 'Where the servers sit is only part of it. Remote access by staff outside the EEA is itself a transfer, and it is the part teams forget.' },
        { id: 'd', text: 'Standard contractual clauses with a transfer assessment, plus in-region design' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 's2.gdpr.dpia_trigger',
    mode: 'drill',
    nodeIds: ['sec.gdpr'],
    difficulty: 'core',
    explanation:
      'A data protection impact assessment is expected when processing is likely to be high risk to individuals: large-scale processing of sensitive categories, systematic monitoring, or automated decisions with significant effects. AI features hit these triggers more often than teams expect. The practical point is that the DPIA wants design inputs you should be able to produce anyway: what data, what purpose, what safeguards, what alternatives you rejected.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer’s privacy office asks for a DPIA before your AI feature ships. What does that most usefully change about your engineering plan?',
      choices: [
        { id: 'a', text: 'You document data flows, purposes, retention and safeguards while design is open' },
        { id: 'b', text: 'Nothing until launch: the DPIA is a legal artifact describing the shipped system', whyWrong: 'An assessment written after launch cannot influence design, which is the entire point of doing it, and it arrives too late to change anything cheaply.' },
        { id: 'c', text: 'You collect consent from every individual whose data the feature processes', whyWrong: 'A DPIA is a risk assessment, not a consent mechanism. Consent may not even be the right lawful basis for this processing.' },
        { id: 'd', text: 'You consolidate processing into a single EU region before the assessment', whyWrong: 'Residency may come up during the assessment, but it is neither what triggers a DPIA nor what satisfies one.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.gdpr.erasure_derived',
    mode: 'drill',
    nodeIds: ['sec.gdpr', 'ai.rag_failure'],
    difficulty: 'deep',
    explanation:
      'Erasure is hard in AI systems because personal data leaks into derived artifacts: vector indexes, fine-tuned weights, prompt and response logs, evaluation datasets, and caches. The tractable design is to keep derived artifacts rebuildable from a source of truth and to avoid putting personal data into anything you cannot rebuild, because you cannot surgically remove one person from a set of weights.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer asks how erasure works if their support transcripts were used to fine-tune a model. What is the design answer?',
      choices: [
        { id: 'a', text: 'Delete their rows from the training corpus; the model forgets them over later runs', whyWrong: 'Models do not forget. Removing the source row changes nothing about the weights already trained on it.' },
        { id: 'b', text: 'Keep erasable personal data out of weights: hold it in retrieval you can reindex' },
        { id: 'c', text: 'Retrain the base model from scratch each time an erasure request arrives', whyWrong: 'Technically true and operationally absurd. Any process that makes one request cost a full training run will not survive the second.' },
        { id: 'd', text: 'Rely on the model almost never reproducing its training data verbatim', whyWrong: 'Low probability of reproduction is not deletion, and it is not a defensible answer to a data subject request.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 's2.gdpr.purpose_limitation',
    mode: 'drill',
    nodeIds: ['sec.gdpr'],
    difficulty: 'deep',
    explanation:
      'Data collected for one purpose cannot be silently repurposed. Support transcripts gathered to resolve tickets are not automatically available as training data for a product model: that is a new purpose that needs its own basis and, usually, its own notice. The engineering consequence is that your data platform needs purpose tags on datasets, not just access controls.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A product manager wants to train a model on two years of customer support transcripts collected under a support-purposes notice. What do you raise?',
      choices: [
        { id: 'a', text: 'It is fine, since the company already holds these transcripts lawfully under its notice', whyWrong: 'Lawful collection for one purpose does not authorize a later one. Purpose limitation is the specific rule this reasoning walks into.' },
        { id: 'b', text: 'It is fine as long as the transcripts never leave the company’s own systems', whyWrong: 'Purpose limitation is about what you do with data, not where it goes. Internal use is still use.' },
        { id: 'c', text: 'Training is a new purpose, so tag datasets by permitted purpose, not just access' },
        { id: 'd', text: 'Remove the customer name from each transcript, which anonymizes the corpus', whyWrong: 'Support transcripts are full of identifying detail beyond names. Dropping one field is not anonymization and does not settle the purpose question.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 's2.gdpr.processor_obligations',
    mode: 'drill',
    nodeIds: ['sec.gdpr', 'sec.audit'],
    difficulty: 'core',
    explanation:
      'A processing agreement with an AI vendor should nail down the things engineering has to implement: which subprocessors are used and how you learn about new ones, whether customer content trains anything, retention and deletion timelines, breach notification, assistance with data subject requests, and audit rights. Vague clauses here become impossible commitments later.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which terms in a processing agreement translate directly into work your platform team must build? Select all that apply.',
      choices: [
        { id: 'a', text: 'A retention and deletion commitment, which requires a real deletion path across every derived store' },
        { id: 'b', text: 'Assistance with data subject requests, which requires the ability to find one person’s data across systems' },
        { id: 'c', text: 'Subprocessor notice and objection, which requires you to know what your service actually calls' },
        { id: 'd', text: 'A limitation-of-liability cap', whyWrong: 'Commercially important, but it does not create any engineering obligation or change what the system must do.' },
        { id: 'e', text: 'Governing law and venue', whyWrong: 'A contract mechanic with no implementation consequence for the platform.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── SOC 2 ────────────────────────────────────────────────────────────────
  {
    id: 's2.soc2.attestation_not_cert',
    mode: 'drill',
    nodeIds: ['sec.soc2'],
    difficulty: 'intro',
    explanation:
      'SOC 2 is an attestation report written by an independent audit firm about controls the company itself defined, not a certification granted by a standards body. That distinction matters in a customer conversation: two SOC 2 reports can describe wildly different control sets, so the useful question is what was in scope, not whether the logo is on the website.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A prospect says "we only buy from SOC 2 certified vendors". How do you correct that without being pedantic?',
      choices: [
        { id: 'a', text: 'Confirm you are certified and send the report cover page with the auditor’s logo', whyWrong: 'There is no certificate to hold. Repeating the wrong framing sets up a harder conversation when their auditor reads the actual report.' },
        { id: 'b', text: 'Offer ISO 27001 instead, since it is a certification and SOC 2 is not', whyWrong: 'They are different instruments, not a strength ranking, and swapping frameworks does not answer the question they asked.' },
        { id: 'c', text: 'Explain that the auditor certifies the product against a fixed control catalog', whyWrong: 'There is no fixed catalog and no product certificate. The report covers a service organization’s own controls over a defined period.' },
        { id: 'd', text: 'Explain it is an attestation over controls you defined, then share the report' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 's2.soc2.cuec',
    mode: 'drill',
    nodeIds: ['sec.soc2'],
    difficulty: 'deep',
    explanation:
      'Most SOC 2 reports list complementary user entity controls: things the customer has to do for the vendor’s controls to actually work, like enforcing SSO, reviewing their own admin list, or rotating their API keys. Customers skim past this section and then assume the vendor covers it. Reading those out loud during a security review is one of the fastest ways to build credibility.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'During a security review the customer asks "so your SOC 2 covers access control, we do not need to do anything?" What is the accurate response?',
      choices: [
        { id: 'a', text: 'Point to the complementary user entity controls the report assigns to them' },
        { id: 'b', text: 'Yes: logical access is fully in scope on our side, including your admin grants', whyWrong: 'No vendor controls who the customer makes an admin in their own tenant. Claiming otherwise creates a gap nobody owns.' },
        { id: 'c', text: 'Access control sits outside the security criteria, so no SOC 2 report covers it', whyWrong: 'Logical access is core to the security criteria. It is in scope on the vendor side, with a customer-side counterpart.' },
        { id: 'd', text: 'Suggest they run their own penetration test against the tenant to be certain', whyWrong: 'A deflection. A penetration test tells them nothing about which responsibilities the report assigns to them.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.soc2.bridge_letter',
    mode: 'drill',
    nodeIds: ['sec.soc2'],
    difficulty: 'core',
    explanation:
      'A SOC 2 Type II report covers a defined observation period that ended in the past. When a customer signs months later they ask what happened in the gap, and the standard artifact is a bridge letter from management stating that no material control changes occurred since the period end. It is management assertion, not audited coverage, and saying so is what keeps you honest.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your Type II report covers a period that ended five months ago. Procurement asks what covers the months since. What do you offer?',
      choices: [
        { id: 'a', text: 'The Type II report itself, which stays valid for twelve months after issue', whyWrong: 'The report describes a specific past period. There is no validity window that extends it forward.' },
        { id: 'b', text: 'A bridge letter, flagged as a management assertion rather than audited coverage' },
        { id: 'c', text: 'A fresh Type I report dated today, which covers the gap at a point in time', whyWrong: 'A Type I speaks to control design at a single date and is a downgrade in assurance, not a patch for a coverage gap.' },
        { id: 'd', text: 'Your most recent vulnerability scan and penetration test results for the period', whyWrong: 'Scans say nothing about whether the audited controls kept operating. Wrong artifact for the question.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 's2.soc2.subservice_method',
    mode: 'drill',
    nodeIds: ['sec.soc2'],
    difficulty: 'edge',
    explanation:
      'When your service runs on a cloud provider, the report either carves that provider out, describing the controls you expect them to run and pointing at their own report, or includes them inclusively. Carve-out is normal and fine, but it means the reader has to stack two reports to see the whole picture, and a sharp reviewer will ask for both.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A reviewer notices your report says physical and environmental controls are the responsibility of your cloud provider. What is that, and what should you hand over next?',
      choices: [
        { id: 'a', text: 'A control gap in your environment that must be remediated before closing', whyWrong: 'Excluding a subservice organization is a standard reporting choice, not a missing control. Remediating it would mean building your own data centers.' },
        { id: 'b', text: 'The inclusive method, which is why those controls are described at all', whyWrong: 'Inclusive means the subservice organization’s controls are tested inside your report. Here they are explicitly assigned elsewhere, the opposite.' },
        { id: 'c', text: 'The carve-out method, so hand over the provider’s own report alongside yours' },
        { id: 'd', text: 'A sign the auditor did not finish testing that part of the engagement', whyWrong: 'Scope decisions are documented deliberately. Reading them as incompleteness misreads the structure of the report.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 's2.soc2.criteria_map',
    mode: 'drill',
    nodeIds: ['sec.soc2'],
    difficulty: 'core',
    explanation:
      'The trust services criteria are modular. Security is the common set every report includes; availability, confidentiality, processing integrity and privacy are added by choice. When a customer says your report "does not cover uptime", they usually mean you scoped security only, and the fix is a scope conversation with your auditor rather than an argument.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each trust services criterion to the question it answers for a customer.',
      pairs: [
        { left: 'Security', right: 'Is the system protected against unauthorized access? Included in every report' },
        { left: 'Availability', right: 'Does the system meet its commitments about being up and reachable?' },
        { left: 'Confidentiality', right: 'Is information designated confidential protected through its lifecycle?' },
        { left: 'Processing integrity', right: 'Is processing complete, accurate, timely and authorized?' },
        { left: 'Privacy', right: 'Is personal information handled in line with the stated privacy notice?' },
      ],
    },
  },

  // ── FedRAMP & public sector ──────────────────────────────────────────────
  {
    id: 's2.fedramp.inheritance',
    mode: 'drill',
    nodeIds: ['sec.fedramp'],
    difficulty: 'core',
    explanation:
      'Running on an authorized cloud lets you inherit infrastructure controls, which is a real and substantial head start. It does not authorize your service. Your application, its data flows and its operational processes still need their own package and their own sponsor. Teams that miss this promise a federal customer a timeline that is off by a year.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your SaaS runs entirely on a FedRAMP High authorized cloud. An agency asks if you are FedRAMP authorized. What is true?',
      choices: [
        { id: 'a', text: 'Yes: authorization flows through to any service built on an authorized platform', whyWrong: 'Authorization attaches to a specific service offering and boundary. Nothing inherits automatically, or the marketplace would list every SaaS in existence.' },
        { id: 'b', text: 'Yes at Low, with extra work needed only if the agency requires Moderate', whyWrong: 'There is no automatic Low authorization for tenants. The impact level describes the data, not a free starting tier.' },
        { id: 'c', text: 'No, and inheriting the cloud’s controls saves you very little on the timeline', whyWrong: 'Too pessimistic. Inheritance genuinely removes a large share of control implementation and evidence work.' },
        { id: 'd', text: 'No: you inherit infrastructure controls but still need your own authorization' },
      ],
      correctId: 'd',
    },
  },
  {
    id: 's2.fedramp.impact_level',
    mode: 'drill',
    nodeIds: ['sec.fedramp'],
    difficulty: 'core',
    explanation:
      'The Low, Moderate and High baselines follow from categorizing the information the system handles by the impact of a confidentiality, integrity or availability loss. The agency owns that categorization. An architect’s job is to ask for it early, because it determines the control count, and the control count determines the cost and the calendar.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agency asks which FedRAMP baseline you would pursue for their use case. What determines the answer?',
      choices: [
        { id: 'a', text: 'The agency’s security categorization of the information the system handles' },
        { id: 'b', text: 'The number of users and the transaction volume the system must support', whyWrong: 'Scale drives capacity planning, not security categorization. A ten-user system holding sensitive data is not Low.' },
        { id: 'c', text: 'Whether the system is internet-facing or reachable only from agency networks', whyWrong: 'Exposure affects which controls are hard to implement, not which baseline applies. The baseline follows the data.' },
        { id: 'd', text: 'Which cloud region and government-community environment you deploy into', whyWrong: 'Region and environment matter for boundary and residency questions, but neither sets the impact level.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.fedramp.boundary',
    mode: 'drill',
    nodeIds: ['sec.fedramp', 'sec.audit'],
    difficulty: 'deep',
    explanation:
      'The authorization boundary covers everything that stores, processes or transmits federal data, plus the systems that protect or manage it. That sweeps in things engineers think of as peripheral: log aggregation, monitoring, the CI system that deploys into the environment, and any third-party API in the request path. Drawing the boundary honestly early is cheaper than being told to redraw it during review.',
    citations: cite('vpcsc'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'While drawing an authorization boundary, a team argues the third-party observability SaaS is out of scope because "it only gets logs". How do you respond?',
      choices: [
        { id: 'a', text: 'Agreed: telemetry is metadata, and metadata sits outside the boundary by rule', whyWrong: 'Application logs are full of request fragments, identifiers and error context. Treating them as harmless is how data leaves the boundary quietly.' },
        { id: 'b', text: 'Logs carry federal data, so it is in the boundary or authorized itself' },
        { id: 'c', text: 'It is acceptable once the vendor signs an NDA and a processing addendum', whyWrong: 'Contract paperwork does not put a service inside an authorization boundary or produce the control evidence the package needs.' },
        { id: 'd', text: 'It is acceptable because the log stream is encrypted in transit over TLS', whyWrong: 'Transport security says nothing about where data comes to rest or who administers that system.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 's2.fedramp.conmon',
    mode: 'drill',
    nodeIds: ['sec.fedramp', 'sec.audit'],
    difficulty: 'deep',
    explanation:
      'Authorization is not a finish line. Continuous monitoring means ongoing scanning, reporting, and a plan of action and milestones tracking open findings, plus a change process where significant changes are reviewed before they ship. Swapping the model behind an AI feature is exactly the kind of change that needs to go through that process rather than land on a Friday deploy.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An authorized federal deployment wants to switch its underlying model to a newer one. What is the process consequence?',
      choices: [
        { id: 'a', text: 'None: the model is configuration, so it ships on the normal release train', whyWrong: 'A different model is a different processing component with different data handling and behavior. Calling it configuration is how an unreviewed change lands inside an authorized boundary.' },
        { id: 'b', text: 'It requires a full re-authorization package and a new agency sponsor review', whyWrong: 'Overcorrection. The change process exists precisely so authorized systems can evolve without restarting authorization.' },
        { id: 'c', text: 'It is likely a significant change, so it goes through the sponsor first' },
        { id: 'd', text: 'It matters only if the replacement model comes from a different vendor', whyWrong: 'Same-vendor version changes can alter behavior and data handling too. Vendor identity is not the test.' },
      ],
      correctId: 'c',
    },
  },
  {
    id: 's2.fedramp.dod_levels',
    mode: 'drill',
    nodeIds: ['sec.fedramp'],
    difficulty: 'edge',
    explanation:
      'Defense customers speak in impact levels from the Defense Department cloud requirements guide, which layer additional requirements on top of a FedRAMP baseline: things like dedicated infrastructure, US-person operational staffing and connectivity through defense network boundaries. A vendor who answers a defense impact-level question with a FedRAMP status is answering a different question.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A defense customer asks whether you can support their impact level requirement. Your product holds a FedRAMP Moderate authorization. What is the honest framing?',
      choices: [
        { id: 'a', text: 'FedRAMP Moderate already satisfies the defense impact levels in practice', whyWrong: 'It is a starting point, not equivalence. The additional requirements are exactly where the engineering and staffing cost lands.' },
        { id: 'b', text: 'Impact levels are simply the defense naming convention for FedRAMP baselines', whyWrong: 'They are a separate framework with its own requirements, maintained by a different authority.' },
        { id: 'c', text: 'Impact levels apply only to classified systems, so they are out of scope here', whyWrong: 'Several levels cover controlled unclassified information, which is where most defense SaaS work actually happens.' },
        { id: 'd', text: 'They build on a FedRAMP baseline and add infrastructure, staffing and network requirements' },
      ],
      correctId: 'd',
    },
  },

  // ── EU AI Act ────────────────────────────────────────────────────────────
  {
    id: 's2.eu_ai_act.provider_vs_deployer',
    mode: 'drill',
    nodeIds: ['sec.eu_ai_act'],
    difficulty: 'core',
    explanation:
      'The Act assigns duties by role. A provider develops or places a system on the market under its own name; a deployer uses it under its own authority. Both carry obligations for high-risk systems, and they are different obligations, so the first architecture question in an EU AI engagement is which role your customer is in and which role you are in.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You build a high-risk AI system that a customer runs inside their own business. Under the EU AI Act, how do the duties split?',
      choices: [
        { id: 'a', text: 'You carry provider duties; the customer carries deployer duties for its own use' },
        { id: 'b', text: 'All duties sit with you as the builder, since you designed and trained the system', whyWrong: 'Deployers have their own obligations because they control how the system is used in practice, which is where much of the real-world risk lives.' },
        { id: 'c', text: 'All duties sit with the customer, since they chose the use case and the data', whyWrong: 'Providers cannot hand off responsibility for the system’s design, documentation and conformity by pointing at the buyer.' },
        { id: 'd', text: 'Duties attach only once the system is used above a defined scale threshold', whyWrong: 'The framework keys on risk category and role, not on user counts or deployment size.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.eu_ai_act.deployer_becomes_provider',
    mode: 'drill',
    nodeIds: ['sec.eu_ai_act'],
    difficulty: 'edge',
    explanation:
      'A deployer can be treated as a provider if it puts its own name or trademark on a high-risk system, substantially modifies it, or changes its intended purpose so that it becomes high-risk. This is the trap for enterprises that white-label a vendor model and then wonder why the vendor documentation does not cover them. Say it out loud during the branding conversation, not after.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer wants to rebrand your high-risk AI system under their own name and add a materially different decision step. What do you flag?',
      choices: [
        { id: 'a', text: 'Nothing: white-labeling is a commercial arrangement with no regulatory effect', whyWrong: 'Placing a system on the market under your own name is precisely one of the conditions that shifts the role.' },
        { id: 'b', text: 'Rebranding plus a substantial modification can shift provider duties to them' },
        { id: 'c', text: 'They inherit your conformity assessment, which travels with the system itself', whyWrong: 'Conformity attaches to the system as assessed. A substantial modification changes the thing that was assessed.' },
        { id: 'd', text: 'Only the added decision step matters; branding alone is legally neutral', whyWrong: 'Both routes can trigger the shift independently. Treating branding as neutral misses half the exposure.' },
      ],
      correctId: 'b',
    },
  },
  {
    id: 's2.eu_ai_act.transparency_duties',
    mode: 'drill',
    nodeIds: ['sec.eu_ai_act', 'ai.guardrails'],
    difficulty: 'core',
    explanation:
      'Some obligations attach to a system regardless of whether it is high-risk: telling people they are interacting with an AI system, and marking machine-generated or manipulated content so it can be detected downstream. These are cheap to build in on day one and awkward to retrofit into a shipped product with a settled UI.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A retail chatbot is clearly not high-risk. Does the EU AI Act still shape the design?',
      choices: [
        { id: 'a', text: 'Yes: transparency duties apply, so users need to know they are talking to an AI system and generated content needs to be marked as such' },
        { id: 'b', text: 'No: only high-risk systems carry obligations', whyWrong: 'The transparency tier exists exactly for systems that are not high-risk. Skipping it because the risk tier is low is the common error.' },
        { id: 'c', text: 'Yes: a full conformity assessment is required for all AI systems', whyWrong: 'Conformity assessment is a high-risk obligation. Applying it to everything overstates the burden and costs you credibility.' },
        { id: 'd', text: 'Only if the chatbot handles personal data', whyWrong: 'That is the data protection question. Transparency duties here follow from the interaction, not from the data category.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.eu_ai_act.gpai_track',
    mode: 'drill',
    nodeIds: ['sec.eu_ai_act', 'gcp.model_garden'],
    difficulty: 'deep',
    explanation:
      'General purpose AI models sit on their own obligation track, with documentation, information for downstream providers and a copyright policy, and a heavier tier for models judged to pose systemic risk. It is separate from the risk classification of any system built on top. Practically, this is what lets you tell a customer that the model vendor owes them information they can use in their own assessment.',
    citations: cite('geap'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer building on a large foundation model asks what the model vendor owes them under the EU AI Act. What is the useful answer?',
      choices: [
        { id: 'a', text: 'General purpose model providers have their own duties, including technical documentation and information for downstream providers, which feeds the customer’s own assessment of their system' },
        { id: 'b', text: 'Nothing: obligations attach only to the deployed system', whyWrong: 'The framework deliberately places duties on the model layer so downstream builders are not reverse-engineering behavior blind.' },
        { id: 'c', text: 'The vendor’s obligations mean the customer’s system inherits compliance', whyWrong: 'Upstream documentation is an input to the customer’s obligations, not a substitute for them.' },
        { id: 'd', text: 'The model vendor must classify the customer’s use case for them', whyWrong: 'Classification follows the intended purpose the customer defines. The vendor cannot know that and is not responsible for it.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.eu_ai_act.high_risk_build',
    mode: 'drill',
    nodeIds: ['sec.eu_ai_act', 'ai.evals'],
    difficulty: 'deep',
    explanation:
      'High-risk obligations read like an engineering backlog: a risk management process, data governance over training and test sets, technical documentation, automatic logging over the system’s lifetime, information for deployers, human oversight that a person can actually exercise, and accuracy, robustness and cybersecurity appropriate to the purpose. Every one of these is cheaper designed in than bolted on.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Your system falls in the high-risk tier. Which of these become engineering requirements rather than paperwork? Select all that apply.',
      choices: [
        { id: 'a', text: 'Automatic logging of system events across its operational lifetime' },
        { id: 'b', text: 'Human oversight that a person can meaningfully exercise, including the ability to intervene or stop' },
        { id: 'c', text: 'Data governance over training, validation and test datasets, including known limitations' },
        { id: 'd', text: 'Choosing a model with the highest benchmark scores available', whyWrong: 'Benchmark leadership is not an obligation and can actively conflict with robustness and explainability requirements.' },
        { id: 'e', text: 'Publishing the model weights so regulators can inspect them', whyWrong: 'Nothing in the framework requires open weights. Documentation and traceability are the mechanism, not disclosure of the model itself.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 's2.eu_ai_act.tiers_match',
    mode: 'drill',
    nodeIds: ['sec.eu_ai_act'],
    difficulty: 'core',
    explanation:
      'The tiers are easy to garble in a customer meeting. Unacceptable practices are prohibited outright, high-risk systems carry the heavy obligation set, some systems carry transparency duties only, and the rest are effectively unregulated by the Act. Being able to place a use case on that ladder quickly is worth more to a customer than reciting the statute.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each EU AI Act tier to what it means for a build.',
      pairs: [
        { left: 'Unacceptable risk', right: 'Prohibited practice: no design will make it lawful, so the use case has to change' },
        { left: 'High risk', right: 'Permitted with the full obligation set: risk management, logging, oversight, documentation, conformity' },
        { left: 'Transparency risk', right: 'Permitted, but people must be told they are dealing with AI and generated content must be marked' },
        { left: 'Minimal risk', right: 'No specific obligations under the Act; normal data protection and sector rules still apply' },
      ],
    },
  },

  // ── Residency & sovereignty ──────────────────────────────────────────────
  {
    id: 's2.residency.personnel_access',
    mode: 'drill',
    nodeIds: ['sec.residency', 'gcp.assured'],
    difficulty: 'deep',
    explanation:
      'Residency has two halves that get conflated: where bytes rest and who can reach them. A workload pinned to an EU region that is supported by an on-call engineer in another continent still fails a sovereignty requirement written about personnel access. The controls that address this are personnel-location constraints and approval workflows over provider access, not another region setting.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An EU customer accepts your region pinning but asks who can access the environment during an incident. What actually answers them?',
      choices: [
        { id: 'a', text: 'Personnel-location constraints on both provider and vendor support, plus an approval and logging path for any access to their data' },
        { id: 'b', text: 'A statement that all data is stored in EU regions', whyWrong: 'That answers the storage half of the question they already accepted. They are asking about the access half.' },
        { id: 'c', text: 'Customer-managed encryption keys', whyWrong: 'Keys constrain decryption at rest. They do not constrain a support engineer working inside a session where the data is already decrypted.' },
        { id: 'd', text: 'A commitment that support tickets are handled within 24 hours', whyWrong: 'Response time is an operational SLA and has nothing to do with who touches the data.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.residency.dr_replica',
    mode: 'drill',
    nodeIds: ['sec.residency', 'gcp.assured'],
    difficulty: 'core',
    explanation:
      'Disaster recovery is where residency commitments quietly break. A multi-region bucket, a cross-region read replica or a backup vault chosen for durability can place a full copy of the data outside the committed geography. The fix is to make the residency constraint a policy that blocks the wrong region rather than a convention the DR design is expected to remember.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team committed to EU-only processing and then designed DR with a replica in a US region for durability. What is the correct intervention?',
      choices: [
        { id: 'a', text: 'Constrain the allowed regions with org policy so DR must be built inside the committed geography, and revisit the recovery objectives under that constraint' },
        { id: 'b', text: 'Allow it: DR copies are only read during a disaster', whyWrong: 'A replica holds the data continuously, whether or not anyone reads it. Storage is storage.' },
        { id: 'c', text: 'Allow it if the replica is encrypted with a customer-managed key', whyWrong: 'Encryption does not change the location of the data or satisfy a geographic commitment.' },
        { id: 'd', text: 'Drop DR entirely to preserve the commitment', whyWrong: 'False choice. In-geography DR is available; what changes is the cost and possibly the recovery objectives.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.residency.inference_logs',
    mode: 'drill',
    nodeIds: ['sec.residency', 'sec.audit'],
    difficulty: 'deep',
    explanation:
      'Prompts and responses are the highest-sensitivity payloads in an AI system and they end up in more places than the primary datastore: abuse-monitoring logs, tracing spans, evaluation captures and error reports. Any of those defaulting to a global sink undoes a residency commitment more thoroughly than the database ever would, because prompts often contain the raw record rather than a reference to it.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A residency review of an EU-only AI service comes back clean on storage. Where should you look next, and why is it the highest-risk gap?',
      choices: [
        { id: 'a', text: 'Prompt and response capture in logs, traces and eval datasets, because those carry the raw content and often default to a global destination' },
        { id: 'b', text: 'The container registry holding your images', whyWrong: 'Images are code artifacts. They are worth pinning for supply-chain reasons but they do not carry customer personal data.' },
        { id: 'c', text: 'The CDN serving your static assets', whyWrong: 'Static assets are not personal data. Worth checking for completeness, but it is not where the exposure is.' },
        { id: 'd', text: 'Your billing exports', whyWrong: 'Billing records usage aggregates, not the content of prompts. Lower sensitivity by a wide margin.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.residency.key_custody',
    mode: 'drill',
    nodeIds: ['sec.residency', 'gcp.kms'],
    difficulty: 'deep',
    explanation:
      'Sovereignty conversations often land on key custody: customer-managed keys inside the cloud, versus keys held in an external manager the customer operates. The external option gives the customer a real ability to withhold decryption, at the cost of an availability dependency on their key service and on the network between them. Be honest that it changes your failure modes, not just your compliance story.',
    citations: cite('cmek'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A sovereignty-focused customer wants keys held outside the cloud provider entirely. What is the trade-off you must state?',
      choices: [
        { id: 'a', text: 'They gain a genuine ability to withhold decryption, and take on an availability dependency: if their key service or the link to it is down, the workload cannot read its own data' },
        { id: 'b', text: 'It is strictly better than provider-managed keys with no operational cost', whyWrong: 'Selling it as free is how you end up in a post-incident review explaining an outage caused by the customer’s own key service.' },
        { id: 'c', text: 'It is equivalent to customer-managed keys inside the provider', whyWrong: 'In-provider customer-managed keys still live in the provider’s key service. The externalized model is the one that changes who can technically deny access.' },
        { id: 'd', text: 'It removes the need for region pinning', whyWrong: 'Encryption custody and data location are independent controls. Neither substitutes for the other.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.residency.controls_match',
    mode: 'drill',
    nodeIds: ['sec.residency', 'gcp.assured'],
    difficulty: 'core',
    explanation:
      'Customers rarely say "residency" and mean one thing. Pulling their requirement apart into storage location, processing location, personnel access and key custody lets you map each to a control and shows immediately which parts you already satisfy. That triage is usually worth more in the meeting than any single technical answer.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each flavor of sovereignty requirement to the control that actually addresses it.',
      pairs: [
        { left: 'Data must rest in-country', right: 'Region-constrained resources enforced by organization policy, including backups and DR' },
        { left: 'Data must be processed in-country', right: 'Regional model and service endpoints with processing commitments, not global endpoints' },
        { left: 'Provider staff must not access data unilaterally', right: 'Access approval workflows plus transparency logs of provider access' },
        { left: 'Customer must be able to cut off access', right: 'Externally held encryption keys the customer can revoke' },
      ],
    },
  },

  // ── PII & de-identification ──────────────────────────────────────────────
  {
    id: 's2.pii.tokenization_vs_encryption',
    mode: 'drill',
    nodeIds: ['sec.pii'],
    difficulty: 'core',
    explanation:
      'Encryption keeps the value recoverable by anyone with the key, so the ciphertext still lives in your systems and still has to be protected. Tokenization replaces the value with a surrogate and moves the real value into a separate vault, so the bulk of your estate holds nothing sensitive. The choice is about shrinking scope, not about cryptographic strength.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A payments customer wants to shrink the number of systems in scope for sensitive-data controls. Tokenization or field-level encryption?',
      choices: [
        { id: 'a', text: 'Tokenization: the surrogate carries no recoverable value, so downstream systems fall out of scope and the vault is the only thing to defend' },
        { id: 'b', text: 'Field-level encryption, because it is mathematically stronger', whyWrong: 'Strength is not the question. Encrypted values plus keys in the same estate keep those systems in scope, which is the outcome they asked to avoid.' },
        { id: 'c', text: 'Either: the compliance effect is the same', whyWrong: 'The scope-reduction effect is exactly what differs, and it is the entire reason tokenization is used in payments.' },
        { id: 'd', text: 'Neither: hashing is the standard approach', whyWrong: 'Hashing destroys the ability to recover the value, which breaks the operational uses that motivated keeping it at all.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.pii.embeddings',
    mode: 'drill',
    nodeIds: ['sec.pii', 'ai.chunking'],
    difficulty: 'edge',
    explanation:
      'An embedding is a lossy but far from anonymous encoding: research has repeatedly shown meaningful reconstruction of source text from vectors, and membership can often be inferred. Treat a vector index holding embeddings of personal data as a store of personal data, with the same access controls, residency and deletion obligations as the source. Redacting before embedding is the only step that genuinely reduces exposure.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team argues their vector index is out of scope for PII controls because "embeddings are just numbers". What is the correction?',
      choices: [
        { id: 'a', text: 'Embeddings can be inverted well enough to recover substantial source content, so the index is a personal data store and inherits the same controls' },
        { id: 'b', text: 'They are right as long as the index has no metadata fields', whyWrong: 'The vectors themselves carry the content signal. Stripping metadata reduces convenience for an attacker, not the underlying exposure.' },
        { id: 'c', text: 'They are right, but you should still restrict access as a precaution', whyWrong: 'Framing it as precaution concedes the wrong premise, and it will not survive a reviewer who has read the inversion literature.' },
        { id: 'd', text: 'It only matters if the embedding model is self-hosted', whyWrong: 'Where the model runs affects who processes the text, not whether the resulting vectors encode personal data.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.pii.quasi_identifiers',
    mode: 'drill',
    nodeIds: ['sec.pii'],
    difficulty: 'deep',
    explanation:
      'Re-identification usually comes from combinations, not from a single field. Postcode plus date of birth plus gender narrows most populations to a handful of people, and a rare job title or a rare diagnosis can be unique on its own. Any de-identification claim needs to reason about quasi-identifiers and about what else the recipient plausibly holds.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A dataset has no names or IDs, but keeps postcode, date of birth, gender and job title. Why is that risky, and what is the practical mitigation?',
      choices: [
        { id: 'a', text: 'Those quasi-identifiers combine to single people out, so generalize them until every combination covers a group of adequate size' },
        { id: 'b', text: 'It is fine: none of those fields identifies anyone on its own', whyWrong: 'Uniqueness comes from the combination. Evaluating fields one at a time is exactly the reasoning error that produces re-identifiable datasets.' },
        { id: 'c', text: 'Encrypt the four columns and keep the rest', whyWrong: 'Encrypting the columns you need for analysis makes them useless. If they are unusable you should have dropped them, and if they are usable you have not reduced the risk.' },
        { id: 'd', text: 'Add random noise to each row independently', whyWrong: 'Naive per-row noise degrades utility while leaving combination uniqueness largely intact. Meaningful noise-based privacy needs a formal mechanism and a budget.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.pii.minimization_prompt',
    mode: 'drill',
    nodeIds: ['sec.pii', 'ai.context'],
    difficulty: 'core',
    explanation:
      'The simplest privacy control in an AI system is not sending the data at all. Most prompts carry an entire record when the model only needs three fields, usually because someone serialized the object that happened to be in hand. Trimming the payload reduces exposure, reduces token cost, and often improves the answer by removing distraction.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A support agent prompt includes the customer’s full CRM record because it was easy to serialize. What is the strongest argument for trimming it?',
      choices: [
        { id: 'a', text: 'Data minimization: every field you do not send cannot be logged, cached, leaked or subpoenaed, and the answer quality usually improves' },
        { id: 'b', text: 'Token cost, which is the main reason to shorten prompts', whyWrong: 'Cost is a real benefit and a weak argument in a security review. Lead with exposure and let cost be the bonus.' },
        { id: 'c', text: 'Models perform worse with structured JSON input', whyWrong: 'Not true as a general claim, and it is not why the record should be trimmed.' },
        { id: 'd', text: 'Long prompts increase the chance of prompt injection', whyWrong: 'Injection risk comes from untrusted content in the context, not from length as such. Conflating them muddies both controls.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.pii.ingest_order',
    mode: 'drill',
    nodeIds: ['sec.pii', 'ai.chunking'],
    difficulty: 'deep',
    explanation:
      'Redaction has to happen before anything derived is created, because every downstream artifact is a copy. Inspect and redact at ingest, then chunk, then embed, then index, and keep the mapping back to the original in a controlled store if the workflow ever needs to reverse it. Teams that redact at query time discover that the index they built last month is the problem.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the stages of a RAG ingest pipeline that must not put personal data into the index.',
      steps: [
        'Land the raw document in a restricted staging store with access logging',
        'Inspect for sensitive data and redact or tokenize the findings in place',
        'Chunk the redacted text and attach tenant and sensitivity metadata',
        'Embed the redacted chunks',
        'Write vectors and metadata to the index, which now holds no raw personal data',
      ],
    },
  },

  // ── Tenancy ──────────────────────────────────────────────────────────────
  {
    id: 's2.tenancy.vector_isolation',
    mode: 'drill',
    nodeIds: ['sec.tenancy', 'gcp.vector_search'],
    difficulty: 'deep',
    explanation:
      'A metadata filter on tenant id works until one query is built without it, and then the failure is a silent cross-tenant read rather than an error. Separate namespaces or indexes per tenant make the isolation structural: the wrong tenant is not filtered out, it is unreachable. The cost is index proliferation and worse small-tenant economics, which is a real trade rather than a free win.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A multi-tenant RAG service filters retrieval results by a tenant id stored in vector metadata. What is the argument for per-tenant namespaces instead?',
      choices: [
        { id: 'a', text: 'A missing filter is a silent leak, whereas a namespace boundary makes other tenants structurally unreachable rather than merely filtered out' },
        { id: 'b', text: 'Metadata filters are too slow at scale', whyWrong: 'Filter performance varies but is rarely the deciding factor, and optimizing latency is not the reason a security reviewer objects.' },
        { id: 'c', text: 'Namespaces let you use a different embedding model per tenant', whyWrong: 'Possible but unrelated. Mixing embedding models across a shared retrieval surface is usually a problem, not a feature.' },
        { id: 'd', text: 'Metadata cannot be trusted because tenants can write to it', whyWrong: 'Tenants do not write index metadata in a sane design. The risk is your own query code, not tenant tampering.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.tenancy.cache_key',
    mode: 'drill',
    nodeIds: ['sec.tenancy', 'ai.cost'],
    difficulty: 'edge',
    explanation:
      'Semantic and exact-match response caches are one of the most common cross-tenant leaks in AI systems, because the natural cache key is the prompt and the prompt looks identical across tenants for common questions. Any cache in a multi-tenant AI path needs tenant identity, and usually the caller’s authorization context, folded into the key.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team adds a semantic cache keyed on prompt similarity to cut model spend in a multi-tenant product. What breaks?',
      choices: [
        { id: 'a', text: 'Similar prompts from different tenants collide, so one tenant can be served an answer computed from another tenant’s documents; the key must include tenant and authorization context' },
        { id: 'b', text: 'Nothing, since the cache stores only answers and not source documents', whyWrong: 'The answer is derived from the documents and frequently quotes them. Serving it across a tenant boundary is the leak.' },
        { id: 'c', text: 'Cache hit rates will be too low to be worth it', whyWrong: 'Hit rates on common questions are often high, which is exactly why this failure mode gets shipped and then bites.' },
        { id: 'd', text: 'Latency becomes unpredictable', whyWrong: 'A cache reduces latency variance for hits. That is not the issue with this design.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.tenancy.per_tenant_keys',
    mode: 'drill',
    nodeIds: ['sec.tenancy', 'gcp.kms'],
    difficulty: 'deep',
    explanation:
      'Per-tenant encryption keys buy two concrete things: a customer can be told exactly which key protects their data, and destroying that key renders their data unrecoverable, which is a clean offboarding story. They do not prevent an application-layer bug from reading another tenant’s rows, because the application already holds decryption rights for every tenant it serves.',
    citations: cite('cmek'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer asks for their own encryption key in your pooled multi-tenant platform. What does that genuinely give them, and what does it not?',
      choices: [
        { id: 'a', text: 'It gives cryptographic deletion on offboarding and a per-tenant key boundary; it does not stop an application bug that queries across tenants' },
        { id: 'b', text: 'It isolates their data from other tenants at every layer', whyWrong: 'The application holds keys for all tenants it serves. A missing tenant predicate in a query is unaffected by which key encrypted the bytes.' },
        { id: 'c', text: 'It is purely cosmetic and worth declining', whyWrong: 'Cryptographic erasure and a clear per-customer boundary are real. Dismissing the ask loses a control you can charge for.' },
        { id: 'd', text: 'It converts a pooled deployment into a siloed one', whyWrong: 'Key separation is one dimension. Compute, cache, index and network are all still shared.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.tenancy.siloed_migration',
    mode: 'drill',
    nodeIds: ['sec.tenancy'],
    difficulty: 'deep',
    explanation:
      'Promoting one large customer from a pooled deployment to a dedicated one is a migration, not a config flag. It needs an isolated environment stood up from the same infrastructure code, a data move with a verification step, a cutover with a rollback, and an explicit decision about how that tenant now receives releases. The last item is what turns into a support problem eighteen months later.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the steps for moving one enterprise tenant from your pooled platform into a dedicated deployment.',
      steps: [
        'Agree what isolation the customer is actually buying and what they give up, including release cadence',
        'Stand up the dedicated environment from the same infrastructure code, with no manual drift',
        'Replicate the tenant’s data and verify record counts and checksums against the source',
        'Cut over with the pooled tenant left read-only and a documented rollback',
        'Remove the tenant’s data from the pooled stores and confirm deletion across derived indexes',
      ],
    },
  },

  // ── Zero trust ───────────────────────────────────────────────────────────
  {
    id: 's2.zero_trust.iap',
    mode: 'drill',
    nodeIds: ['sec.zero_trust', 'gcp.iam'],
    difficulty: 'core',
    explanation:
      'An identity-aware proxy puts authentication and authorization in front of the application at the request level, so being on the corporate network grants nothing and contractors need no VPN client. The migration insight is that the app no longer needs its own login, but it does need to trust the identity header the proxy asserts and reject anything that reaches it directly.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are putting an internal AI tool behind an identity-aware proxy instead of the VPN. What must the application still do?',
      choices: [
        { id: 'a', text: 'Verify the proxy’s signed identity assertion and refuse any request that did not come through the proxy' },
        { id: 'b', text: 'Nothing: the proxy handles authentication end to end', whyWrong: 'If the backend accepts unproxied traffic, anyone who can route to it bypasses the whole control. The proxy is only as good as the backend’s refusal to be reached directly.' },
        { id: 'c', text: 'Keep its own login as a fallback for when the proxy is unavailable', whyWrong: 'A fallback login is a permanent bypass with worse controls, and it will be the path an attacker uses.' },
        { id: 'd', text: 'Allowlist the proxy’s IP range and trust anything from it', whyWrong: 'IP-based trust is the assumption zero trust removes, and it discards the per-user identity the proxy just established.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.zero_trust.standing_privilege',
    mode: 'drill',
    nodeIds: ['sec.zero_trust', 'idp.impersonation'],
    difficulty: 'deep',
    explanation:
      'Standing admin access is the single largest contributor to blast radius, because it is available at three in the morning to whoever phished the right person. Just-in-time elevation with a reason, an expiry and an alert converts a permanent capability into an auditable event. The engineering work is mostly in making the elevation fast enough that nobody builds a way around it.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Twelve engineers hold permanent production admin "so incidents are not blocked". What do you propose, and what makes it stick?',
      choices: [
        { id: 'a', text: 'Just-in-time elevation with a stated reason, a short expiry and an alert, plus making the path fast enough that nobody keeps a side door' },
        { id: 'b', text: 'Cut it to three engineers who keep permanent admin', whyWrong: 'Fewer standing credentials is better than more, but the failure mode is unchanged and now three people are a single point of both risk and availability.' },
        { id: 'c', text: 'Keep the access and add quarterly reviews', whyWrong: 'A review confirms the access still exists. It does nothing about the 89 days between reviews.' },
        { id: 'd', text: 'Require a change ticket before any production login', whyWrong: 'Process without enforcement is a convention people abandon during a real incident, which is precisely when it matters.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.zero_trust.device_context',
    mode: 'drill',
    nodeIds: ['sec.zero_trust'],
    difficulty: 'core',
    explanation:
      'Context-aware access evaluates signals beyond the password: whether the device is managed and patched, where the request comes from, and how sensitive the resource is. It is what lets you allow read access from a personal laptop while requiring a managed device for anything that exports data, instead of making one blunt allow or deny decision for the whole application.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer wants contractors to use an internal AI assistant but not to bulk-export from it. What is the zero-trust shape of that?',
      choices: [
        { id: 'a', text: 'Graduated access policy: authenticated use from any compliant device, with export actions gated on a managed device and a stronger authentication signal' },
        { id: 'b', text: 'Give contractors a separate read-only account', whyWrong: 'Account splitting is coarse and drifts. It also does not tie the decision to device posture, which is the actual risk here.' },
        { id: 'c', text: 'Block contractors from the assistant entirely', whyWrong: 'That refuses the business requirement rather than meeting it, and the work will route around you into a consumer tool.' },
        { id: 'd', text: 'Put the assistant on a network segment contractors cannot reach', whyWrong: 'Network segmentation is the perimeter model. It cannot express "this person, this device, this action".' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.zero_trust.agent_privilege',
    mode: 'drill',
    nodeIds: ['sec.zero_trust', 'idp.agent_identity'],
    difficulty: 'deep',
    explanation:
      'An agent is a workload whose next action is decided by text it read somewhere. That makes its permission set the ceiling on the damage an injection can do, so tools should be scoped narrowly, write actions should be separated from read actions, and anything irreversible should need a human. Least privilege stops being a hygiene item and becomes the primary containment control.',
    citations: cite('modelArmor', 'adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Why does least privilege matter more for an autonomous agent than for a conventional service with the same integrations?',
      choices: [
        { id: 'a', text: 'The agent’s next call is chosen from untrusted text, so its granted permissions are the exact upper bound on what a successful injection can do' },
        { id: 'b', text: 'Agents make more API calls, so the exposure window is longer', whyWrong: 'Volume affects cost and rate limits. It does not change what an attacker can reach.' },
        { id: 'c', text: 'Agents cannot be covered by the same audit logging', whyWrong: 'They can and must be. Logging is a separate control and does not explain the privilege argument.' },
        { id: 'd', text: 'Model providers require least privilege in their terms', whyWrong: 'Contract terms are not the reason. The reason is that instruction and data share one channel.' },
      ],
      correctId: 'a',
    },
  },

  // ── Audit & access transparency ──────────────────────────────────────────
  {
    id: 's2.audit.log_immutability',
    mode: 'drill',
    nodeIds: ['sec.audit'],
    difficulty: 'core',
    explanation:
      'Audit logs are only evidence if the people whose actions they record cannot alter them. That means an export to a destination in a separate project or account, with retention locked and write access held by a different team. Logs sitting in the same project as the workload, deletable by the same service account, prove nothing to an auditor who is asking about insider risk.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An auditor asks whether your audit trail could have been tampered with by the platform team. What answers that?',
      choices: [
        { id: 'a', text: 'Logs are exported to a separate project under different ownership, with locked retention so nobody including that team can delete or shorten them' },
        { id: 'b', text: 'Logs are write-only from the application’s perspective', whyWrong: 'The application not deleting logs is irrelevant if an operator with project access can. The question is about the humans, not the code path.' },
        { id: 'c', text: 'Logs are encrypted at rest with a customer-managed key', whyWrong: 'Encryption protects confidentiality. It does nothing to prevent deletion or modification by someone with the right permissions.' },
        { id: 'd', text: 'Logs are replicated to a second region', whyWrong: 'Replication protects against regional loss and faithfully copies a deletion. It is durability, not integrity.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.audit.transparency_vs_approval',
    mode: 'drill',
    nodeIds: ['sec.audit', 'gcp.assured'],
    difficulty: 'deep',
    explanation:
      'Access Transparency tells you after the fact that provider personnel touched your content and why. Access Approval requires them to ask first and lets you refuse. Customers frequently ask for the first and mean the second, and the difference is a support-latency conversation, because a denied or unanswered approval during an outage extends the outage.',
    citations: cite('assured'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A regulated customer says they need to "control cloud provider access to our data". Which control matches, and what must you warn them about?',
      choices: [
        { id: 'a', text: 'Access Approval, since transparency logs are after-the-fact; warn that an unanswered approval request during an incident will lengthen the outage' },
        { id: 'b', text: 'Access Transparency, which is the industry standard control for this', whyWrong: 'Transparency gives visibility, not control. If they asked for control, handing them a log is answering a different question.' },
        { id: 'c', text: 'VPC Service Controls, which prevent provider access', whyWrong: 'A service perimeter constrains data movement across API boundaries. It is not a control over provider personnel actions.' },
        { id: 'd', text: 'Customer-managed keys, which make provider access impossible', whyWrong: 'Overclaim. Keys inside the provider’s key service do not make administrative access impossible, and saying so damages your credibility fast.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.audit.agent_trail',
    mode: 'drill',
    nodeIds: ['sec.audit', 'idp.agent_identity'],
    difficulty: 'deep',
    explanation:
      'An agent audit record has to reconstruct a decision, not just record an API call. That means the human on whose behalf it acted, the agent and its version, the prompt or plan that led to the tool call, the arguments, the result, and any approval that gated it. Without the version and the reasoning input, the trail tells you what happened but never why, which is the question every post-incident review asks.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'An agent issued a refund it should not have. Which fields must the audit record carry for the review to reach a conclusion? Select all that apply.',
      choices: [
        { id: 'a', text: 'The end user the agent was acting for, distinct from the agent’s own identity' },
        { id: 'b', text: 'The agent build or prompt version in effect at the time' },
        { id: 'c', text: 'The tool call arguments and the retrieved context that led to it' },
        { id: 'd', text: 'The total token cost of the session', whyWrong: 'Useful for a cost dashboard and useless for determining why the wrong decision was made.' },
        { id: 'e', text: 'The model’s reported confidence score', whyWrong: 'Most production stacks do not have a meaningful calibrated confidence here, and treating one as an audit field invites false conclusions.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 's2.audit.prompt_retention_tension',
    mode: 'drill',
    nodeIds: ['sec.audit', 'sec.pii'],
    difficulty: 'edge',
    explanation:
      'Auditability wants long retention of prompts and responses; data minimization wants the opposite, and prompts are among the most sensitive payloads you hold. The workable design separates the two needs: a durable, tightly controlled record of who did what with which document identifiers, and a much shorter retention for the raw text, with redaction on the way in.',
    citations: cite('genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Compliance wants seven years of AI interaction history; privacy wants prompts kept for thirty days. What do you design?',
      choices: [
        { id: 'a', text: 'Split the record: long retention for actor, action, timestamps and document references, short retention for the raw prompt and response text' },
        { id: 'b', text: 'Keep everything for seven years and restrict access tightly', whyWrong: 'Access control does not answer a minimization obligation, and it makes every future breach seven years deep.' },
        { id: 'c', text: 'Keep everything for thirty days and tell compliance the constraint is technical', whyWrong: 'It is not technical, and misrepresenting a design choice as a limitation is how you lose the room.' },
        { id: 'd', text: 'Store hashes of prompts for the long window', whyWrong: 'A hash of free text is unsearchable and uninterpretable later. It satisfies neither side while looking like a solution.' },
      ],
      correctId: 'a',
    },
  },

  // ── OIDC & OAuth flows ───────────────────────────────────────────────────
  {
    id: 's2.oidc.id_vs_access',
    mode: 'drill',
    nodeIds: ['idp.oidc', 'idp.jwt'],
    difficulty: 'core',
    explanation:
      'An ID token is a statement to the client about who authenticated; an access token is a credential for calling an API. Sending the ID token to your backend as authorization is a common shortcut that works, because it validates, and is wrong, because its audience is the client and nothing constrains what it may be used for. The fix is one line of configuration and a lot of arguing.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A frontend sends its OIDC ID token in the Authorization header and the API validates the signature happily. What is wrong?',
      choices: [
        { id: 'a', text: 'The ID token is audienced to the client and carries no authorization semantics; the API should require an access token issued for its own audience' },
        { id: 'b', text: 'Nothing, as long as the signature and expiry check out', whyWrong: 'Signature validity says the token is genuine, not that it was issued for this API or authorizes anything.' },
        { id: 'c', text: 'ID tokens are unsigned and cannot be validated', whyWrong: 'ID tokens are signed JWTs. The problem is what they mean, not whether they verify.' },
        { id: 'd', text: 'ID tokens expire too quickly for API use', whyWrong: 'Lifetime is not the issue and lengthening it would make this worse, not better.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.oidc.device_flow',
    mode: 'drill',
    nodeIds: ['idp.oidc'],
    difficulty: 'core',
    explanation:
      'The device authorization grant exists for clients that cannot host a browser or receive a redirect: CLIs on headless machines, appliances, terminals. The device shows a code, the user completes login on a device that does have a browser, and the client polls until the authorization lands. Reaching for client credentials instead is what turns a per-user CLI into a shared service account.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A CLI runs on a headless build machine and must act as the engineer who invoked it. Which OAuth grant fits?',
      choices: [
        { id: 'a', text: 'Device authorization grant: display a code, the engineer approves in a browser elsewhere, the CLI polls for the token' },
        { id: 'b', text: 'Client credentials, since there is no browser available', whyWrong: 'Client credentials authenticate the application, not the person. You lose per-user attribution, which was the requirement.' },
        { id: 'c', text: 'Resource owner password credentials, prompting for the password in the terminal', whyWrong: 'That grant is deprecated for good reasons: it teaches users to type their password into arbitrary software and defeats multi-factor and federation.' },
        { id: 'd', text: 'Authorization code with PKCE and a loopback redirect', whyWrong: 'Reasonable on a developer laptop, but a headless machine has no browser to open and often no reachable loopback for the user.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.oidc.state_nonce',
    mode: 'drill',
    nodeIds: ['idp.oidc'],
    difficulty: 'deep',
    explanation:
      'The state parameter binds the callback to the browser session that started the flow, defending against a forged authorization response. The nonce binds the resulting ID token to that same request, defending against a token replayed from elsewhere. They defend different hops, which is why libraries implement both and why dropping one because "we already have the other" is a real finding.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A reviewer asks why the login flow needs both `state` and `nonce`. What is the accurate distinction?',
      choices: [
        { id: 'a', text: '`state` ties the callback back to the request the browser initiated; `nonce` ties the issued ID token to that same request so a replayed token is rejected' },
        { id: 'b', text: 'They are redundant; `state` alone is sufficient in modern flows', whyWrong: 'They cover different attacks. A valid ID token obtained elsewhere can be injected into a flow that only checks state.' },
        { id: 'c', text: '`nonce` prevents CSRF and `state` prevents replay', whyWrong: 'The roles are the other way around, which is exactly the confusion worth clearing up.' },
        { id: 'd', text: 'Both exist only for logging correlation', whyWrong: 'Neither is a correlation identifier. Treating them as telemetry is how implementations stop validating them.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.oidc.bff',
    mode: 'drill',
    nodeIds: ['idp.oidc', 'client.token_storage'],
    difficulty: 'deep',
    explanation:
      'The backend-for-frontend pattern keeps tokens entirely server-side and gives the browser a same-site, http-only session cookie instead. Nothing exploitable by script ever reaches the page, which removes the whole category of token theft through cross-site scripting or a compromised dependency. The cost is a stateful backend hop, which is usually cheaper than the alternative.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A bank refuses to accept any design where OAuth tokens are reachable from browser JavaScript. What do you propose?',
      choices: [
        { id: 'a', text: 'A backend-for-frontend that holds the tokens server-side and issues the browser an http-only, same-site session cookie' },
        { id: 'b', text: 'Store tokens in memory only, never in localStorage', whyWrong: 'Better than localStorage and still reachable by any script running in the page, which is what the bank objected to.' },
        { id: 'c', text: 'Encrypt tokens before putting them in localStorage', whyWrong: 'The key has to live in the same page, so anything that can read the ciphertext can read the key.' },
        { id: 'd', text: 'Use very short token lifetimes and refresh silently', whyWrong: 'Short lifetimes shrink the window and do not remove the exposure. Silent refresh also requires keeping a refresh capability in the browser.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.oidc.grant_match',
    mode: 'drill',
    nodeIds: ['idp.oidc'],
    difficulty: 'intro',
    explanation:
      'Grant selection follows from what the client is: can it keep a secret, can it host a browser, and is there a human present at all. Getting this mapping automatic saves a great deal of time, because most authentication design arguments are really arguments about which of these three facts is true.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each client to the OAuth grant it should use.',
      pairs: [
        { left: 'Single-page app in a browser', right: 'Authorization code with PKCE, ideally fronted by a backend that holds the tokens' },
        { left: 'Mobile app', right: 'Authorization code with PKCE, no client secret shipped in the binary' },
        { left: 'Nightly batch job with no user', right: 'Client credentials against its own workload identity' },
        { left: 'CLI on a headless server', right: 'Device authorization grant so a human approves in a browser elsewhere' },
      ],
    },
  },

  // ── SAML & enterprise SSO ────────────────────────────────────────────────
  {
    id: 's2.saml.cert_rotation',
    mode: 'drill',
    nodeIds: ['idp.saml'],
    difficulty: 'core',
    explanation:
      'The most common SAML outage is not an attack, it is a signing certificate expiring on a date nobody tracked. The durable fix is to consume the identity provider metadata on a schedule so new keys are picked up automatically, and to support more than one valid signing key during an overlap so rotation is not a cutover. Manual certificate uploads are a calendar dependency you will forget.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Every eighteen months a customer’s SSO breaks for a morning when their IdP rotates its signing certificate. What is the fix?',
      choices: [
        { id: 'a', text: 'Refresh the IdP metadata on a schedule and accept multiple valid signing keys during the overlap window' },
        { id: 'b', text: 'Ask the customer to notify you a week before each rotation', whyWrong: 'You are outsourcing your uptime to somebody else’s change calendar, and the notification will eventually not arrive.' },
        { id: 'c', text: 'Pin the certificate and lengthen its validity period', whyWrong: 'Long-lived signing certificates are the opposite of good hygiene, and most enterprise IdPs will not agree to it anyway.' },
        { id: 'd', text: 'Skip signature validation on assertions from trusted customers', whyWrong: 'That removes the only thing making a SAML assertion trustworthy. It converts an availability problem into a total authentication bypass.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.saml.idp_initiated',
    mode: 'drill',
    nodeIds: ['idp.saml'],
    difficulty: 'deep',
    explanation:
      'In an IdP-initiated flow the service provider receives an unsolicited assertion with no request of its own to match it against, so the standard defenses against replay and against a forced login into an attacker-controlled context are weaker. Enterprises want it because of their application portal tile. The workable answer is to support it with strict single-use tracking and a bounded validity window while making the portal tile trigger an SP-initiated flow where you can.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer insists on IdP-initiated SSO from their app portal. What do you tell them and what do you build?',
      choices: [
        { id: 'a', text: 'It is weaker because there is no request to bind the assertion to, so build strict single-use tracking and a tight validity window, and point the portal tile at an SP-initiated start where possible' },
        { id: 'b', text: 'Refuse: IdP-initiated SSO is insecure and unsupportable', whyWrong: 'Absolutism loses the deal over something with well-understood mitigations that most enterprise SaaS supports.' },
        { id: 'c', text: 'Accept it as equivalent to SP-initiated; the assertion is signed either way', whyWrong: 'Signing proves origin, not freshness or intent. The missing request binding is the real difference.' },
        { id: 'd', text: 'Support it and set a long assertion validity so portal clicks never fail', whyWrong: 'A long validity window is precisely what makes a captured assertion useful to an attacker.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.saml.scim_gap',
    mode: 'drill',
    nodeIds: ['idp.saml', 'idp.revocation'],
    difficulty: 'core',
    explanation:
      'SAML tells you a person authenticated. It does not tell you a person was hired, changed teams or was terminated. Without a provisioning channel, an offboarded employee simply stops being able to log in while their account, their group memberships and any API keys they created stay alive. Provisioning is the other half of the SSO conversation and it is the half that shows up in audit findings.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer has SAML SSO configured and asks why an offboarded employee still appears as an active user in your product. What do you explain?',
      choices: [
        { id: 'a', text: 'SSO handles authentication only; deprovisioning needs a provisioning channel such as SCIM so deactivation propagates rather than merely blocking future logins' },
        { id: 'b', text: 'The account will expire automatically after a period of inactivity', whyWrong: 'Inactivity expiry is a slow, unreliable substitute for deprovisioning and leaves any non-interactive credential intact.' },
        { id: 'c', text: 'They should delete the user manually in your admin console', whyWrong: 'A workable stopgap and a process that fails silently at scale, which is the finding they will get next audit.' },
        { id: 'd', text: 'SAML deprovisions users on single logout', whyWrong: 'Single logout ends sessions. It has no concept of an account lifecycle.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.saml.assertion_checks',
    mode: 'drill',
    nodeIds: ['idp.saml', 'idp.jwt'],
    difficulty: 'deep',
    explanation:
      'Assertion validation is where SAML implementations go wrong, because the XML is complex and libraries expose enough surface to make a mistake. The non-negotiable checks are that the signature covers the element you trust and verifies against a configured key, that you are the intended audience, that the validity window is current, and that this assertion has not been seen before.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the validation your service provider must perform on an incoming SAML assertion.',
      steps: [
        'Verify the signature against a key from the configured IdP metadata, over the element you intend to trust',
        'Check the audience restriction names your service provider entity',
        'Check the validity window and the subject confirmation, allowing only small clock skew',
        'Reject the assertion if its identifier has been seen before, and record it',
        'Map attributes to your user model and only then establish a session',
      ],
    },
  },

  // ── JWT validation ───────────────────────────────────────────────────────
  {
    id: 's2.jwt.alg_pinning',
    mode: 'drill',
    nodeIds: ['idp.jwt'],
    difficulty: 'deep',
    explanation:
      'A verifier that takes the algorithm from the token header lets the token choose how it will be checked, which is how `none` acceptance and symmetric-for-asymmetric confusion attacks work. The verifier must pin the expected algorithm and key type from configuration and reject anything else, treating the header as a hint about which key, never about which scheme.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A code review finds the JWT verifier reads `alg` from the token header and dispatches on it. Why is that the finding?',
      choices: [
        { id: 'a', text: 'The token gets to choose how it is verified, enabling `none` acceptance and passing a public key off as a symmetric secret; pin the algorithm in configuration instead' },
        { id: 'b', text: 'It is slower than hard-coding the algorithm', whyWrong: 'Performance is irrelevant here. The issue is that an attacker controls a security-critical decision.' },
        { id: 'c', text: 'Some issuers omit the `alg` header, so parsing may fail', whyWrong: '`alg` is required in practice. Missing-header handling is not the vulnerability.' },
        { id: 'd', text: 'It breaks when the issuer rotates keys', whyWrong: 'Key rotation is tracked by `kid`, a separate concern from algorithm selection.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.jwt.jwks_cache',
    mode: 'drill',
    nodeIds: ['idp.jwt'],
    difficulty: 'deep',
    explanation:
      'Fetching the issuer key set on every request makes the identity provider a hard dependency in your hot path and invites rate limiting. Caching it forever means the first key rotation takes you down. The correct behavior is a cached key set with a sane refresh interval, plus a single rate-limited refetch when an unknown key identifier appears, so rotation self-heals without becoming a stampede.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'How should a resource server handle the issuer’s public key set?',
      choices: [
        { id: 'a', text: 'Cache it with a periodic refresh, and refetch once, rate-limited, when a token presents an unknown key identifier' },
        { id: 'b', text: 'Fetch it on every request so rotation is always picked up instantly', whyWrong: 'That puts a network call in your authentication path for every request and makes the IdP a single point of failure and a rate-limit victim.' },
        { id: 'c', text: 'Fetch once at startup and hold it for the process lifetime', whyWrong: 'The next key rotation causes a total authentication outage until every instance restarts.' },
        { id: 'd', text: 'Embed the public key in configuration and never fetch', whyWrong: 'It works right up to the first rotation, and then it becomes a deployment across every service at once.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.jwt.audience_confusion',
    mode: 'drill',
    nodeIds: ['idp.jwt', 'idp.scopes'],
    difficulty: 'core',
    explanation:
      'If a service checks that a token is signed by the right issuer but not that it was issued for that service, then any token from that issuer works everywhere. A low-privilege integration can hand its token to a high-privilege API and be accepted. The audience check is one comparison and it is the difference between a token and a skeleton key.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Five internal services all validate issuer and signature but not audience. What is the concrete consequence?',
      choices: [
        { id: 'a', text: 'A token minted for the least sensitive service is accepted by the most sensitive one, so the weakest integration sets the security of all five' },
        { id: 'b', text: 'Tokens will be rejected after the issuer rotates keys', whyWrong: 'Key rotation is unrelated to audience. This describes a different bug.' },
        { id: 'c', text: 'Services cannot tell which user the token represents', whyWrong: 'The subject claim still identifies the user. The problem is which service the token was meant for.' },
        { id: 'd', text: 'Token size grows because more claims are needed', whyWrong: 'Nothing here changes token size, and size is not a security property.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.jwt.stale_claims',
    mode: 'drill',
    nodeIds: ['idp.jwt', 'idp.rbac_abac'],
    difficulty: 'edge',
    explanation:
      'Group and role claims baked into a token are a snapshot taken at issue time. If a token lives an hour, then for up to an hour after a permission change the bearer still carries the old rights, which is fine for coarse roles and dangerous for anything that gets revoked in an emergency. High-sensitivity decisions should be evaluated against live authorization data rather than read out of the token.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your API authorizes from `groups` claims in the access token. Security asks how fast a permission removal takes effect. What is the honest answer and the fix?',
      choices: [
        { id: 'a', text: 'Up to the remaining token lifetime, because claims are a snapshot; evaluate high-impact permissions against live authorization data instead of the token' },
        { id: 'b', text: 'Immediately, because the identity provider updates the token', whyWrong: 'Issued tokens are immutable. Nothing updates a token already in the client’s hands.' },
        { id: 'c', text: 'Immediately, as long as tokens are validated on every request', whyWrong: 'Validation checks signature and expiry. It does not re-read the group membership the claim asserts.' },
        { id: 'd', text: 'It never takes effect until the user logs out', whyWrong: 'Too pessimistic: the token does expire. The window is the remaining lifetime, not indefinite.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.jwt.claim_checks',
    mode: 'drill',
    nodeIds: ['idp.jwt'],
    difficulty: 'intro',
    explanation:
      'Every JWT claim maps to a specific question the verifier must answer. Reciting them is the cheapest way to spot the missing check in someone else’s middleware, and the missing check is almost always audience or expiry handling under clock skew.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each JWT claim to the check the resource server performs with it.',
      pairs: [
        { left: 'iss', right: 'Was this minted by an issuer I have configured and trust?' },
        { left: 'aud', right: 'Was this issued for me, rather than for some other service?' },
        { left: 'exp and nbf', right: 'Is this within its validity window, allowing only small clock skew?' },
        { left: 'sub', right: 'Which principal is this about, used as the stable identifier for authorization?' },
        { left: 'jti', right: 'A unique token identifier, usable for replay tracking and revocation lists' },
      ],
    },
  },

  // ── Token exchange & on-behalf-of ────────────────────────────────────────
  {
    id: 's2.token_exchange.delegation_vs_impersonation',
    mode: 'drill',
    nodeIds: ['idp.token_exchange', 'idp.agent_identity'],
    difficulty: 'deep',
    explanation:
      'Token exchange supports two shapes. In delegation the issued token names the user as subject and records the acting party, so downstream logs can see both. In impersonation the issued token simply looks like the user with no trace of who requested it. For agents, delegation is almost always what you want, because the entire point is to be able to answer "which agent did this on whose behalf".',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your agent exchanges its token for one it uses to call a downstream API as the user. Delegation or impersonation semantics, and why?',
      choices: [
        { id: 'a', text: 'Delegation: the issued token keeps the user as subject and records the agent as the acting party, so the downstream audit trail shows both' },
        { id: 'b', text: 'Impersonation, because downstream services should not need to know an agent was involved', whyWrong: 'Hiding the actor is exactly what makes an incident unresolvable, and it removes the ability to apply agent-specific policy downstream.' },
        { id: 'c', text: 'Impersonation, because it produces a smaller token', whyWrong: 'Token size is not a design driver here, and trading auditability for bytes is a poor trade.' },
        { id: 'd', text: 'Either: the two are naming conventions for the same thing', whyWrong: 'They differ in what the issued token records. That difference is the whole reason both are specified.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.token_exchange.downscope',
    mode: 'drill',
    nodeIds: ['idp.token_exchange', 'idp.scopes'],
    difficulty: 'core',
    explanation:
      'The practical value of exchange is narrowing. An agent holding a broad user-consented token should trade it, per tool call, for a token audienced to exactly that downstream API with only the scopes that call needs and a short lifetime. If a tool is compromised or a call is injected, the credential it holds is worth almost nothing anywhere else.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An agent has one user token covering calendar, mail and files. It is about to call the calendar tool. What should happen first?',
      choices: [
        { id: 'a', text: 'Exchange it for a short-lived token audienced to the calendar API with only calendar scopes' },
        { id: 'b', text: 'Pass the broad token through, since the calendar API will ignore scopes it does not use', whyWrong: 'The calendar service now holds a credential that also opens mail and files. You have handed your blast radius to whichever integration is weakest.' },
        { id: 'c', text: 'Cache the broad token in the tool for reuse across calls', whyWrong: 'That extends both the lifetime and the reach of the most privileged credential in the system.' },
        { id: 'd', text: 'Re-prompt the user to log in for each tool', whyWrong: 'Unusable, and unnecessary: exchange exists so consent is captured once and narrowed programmatically.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.token_exchange.may_act',
    mode: 'drill',
    nodeIds: ['idp.token_exchange', 'idp.agent_identity'],
    difficulty: 'edge',
    explanation:
      'Without a constraint at the authorization server, any client that can authenticate and holds a user token can request one on that user’s behalf. The `may_act` claim expresses which party is permitted to act for a subject, so the authorization server can refuse an exchange from an agent nobody authorized. It is the difference between delegation being a policy and delegation being whatever the caller asks for.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What stops an arbitrary internal service from exchanging a user’s token for one that acts on that user’s behalf?',
      choices: [
        { id: 'a', text: 'A policy at the authorization server, expressed with a `may_act` style claim, that names which actors are permitted to act for that subject' },
        { id: 'b', text: 'Network policy restricting which services can reach the token endpoint', whyWrong: 'Reachability is not authorization, and any compromised in-network service defeats it. This is the perimeter assumption again.' },
        { id: 'c', text: 'The short lifetime of the exchanged token', whyWrong: 'A short-lived token that should never have been issued is still an unauthorized delegation.' },
        { id: 'd', text: 'Nothing: any authenticated client holding the token may exchange it', whyWrong: 'That is the default you must not accept, which is why the constraint exists in the specification.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.token_exchange.flow_order',
    mode: 'drill',
    nodeIds: ['idp.token_exchange', 'idp.agent_identity'],
    difficulty: 'core',
    explanation:
      'The on-behalf-of hop has a fixed shape, and writing it out settles most design arguments. The agent authenticates as itself, presents the user token as the subject, receives a narrowed token naming the user with the agent recorded as actor, and the downstream service authorizes the user while logging both. Every step that gets skipped shows up later as an unanswerable audit question.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the steps of an on-behalf-of token exchange during an agent tool call.',
      steps: [
        'The user authenticates and consents to the scopes the agent may use',
        'The agent authenticates to the authorization server with its own workload identity',
        'The agent presents the user token as the subject and requests a token for one downstream audience and scope',
        'The authorization server checks the delegation is permitted and issues a narrowed token naming the user as subject and the agent as actor',
        'The downstream service authorizes the user, and logs both the user and the acting agent',
      ],
    },
  },

  // ── Agent identity & delegation ──────────────────────────────────────────
  {
    id: 's2.agent_identity.two_principals',
    mode: 'drill',
    nodeIds: ['idp.agent_identity'],
    difficulty: 'intro',
    explanation:
      'Every agent call involves two principals: the agent itself, which is a workload with its own identity and its own permitted tool set, and the human it is acting for, whose consent bounds what may be done with their data. Collapsing them into one is the root cause of most agent authorization confusion, in both directions.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'When an agent calls a downstream API on a user’s request, how many identities are in play?',
      choices: [
        { id: 'a', text: 'Two: the agent as a workload with its own identity, and the user whose consent scopes what may be done' },
        { id: 'b', text: 'One: the user, since the agent is just software running on their behalf', whyWrong: 'Then you cannot revoke a misbehaving agent without revoking the user, and no log can tell you which agent build did something.' },
        { id: 'c', text: 'One: the agent, since it is the thing making the call', whyWrong: 'Then downstream services authorize a service account rather than a person, and the user’s own permissions stop constraining anything.' },
        { id: 'd', text: 'Three: the agent, the user, and the model provider', whyWrong: 'The model provider is a subprocessor in the data path, not a principal in your authorization decision.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.agent_identity.injection_blast_radius',
    mode: 'drill',
    nodeIds: ['idp.agent_identity', 'ai.guardrails'],
    difficulty: 'deep',
    explanation:
      'Assume the injection succeeds, because eventually one will: a document in the corpus or a web page the agent reads will contain instructions the model follows. What is left is containment. Narrow per-call credentials, human approval on irreversible actions, and egress restrictions on where data can be sent decide whether the incident is a weird transcript or a data breach.',
    citations: cite('modelArmor', 'genaiSecurity'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A security architect asks what happens when, not if, your agent is prompt-injected by a document it retrieves. What is the right frame?',
      choices: [
        { id: 'a', text: 'Design so the injection has nowhere to go: per-call narrow credentials, human approval on irreversible actions, and restricted egress destinations' },
        { id: 'b', text: 'Add a system prompt instructing the model to ignore instructions found in retrieved content', whyWrong: 'It raises the bar slightly and is not a control. Instructions and data share one channel, so this is the model policing itself.' },
        { id: 'c', text: 'Filter retrieved documents for known injection phrases', whyWrong: 'Signature matching catches yesterday’s phrasings. Useful in depth, worthless as the primary containment.' },
        { id: 'd', text: 'Run the agent with a service account that has only the permissions the whole product needs', whyWrong: 'Product-wide permissions are exactly the over-broad grant that makes an injection worth exploiting. Scope per call, not per product.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.agent_identity.consent_carry',
    mode: 'drill',
    nodeIds: ['idp.agent_identity', 'idp.scopes'],
    difficulty: 'deep',
    explanation:
      'User consent has to travel with the call rather than being checked once at the front door. In practice that means the consent granted at authorization is encoded in the scopes of the token the agent obtains, and each tool call carries a token derived from it. A tool that receives no user context cannot enforce consent no matter how carefully it was collected.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A user consented to the agent reading their mail but not sending it. How does that constraint reach the mail tool?',
      choices: [
        { id: 'a', text: 'Consent is encoded as scopes on the user token, and the tool call carries a token derived from it, so the send endpoint refuses on the token, not on the agent’s good behavior' },
        { id: 'b', text: 'The orchestrator checks the consent record before selecting the send tool', whyWrong: 'A check in the orchestrator is a check the injected plan can route around. Enforcement has to sit at the resource.' },
        { id: 'c', text: 'The system prompt tells the agent it may not send mail', whyWrong: 'Instructions are not enforcement, and this is the exact instruction an injection overrides.' },
        { id: 'd', text: 'The mail tool is simply not registered for this user', whyWrong: 'Workable for a coarse on and off switch, and it collapses as soon as one user consents to send and another does not within the same deployment.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.agent_identity.background_run',
    mode: 'drill',
    nodeIds: ['idp.agent_identity', 'idp.token_exchange'],
    difficulty: 'edge',
    explanation:
      'Scheduled and long-running agents have no user in the loop to re-authenticate, so they depend on a credential granted earlier for offline use. That credential is the most dangerous thing in the system: it acts as a person, indefinitely, with nobody watching. It needs a narrower scope than the interactive session, its own revocation path, an expiry the user is told about, and a notification when it is used.',
    citations: cite('agentEngine'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A nightly agent acts for users who are asleep. What must the design include beyond the interactive case?',
      choices: [
        { id: 'a', text: 'An explicit offline grant with narrower scopes than the interactive session, a stated expiry, its own revocation path and a record the user can see' },
        { id: 'b', text: 'A long-lived copy of the token captured during the user’s last interactive session', whyWrong: 'Silently repurposing an interactive credential for unattended use exceeds what the user agreed to and gives you no separate revocation handle.' },
        { id: 'c', text: 'A service account with permissions across all users, since no single user is present', whyWrong: 'That is the confused-deputy design: one compromise reaches every user, and no log shows on whose behalf anything ran.' },
        { id: 'd', text: 'Nothing extra: the same token flow works whether or not the user is watching', whyWrong: 'Unattended use has no chance for the user to notice or intervene, which is exactly why it needs tighter scope and visibility.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.agent_identity.revoke_one_agent',
    mode: 'drill',
    nodeIds: ['idp.agent_identity', 'idp.revocation'],
    difficulty: 'deep',
    explanation:
      'If an agent only ever presents user tokens, the only lever you have when it misbehaves is revoking users, which punishes the wrong party and takes the product down. Giving every agent its own registered identity, and recording it as the actor in issued tokens, means the authorization server can refuse exchanges for that one agent while every user session keeps working.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'One agent build starts making bad tool calls in production. What lets you stop it in minutes without logging everyone out?',
      choices: [
        { id: 'a', text: 'A registered per-agent identity recorded as the actor, so the authorization server can refuse to issue tokens for that agent alone' },
        { id: 'b', text: 'Revoke the refresh tokens of affected users', whyWrong: 'It stops the damage by disabling the victims. Users get logged out and the underlying agent is untouched for everyone else.' },
        { id: 'c', text: 'Roll back the deployment and wait for instances to cycle', whyWrong: 'Often the right follow-up and far too slow as the containment step, especially with long-running sessions still in flight.' },
        { id: 'd', text: 'Disable the downstream tools the agent was calling', whyWrong: 'That takes the capability away from every well-behaved agent and user too, which is a bigger outage than the incident.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.agent_identity.record_fields',
    mode: 'drill',
    nodeIds: ['idp.agent_identity'],
    difficulty: 'core',
    explanation:
      'Treat agents as first-class principals in your identity system. The registration record should name an accountable human owner, the tools and scopes the agent may ever request, an environment, and a version identifier that appears in issued tokens and logs. Anything less and you cannot answer who deployed this, what it is allowed to do, or which build did the thing.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'What belongs in an agent’s registration record so it can be governed like any other principal? Select all that apply.',
      choices: [
        { id: 'a', text: 'An accountable human or team owner' },
        { id: 'b', text: 'The maximum set of tools and scopes it may ever request' },
        { id: 'c', text: 'A version identifier that propagates into issued tokens and audit logs' },
        { id: 'd', text: 'The model name it currently uses, as an immutable field', whyWrong: 'Worth recording as changeable metadata, but freezing it into identity means every model upgrade forces re-registration.' },
        { id: 'e', text: 'A copy of its system prompt stored with the credential', whyWrong: 'Prompts belong in versioned configuration. Binding them to the credential record conflates two lifecycles and leaks instructions into identity systems.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 's2.agent_identity.confused_deputy',
    mode: 'drill',
    nodeIds: ['idp.agent_identity', 'idp.rbac_abac'],
    difficulty: 'edge',
    explanation:
      'A confused deputy is a privileged component that performs an action for a caller who could not have performed it directly. An agent with broad service credentials is a textbook one: the user asks a question, the agent retrieves whatever it can reach, and the answer includes documents the user was never allowed to see. The fix is to make the downstream authorize the user, not to add a check in the agent.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An assistant retrieves with a service account that can read every document, then filters results by the asking user’s permissions before answering. What is wrong?',
      choices: [
        { id: 'a', text: 'It is a confused deputy: authorization happens in the component an attacker influences, so push the user context into retrieval and let the store enforce it' },
        { id: 'b', text: 'Nothing, provided the filter is correctly implemented and tested', whyWrong: 'Correct today and one refactor from a leak, with no other layer to catch it. The data already crossed a boundary before the check ran.' },
        { id: 'c', text: 'It is slower than filtering at the source', whyWrong: 'Performance is a side effect. The security argument stands even if post-filtering were faster.' },
        { id: 'd', text: 'The service account should be replaced with the agent’s own identity', whyWrong: 'Renaming the over-privileged credential does not reduce what it can read. The problem is that the user is absent from the decision.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.agent_identity.compromise_order',
    mode: 'drill',
    nodeIds: ['idp.agent_identity', 'sec.audit'],
    difficulty: 'core',
    explanation:
      'Agent incidents have an order that differs from ordinary service incidents, because the agent may still be running with valid credentials and a plan it read from an attacker. Stop the credential issuance first, then stop the running sessions, then determine reach from the tool-call log, and only then decide about user notification. Rolling back the build first feels productive and leaves live sessions holding valid tokens.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'You suspect an agent has been prompt-injected and is acting on attacker instructions. Order your first response steps.',
      steps: [
        'Block token issuance for that agent identity at the authorization server',
        'Terminate in-flight sessions so tokens already held stop being usable',
        'Reconstruct reach from the tool-call audit log: which users, which resources, which writes',
        'Reverse or quarantine the write actions that were performed',
        'Decide on customer and regulator notification with the reach evidence in hand',
      ],
    },
  },

  // ── Sender-constrained tokens ────────────────────────────────────────────
  {
    id: 's2.dpop.what_it_buys',
    mode: 'drill',
    nodeIds: ['idp.dpop'],
    difficulty: 'intro',
    explanation:
      'A bearer token is a password: whoever holds it can use it. Sender-constrained tokens bind the token to a key the legitimate client holds, so a copy lifted from a log, a proxy or a browser is useless without that key. It is the single highest-leverage change for any system where tokens pass through components you do not fully control.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What is the actual threat a sender-constrained access token removes?',
      choices: [
        { id: 'a', text: 'Use of a stolen token by anyone who does not also hold the private key it was bound to' },
        { id: 'b', text: 'A malicious client requesting scopes it should not have', whyWrong: 'Scope policy is decided at the authorization server. Binding says nothing about what was granted.' },
        { id: 'c', text: 'A compromised resource server reading token contents', whyWrong: 'The resource server legitimately reads the token. Binding does not encrypt anything from it.' },
        { id: 'd', text: 'A user sharing their password with a colleague', whyWrong: 'That happens before any token exists and is addressed by authentication policy, not token binding.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.dpop.proof_binding',
    mode: 'drill',
    nodeIds: ['idp.dpop', 'idp.jwt'],
    difficulty: 'deep',
    explanation:
      'A DPoP proof is a short-lived JWT signed with the client key and bound to the specific request: the HTTP method, the target URI, a unique identifier, and a hash of the access token being presented. That binding is why a captured proof cannot be reused against a different endpoint or with a different token, and why the resource server must actually validate all of it rather than just checking a proof exists.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An attacker captures both a DPoP-bound access token and one valid proof from a read request. Why can they not replay them against a write endpoint?',
      choices: [
        { id: 'a', text: 'The proof is signed over the method and target URI and hashes the access token, so it is only valid for that one request shape' },
        { id: 'b', text: 'The access token itself encodes the allowed endpoints', whyWrong: 'Scopes may constrain operations, but the replay defense here comes from the proof binding, not from the token contents.' },
        { id: 'c', text: 'Proofs are encrypted so the attacker cannot read them', whyWrong: 'Proofs are signed, not encrypted. Readability was never the protection.' },
        { id: 'd', text: 'The resource server keeps a list of used tokens', whyWrong: 'Replay tracking of proof identifiers helps, but the primary reason is the method and URI binding in the signature.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.dpop.mtls_choice',
    mode: 'drill',
    nodeIds: ['idp.dpop', 'idp.service_auth'],
    difficulty: 'core',
    explanation:
      'Both mechanisms bind a token to a key. Certificate binding via mutual TLS is the natural fit where you already run a certificate infrastructure and terminate TLS yourself, typically service to service. Application-layer proofs fit clients that cannot present a client certificate, such as browser and mobile apps, or where TLS terminates at a load balancer you do not control.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You want sender-constrained tokens for both a mobile app and a set of internal services. What do you pick for each?',
      choices: [
        { id: 'a', text: 'Application-layer proofs for the mobile app, certificate-bound tokens over mutual TLS between internal services that already have a certificate infrastructure' },
        { id: 'b', text: 'Certificate binding everywhere, for consistency', whyWrong: 'Provisioning and rotating client certificates on end-user devices is a support burden most teams abandon, and TLS often terminates before your service anyway.' },
        { id: 'c', text: 'Application-layer proofs everywhere, since they work in both cases', whyWrong: 'Workable, but it discards the mesh identity you already have between services and adds per-request signing where mutual TLS is free.' },
        { id: 'd', text: 'Neither: bearer tokens with short lifetimes are equivalent', whyWrong: 'Short lifetimes shrink the replay window. They do not stop a token stolen and used within it, which is the threat here.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.dpop.limits',
    mode: 'drill',
    nodeIds: ['idp.dpop'],
    difficulty: 'deep',
    explanation:
      'Binding stops a token being useful somewhere else. It does nothing about a client that is itself compromised, because that attacker holds the key and can mint proofs at will, and it does nothing about a user tricked into authorizing a malicious application. Being precise about what a control does not cover is what keeps a security review from ending with a false sense of completion.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Sender-constrained tokens are deployed everywhere. Which risks remain? Select all that apply.',
      choices: [
        { id: 'a', text: 'Malware on the client device, which holds the key and can produce valid proofs' },
        { id: 'b', text: 'A user consenting to a malicious application that then legitimately obtains its own bound tokens' },
        { id: 'c', text: 'Over-broad scopes granted at authorization time' },
        { id: 'd', text: 'A token copied out of a proxy log and replayed from another host', whyWrong: 'This is precisely what binding defeats: the replaying host has no private key, so it cannot produce a valid proof.' },
        { id: 'e', text: 'A token intercepted on the network and used elsewhere', whyWrong: 'Also defeated by binding, for the same reason. Interception alone yields an unusable credential.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── Revocation & session events ──────────────────────────────────────────
  {
    id: 's2.revocation.reuse_detection',
    mode: 'drill',
    nodeIds: ['idp.revocation'],
    difficulty: 'core',
    explanation:
      'Refresh token rotation issues a new refresh token on every use and invalidates the old one. That turns theft into something detectable: when the old token is presented a second time, either the attacker or the legitimate client is replaying, and either way the right response is to kill the whole family and force re-authentication. Rotation without reuse detection gives you the rotation cost and none of the benefit.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order what a correctly implemented refresh flow does when a previously used refresh token is presented again.',
      steps: [
        'Recognize the presented token as one already exchanged, not merely expired',
        'Invalidate the entire token family descended from that original grant',
        'Reject the request and force the client back through interactive authentication',
        'Raise a security event naming the user, client and source so someone can investigate',
      ],
    },
  },
  {
    id: 's2.revocation.mechanism_match',
    mode: 'drill',
    nodeIds: ['idp.revocation'],
    difficulty: 'core',
    explanation:
      'Revocation is not one control, it is a set of mechanisms with different coverage and different latency. Being able to say which one closes which gap, and how fast, is what turns "can you revoke access immediately?" from an uncomfortable question into a two-minute answer.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each revocation mechanism to what it actually achieves.',
      pairs: [
        { left: 'Short access token lifetime', right: 'Bounds the worst-case window with no coordination, at the cost of more token requests' },
        { left: 'Refresh token revocation', right: 'Stops renewal, but leaves any already-issued access token valid until it expires' },
        { left: 'Token introspection per request', right: 'Near-instant revocation, paid for with a call to the authorization server in the hot path' },
        { left: 'Back-channel logout', right: 'Tells relying parties to end their local sessions when the identity provider session ends' },
        { left: 'Continuous access evaluation signals', right: 'Pushes events such as a disabled account so consumers react without polling' },
      ],
    },
  },
  {
    id: 's2.revocation.window_reduction',
    mode: 'drill',
    nodeIds: ['idp.revocation', 'idp.agent_identity'],
    difficulty: 'core',
    explanation:
      'When a customer asks how fast access stops after a termination, the honest answer is a window, not zero. Shrinking it is a combination of shorter access token lifetimes, revoking refresh grants, pushing session events to relying parties, and, for anything long-running, terminating in-flight work rather than assuming it will notice. Agent sessions are the ones that quietly outlive everything else.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'A customer requires that access stops within minutes of an employee being terminated. Which measures genuinely shorten that window? Select all that apply.',
      choices: [
        { id: 'a', text: 'Short access token lifetimes so unrevoked tokens die quickly on their own' },
        { id: 'b', text: 'Consuming identity provider session events so relying parties act without waiting for expiry' },
        { id: 'c', text: 'Terminating long-running agent and batch sessions that hold credentials issued earlier' },
        { id: 'd', text: 'Rotating the token signing key on every termination', whyWrong: 'It invalidates every token for every user at once, which is an outage rather than a revocation strategy.' },
        { id: 'e', text: 'Increasing the password complexity requirement', whyWrong: 'Password policy affects account takeover, not how quickly an existing valid session stops working.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },

  // ── RBAC, ABAC and ReBAC ─────────────────────────────────────────────────
  {
    id: 's2.rbac.role_explosion',
    mode: 'drill',
    nodeIds: ['idp.rbac_abac'],
    difficulty: 'intro',
    explanation:
      'Roles work while the permission depends only on who you are. As soon as it depends on properties of the request, such as the region, the classification of the record or the time of day, the role set multiplies out one role per combination. That is the signal to move the varying part into attributes evaluated at request time rather than to mint another role.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer has grown to four hundred roles, most of them named like `analyst_emea_restricted_readonly`. What does that pattern indicate?',
      choices: [
        { id: 'a', text: 'Request attributes such as region and classification are being encoded into role names; those belong in an attribute-based policy evaluated per request' },
        { id: 'b', text: 'They need a role hierarchy so roles can inherit from each other', whyWrong: 'Inheritance tidies the naming and does not reduce the combinatorics. You still need one leaf per combination.' },
        { id: 'c', text: 'They should grant permissions directly to users instead of roles', whyWrong: 'Direct grants remove the only abstraction they have and make review impossible.' },
        { id: 'd', text: 'Role count is a normal consequence of scale and needs no change', whyWrong: 'Four hundred roles cannot be reviewed by anyone, which means nobody knows what any of them grant.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.rbac.retrieval_filter',
    mode: 'drill',
    nodeIds: ['idp.rbac_abac', 'ai.rag_failure'],
    difficulty: 'deep',
    explanation:
      'In a retrieval system, authorization has to constrain the candidate set before the ranking happens, not after. Filtering afterwards means the model may already have seen forbidden content, and it also silently degrades results, because the top-k you retrieved was chosen from documents the user cannot use. Push the permission predicate into the query.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Why must document permissions be applied during retrieval rather than to the final answer?',
      choices: [
        { id: 'a', text: 'Post-filtering means forbidden content already entered the context, and it degrades quality because the top results were selected from documents the user cannot see' },
        { id: 'b', text: 'Post-filtering is more expensive in tokens', whyWrong: 'Cost is a minor side effect. The problem is that unauthorized content reached the model and the ranking is wrong.' },
        { id: 'c', text: 'Vector stores cannot express permission filters', whyWrong: 'Most support metadata filtering, and where they do not you partition. Capability is not the obstacle.' },
        { id: 'd', text: 'The model may hallucinate about documents it was not given', whyWrong: 'True in general and unrelated: hallucination happens with or without a filtering strategy.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.rbac.model_match',
    mode: 'drill',
    nodeIds: ['idp.rbac_abac', 'idp.rls'],
    difficulty: 'core',
    explanation:
      'The three models answer different questions, and most real systems use all three: roles for coarse capability, attributes for contextual conditions, and relationships for user-created sharing graphs. Naming which one a requirement needs stops the common failure of trying to express document sharing as a role.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each authorization model to the question it answers well.',
      pairs: [
        { left: 'RBAC', right: 'What capabilities does this job function have, independent of the specific record?' },
        { left: 'ABAC', right: 'Do the attributes of this request, such as region or classification, permit this action right now?' },
        { left: 'ReBAC', right: 'Is this user related to this specific object, for example through a folder someone shared with them?' },
        { left: 'Row-level security', right: 'Where is that decision enforced so a missing predicate in one query cannot leak data?' },
      ],
    },
  },

  // ── Scopes, audience & least privilege ───────────────────────────────────
  {
    id: 's2.scopes.not_permissions',
    mode: 'drill',
    nodeIds: ['idp.scopes'],
    difficulty: 'core',
    explanation:
      'A scope bounds what a client may attempt on the user’s behalf; it does not grant the user anything. A token with a broad write scope held by a user with read-only rights must still be refused by the resource server. Systems that treat scopes as the authorization decision end up letting the client escalate simply by asking for more.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'An access token carries a broad write scope, but the user it represents has read-only rights in the target system. What should the resource server do?',
      choices: [
        { id: 'a', text: 'Refuse the write: the scope caps what the client may attempt, and the user’s own permissions are a separate check that still applies' },
        { id: 'b', text: 'Allow it, since the authorization server granted the scope', whyWrong: 'That makes scope requests an escalation path. The authorization server does not know the user’s rights in every downstream system.' },
        { id: 'c', text: 'Allow it but log a warning', whyWrong: 'Logging an unauthorized write does not make it authorized. It just documents the breach.' },
        { id: 'd', text: 'Refuse and revoke the token as malicious', whyWrong: 'Over-broad scopes are usually sloppy client configuration, not attack. Refusing the operation is right; treating every occurrence as an incident is noise.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.scopes.resource_indicator',
    mode: 'drill',
    nodeIds: ['idp.scopes', 'idp.jwt'],
    difficulty: 'edge',
    explanation:
      'Scopes alone do not say which service a token is for. Asking the authorization server for a token targeted at a named resource yields a token whose audience is that resource and nothing else, so a downstream service cannot turn around and replay it against a sibling. In an agent architecture with many tools, this is what stops one compromised tool from reaching the rest.',
    citations: cite('mcp'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your agent calls six internal APIs. What request-time mechanism stops a token issued for one from being usable at another?',
      choices: [
        { id: 'a', text: 'Requesting a token for a named target resource, so the issued token’s audience is that one API' },
        { id: 'b', text: 'Distinct scope strings per API', whyWrong: 'Scopes describe permissions, and a token carrying all six scopes is still presentable to all six unless the audience is constrained.' },
        { id: 'c', text: 'A separate client registration per API', whyWrong: 'It multiplies the credential set the agent holds and still issues tokens no service is bound to reject.' },
        { id: 'd', text: 'Encrypting the token so only the target can read it', whyWrong: 'Encrypted tokens are used in some designs and are not the standard mechanism here, and the audience check is what services actually enforce.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.scopes.incremental_consent',
    mode: 'drill',
    nodeIds: ['idp.scopes', 'idp.agent_identity'],
    difficulty: 'intro',
    explanation:
      'Asking for every permission the product could ever want on first launch produces a consent screen users refuse, and a token far broader than any single session needs. Requesting permissions when the feature is first used gives the user context for the decision and keeps the common-case token small.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your assistant might eventually touch mail, calendar, files and payments. What should it request at first login?',
      choices: [
        { id: 'a', text: 'Only what the first session needs, requesting further scopes when the user first invokes a feature that requires them' },
        { id: 'b', text: 'Everything up front, so the user is never interrupted later', whyWrong: 'A maximal consent screen has the worst conversion and hands the agent standing access to systems it may never touch.' },
        { id: 'c', text: 'Everything except payments, which is the only sensitive one', whyWrong: 'Mail and files are extremely sensitive. Singling out payments misreads where the risk is.' },
        { id: 'd', text: 'Nothing: request scopes silently as needed without user interaction', whyWrong: 'Consent that the user never sees is not consent, and no authorization server will grant new user scopes without them.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.scopes.tool_token_properties',
    mode: 'drill',
    nodeIds: ['idp.scopes', 'idp.agent_identity'],
    difficulty: 'core',
    explanation:
      'A well-formed credential for an agent tool call is narrow in four dimensions at once: which service it is for, what it permits, how long it lives, and who it says is acting. Any one of them left wide is where the incident report will point, and all four are cheap to get right if the exchange happens per call rather than per session.',
    citations: cite('adk'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'Which properties should a token used for a single agent tool call have? Select all that apply.',
      choices: [
        { id: 'a', text: 'An audience naming only the API being called' },
        { id: 'b', text: 'Only the scopes that one operation needs' },
        { id: 'c', text: 'A lifetime measured in minutes, not hours' },
        { id: 'd', text: 'A claim recording both the user and the acting agent' },
        { id: 'e', text: 'A stable value reusable across calls so it can be cached', whyWrong: 'Reuse is the opposite of the goal: a cached broad credential is the thing an injected tool call would most like to find.' },
      ],
      correctIds: ['a', 'b', 'c', 'd'],
    },
  },

  // ── Service-to-service auth ──────────────────────────────────────────────
  {
    id: 's2.service_auth.no_key_files',
    mode: 'drill',
    nodeIds: ['idp.service_auth', 'gcp.wif'],
    difficulty: 'intro',
    explanation:
      'A downloaded service account key is a long-lived secret that has to be stored, rotated and eventually found in a repository. Identity federation lets a workload present the identity token its own platform already gives it, trade it for short-lived cloud credentials, and hold no secret at all. It is the standard answer to "can you not email us a JSON key".',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A workload in another cloud needs to call your GCP APIs. The customer asks you to generate a service account key. What do you propose instead?',
      choices: [
        { id: 'a', text: 'Workload identity federation: the workload presents its own platform identity token and exchanges it for short-lived credentials, so no key exists' },
        { id: 'b', text: 'A service account key stored in a secrets manager with quarterly rotation', whyWrong: 'Better than a key in a repository and still a long-lived secret that can be copied. Rotation reduces the window rather than removing the credential.' },
        { id: 'c', text: 'A key scoped to one project, which limits the damage', whyWrong: 'Scoping helps and does not address the core problem: a bearer secret that exists can be exfiltrated.' },
        { id: 'd', text: 'An API key with an IP allowlist', whyWrong: 'API keys are weaker than service account keys and IP allowlists break the moment the workload moves or scales.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.service_auth.subject_constraint',
    mode: 'drill',
    nodeIds: ['idp.service_auth', 'gcp.wif'],
    difficulty: 'core',
    explanation:
      'Federation is only as good as the condition on the trust. Trusting an entire CI provider means any repository on that platform can obtain your credentials. The binding has to pin the specific repository, and usually the branch or environment, so that a fork or an unrelated project presenting a perfectly valid token from the same issuer is refused.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'You are federating a CI system into cloud credentials. Which conditions must the trust binding assert? Select all that apply.',
      choices: [
        { id: 'a', text: 'The issuer is the expected CI provider’s token endpoint' },
        { id: 'b', text: 'The subject names the specific repository, not just the platform' },
        { id: 'c', text: 'The branch, tag or deployment environment the job ran from' },
        { id: 'd', text: 'The IP address range the CI runners use', whyWrong: 'Hosted runner ranges are broad, shared and change. Pinning to them gives false assurance and causes outages.' },
        { id: 'e', text: 'The name of the engineer who triggered the run', whyWrong: 'Useful in the audit log and a poor authorization condition, since it blocks automated and scheduled runs.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 's2.service_auth.pattern_match',
    mode: 'drill',
    nodeIds: ['idp.service_auth'],
    difficulty: 'core',
    explanation:
      'Service authentication has a small set of patterns and each fits a specific topology. Picking correctly is mostly about where the workload runs and whether you control both ends of the connection, not about which mechanism is strongest in the abstract.',
    citations: cite('wif'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'match',
      stem: 'Match each situation to the service authentication approach that fits.',
      pairs: [
        { left: 'Two services inside one mesh you operate', right: 'Mutual TLS with mesh-issued workload identities and per-request authorization' },
        { left: 'A workload in another cloud calling your APIs', right: 'Identity federation exchanging its native token for short-lived credentials' },
        { left: 'A CI pipeline deploying into your project', right: 'Federated identity constrained to a specific repository and environment' },
        { left: 'A partner calling your public API from their data center', right: 'OAuth client credentials with a registered client, narrow scopes and rotation' },
      ],
    },
  },
  {
    id: 's2.service_auth.network_is_not_identity',
    mode: 'drill',
    nodeIds: ['idp.service_auth', 'sec.zero_trust'],
    difficulty: 'intro',
    explanation:
      'An IP allowlist answers where a request came from, which in a container platform is a rotating pool shared by every workload on the cluster. Identity answers who is calling, survives rescheduling and autoscaling, and can be authorized per operation. Network controls remain useful as a second layer, but they are not an authentication mechanism.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team authenticates an internal API by allowlisting the caller’s pod CIDR range. What is the practical failure?',
      choices: [
        { id: 'a', text: 'Every workload on that network shares the range, so the control authorizes the cluster rather than the service, and it breaks whenever addressing changes' },
        { id: 'b', text: 'CIDR allowlists are too slow to evaluate at request volume', whyWrong: 'They are cheap to evaluate. The problem is what they prove, not what they cost.' },
        { id: 'c', text: 'It only works over IPv4', whyWrong: 'An implementation detail, not the reason the approach is unsound.' },
        { id: 'd', text: 'It requires a static IP, which cloud providers no longer offer', whyWrong: 'Static addressing is available. The objection stands even when the address never changes.' },
      ],
      correctId: 'a',
    },
  },

  // ── Row-level security ───────────────────────────────────────────────────
  {
    id: 's2.rls.what_it_buys',
    mode: 'drill',
    nodeIds: ['idp.rls'],
    difficulty: 'intro',
    explanation:
      'Row-level security moves the tenant predicate from every query into the database itself, so a query written without a filter returns nothing rather than everything. It is defense in depth for the single most common multi-tenant bug: the one forgotten WHERE clause in a reporting endpoint written under time pressure.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'What does enabling row-level security on a multi-tenant table actually change?',
      choices: [
        { id: 'a', text: 'A query missing the tenant predicate returns no rows instead of every tenant’s rows, so the failure mode becomes an empty result rather than a leak' },
        { id: 'b', text: 'The application no longer needs to know which tenant it is serving', whyWrong: 'The policy reads the tenant from session context that the application must set correctly. It moves the responsibility, it does not remove it.' },
        { id: 'c', text: 'Each tenant’s rows are encrypted with a separate key', whyWrong: 'That is a key management design. Row-level security is a visibility rule, not encryption.' },
        { id: 'd', text: 'Queries get faster because fewer rows are scanned', whyWrong: 'Policy predicates usually cost something. Performance is a thing to watch, not a benefit.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.rls.pooled_connections',
    mode: 'drill',
    nodeIds: ['idp.rls', 'sec.tenancy'],
    difficulty: 'edge',
    explanation:
      'Row-level security policies usually read the tenant from a session setting, and a connection pool hands the same physical connection to the next request. If the setting is applied at session scope and the pool does not reset it, request B inherits request A’s tenant. Setting it transaction-locally, inside the same transaction as the query, is what makes it safe under pooling.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'Your RLS policy reads a tenant id from a session setting and the app uses a connection pooler. What is the specific hazard and the fix?',
      choices: [
        { id: 'a', text: 'A pooled connection can carry the previous request’s tenant setting; set it transaction-locally so it is scoped to the same transaction as the query' },
        { id: 'b', text: 'Pooling is incompatible with row-level security and must be removed', whyWrong: 'They coexist fine. The problem is the scope of the setting, not the existence of the pool.' },
        { id: 'c', text: 'The policy will be re-evaluated on every row, which is too slow', whyWrong: 'A performance concern with its own remedies, and not the correctness bug that leaks data across tenants.' },
        { id: 'd', text: 'The pooler cannot forward session settings, so policies never apply', whyWrong: 'The dangerous case is the opposite: the setting persists when it should not.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.rls.owner_bypass',
    mode: 'drill',
    nodeIds: ['idp.rls'],
    difficulty: 'edge',
    explanation:
      'In Postgres the table owner is not subject to the table’s row-level policies unless the table is set to force them, and roles with the bypass attribute skip policies entirely. Applications that connect as the migration or owner role therefore see every row while the team believes the policy is protecting them. Connect as a separate least-privilege application role and force the policy on the table.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A team enabled row-level security, wrote correct policies, and cross-tenant reads still succeed in the application. What is the most likely cause?',
      choices: [
        { id: 'a', text: 'The application connects as the table owner or a bypass-privileged role, which is exempt from policies unless the table forces them' },
        { id: 'b', text: 'The policies were created but never granted to any role', whyWrong: 'Policies are not granted to roles; they are attached to the table and evaluated for the current role. This describes a mechanism that does not exist.' },
        { id: 'c', text: 'Row-level security only applies to writes', whyWrong: 'Policies can cover select, insert, update and delete. Read protection is the main use.' },
        { id: 'd', text: 'The table has no primary key', whyWrong: 'Unrelated. Policy evaluation does not depend on key constraints.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.rls.rollout_order',
    mode: 'drill',
    nodeIds: ['idp.rls', 'sec.tenancy'],
    difficulty: 'core',
    explanation:
      'Turning on row-level security against live traffic is a change that can either leak or break everything, so it goes out in an order that surfaces mistakes before they matter: a dedicated application role, policies written and tested, the setting plumbed through the request path, then enable and force, with a permissive-then-restrictive step to see what would have broken.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order a safe rollout of row-level security on a live multi-tenant table.',
      steps: [
        'Create a least-privilege application role that is neither the table owner nor bypass-privileged',
        'Write the policies and prove them with tests that assert cross-tenant reads return nothing',
        'Plumb the tenant setting through the request path, scoped to the transaction',
        'Enable and force row-level security on the table, and switch the application to the new role',
        'Watch for queries returning unexpectedly empty results, which are the ones that were relying on missing predicates',
      ],
    },
  },

  // ── Impersonation & break-glass ──────────────────────────────────────────
  {
    id: 's2.impersonation.read_only_default',
    mode: 'drill',
    nodeIds: ['idp.impersonation'],
    difficulty: 'intro',
    explanation:
      'Almost every support impersonation request is really "I need to see what they see". Making the default session read-only satisfies that, removes the possibility of an agent accidentally submitting something as the customer, and turns write capability into a separately approved, rarer event that is worth alerting on.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'You are designing support impersonation for a customer-facing product. What is the sensible default?',
      choices: [
        { id: 'a', text: 'Read-only by default, with write capability a separate, approved and alerted escalation' },
        { id: 'b', text: 'Full access, because support needs to fix things for customers', whyWrong: 'Most tickets are diagnostic. Granting write on every session means the risky capability is used routinely and unremarkably.' },
        { id: 'c', text: 'Full access, with a policy that agents must ask permission first', whyWrong: 'A policy is not a control. If the capability is there, it will be used when someone is in a hurry.' },
        { id: 'd', text: 'No impersonation at all; support should ask for screenshots', whyWrong: 'It pushes support into asking customers to send screenshots full of their own sensitive data, which is worse for privacy than a controlled session.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.impersonation.audit_attribution',
    mode: 'drill',
    nodeIds: ['idp.impersonation', 'sec.audit'],
    difficulty: 'core',
    explanation:
      'If an impersonated session logs only the impersonated user, then the customer’s own audit trail shows them doing things they never did, and yours cannot identify which employee acted. Records must carry both principals: the subject whose context was used and the operator who was actually driving. This is the same actor-claim discipline that agent delegation needs.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'mcq',
      stem: 'A customer reviewing their audit log sees actions attributed to an employee who was on leave that day. Your support team had impersonated the account. What is the design defect?',
      choices: [
        { id: 'a', text: 'The log records only the impersonated subject; it must record the operator as the acting principal alongside the subject' },
        { id: 'b', text: 'Support should not have impersonated an account belonging to someone on leave', whyWrong: 'A process observation that does not fix anything. The next impersonation will be just as unattributable.' },
        { id: 'c', text: 'The customer should not have access to their own audit log', whyWrong: 'Removing their visibility to hide your gap is exactly the wrong direction, and it is a control they are entitled to.' },
        { id: 'd', text: 'Impersonation sessions should not be logged in the customer’s trail at all', whyWrong: 'They must be. The customer needs to know their account was accessed and by whom.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 's2.impersonation.break_glass',
    mode: 'drill',
    nodeIds: ['idp.impersonation', 'sec.zero_trust'],
    difficulty: 'core',
    explanation:
      'Break-glass exists so that a genuine emergency is not blocked by the controls, which means it will be used at the worst possible moment by someone under pressure. It has to be a distinct credential, time-bounded, requiring a stated reason and ideally a second approver, and it must generate a loud alert that someone reviews afterwards. Silent break-glass is indistinguishable from a compromise.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'multi',
      stem: 'What makes a break-glass path safe to have? Select all that apply.',
      choices: [
        { id: 'a', text: 'A distinct credential, not an everyday account with extra rights' },
        { id: 'b', text: 'A hard time bound after which the elevated access expires by itself' },
        { id: 'c', text: 'An alert that fires on use and a review that actually happens afterwards' },
        { id: 'd', text: 'A shared password held by the on-call rotation for speed', whyWrong: 'A shared secret destroys attribution at exactly the moment you most need to know who acted.' },
        { id: 'e', text: 'Exemption from audit logging so incident response is not slowed', whyWrong: 'The highest-privilege path is the one that most needs a record. Exempting it makes the credential attractive for the wrong reasons.' },
      ],
      correctIds: ['a', 'b', 'c'],
    },
  },
  {
    id: 's2.impersonation.session_order',
    mode: 'drill',
    nodeIds: ['idp.impersonation'],
    difficulty: 'core',
    explanation:
      'A defensible impersonation session has a shape: a recorded reason tied to a ticket, a check that the operator is permitted for this customer, a bounded session with the operator carried as the acting principal, a visible indication in the interface, and an automatic end. Skipping the visible indication is how an operator forgets which context they are in and does something as the customer.',
    citations: cite('waf'),
    origin: 'seed',
    criticScore: null,
    payload: {
      kind: 'order',
      stem: 'Order the steps of a support impersonation session you would defend in a security review.',
      steps: [
        'Operator states a reason linked to a support ticket and requests access',
        'Authorization checks the operator is entitled to act for this customer, applying any customer-side consent setting',
        'A time-bounded, read-only session starts with the operator recorded as the acting principal',
        'The interface shows an unmistakable indication that this is an impersonated session',
        'The session expires automatically and the record lands in both the operator and customer audit trails',
      ],
    },
  },
];
