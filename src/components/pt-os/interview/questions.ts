// The Client Interview's questions, in the order a trainer asks them.
//
// Limits match the server (backend migration 227 and its zod schema). Each
// question carries a decorative tone from the profile spectrum — the client
// profile and the pages a trainer fills in for that client read as one family.
// The tones are decoration only: the one STATE on this page, "answered", is
// emerald from the five families, so colour never claims something is done
// that is not.

import type { LucideIcon } from 'lucide-react';
import { CalendarClock, Dumbbell, Flame, HeartPulse, Moon, NotebookPen, SlidersHorizontal } from 'lucide-react';
import type { ToneName } from '@/components/profile/profileTheme';

export type InterviewField =
  | 'training_history' | 'pain_and_injuries' | 'lifestyle' | 'motivation' | 'availability' | 'preferences' | 'notes';

export interface InterviewQuestion {
  key: InterviewField;
  label: string;
  /** The question as the trainer would ask it out loud. */
  prompt: string;
  hint: string;
  max: number;
  icon: LucideIcon;
  tone: ToneName;
}

export const INTERVIEW_QUESTIONS: readonly InterviewQuestion[] = [
  { key: 'training_history', label: 'Training history', prompt: 'What have you done before?',
    hint: 'How long, how often, and what made them stop.', max: 2000, icon: Dumbbell, tone: 'indigo' },
  // Rose, the warmest tone: this is the answer that can change what is safe
  // to programme, and it should be the one the eye lands on when scanning.
  { key: 'pain_and_injuries', label: 'Pain & injuries', prompt: 'Does anything hurt?',
    hint: 'Current pain, past injuries, surgeries, and what aggravates it.', max: 2000, icon: HeartPulse, tone: 'rose' },
  { key: 'lifestyle', label: 'Lifestyle', prompt: 'What does a normal day look like?',
    hint: 'Work, sleep, stress, daily steps, food routine.', max: 2000, icon: Moon, tone: 'mint' },
  { key: 'motivation', label: 'Motivation & goals', prompt: 'Why now?',
    hint: 'What success would look like, in their own words.', max: 2000, icon: Flame, tone: 'gold' },
  { key: 'availability', label: 'Availability', prompt: 'When can you train?',
    hint: 'Days and times; travel, shifts, anything that moves.', max: 1000, icon: CalendarClock, tone: 'sky' },
  { key: 'preferences', label: 'Preferences', prompt: 'What do you enjoy — and avoid?',
    hint: 'Training style, likes, dislikes, equipment at home.', max: 1000, icon: SlidersHorizontal, tone: 'berry' },
  { key: 'notes', label: 'Trainer notes', prompt: 'Anything else worth remembering?',
    hint: 'Your own observations from the conversation.', max: 2000, icon: NotebookPen, tone: 'violet' },
] as const;

export type Answers = Record<InterviewField, string>;

export const EMPTY_ANSWERS: Answers = {
  training_history: '', pain_and_injuries: '', lifestyle: '', motivation: '', availability: '', preferences: '', notes: '',
};

/** Questions with something written in them — whitespace is not an answer. */
export function answeredCount(answers: Answers): number {
  return INTERVIEW_QUESTIONS.filter(({ key }) => answers[key].trim()).length;
}
