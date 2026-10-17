// The Client Interview's questions, in the order a trainer asks them.
//
// Limits match the server (backend migration 227 + 228) and its zod schema.

import type { LucideIcon } from 'lucide-react';
import { CalendarClock, Dumbbell, Flame, HeartPulse, Moon, NotebookPen, SlidersHorizontal } from 'lucide-react';
import type { ToneName } from '@/components/profile/profileTheme';

export type InterviewField =
  | 'training_history' | 'pain_and_injuries' | 'lifestyle' | 'motivation' | 'availability' | 'preferences' | 'notes'
  | 'lifestyle_occupation' | 'lifestyle_sitting_hours' | 'lifestyle_screen_time' | 'lifestyle_sleep_hours'
  | 'lifestyle_meal_regularity' | 'lifestyle_smoking' | 'lifestyle_alcohol' | 'lifestyle_training_days';

export interface InterviewQuestion {
  key: InterviewField;
  label: string;
  prompt: string;
  hint: string;
  max: number;
  icon: LucideIcon;
  tone: ToneName;
}

export const INTERVIEW_QUESTIONS: readonly InterviewQuestion[] = [
  { key: 'training_history', label: 'Training history', prompt: 'What have you done before?', hint: 'How long, how often, and what made them stop.', max: 2000, icon: Dumbbell, tone: 'indigo' },
  { key: 'pain_and_injuries', label: 'Pain & injuries', prompt: 'Does anything hurt?', hint: 'Current pain, past injuries, surgeries, and what aggravates it.', max: 2000, icon: HeartPulse, tone: 'rose' },
  { key: 'lifestyle', label: 'Lifestyle', prompt: 'What does a normal day look like?', hint: 'Work, sleep, stress, daily steps, food routine.', max: 2000, icon: Moon, tone: 'mint' },
  { key: 'motivation', label: 'Motivation & goals', prompt: 'Why now?', hint: 'What success would look like, in their own words.', max: 2000, icon: Flame, tone: 'gold' },
  { key: 'availability', label: 'Availability', prompt: 'When can you train?', hint: 'Days and times; travel, shifts, anything that moves.', max: 1000, icon: CalendarClock, tone: 'sky' },
  { key: 'preferences', label: 'Preferences', prompt: 'What do you enjoy — and avoid?', hint: 'Training style, likes, dislikes, equipment at home.', max: 1000, icon: SlidersHorizontal, tone: 'berry' },
  { key: 'notes', label: 'Trainer notes', prompt: 'Anything else worth remembering?', hint: 'Your own observations from the conversation.', max: 2000, icon: NotebookPen, tone: 'violet' },
  // ── Lifestyle & Training Readiness (migration 228) ──
  { key: 'lifestyle_occupation', label: 'Occupation', prompt: 'What kind of work does the client do?', hint: 'Desk / sedentary vs active — changes recovery.', max: 50, icon: Dumbbell, tone: 'indigo' },
  { key: 'lifestyle_sitting_hours', label: 'Daily sitting hours', prompt: 'Average hours sitting per day?', hint: 'Work-day average.', max: 4, icon: Moon, tone: 'mint' },
  { key: 'lifestyle_screen_time', label: 'Daily screen time', prompt: 'Average screen time (hours)?', hint: 'Work + leisure.', max: 10, icon: HeartPulse, tone: 'rose', control: 'select', options: [
    { value: '<2', label: 'Under 2 h' }, { value: '2_4', label: '2 – 4 h' },
    { value: '4_6', label: '4 – 6 h' }, { value: '6_8', label: '6 – 8 h' }, { value: '8_plus', label: '8+ h' },
  ]},
  { key: 'lifestyle_sleep_hours', label: 'Sleep duration', prompt: 'Average hours of sleep per night?', hint: 'Last 2–4 weeks.', max: 4, icon: Flame, tone: 'gold', control: 'number' },
  { key: 'lifestyle_meal_regularity', label: 'Meal regularity', prompt: 'Meal pattern?', hint: 'Regular, irregular, or inconsistent.', max: 20, icon: SlidersHorizontal, tone: 'berry', control: 'select', options: [
    { value: 'regular', label: 'Regular' }, { value: 'irregular', label: 'Irregular' }, { value: 'inconsistent', label: 'Inconsistent' },
  ]},
  { key: 'lifestyle_smoking', label: 'Smoking', prompt: 'Smoking status?', hint: 'Never, occasionally, daily, or former.', max: 20, icon: NotebookPen, tone: 'violet', control: 'select', options: [
    { value: 'never', label: 'Never' }, { value: 'occasionally', label: 'Occasionally' },
    { value: 'daily', label: 'Daily' }, { value: 'former', label: 'Former' },
  ]},
  { key: 'lifestyle_alcohol', label: 'Alcohol', prompt: 'Drinking frequency?', hint: 'Never, occasionally, weekly, or frequently.', max: 20, icon: Dumbbell, tone: 'indigo', control: 'select', options: [
    { value: 'never', label: 'Never' }, { value: 'occasionally', label: 'Occasionally' },
    { value: 'weekly', label: 'Weekly' }, { value: 'frequently', label: 'Frequently' },
  ]},
  { key: 'lifestyle_training_days', label: 'Weekly training', prompt: 'Days per week they can train?', hint: 'Select 3–6.', max: 4, icon: CalendarClock, tone: 'sky' },
] as const;

export type Answers = Record<InterviewField, string | number | null>;

export const EMPTY_ANSWERS: Answers = {
  training_history: '', pain_and_injuries: '', lifestyle: '', motivation: '', availability: '', preferences: '', notes: '',
  lifestyle_occupation: null, lifestyle_sitting_hours: null, lifestyle_screen_time: null,
  lifestyle_sleep_hours: null, lifestyle_meal_regularity: null, lifestyle_smoking: null,
  lifestyle_alcohol: null, lifestyle_training_days: null,
};

export function answeredCount(answers: Answers): number {
  return INTERVIEW_QUESTIONS.filter(({ key }) => {
    const v = answers[key];
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    return true;
  }).length;
}
