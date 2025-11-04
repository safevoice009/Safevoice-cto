import { Menu, SortDesc } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type CommunitySortOption = 'active' | 'new' | 'members';

interface CommunitySortMenuProps {
  value: CommunitySortOption;
  onChange: (value: CommunitySortOption) => void;
}

const SORT_LABELS: Record<CommunitySortOption, string> = {
  active: 'Most Active',
  new: 'Newest',
  members: 'Most Members',
};

export default function CommunitySortMenu({ value, onChange }: CommunitySortMenuProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (option: CommunitySortOption) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-200 transition-all hover:bg-white/10"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <SortDesc className="h-4 w-4" aria-hidden />
        <span>{SORT_LABELS[value]}</span>
        <Menu className="h-4 w-4 text-gray-400" aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-lg border border-white/5 bg-slate-950/90 shadow-xl backdrop-blur"
            role="listbox"
          >
            {(Object.keys(SORT_LABELS) as CommunitySortOption[]).map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`
                    flex w-full items-center justify-between px-3 py-2 text-sm transition-colors
                    ${
                      value === option
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }
                  `}
                  role="option"
                  aria-selected={value === option}
                >
                  {SORT_LABELS[option]}
                  {value === option && <span className="text-xs text-primary">Selected</span>}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
