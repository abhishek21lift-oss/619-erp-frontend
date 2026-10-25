// The consent wording the client sees and ticks.
//
// Dependency-free on purpose: the cross-repo parity script imports this in
// CI, where the frontend's node_modules are not installed. Importing the
// wizard's types.ts instead pulls in zod via forms/domain, and the check
// cannot run at all.
export const PARQ_CONSENT_FIELDS = [
  { key: 'info_true', label: 'The answers in this screening are true and complete to the best of my knowledge, and I will tell my trainer if my health changes.' },
] as const;

export const INFORMED_CONSENT_ACK_FIELDS = [
  { key: 'understands_confidentiality', label: 'I understand my personal and medical information will remain confidential and will only be used for designing, monitoring and improving my personal training program. Parts of my programme may be drafted with the help of AI tools; to do this, relevant details (such as my goals, measurements and health or injury notes, but not my phone number) are sent to an AI service provider that is not permitted to store or train on them, and my trainer reviews everything before it is used.' },
  { key: 'voluntary_participation', label: 'I understand my participation is voluntary and I can withdraw at any time.' },
  {
    key: 'final_declaration',
    label: 'I confirm that: I have read this entire informed consent document; I understand the risks; I understand the benefits; I have asked all my questions; my questions have been answered; I voluntarily agree to participate.',
  },
] as const;
