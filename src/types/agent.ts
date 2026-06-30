// Agent system types

export type AgentTaskStatus =
  | 'pending'
  | 'planning'
  | 'awaiting_confirmation'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentTask = {
  id: string;
  input_text: string;
  parsed_intent: string | null;
  status: AgentTaskStatus;
  plan: AgentPlan | null;
  result: AgentResult | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

export type AgentPlan = {
  summary: string;
  steps: AgentStep[];
  actions: AgentAction[];
  confirmationToken: string;
  taskId: string;
};

export type AgentStep = {
  order: number;
  department: string;
  action: string;
  entities: Record<string, unknown>;
  depends_on: number[];
  is_write: boolean;
};

export type AgentAction = {
  type: 'write' | 'read' | 'error';
  description: string;
  tool?: string;
  params?: Record<string, unknown>;
  department?: string;
};

export type AgentResult = {
  status: 'completed' | 'failed';
  results?: AgentDeptResult[];
  summary: string;
  taskId: string;
};

export type AgentDeptResult = {
  department: string;
  status: 'completed' | 'failed' | 'skipped';
  summary?: string;
  result?: unknown;
  error?: string;
};

export type AgentAuditEntry = {
  agent_name: string;
  tool_name: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  params: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: 'success' | 'failed' | 'skipped' | 'pending';
  error_message: string | null;
  created_at: string;
};

// SSE event discriminated union
export type AgentSSEEvent =
  | { event: 'start';                  taskId: string; message: string }
  | { event: 'thinking';               message: string }
  | { event: 'action_result';          department: string; summary: string; error?: boolean }
  | { event: 'requires_confirmation';  plan: AgentPlan; confirmationToken: string }
  | { event: 'done';                   status: string; summary?: string; results?: AgentDeptResult[]; taskId?: string }
  | { event: 'error';                  message: string; code?: string };
