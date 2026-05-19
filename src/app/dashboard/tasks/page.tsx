'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronRight,
  Circle, Clock, Flag, GripVertical, KanbanSquare,
  LayoutDashboard, LayoutList, Plus, User, X,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import Guard from '@/components/Guard';
import { cn } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────
type Priority = 'critical' | 'high' | 'medium' | 'low';
type Status   = 'todo' | 'in_progress' | 'review' | 'done';
type ViewMode = 'kanban' | 'list';

interface Task {
  id: string;
  title: string;
  category: string;
  priority: Priority;
  status: Status;
  assignee?: string;
  due?: string;
  tags?: string[];
}

// ─── Mock tasks ───────────────────────────────────────────────
const TASKS: Task[] = [
  { id:'t1',  title:'Send renewal WhatsApp to 14 expiring members', category:'Member',     priority:'critical', status:'todo',        assignee:'Rahul',    due:'Today',     tags:['urgent','crm'] },
  { id:'t2',  title:'Collect ₹42,000 outstanding dues',             category:'Finance',    priority:'critical', status:'in_progress', assignee:'Admin',    due:'Today',     tags:['finance'] },
  { id:'t3',  title:'Repair treadmill #3 — belt slipping',          category:'Maintenance',priority:'high',     status:'todo',        assignee:'Suresh',   due:'Tomorrow',  tags:['equipment'] },
  { id:'t4',  title:'Review Priya Mehta\'s 3-month progress',       category:'PT',         priority:'high',     status:'in_progress', assignee:'Trainer',  due:'Today',     tags:['pt'] },
  { id:'t5',  title:'Approve new Gold plan pricing',                category:'Admin',      priority:'high',     status:'review',      assignee:'Admin',    due:'This week', tags:['plans'] },
  { id:'t6',  title:'Update CCTV footage archive',                  category:'Operations', priority:'medium',   status:'todo',        assignee:'Suresh',   due:'This week', tags:['ops'] },
  { id:'t7',  title:'Follow up on 6 trial conversion leads',        category:'Sales',      priority:'medium',   status:'in_progress', assignee:'Sales',    due:'This week', tags:['sales'] },
  { id:'t8',  title:'Print new membership cards batch',             category:'Admin',      priority:'medium',   status:'review',      assignee:'Admin',    due:'This week', tags:['admin'] },
  { id:'t9',  title:'Monthly P&L review with management',           category:'Finance',    priority:'high',     status:'todo',        assignee:'Admin',    due:'This week', tags:['finance'] },
  { id:'t10', title:'Replace 5 broken dumbbell collars',            category:'Maintenance',priority:'low',      status:'done',        assignee:'Suresh',   due:'Done',      tags:['equipment'] },
  { id:'t11', title:'Create June offer campaigns on WhatsApp',      category:'Marketing',  priority:'medium',   status:'done',        assignee:'Admin',    due:'Done',      tags:['marketing'] },
  { id:'t12', title:'Onboard 2 new trainers — orientation done',    category:'HR',         priority:'low',      status:'done',        assignee:'Admin',    due:'Done',      tags:['hr'] },
];

const PRIORITY_CONFIG: Record<Priority, { label:string; color:string; dot:string; flag:string }> = {
  critical: { label:'Critical', color:'text-rose-700',   dot:'bg-rose-500',   flag:'text-rose-500' },
  high:     { label:'High',     color:'text-amber-700',  dot:'bg-amber-500',  flag:'text-amber-500' },
  medium:   { label:'Medium',   color:'text-sky-700',    dot:'bg-sky-500',    flag:'text-sky-500' },
  low:      { label:'Low',      color:'text-slate-500',  dot:'bg-slate-400',  flag:'text-slate-400' },
};

const STATUS_COLUMNS: { id: Status; label: string; color: string; bg: string }[] = [
  { id:'todo',        label:'To Do',       color:'text-slate-600',  bg:'bg-slate-100' },
  { id:'in_progress', label:'In Progress', color:'text-violet-700', bg:'bg-violet-100' },
  { id:'review',      label:'Review',      color:'text-amber-700',  bg:'bg-amber-100' },
  { id:'done',        label:'Done',        color:'text-emerald-700',bg:'bg-emerald-100' },
];

// ─── Page ─────────────────────────────────────────────────────
export default function TasksPage() {
  return (
    <Guard>
      <TasksContent />
    </Guard>
  );
}

function TasksContent() {
  const [tasks, setTasks] = React.useState<Task[]>(TASKS);
  const [view, setView] = React.useState<ViewMode>('kanban');
  const [filterPriority, setFilterPriority] = React.useState<Priority|'all'>('all');
  const [showNewTask, setShowNewTask] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');

  const filtered = tasks.filter(t =>
    filterPriority === 'all' || t.priority === filterPriority
  );

  const byStatus = (s: Status) => filtered.filter(t => t.status === s);

  const stats = {
    total: tasks.length,
    done:  tasks.filter(t => t.status === 'done').length,
    critical: tasks.filter(t => t.priority === 'critical' && t.status !== 'done').length,
  };

  const toggleDone = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t
    ));
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    const newTask: Task = {
      id: `t${Date.now()}`,
      title: newTitle.trim(),
      category: 'Admin',
      priority: 'medium',
      status: 'todo',
      assignee: 'Admin',
      due: 'This week',
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTitle('');
    setShowNewTask(false);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">

        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-400 pt-4">
          <LayoutDashboard size={12} />
          <Link href="/dashboard" className="hover:text-slate-700 transition-colors">Dashboard</Link>
          <ChevronRight size={10} />
          <span className="text-slate-700 font-medium">Tasks</span>
        </nav>

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tasks</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {stats.done}/{stats.total} complete
              {stats.critical > 0 && (
                <span className="ml-2 text-rose-600 font-semibold">· {stats.critical} critical open</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <button onClick={() => setView('kanban')}
                className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  view==='kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
                <KanbanSquare size={13}/> Kanban
              </button>
              <button onClick={() => setView('list')}
                className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  view==='list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
                <LayoutList size={13}/> List
              </button>
            </div>
            <button onClick={() => setShowNewTask(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-violet-700 shadow-sm shadow-violet-200 transition-all">
              <Plus size={13}/> New Task
            </button>
          </div>
        </header>

        {/* New task modal */}
        {showNewTask && (
          <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50/80 p-4">
            <div className="flex items-center gap-3">
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter') addTask(); if(e.key==='Escape') setShowNewTask(false); }}
                placeholder="Task title… (Enter to save, Esc to cancel)"
                className="flex-1 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
              />
              <button onClick={addTask} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-colors">Add</button>
              <button onClick={() => setShowNewTask(false)} className="text-slate-400 hover:text-slate-700"><X size={16}/></button>
            </div>
          </div>
        )}

        {/* Priority filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {(['all','critical','high','medium','low'] as const).map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all',
                filterPriority === p
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600'
              )}>
              {p === 'all' ? `All (${tasks.length})` : p}
            </button>
          ))}
        </div>

        {/* Kanban view */}
        {view === 'kanban' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {STATUS_COLUMNS.map(col => (
              <div key={col.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('rounded-lg px-2.5 py-1 text-xs font-bold', col.bg, col.color)}>
                    {col.label}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{byStatus(col.id).length}</span>
                </div>
                <div className="space-y-2">
                  {byStatus(col.id).map(task => (
                    <KanbanCard key={task.id} task={task} onToggle={() => toggleDone(task.id)} />
                  ))}
                  {byStatus(col.id).length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center">
                      <p className="text-xs text-slate-400">Nothing here</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List view */}
        {view === 'list' && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Task</span><span>Priority</span><span>Status</span><span>Assignee</span><span>Due</span>
            </div>
            {filtered.map(task => (
              <div key={task.id}
                className="grid grid-cols-[1fr,auto,auto,auto,auto] items-center gap-4 px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => toggleDone(task.id)}
                    className={cn('shrink-0 transition-colors', task.status==='done' ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-500')}>
                    {task.status === 'done' ? <CheckCircle2 size={16}/> : <Circle size={16}/>}
                  </button>
                  <span className={cn('text-sm font-medium truncate', task.status==='done' && 'line-through text-slate-400')}>{task.title}</span>
                </div>
                <span className={cn('flex items-center gap-1 text-xs font-semibold', PRIORITY_CONFIG[task.priority].color)}>
                  <Flag size={11} className={PRIORITY_CONFIG[task.priority].flag} />{PRIORITY_CONFIG[task.priority].label}
                </span>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  task.status==='done'        ? 'bg-emerald-50 text-emerald-700' :
                  task.status==='in_progress' ? 'bg-violet-50 text-violet-700' :
                  task.status==='review'      ? 'bg-amber-50 text-amber-700' :
                                               'bg-slate-100 text-slate-600'
                )}>
                  {task.status.replace('_',' ')}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <User size={11} />{task.assignee}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={11} />{task.due}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </AppShell>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────
function KanbanCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const p = PRIORITY_CONFIG[task.priority];
  return (
    <div className={cn(
      'group rounded-2xl bg-white border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4',
      task.status === 'done' ? 'border-emerald-100 opacity-70' : 'border-slate-100'
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={cn('flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide', p.color)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', p.dot)} />
          {p.label}
        </span>
        <button onClick={onToggle}
          className={cn('shrink-0 transition-colors', task.status==='done' ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500')}>
          <CheckCircle2 size={15}/>
        </button>
      </div>
      <p className={cn('text-sm font-medium text-slate-800 leading-snug mb-3', task.status==='done' && 'line-through text-slate-400')}>
        {task.title}
      </p>
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{task.category}</span>
        <div className="flex items-center gap-1.5">
          {task.assignee && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <User size={10}/>{task.assignee}
            </span>
          )}
          {task.due && task.due !== 'Done' && (
            <span className={cn('flex items-center gap-1 text-[10px] font-medium',
              task.due==='Today' ? 'text-rose-600' : 'text-slate-400')}>
              <CalendarDays size={10}/>{task.due}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
