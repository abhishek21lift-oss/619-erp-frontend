/** Shared public types for the landing page data fetched from the live API. */

export type PublicPlan = {
  code: string;
  name: string;
  price_inr: number;
  effective_price_inr: number;
  is_launch: boolean;
  duration_months: number;
  client_limit: number | null;
  best_for: string | null;
};

export type PublicStats = {
  studios: number;
  trainers: number;
  active_clients: number;
  sessions_completed: number;
};