'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Card, MC, Section } from './MemberUI';

/** Light/Dark only: "system" needs the shared provider changed, so it is out of scope. */
export default function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
  ] as const;

  return (
    <Section title="Appearance">
      <Card className="p-3">
        <div role="group" aria-label="Theme" className="grid grid-cols-2 gap-2">
          {options.map(({ value, label, Icon }) => {
            const active = theme === value;
            return (
              <button key={value} type="button" aria-pressed={active}
                onClick={() => setTheme(value)}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-[12px] text-[13px] font-[750] transition-colors active:scale-[0.98]"
                style={{ background: active ? MC.primary : 'var(--bg-subtle)', color: active ? '#fff' : MC.ink }}>
                <Icon size={16} aria-hidden /> {label}
              </button>
            );
          })}
        </div>
      </Card>
    </Section>
  );
}
