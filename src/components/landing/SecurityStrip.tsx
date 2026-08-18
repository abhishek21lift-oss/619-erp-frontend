'use client';

import { ShieldCheck, LockKeyhole, Fingerprint, BrainCircuit, Database, ServerCog } from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C } from './tokens';

const ITEMS = [
  {
    icon: <Database size={17} />,
    title: 'Tenant isolation',
    body: 'Every studio’s data is separated at the storage layer — your records are never mixed with another business’s.',
  },
  {
    icon: <LockKeyhole size={17} />,
    title: 'Row-level security',
    body: 'Database rows are access-controlled, so a trainer can only ever reach their own clients and programmes.',
  },
  {
    icon: <Fingerprint size={17} />,
    title: 'Passkey sign-in',
    body: 'Passwordless, phishing-resistant authentication for owners and staff — no shared passwords at the studio.',
  },
  {
    icon: <BrainCircuit size={17} />,
    title: 'Authorised AI knowledge',
    body: 'The AI reads only what your role allows — a trainer’s questions never cross into other clients’ private records.',
  },
  {
    icon: <ShieldCheck size={17} />,
    title: 'Role-based access',
    body: 'Owner, admin, manager, trainer — distinct permissions for every surface, from billing to client lists.',
  },
  {
    icon: <ServerCog size={17} />,
    title: 'No client-side secrets',
    body: 'Billing and access logic runs server-side; the browser never sees keys or privileged routes.',
  },
];

/**
 * Trust strip — replaces the invented "secure & trusted" claims with the
 * actual security architecture decisions the platform documents.
 */
export default function SecurityStrip() {
  return (
    <Section id="trust" alt aria-labelledby="trust-title" className="py-16 sm:py-20">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-[380px_1fr]">
          <div className="lg:sticky lg:top-28">
            <SectionHeader
              id="trust-title"
              eyebrow="Trust & security"
              align="left"
              title="Your clients' data is treated like your business depends on it"
              sub="Because it does. Every architectural decision below is enforced at the storage and API layers — not as a marketing promise."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ITEMS.map((item, i) => (
              <Reveal key={item.title} delay={0.04 + i * 0.04} className="h-full">
                <div className="flex h-full gap-3.5 rounded-2xl border p-5" style={{ background: C.panel, borderColor: C.lineSoft }}>
                  <span className="mt-0.5 shrink-0" style={{ color: C.emerald }} aria-hidden>{item.icon}</span>
                  <div>
                    <h3 className="text-[13.5px] font-bold" style={{ color: C.ink }}>{item.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-[1.6]" style={{ color: C.muted }}>{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}