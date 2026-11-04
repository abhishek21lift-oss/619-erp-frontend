// The Client Interview, as four sections a trainer can walk through without
// typing. Values are canonical, labels are for people.
//
// ── Selection first ────────────────────────────────────────────────────────
//
// Every counted answer is a selection: a searchable occupation, a single-select
// card, a duration dropdown, a multi-select chip, a segmented choice or the
// 1–10 readiness scale. The only text fields are optional context fields and
// the trainer's observation; none of them counts towards completion.
//
// ── Ownership ─────────────────────────────────────────────────────────────
//
// The interview owns the conversation answers: work and lifestyle context,
// training background, barriers, readiness and the trainer's summary. It does
// not write the Lifestyle Assessment, the PAR-Q, pt_goals or the live
// programme level. Fitness goals here are what the client said in the
// interview; the dated goal record remains pt_goals.
//
// ── Historical answers ────────────────────────────────────────────────────
//
// The free-text columns from the first interview (job_details, training_history,
// preferences, motivation, important_client_statements) are still controls —
// optional and uncounted — so a completed record can be read and corrected
// rather than silently losing what the client said. Meal regularity, training
// days and availability are read-only history; the form never writes them.

import type { LucideIcon } from 'lucide-react';
import { Briefcase, Dumbbell, Flag, NotebookPen } from 'lucide-react';

/** Text answers the form holds. Optional/legacy fields are here too. */
export const TEXT_FIELDS = [
  'occupation_type',
  'occupation_title',
  'job_details',
  'occupation_other_details',
  'work_type',
  'work_hours_band',
  'lifestyle_sitting_hours',
  'daily_activity_level',
  'previous_workout_experience',
  'training_duration',
  'sports_participation',
  'training_history',
  'preferences',
  'challenge_other',
  'motivation',
  'programme_readiness',
  'important_client_statements',
  'client_attitude',
  'confidence_level',
  'commitment_level',
  'coaching_preference',
  'initial_training_level',
  'notes',
  // Read-only history. Kept in the shape so a saved row never loses them.
  'lifestyle_meal_regularity',
  'lifestyle_training_days',
  'availability',
] as const;

/** Multi-select answers, in screen order. */
export const ARRAY_FIELDS = [
  'sports_played',
  'previous_activities',
  'exercise_preferences',
  'fitness_goals',
  'training_challenges',
  'motivation_factors',
] as const;

export type TextField = typeof TEXT_FIELDS[number];
export type ArrayField = typeof ARRAY_FIELDS[number];
export type InterviewField = TextField | ArrayField;
export type Answers = Record<TextField, string> & Record<ArrayField, string[]>;

export interface InterviewOption {
  /** Stored as-is. */
  value: string;
  /** Read by a person. */
  label: string;
  /** One line under the label on a card. Never stored. */
  description?: string;
}

export interface OccupationChoice extends InterviewOption {
  /** The canonical scoring category written to occupation_type. */
  occupationType: string;
}

/** A field only shown while the thing it describes is true. */
export type InterviewCondition = 'occupationOther' | 'challengeOther';

interface ControlBase {
  key: InterviewField;
  /** The control's own accessible name. */
  label: string;
  hint?: string;
  showWhen?: InterviewCondition;
  /** Defaults to counted. A detail field set false never counts. */
  counted?: boolean;
}

export type InterviewControl =
  | (ControlBase & { kind: 'text'; rows?: number; maxLength?: number; placeholder?: string })
  | (ControlBase & { kind: 'select'; options: readonly InterviewOption[] })
  | (ControlBase & { kind: 'chips'; options: readonly InterviewOption[] })
  | (ControlBase & { kind: 'search-chips'; options: readonly InterviewOption[] })
  | (ControlBase & { kind: 'cards'; options: readonly InterviewOption[]; columns?: 2 | 3 })
  | (ControlBase & { kind: 'segmented'; options: readonly InterviewOption[] })
  | (ControlBase & { kind: 'scale' })
  | (ControlBase & { kind: 'occupation'; options: readonly OccupationChoice[] });

export interface InterviewSection {
  id: string;
  /** The section's short name, in the step indicator. */
  label: string;
  /** The section as it is introduced on the page. */
  prompt: string;
  /** One line under the prompt. */
  hint: string;
  icon: LucideIcon;
  controls: readonly InterviewControl[];
}

/** Bands as midpoints — the DB stores a number, the trainer picks a band. */
const SITTING: readonly InterviewOption[] = [
  { value: '1', label: 'Under 2 hours' },
  { value: '3', label: '2 – 4 hours' },
  { value: '5', label: '4 – 6 hours' },
  { value: '7', label: '6 – 8 hours' },
  { value: '9', label: '8+ hours' },
];

const WORK_TYPES: readonly InterviewOption[] = [
  { value: 'desk', label: 'Desk-based', description: 'Mostly at a desk' },
  { value: 'on_feet', label: 'On feet', description: 'Moving around most of the day' },
  { value: 'physical', label: 'Physical labour', description: 'Heavy lifting or manual work' },
  { value: 'mixed', label: 'Mixed', description: 'Some desk, some active' },
  { value: 'shifts', label: 'Shift work', description: 'Rotating, early or night shifts' },
  { value: 'field', label: 'On the road', description: 'Driving or travelling for work' },
  { value: 'other', label: 'Other', description: 'Something else' },
];

const WORK_HOURS: readonly InterviewOption[] = [
  { value: 'under_4', label: 'Under 4 hours' },
  { value: '4_6', label: '4 – 6 hours' },
  { value: '6_8', label: '6 – 8 hours' },
  { value: '8_10', label: '8 – 10 hours' },
  { value: '10_plus', label: '10+ hours' },
  { value: 'varies', label: 'Varies by day' },
];

const ACTIVITY_LEVELS: readonly InterviewOption[] = [
  { value: 'mostly_seated', label: 'Mostly seated', description: 'Little movement outside work' },
  { value: 'light', label: 'Lightly active', description: 'Some walking, not much exercise' },
  { value: 'moderately_active', label: 'Moderately active', description: 'Regular movement most days' },
  { value: 'very_active', label: 'Very active', description: 'Physical most of the day' },
];

const EXPERIENCE: readonly InterviewOption[] = [
  { value: 'never', label: 'Never trained', description: 'No structured training yet' },
  { value: 'beginner', label: 'Beginner', description: 'Under 6 months' },
  { value: 'intermediate', label: 'Intermediate', description: '6 months to 2 years' },
  { value: 'advanced', label: 'Advanced', description: '2+ years' },
];

const TRAINING_DURATION: readonly InterviewOption[] = [
  { value: 'none', label: 'None yet' },
  { value: 'under_3_months', label: 'Under 3 months' },
  { value: '3_6_months', label: '3 – 6 months' },
  { value: '6_12_months', label: '6 – 12 months' },
  { value: '1_2_years', label: '1 – 2 years' },
  { value: '2_plus_years', label: '2+ years' },
];

const SPORTS_PARTICIPATION: readonly InterviewOption[] = [
  { value: 'never', label: 'No' },
  { value: 'previously', label: 'Previously' },
  { value: 'currently', label: 'Yes' },
];

const SPORTS: readonly InterviewOption[] = [
  { value: 'cricket', label: 'Cricket' },
  { value: 'football', label: 'Football' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'table_tennis', label: 'Table tennis' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'hockey', label: 'Hockey' },
  { value: 'athletics', label: 'Athletics' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'running', label: 'Running' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'martial_arts', label: 'Martial arts' },
  { value: 'gymnastics', label: 'Gymnastics' },
  { value: 'rowing', label: 'Rowing' },
  { value: 'golf', label: 'Golf' },
  { value: 'squash', label: 'Squash' },
  { value: 'dance', label: 'Dance' },
  { value: 'other', label: 'Other' },
];

const ACTIVITIES: readonly InterviewOption[] = [
  { value: 'walking', label: 'Walking' },
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'gym_weights', label: 'Gym weights' },
  { value: 'cardio_machines', label: 'Cardio machines' },
  { value: 'home_workouts', label: 'Home workouts' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'martial_arts', label: 'Martial arts' },
  { value: 'dance', label: 'Dance' },
  { value: 'sports', label: 'Sports' },
  { value: 'physical_job', label: 'Physical job' },
  { value: 'none', label: 'None' },
];

const PREFERENCES: readonly InterviewOption[] = [
  { value: 'free_weights', label: 'Free weights' },
  { value: 'machines', label: 'Machines' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'stretching', label: 'Stretching' },
  { value: 'outdoors', label: 'Outdoors' },
  { value: 'group_classes', label: 'Group classes' },
  { value: 'home_workouts', label: 'Home workouts' },
  { value: 'sports', label: 'Sports' },
  { value: 'no_preference', label: 'No preference' },
];

// Goal keys match the Goal Assessment taxonomy so the two screens never name
// the same goal with two different words. No pt_goals row is written here.
const GOALS: readonly InterviewOption[] = [
  { value: 'fat_loss', label: 'Lose fat' },
  { value: 'muscle_gain', label: 'Build muscle' },
  { value: 'body_recomposition', label: 'Body recomposition' },
  { value: 'strength_gain', label: 'Get stronger' },
  { value: 'endurance', label: 'Improve endurance' },
  { value: 'general_fitness', label: 'General fitness' },
  { value: 'mobility', label: 'Improve mobility' },
  { value: 'athletic_performance', label: 'Sport performance' },
  { value: 'medical_fitness', label: 'Medical / health' },
  { value: 'wedding_transformation', label: 'Wedding / event' },
  { value: 'senior_fitness', label: 'Senior fitness' },
];

const CHALLENGES: readonly InterviewOption[] = [
  { value: 'time', label: 'Time' },
  { value: 'work_schedule', label: 'Work schedule' },
  { value: 'motivation', label: 'Motivation' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'pain_or_injury', label: 'Pain or injury' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'family', label: 'Family commitments' },
  { value: 'travel', label: 'Travel' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'gym_access', label: 'Gym access' },
  { value: 'cost', label: 'Cost' },
  { value: 'other', label: 'Other' },
];

const MOTIVATION: readonly InterviewOption[] = [
  { value: 'health', label: 'Health' },
  { value: 'appearance', label: 'Appearance' },
  { value: 'energy', label: 'More energy' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'strength', label: 'Strength' },
  { value: 'event', label: 'Upcoming event' },
  { value: 'doctor_advice', label: 'Doctor advice' },
  { value: 'family', label: 'Family' },
  { value: 'accountability', label: 'Accountability' },
  { value: 'stress', label: 'Stress relief' },
  { value: 'sport', label: 'Sport' },
  { value: 'habit', label: 'Build a habit' },
];

const ATTITUDES: readonly InterviewOption[] = [
  { value: 'motivated', label: 'Motivated', description: 'Ready and keen' },
  { value: 'neutral', label: 'Neutral', description: 'Open, not yet committed' },
  { value: 'anxious', label: 'Anxious', description: 'Nervous or unsure' },
  { value: 'resistant', label: 'Resistant', description: 'Sceptical or reluctant' },
];

const LEVELS: readonly InterviewOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const COMMITMENT: readonly InterviewOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

const COACHING: readonly InterviewOption[] = [
  { value: 'strict', label: 'Strict' },
  { value: 'supportive', label: 'Supportive' },
  { value: 'balanced', label: 'Balanced' },
];

const TRAINING_LEVELS: readonly InterviewOption[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

// The category keys the database and Lifestyle scoring already use. The
// generic row per category also gives a legacy occupation_type a readable
// selection when the old record has no occupation_title.
const OCCUPATION_TYPES = [
  'desk_job', 'active_job', 'physical_labor', 'student', 'homemaker',
  'driver', 'healthcare', 'police', 'fitness_professional', 'retired', 'other',
] as const;

const OCCUPATION_GENERIC: Record<string, string> = {
  desk_job: 'Desk job (general)',
  active_job: 'Active job (general)',
  physical_labor: 'Physical labour (general)',
  student: 'Student',
  homemaker: 'Homemaker',
  driver: 'Driver (general)',
  healthcare: 'Healthcare (general)',
  police: 'Police / security (general)',
  fitness_professional: 'Fitness professional (general)',
  retired: 'Retired',
  other: 'Other',
};

const OCCUPATIONS: readonly OccupationChoice[] = [
  { value: OCCUPATION_GENERIC.desk_job, label: OCCUPATION_GENERIC.desk_job, occupationType: 'desk_job' },
  { value: 'Software engineer', label: 'Software engineer', occupationType: 'desk_job' },
  { value: 'Accountant', label: 'Accountant', occupationType: 'desk_job' },
  { value: 'Banker', label: 'Banker', occupationType: 'desk_job' },
  { value: 'Administrator', label: 'Administrator', occupationType: 'desk_job' },
  { value: 'Customer support', label: 'Customer support', occupationType: 'desk_job' },
  { value: 'Designer', label: 'Designer', occupationType: 'desk_job' },
  { value: 'Lawyer', label: 'Lawyer', occupationType: 'desk_job' },
  { value: 'Consultant', label: 'Consultant', occupationType: 'desk_job' },
  { value: 'Architect', label: 'Architect', occupationType: 'desk_job' },

  { value: OCCUPATION_GENERIC.active_job, label: OCCUPATION_GENERIC.active_job, occupationType: 'active_job' },
  { value: 'Teacher', label: 'Teacher', occupationType: 'active_job' },
  { value: 'Retail staff', label: 'Retail staff', occupationType: 'active_job' },
  { value: 'Sales assistant', label: 'Sales assistant', occupationType: 'active_job' },
  { value: 'Waiter', label: 'Waiter', occupationType: 'active_job' },
  { value: 'Security guard', label: 'Security guard', occupationType: 'active_job' },
  { value: 'Chef', label: 'Chef', occupationType: 'active_job' },
  { value: 'Hair stylist', label: 'Hair stylist', occupationType: 'active_job' },

  { value: OCCUPATION_GENERIC.physical_labor, label: OCCUPATION_GENERIC.physical_labor, occupationType: 'physical_labor' },
  { value: 'Construction worker', label: 'Construction worker', occupationType: 'physical_labor' },
  { value: 'Warehouse associate', label: 'Warehouse associate', occupationType: 'physical_labor' },
  { value: 'Mechanic', label: 'Mechanic', occupationType: 'physical_labor' },
  { value: 'Electrician', label: 'Electrician', occupationType: 'physical_labor' },
  { value: 'Plumber', label: 'Plumber', occupationType: 'physical_labor' },
  { value: 'Farmer', label: 'Farmer', occupationType: 'physical_labor' },
  { value: 'Cleaner', label: 'Cleaner', occupationType: 'physical_labor' },
  { value: 'Factory worker', label: 'Factory worker', occupationType: 'physical_labor' },

  { value: OCCUPATION_GENERIC.student, label: OCCUPATION_GENERIC.student, occupationType: 'student' },
  { value: 'College student', label: 'College student', occupationType: 'student' },
  { value: 'School student', label: 'School student', occupationType: 'student' },

  { value: OCCUPATION_GENERIC.homemaker, label: OCCUPATION_GENERIC.homemaker, occupationType: 'homemaker' },

  { value: OCCUPATION_GENERIC.driver, label: OCCUPATION_GENERIC.driver, occupationType: 'driver' },
  { value: 'Cab driver', label: 'Cab driver', occupationType: 'driver' },
  { value: 'Delivery rider', label: 'Delivery rider', occupationType: 'driver' },
  { value: 'Truck driver', label: 'Truck driver', occupationType: 'driver' },

  { value: OCCUPATION_GENERIC.healthcare, label: OCCUPATION_GENERIC.healthcare, occupationType: 'healthcare' },
  { value: 'Doctor', label: 'Doctor', occupationType: 'healthcare' },
  { value: 'Nurse', label: 'Nurse', occupationType: 'healthcare' },
  { value: 'Physiotherapist', label: 'Physiotherapist', occupationType: 'healthcare' },
  { value: 'Pharmacist', label: 'Pharmacist', occupationType: 'healthcare' },
  { value: 'Caregiver', label: 'Caregiver', occupationType: 'healthcare' },

  { value: OCCUPATION_GENERIC.police, label: OCCUPATION_GENERIC.police, occupationType: 'police' },
  { value: 'Police officer', label: 'Police officer', occupationType: 'police' },
  { value: 'Firefighter', label: 'Firefighter', occupationType: 'police' },
  { value: 'Soldier', label: 'Soldier', occupationType: 'police' },

  { value: OCCUPATION_GENERIC.fitness_professional, label: OCCUPATION_GENERIC.fitness_professional, occupationType: 'fitness_professional' },
  { value: 'Personal trainer', label: 'Personal trainer', occupationType: 'fitness_professional' },
  { value: 'Yoga teacher', label: 'Yoga teacher', occupationType: 'fitness_professional' },
  { value: 'Sports coach', label: 'Sports coach', occupationType: 'fitness_professional' },

  { value: OCCUPATION_GENERIC.retired, label: OCCUPATION_GENERIC.retired, occupationType: 'retired' },
  { value: OCCUPATION_GENERIC.other, label: OCCUPATION_GENERIC.other, occupationType: 'other' },
  { value: 'Freelancer', label: 'Freelancer', occupationType: 'other' },
  { value: 'Business owner', label: 'Business owner', occupationType: 'other' },
];

export const INTERVIEW_SECTIONS: readonly InterviewSection[] = [
  {
    id: 'work',
    label: 'Work & Lifestyle',
    prompt: 'What do they do all day?',
    hint: 'Their working life and how much movement it already gives them.',
    icon: Briefcase,
    controls: [
      {
        key: 'occupation_title',
        kind: 'occupation',
        label: 'What is their occupation?',
        hint: 'Search the list. Pick the closest role.',
        options: OCCUPATIONS,
      },
      {
        key: 'work_type',
        kind: 'cards',
        label: 'What type of work do they do?',
        hint: 'Pick the one that fits most days.',
        options: WORK_TYPES,
        columns: 2,
      },
      {
        key: 'work_hours_band',
        kind: 'select',
        label: 'How many hours do they work a day?',
        hint: 'A typical working day is close enough.',
        options: WORK_HOURS,
      },
      {
        key: 'lifestyle_sitting_hours',
        kind: 'select',
        label: 'How many hours do they spend sitting at work?',
        hint: 'A work-day average is close enough.',
        options: SITTING,
      },
      {
        key: 'daily_activity_level',
        kind: 'cards',
        label: 'How active are they outside training?',
        hint: 'Daily movement that is not exercise.',
        options: ACTIVITY_LEVELS,
        columns: 2,
      },
      {
        key: 'job_details',
        kind: 'text',
        label: 'Role details',
        hint: 'Optional. Shifts, responsibilities, or anything the list missed.',
        placeholder: 'e.g. Warehouse team lead, rotating shifts',
        rows: 2,
        maxLength: 2000,
        counted: false,
      },
      {
        key: 'occupation_other_details',
        kind: 'text',
        label: 'Describe their occupation',
        hint: 'Optional. What do they do?',
        placeholder: 'What do they do?',
        rows: 2,
        maxLength: 500,
        showWhen: 'occupationOther',
        counted: false,
      },
    ],
  },
  {
    id: 'training',
    label: 'Training Background',
    prompt: 'What are they bringing with them?',
    hint: 'What they have done before, and what they enjoy doing.',
    icon: Dumbbell,
    controls: [
      {
        key: 'previous_workout_experience',
        kind: 'cards',
        label: 'What is their previous workout experience?',
        hint: 'Their history at intake — not their current programme level.',
        options: EXPERIENCE,
        columns: 2,
      },
      {
        key: 'training_duration',
        kind: 'select',
        label: 'How long have they trained?',
        hint: 'The total time they have stuck with training.',
        options: TRAINING_DURATION,
      },
      {
        key: 'sports_participation',
        kind: 'segmented',
        label: 'Have they played any sports?',
        hint: 'Any sport, at any level.',
        options: SPORTS_PARTICIPATION,
      },
      {
        key: 'sports_played',
        kind: 'search-chips',
        label: 'Which sports have they played?',
        hint: 'Search and choose every sport that applies.',
        options: SPORTS,
      },
      {
        key: 'previous_activities',
        kind: 'chips',
        label: 'What physical activities have they done before?',
        hint: 'Choose everything they have tried.',
        options: ACTIVITIES,
      },
      {
        key: 'exercise_preferences',
        kind: 'chips',
        label: 'What exercise do they prefer?',
        hint: 'Choose what they enjoy or will stick with.',
        options: PREFERENCES,
      },
      {
        key: 'training_history',
        kind: 'text',
        label: 'Training history notes',
        hint: 'Optional. What they did, for how long, and how it went.',
        placeholder: 'e.g. Two years of home workouts, then a long break',
        rows: 2,
        maxLength: 2000,
        counted: false,
      },
      {
        key: 'preferences',
        kind: 'text',
        label: 'Anything they would rather avoid?',
        hint: 'Optional. Injuries, dislikes, or a style they will not do.',
        placeholder: 'e.g. Avoids running and jumping',
        rows: 2,
        maxLength: 1000,
        counted: false,
      },
    ],
  },
  {
    id: 'barriers',
    label: 'Motivation & Barriers',
    prompt: 'What gets in the way, and what pulls them forward?',
    hint: 'The reasons they came, what stops them, and how ready they feel.',
    icon: Flag,
    controls: [
      {
        key: 'fitness_goals',
        kind: 'chips',
        label: 'What are their fitness goals?',
        hint: 'Choose everything they named.',
        options: GOALS,
      },
      {
        key: 'training_challenges',
        kind: 'chips',
        label: 'What are their biggest barriers to exercise?',
        hint: 'Choose everything they mentioned. Missing is unknown, not none.',
        options: CHALLENGES,
      },
      {
        key: 'challenge_other',
        kind: 'text',
        label: 'What else gets in the way?',
        hint: 'Optional. The barrier they named that is not on the list.',
        placeholder: 'Describe it in their words',
        rows: 2,
        maxLength: 500,
        showWhen: 'challengeOther',
        counted: false,
      },
      {
        key: 'motivation_factors',
        kind: 'chips',
        label: 'What motivates them to train?',
        hint: 'Choose everything that matters to them.',
        options: MOTIVATION,
      },
      {
        key: 'programme_readiness',
        kind: 'scale',
        label: 'How ready are they to start a fitness programme?',
        hint: 'Their own number, in their words.',
      },
      {
        key: 'motivation',
        kind: 'text',
        label: 'Anything else about their motivation?',
        hint: 'Optional. What brought them in today, in their words.',
        placeholder: 'e.g. Wedding in six months, doctor advised exercise',
        rows: 2,
        maxLength: 2000,
        counted: false,
      },
      {
        key: 'important_client_statements',
        kind: 'text',
        label: 'In the client’s words',
        hint: 'Optional. One sentence worth remembering exactly.',
        placeholder: 'e.g. "I want to keep up with my kids."',
        rows: 2,
        maxLength: 2000,
        counted: false,
      },
    ],
  },
  {
    id: 'summary',
    label: 'Trainer Summary',
    prompt: 'What should the team remember?',
    hint: 'Your read of the client. This is the only part written by you.',
    icon: NotebookPen,
    controls: [
      {
        key: 'client_attitude',
        kind: 'cards',
        label: 'How would you describe their attitude?',
        hint: 'Your read after the conversation.',
        options: ATTITUDES,
        columns: 2,
      },
      {
        key: 'confidence_level',
        kind: 'segmented',
        label: 'How confident are they?',
        hint: 'About training and sticking with it.',
        options: LEVELS,
      },
      {
        key: 'commitment_level',
        kind: 'segmented',
        label: 'How committed are they?',
        hint: 'What they are ready to put in.',
        options: COMMITMENT,
      },
      {
        key: 'coaching_preference',
        kind: 'segmented',
        label: 'What coaching style suits them?',
        hint: 'How they want to be pushed and supported.',
        options: COACHING,
      },
      {
        key: 'initial_training_level',
        kind: 'segmented',
        label: 'What level should they start at?',
        hint: 'Your starting prescription — not their history.',
        options: TRAINING_LEVELS,
      },
      {
        key: 'notes',
        kind: 'text',
        label: 'Trainer observation',
        hint: 'Optional. What the next trainer needs to know.',
        placeholder: 'What should the team remember?',
        rows: 4,
        maxLength: 2000,
        counted: false,
      },
    ],
  },
] as const;

// Every field the save may write, in screen order. `occupation_type` is not a
// control of its own — the occupation picker writes it — but it is canonical
// and must be diffed like any other field or the category would never update.
export const INTERVIEW_FIELDS: readonly InterviewField[] = [
  ...INTERVIEW_SECTIONS.flatMap((section) => section.controls.map((control) => control.key)),
  'occupation_type',
];

/** The counted questions, in screen order. */
export const INTERVIEW_QUESTIONS: readonly InterviewControl[] = INTERVIEW_SECTIONS
  .flatMap((section) => section.controls)
  .filter((control) => control.counted !== false);

/** Older answers the form no longer asks, shown as history only. */
export const LEGACY_ANSWERS: readonly { key: TextField; label: string }[] = [
  { key: 'lifestyle_meal_regularity', label: 'Meal regularity' },
  { key: 'lifestyle_training_days', label: 'Days a week they could train' },
  { key: 'availability', label: 'When they could train' },
];

/** The category a chosen occupation title writes. */
export function occupationTypeFor(title: string): string {
  return OCCUPATIONS.find((option) => option.value === title)?.occupationType ?? '';
}

/** A legacy occupation_type as the generic choice the picker can show. */
export function occupationTitleForType(type: string): string {
  return OCCUPATION_GENERIC[type] ?? '';
}

/** '' is "not answered" for text; [] is "not answered" for a chip list. */
export function controlAnswered(value: string | string[]): boolean {
  return Array.isArray(value) ? value.length > 0 : value.trim() !== '';
}

export function isControlVisible(
  control: InterviewControl,
  answers: Answers,
): boolean {
  if (control.showWhen === 'occupationOther') return answers.occupation_type === 'other';
  if (control.showWhen === 'challengeOther') return answers.training_challenges.includes('other');
  return true;
}

export function visibleControls(
  section: InterviewSection,
  answers: Answers,
): InterviewControl[] {
  return section.controls.filter((control) => isControlVisible(control, answers));
}

/** Answered controls out of the ones currently on screen. */
export function answeredCount(answers: Answers): { answered: number; total: number } {
  let answered = 0;
  let total = 0;
  for (const section of INTERVIEW_SECTIONS) {
    for (const control of visibleControls(section, answers)) {
      if (control.counted === false) continue;
      total += 1;
      if (controlAnswered(answers[control.key])) answered += 1;
    }
  }
  return { answered, total };
}

export function sectionAnswered(
  section: InterviewSection,
  answers: Answers,
): { answered: number; total: number } {
  const controls = visibleControls(section, answers)
    .filter((control) => control.counted !== false);
  return {
    answered: controls.filter((c) => controlAnswered(answers[c.key])).length,
    total: controls.length,
  };
}

/** The first section with an unanswered counted question, or 0. */
export function firstIncompleteSection(answers: Answers): number {
  const index = INTERVIEW_SECTIONS.findIndex((section) => {
    const progress = sectionAnswered(section, answers);
    return progress.total > 0 && progress.answered < progress.total;
  });
  return index === -1 ? 0 : index;
}

const EMPTY_TEXT = Object.fromEntries(TEXT_FIELDS.map((key) => [key, ''])) as Record<TextField, string>;
const EMPTY_ARRAYS = Object.fromEntries(ARRAY_FIELDS.map((key) => [key, [] as string[]])) as Record<ArrayField, string[]>;

export const EMPTY_ANSWERS: Answers = { ...EMPTY_TEXT, ...EMPTY_ARRAYS };

/**
 * The saved record as the values the controls hold. Postgres returns NUMERIC
 * values with a scale — NUMERIC(4,1) reads '7.0' for the 7 that was stored —
 * so trailing zeros are trimmed for numeric columns only, before a select has
 * to match its option. Free text is never rewritten.
 */
export function answersFrom(row: Record<string, unknown> | null): Answers {
  const base: Answers = { ...EMPTY_ANSWERS, ...EMPTY_ARRAYS };
  if (!row) return base;
  const numeric = new Set(['lifestyle_sitting_hours', 'programme_readiness', 'lifestyle_training_days']);
  for (const key of TEXT_FIELDS) {
    const raw = row[key];
    base[key] = raw == null
      ? ''
      : numeric.has(key) ? String(raw).replace(/\.0+$/, '') : String(raw);
  }
  for (const key of ARRAY_FIELDS) {
    const raw = row[key];
    base[key] = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
  }
  if (!base.occupation_title && base.occupation_type) {
    base.occupation_title = occupationTitleForType(base.occupation_type);
  }
  return base;
}

/** The labels for a stored key list, for review and the profile snapshot. */
export function optionLabels(
  options: readonly InterviewOption[],
  values: readonly string[],
): string[] {
  const byValue = new Map(options.map((option) => [option.value, option.label]));
  return values.map((value) => byValue.get(value) ?? value);
}

/** Barrier labels for the read-only profile snapshot. */
export function challengeLabels(values: readonly string[]): string[] {
  return optionLabels(CHALLENGES, values);
}

/** One answer as a person reads it. */
export function answerText(
  control: InterviewControl,
  value: string | string[],
  answers?: Answers,
): string {
  if (Array.isArray(value)) {
    return control.kind === 'chips' || control.kind === 'search-chips'
      ? optionLabels(control.options, value).join(', ')
      : value.join(', ');
  }
  if (control.kind === 'text') return value;
  if (control.kind === 'scale') return value ? `${value} / 10` : '';
  if (control.kind === 'occupation') {
    return value || (answers ? occupationTitleForType(answers.occupation_type) : '');
  }
  if ('options' in control) {
    return control.options.find((option) => option.value === value)?.label ?? value;
  }
  return value;
}
