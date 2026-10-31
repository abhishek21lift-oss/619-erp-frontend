import type { FaqItem } from './faq-content';

/**
 * PT OS FAQ — the single source for both the accordion on `/pt-os` and the
 * FAQPage JSON-LD that page renders. Same rule as the homepage list: the
 * markup may only claim answers that are actually on the page.
 */
export const PT_OS_FAQ: FaqItem[] = [
  {
    q: 'Who is PT OS for?',
    a: 'Independent personal trainers, boutique PT studios, strength coaches and online coaches in India — anyone who trains clients and also runs the business.',
  },
  {
    q: 'How is this different from a diary or Excel sheet?',
    a: 'A diary cannot remind a client to renew, reconcile a UPI payment, or show attendance trends. PT OS keeps clients, sessions, payments and renewals in one searchable record.',
  },
  {
    q: 'How is this different from generic gym management software?',
    a: 'Gym software is built for front-desk operations across hundreds of members. PT OS is built around the trainer-client relationship: programmes, assessments, progress reviews and personal follow-ups.',
  },
  {
    q: 'Does it work for online coaching?',
    a: 'Yes. Programmes, diet plans, progress tracking and payments work the same whether the client trains in person or online.',
  },
  {
    q: 'What does it cost to try?',
    a: 'Every plan starts with a 7-day free trial. No card is required to start.',
  },
];
