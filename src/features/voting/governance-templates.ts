import type {CharterArticle, CharterOffice, CharterRules, DecisionKind} from '../../receiz/governance-documents';

export const ruleLabels = {
  membership: 'Membership and admission',
  decisions: 'Decision rules',
  representation: 'Representation and recall',
  amendments: 'Amendment procedure',
  appeals: 'Challenges and appeals',
  treasury: 'Treasury authority and limits',
} as const;
type Clauses = Pick<CharterRules, keyof typeof ruleLabels>;
type CharterDraft = Clauses & Pick<CharterRules, 'purpose' | 'approvalPercent' | 'minimumSupportPercent' | 'voteDays' | 'appealDays' | 'allowMandates'> & {
  offices: CharterOffice[];
  articles: CharterArticle[];
};
const collective: CharterDraft = {
  purpose: 'Maintain shared services for members. Members set priorities, approve operating rules and review progress at an open quarterly meeting.',
  membership: 'The voting membership is the list in this charter. Publish proposed admissions and departures for member review. A change takes effect under a separately ratified successor charter.',
  decisions: 'A member may publish a proposal identifying the action, its reason and who will carry it out. Each voting member has one vote. A tie leaves the current decision in place.',
  representation: 'Members cast their own ballots. Holding an office gives its holder only the duties written in this charter. Founding the organization confers no office.',
  amendments: 'Publish the exact replacement text with the prior charter reference and a description of the change. Give members a full voting and challenge period. Obtain ratification of the resulting charter before applying it.',
  appeals: 'Identify the disputed Original, the rule at issue, supporting public evidence and the remedy sought. A reviewer with a personal interest discloses it and steps aside. Publish the finding for member review.',
  treasury: 'The organization may publish budgets for member review. A release requires a separately authorized installment naming its source, recipient, amount and purpose. Publish the receipt for each completed payment.',
  approvalPercent: 67, minimumSupportPercent: 25, voteDays: 7, appealDays: 3, allowMandates: false,
  offices: [], articles: [
    {title: 'Member access', text: 'Give every member access to the same proposal, ballot choices, closing rules and public evidence. Provide a plain-language summary on request.'},
    {title: 'Quarterly review', text: 'Publish actions completed, actions outstanding and any expenses. Members may propose a correction or a change in priorities.'},
  ],
};
export const scopedRepresentation = 'A voting member may give another voting member a time-limited mandate for a decision scope. Members may revise or revoke a mandate. A member’s direct ballot takes precedence.';
function elected(name: string, powers: string, term: string): CharterOffice {
  return {name, seats: 1, selection: 'Election', eligibility: 'Electorate', powers, term,
    recall: 'Members may propose removal with reasons and give the holder an opportunity to respond. Record the outcome and follow the charter procedure to fill a vacancy.',
    procedure: 'Candidates publish their own statements. Members cast one ballot each. Apply the charter threshold and leave a tied seat vacant pending a new decision.'};
}

export const charterTemplates: Record<string, CharterDraft> = {
  'Member association': collective,
  Cooperative: {...collective,
    purpose: 'Run a member-owned enterprise. Members determine the services they share, review operating costs and decide how to use any surplus.',
    membership: 'List the founding voting membership. Applicants describe their contribution and accept the cooperative duties. Members review applications and ratify any change to the electorate in a successor charter.',
    decisions: 'Members vote on operating policy, work commitments, service prices and surplus allocations. A proposal states its expected effect on members and a date for review.',
    representation: scopedRepresentation, allowMandates: true,
    treasury: 'Publish an operating budget, reserves and the proposed use of surplus. Members review conflicts and authorize each disbursement against a named budget and recipient.',
    offices: [elected('Operations steward', 'Coordinate adopted work, publish service reports and return material changes to the members.', 'One year. Members may nominate a new candidate at the end of the term.')],
    articles: [{title:'Member accounts',text:'Publish a quarterly account of services, reserves and operating expenses. Give members a way to challenge an entry by citing its Original.'},
      {title:'Conflicts of interest',text:'A steward discloses any interest in a supplier or recipient before a proposal is opened. Record the disclosure with the decision.'}]},
  'Representative council': {...collective,
    purpose: 'Represent members in collective decisions. Members elect accountable officeholders and retain the right to vote directly on proposals.',
    representation: scopedRepresentation, allowMandates: true, voteDays: 14, appealDays: 7,
    offices: [elected('Council representative', 'Collect member proposals, convene deliberation and communicate adopted decisions.', 'One year, renewable by election.'),
      elected('Records steward', 'Publish meeting decisions, disclosures and the evidence members need to reproduce each count.', 'One year, renewable by election.')],
    articles: [{title:'Public deliberation',text:'Publish an agenda ahead of every sitting. Record the question, declared interests, dissenting views and the exact decision.'},
      {title:'Constituent review',text:'Members may request a report from any representative or propose a recall under the office procedure.'}]},
  'Participatory budget': {...collective,
    purpose: 'Let members choose projects for a shared budget and track each approved installment from proposal to receipt.',
    decisions: 'Publish a project description, beneficiaries, alternatives, total cost and delivery milestones. Members may poll priorities before a separate vote on an exact expenditure.',
    treasury: 'Identify the budget, available source, recipient and exact installment before authorizing a release. Publish a receipt with the project report. Unspent allocations return for member review.',
    approvalPercent: 67, minimumSupportPercent: 35, voteDays: 14, appealDays: 7,
    offices: [elected('Budget reviewer', 'Check cost estimates and publish spending reports. The office cannot release funds by itself.', 'One budget cycle.')],
    articles: [{title:'Project selection',text:'Accept project submissions from members. Publish eligibility, comparable estimates and any delivery risks before opening a funding vote.'},
      {title:'Delivery and closeout',text:'For each funded milestone publish the deliverable, the receipt and any variance. Submit changes of recipient or amount for fresh authorization.'}]},
  'Nonprofit board': {...collective,
    purpose: 'Oversee a public-benefit mission. The board reviews programs, records conflicts of interest and accounts for resources entrusted to the organization.',
    membership: 'Name the voting board in the electorate. Identify qualifications, disclose conflicts and ratify any successor membership before a new board votes.',
    treasury: 'Restrict each grant to its stated purpose and beneficiary. Publish the approved budget, evidence of delivery and the resulting receipts. Return scope changes to the board.',
    offices: [elected('Board chair','Convene meetings and report adopted decisions. Expenditures require separate charter authority.','One year, renewable by election.'),elected('Secretary','Maintain the decision record, disclosures and review calendar.','One year, renewable by election.')],
    articles: [{title:'Mission review',text:'Publish an annual report describing who was served, how resources were used and the indicators members selected.'},
      {title:'Interested transactions',text:'Record the interest and the independent review before considering a contract involving an officeholder.'}]},
  'Working group': {...collective,
    purpose: 'Deliver a defined piece of work, publish recommendations and close the group when members accept the final report.',
    decisions:'State the deliverable, responsible contributor, acceptance criteria and review date for each assignment. Members vote on scope changes and the final recommendation.',
    treasury:'This working group has no standing spending authority. Submit expense requests to the body that controls the relevant budget.',
    approvalPercent: 60, minimumSupportPercent: 25, voteDays: 3, appealDays: 2,
    articles:[{title:'Handover and dissolution',text:'Publish the final deliverable, unresolved questions and locations of the supporting Originals. Members vote on handover or an extension of the mandate.'}]},
  'Mutual aid fund': {...collective,
    purpose:'Pool member resources for essential needs. Members set eligibility, review allocations and account for the use of the common fund.',
    decisions:'Propose an allocation with its eligibility basis, available resources and review conditions. Obtain consent for information that will appear on the permanent public record.',
    treasury:'Set aside a reserve. Each release identifies the recipient subject, installment and source and requires separate approval. Publish aggregate program outcomes and individual settlement receipts.',
    voteDays:3, appealDays:2, articles:[{title:'Privacy in public proposals',text:'Request only the evidence required for an allocation. Keep medical details, home addresses and other sensitive supporting material outside public governance Originals.'},
      {title:'Review of allocations',text:'Members review aggregate demand, remaining reserves and any unmet needs each month before considering a change to eligibility.'}]},
  'Custom': {purpose:'', membership:'',decisions:'',representation:'',amendments:'',appeals:'',treasury:'',approvalPercent:67,minimumSupportPercent:25,voteDays:7,appealDays:3,allowMandates:false,offices:[],articles:[]},
};

export type ProposalDraft = {title: string; text: string; choices: string[]};
type ProposalTemplate = (rules: CharterRules, office?: string) => ProposalDraft;
const binary = ['Approve','Reject'];
export const proposalTemplates: Record<DecisionKind, Record<string, ProposalTemplate>> = {
  Policy: {
    'Operating policy': r=>({title:'Adopt a quarterly review of operations',text:'Each quarter, '+r.name+' will publish a report on decisions carried out, work still open and resources used. Members may propose corrections with evidence. Review the format after the first two reports.',choices:binary}),
    'Member access': r=>({title:'Make member meetings easier to attend',text:'Publish the agenda and participation instructions before each meeting of '+r.name+'. Accept written contributions during the review period. Publish the minutes, decisions and follow-up owners together after each meeting.',choices:binary}),
    'Project mandate': r=>({title:'Commission a service review',text:'Authorize a working group to consult members of '+r.name+', compare service needs and publish a recommendation within six weeks. The group will return any spending request or proposed change in rules for a separate vote.',choices:binary}),
  },
  Poll: {
    'Member priorities': r=>({title:'Which member priority should come first?',text:'Choose the area '+r.name+' should investigate next. Members will use the result to prepare a costed proposal for a separate decision.',choices:['Improve existing services','Reach new members','Build reserves']}),
    'Meeting schedule': r=>({title:'When should members meet?',text:'Select the meeting window that would make it easiest to participate in '+r.name+'. Use the results to draw up a schedule for the next quarter.',choices:['Weekday morning','Weekday evening','Weekend afternoon']}),
    'Project feedback': r=>({title:'How should the pilot proceed?',text:'Use the experience of members in '+r.name+' to guide the next review. The sponsor will publish the feedback alongside any proposal to extend or revise the pilot.',choices:['Continue as designed','Revise and retest','Conclude the pilot']}),
  },
  Election: {
    'Regular election': (r,o)=>({title:o?'Elect the '+o:'Elect an officeholder',text:'Members of '+r.name+' elect '+(o?'the '+o:'a charter officeholder')+' from the candidates whose statements are selected below. The charter defines the duties, seats, term and procedure. Review each statement before casting a ballot.',choices:[]}),
    'Fill a vacancy': (r,o)=>({title:o?'Fill the vacant '+o+' office':'Fill a vacant office',text:'Members of '+r.name+' are invited to fill '+(o?'the vacant '+o+' office':'a vacant office')+'. Record the vacancy and the applicable term under the charter. Count the selected candidates under its election rules.',choices:[]}),
  },
  Treasury: {
    'Budget installment': r=>({title:'Authorize a budget installment',text:r.execution?.treasury?'Authorize the exact installment specified below for '+r.name+'. The custodian will compare the funding and recipient heads before execution and publish the resulting settlement receipt.':'Members of '+r.name+' will review the budget request below. Approve the listed purpose, recipient and ceiling for the stated conditions. The sponsor will report the outcome to members after the review.',choices:binary}),
    'Expense reimbursement': r=>({title:'Approve an expense reimbursement',text:'Consider a reimbursement for an expense incurred for '+r.name+'. Identify the approved purpose and evidence of the expense, disclose conflicts and verify the recipient and amount. Record each completed reimbursement against the original request.',choices:binary}),
  },
  Amendment: {
    'Revise a charter article':r=>({title:'Amend the charter review procedure',text:'Proposed article for '+r.name+'\n\nMembers will review the charter annually and publish the clauses they propose to retain, replace or retire. Allow the complete voting and challenge periods before ratification. Publish the successor charter with a reference to the charter it replaces.',choices:['Recommend adoption','Retain current article']}),
    'Change representation':r=>({title:'Review the representation rules',text:'Ask '+r.name+' to publish a successor charter specifying which decisions may be delegated, who may represent a member and how mandates expire or are revoked. Circulate the complete text and ratify the successor under the existing amendment procedure.',choices:['Prepare a successor charter','Keep existing rules']}),
  },
};
export function proposalDraft(kind: DecisionKind, startingPoint: string, rules: CharterRules, office?: string): ProposalDraft {
  const build = proposalTemplates[kind][startingPoint];
  const draft = build ? build(rules, office) : {title:'',text:'',choices:[]};
  return {...draft, title:draft.title.length>160 ? draft.title.slice(0,159).trimEnd()+'…' : draft.title};
}
