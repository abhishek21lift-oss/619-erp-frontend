'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import {
  CheckSquare, Plus, ChevronRight, Filter, Search,
  Calendar, List, Columns, Grid, Flag, User, Clock,
  MoreHorizontal, CircleDashed, CircleCheck, Circle,
  AlertTriangle, ArrowUpRight, Zap, Tag
} from 'lucide-react';

/* ─── types ───────────────────────────────────────────────── */
type Status = 'todo' | 'in-progress' | 'done';
type Priority = 'urgent' | 'high' | 'medium' | 'low';
type View = 'kanban' | 'list';

interface Task {
  id: string;
  title: string;
  desc?: string;
  status: Status;
  priority: Priority;
  assignee: string;
  due: string;
  category: string;
  tags: string[];
}

/* ─── mock data ───────────────────────────────────────────── */
const TASKS: Task[] = [
  { id:'t1', title:'Follow up with Ankit Joshi renewal', desc:'Membership expires in 2 days. Call and offer discount.', status:'todo', priority:'urgent', assignee:'Vikram', due:'Today', category:'Renewal', tags:['Follow-up','Revenue'] },
  { id:'t2', title:'Fix treadmill #3 belt', desc:'Member reported slipping. Needs maintenance check.', status:'todo', priority:'high', assignee:'Staff', due:'Today', category:'Maintenance', tags:['Equipment'] },
  { id:'t3', title:'Collect dues from 8 members', desc:'Total: ₹38,400 outstanding. Send WhatsApp reminders.', status:'in-progress', priority:'urgent', assignee:'Sneha', due:'Today', category:'Finance', tags:['Dues','Finance'] },
  { id:'t4', title:'Update diet plans for PT batch', desc:'3 clients need updated macro targets for June.', status:'in-progress', priority:'medium', assignee:'Nisha', due:'Tomorrow', category:'Training', tags:['PT','Nutrition'] },
  { id:'t5', title:'Review new trainer applications', desc:'2 applicants pending HR review from last week.', status:'todo', priority:'medium', assignee:'Admin', due:'23 May', category:'HR', tags:['Staff'] },
  { id:'t6', title:'Approve April expense report', desc:'Pending sign-off from management.', status:'in-progress', priority:'high', assignee:'Admin', due:'Today', category:'Finance', tags:['Approval'] },
  { id:'t7', title:'Send birthday messages', desc:'5 members have birthdays this week.', status:'done', priority:'low', assignee:'Sneha', due:'Done', category:'Engagement', tags:['CRM'] },
  { id:'t8', title:'Post workout content reel', desc:'619 weekly reel — legs day theme.', status:'done', priority:'medium', assignee:'Admin', due:'Done', category:'Marketing', tags:['Social'] },
  { id:'t9', title:'Schedule AC maintenance', desc:'Annual servicing due for main hall units.', status:'todo', priority:'low', assignee:'Staff', due:'26 May', category:'Maintenance', tags:['Facility'] },
  { id:'t10', title:'Onboard 3 new PT clients', desc:'Walk-throughs scheduled for this week.', status:'in-progress', priority:'high', assignee:'Vikram', due:'Tomorrow', category:'Training', tags:['PT','New'] },
];

const COLS: { id: Status; label: string; icon: React.ElementType; color: string; count: number }[] = [
  { id:'todo',        label:'To Do',      icon:CircleDashed, color:'text-slate-500', count: TASKS.filter(t=>t.status==='todo').length },
  { id:'in-progress', label:'In Progress',icon:Circle,       color:'text-amber-500', count: TASKS.filter(t=>t.status==='in-progress').length },
  { id:'done',        label:'Done',       icon:CircleCheck,  color:'text-emerald-500', count: TASKS.filter(t=>t.status==='done').length },
];

const PCOLORS: Record<Priority, string> = {
  urgent:'bg-rose-100 text-rose-700 border-rose-200',
  high:  'bg-orange-100 text-orange-700 border-orange-200',
  medium:'bg-amber-100 text-amber-700 border-amber-200',
  low:   'bg-slate-100 text-slate-500 border-slate-200',
};

/* ─── component ───────────────────────────────────────────── */
export default function TasksPage() {
  const [view, setView] = useState<View>('kanban');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');

  const filtered = TASKS.filter(t =>
    (filterPriority === 'all' || t.priority === filterPriority) &&
    (t.title.toLowerCase().includes(search.toLowerCase()) ||
     t.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/80 px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Link href="/dashboard" className="hover:text-slate-700 transition-colors">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700">Tasks</span>
          </nav>

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                  <CheckSquare className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Tasks</h1>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{TASKS.filter(t=>t.status!=='done').length} open</span>
              </div>
              <p className="text-sm text-slate-500">Internal operations management · 619 Fitness Studio</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all shadow-md">
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Priority filter */}
              {(['all','urgent','high','medium','low'] as (Priority | 'all')[]).map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                    filterPriority === p ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
              {/* View toggle */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setView('kanban')}
                  className={`p-2 transition-colors ${view==='kanban' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                  title="Kanban view"
                >
                  <Columns className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 transition-colors ${view==='list' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Kanban View */}
          {view === 'kanban' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {COLS.map(col => (
                <div key={col.id} className="bg-slate-50/80 rounded-2xl border border-slate-200/80 overflow-hidden">
                  {/* Column header */}
                  <div className="px-4 py-3 border-b border-slate-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <col.icon className={`w-4 h-4 ${col.color}`} />
                      <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 w-6 h-6 rounded-full flex items-center justify-center">{filtered.filter(t=>t.status===col.id).length}</span>
                  </div>
                  {/* Cards */}
                  <div className="p-3 space-y-2 min-h-[200px]">
                    {filtered.filter(t => t.status === col.id).map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {view === 'list' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Task','Category','Priority','Assignee','Due',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(task => (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {task.status === 'done' ? <CircleCheck className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> :
                           task.status === 'in-progress' ? <Circle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" /> :
                           <CircleDashed className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />}
                          <div>
                            <p className={`text-sm font-medium ${task.status==='done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
                            {task.desc && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.desc}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{task.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${PCOLORS[task.priority]}`}>{task.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-600">{task.assignee[0]}</span>
                          </div>
                          <span className="text-xs text-slate-600">{task.assignee}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${
                          task.due === 'Today' ? 'text-rose-600' :
                          task.due === 'Tomorrow' ? 'text-amber-600' :
                          task.due === 'Done' ? 'text-emerald-600' : 'text-slate-500'
                        }`}>{task.due}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-slate-100">
                          <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </AppShell>
    </Guard>
  );
}

/* ─── TaskCard ─────────────────────────────────────────────── */
function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-sm font-medium leading-snug ${
          task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'
        }`}>{task.title}</p>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
      {task.desc && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{task.desc}</p>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${PCOLORS[task.priority]}`}>
            {task.priority}
          </span>
          <span className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">{task.category}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-600">{task.assignee[0]}</span>
          </div>
          <span className={`text-xs font-medium ${
            task.due === 'Today' ? 'text-rose-500' :
            task.due === 'Tomorrow' ? 'text-amber-500' :
            task.due === 'Done' ? 'text-emerald-500' : 'text-slate-400'
          }`}>{task.due}</span>
        </div>
      </div>
    </div>
  );
}
