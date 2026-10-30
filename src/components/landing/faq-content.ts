export type FaqItem = { q: string; a: string };

/**
 * Homepage FAQ — the single source for both the accordion (FaqSection) and the
 * FAQPage JSON-LD rendered by app/(chrome)/page.tsx. Answers must stay things
 * the product actually does: structured data describing content that is not on
 * the page is worse than no structured data.
 */
export const HOME_FAQ: FaqItem[] = [
  { q: 'What is MY PT STUDIO?', a: 'The business management platform for personal trainers — client management, workout and nutrition builders, progress tracking, payments and analytics in one platform, so you can run your entire training business from a single place.' },
  { q: 'Who is it for?', a: 'Independent personal trainers and PT studios — the person who trains the clients and also has to run the business around them.' },
  { q: 'Do my clients need to install anything?', a: 'No. The platform is fully web-based and mobile-friendly. You manage everything from any device, and clients can be onboarded in minutes.' },
  { q: 'Can my clients sign in too?', a: 'Yes. Every client gets their own Member Login, where they see their membership, payments, attendance and progress — only their own, never another member’s.' },
  { q: 'Is my data secure?', a: 'Every request the app makes is scoped to your studio, connections are encrypted, and sign-in supports two-factor codes and passkeys. Your client data is yours, and it is never shared across studios.' },
  { q: 'How do I get started?', a: 'Start free — creating your studio takes a couple of minutes. Our team reviews every new studio, and your free trial starts the day it is approved.' },
];
