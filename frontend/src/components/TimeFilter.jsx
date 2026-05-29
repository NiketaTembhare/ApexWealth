import React from 'react';
import { Calendar } from 'lucide-react';

const FILTERS = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
];

export default function TimeFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-bank-textMuted flex-shrink-0" />
      <div className="flex bg-bank-bg border border-bank-cardBorder rounded-xl p-1 gap-1">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
              value === f.id
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-sm'
                : 'text-bank-textMuted hover:text-bank-textActive hover:bg-bank-card/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
