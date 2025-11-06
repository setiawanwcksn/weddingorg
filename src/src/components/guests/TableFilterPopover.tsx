/**
 * TableFilterPopover component
 * Renders a popover panel with toggle switches to control table column visibility on the Kelola Tamu page.
 * It receives options and callbacks from the parent (ManageGuests) and focuses solely on UI + interaction.
 */
import React from 'react';

export interface TableFilterOption {
  key: string;
  label: string;
  checked: boolean;
}

export interface TableFilterPopoverProps {
  open: boolean;
  options: TableFilterOption[];
  onToggle: (key: string) => void;
  onToggleAll: (checked: boolean) => void;
  onClose: () => void;
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-border'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function TableFilterPopover({ open, options, onToggle, onToggleAll, onClose }: TableFilterPopoverProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handle(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (ref.current && !ref.current.contains(target)) onClose();
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose]);

  const allOn = options.length > 0 && options.every(o => o.checked);

  if (!open) return null;
  return (
    <div ref={ref} className="absolute right-0 mt-2 w-48 sm:w-56 md:w-64 rounded-xl border border-border bg-white shadow-lg z-50">
      <div className="p-2 sm:p-3 border-b border-border">
        <div className="text-xs font-semibold tracking-wide text-text">FILTER TABEL</div>
      </div>
      <div className="max-h-48 sm:max-h-64 md:max-h-80 overflow-auto p-1 sm:p-2 space-y-1 sm:space-y-2">
        <div className="flex items-center justify-between px-2 py-1 sm:py-2 rounded-lg hover:bg-accent">
          <span className="text-xs sm:text-sm text-text">Tampilkan Semua</span>
          <Switch checked={allOn} onChange={() => onToggleAll(!allOn)} />
        </div>
        <div className="h-px bg-border" />
        {options.map(opt => (
          <div key={opt.key} className="flex items-center justify-between px-2 py-1 sm:py-2 rounded-lg hover:bg-accent">
            <span className="text-xs sm:text-sm text-text">{opt.label}</span>
            <Switch checked={opt.checked} onChange={() => onToggle(opt.key)} />
          </div>
        ))}
      </div>
    </div>
  );
}
