'use client';

import { clsx } from 'clsx';

type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
};

type PremiumTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
};

export function PremiumTable<T>({ columns, data, keyExtractor, emptyMessage = 'No data' }: PremiumTableProps<T>) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center py-12 text-[13px] text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-[10.5px] font-[700] uppercase tracking-[0.06em] text-slate-400"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="border-b border-slate-50 transition-colors hover:bg-slate-50/50"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-[12.5px]">
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
