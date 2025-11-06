import React from 'react';
import { Home, Package, Gift, Ticket, QrCode } from 'lucide-react';

export type BottomKey = 'home' | 'souvenir' | 'checkin' | 'gift' | 'doorprize';

export interface BottomBarProps {
  active?: BottomKey;
  onSelect?: (key: BottomKey) => void;
  variant?: 'floating' | 'inline';
}

function Item({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 focus:outline-none transition-transform active:scale-95"
    >
      <span className={active ? 'text-primary' : 'text-gray-400'}>{icon}</span>
      <span
        className={`text-xs font-medium ${
          active ? 'text-primary' : 'text-gray-500'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export function BottomBar({
  active = 'checkin',
  onSelect,
  variant = 'inline',
}: BottomBarProps): JSX.Element {
  const isFloating = variant === 'floating';

  const navItems: Array<{ key: BottomKey; label: string; icon: React.ReactNode }> = [
    { key: 'home', label: 'Home', icon: <Home className="w-6 h-6" /> },
    { key: 'souvenir', label: 'Souvenir', icon: <Package className="w-6 h-6" /> },
    { key: 'gift', label: 'Gift', icon: <Gift className="w-6 h-6" /> },
    { key: 'doorprize', label: 'Doorprize', icon: <Ticket className="w-6 h-6" /> },
  ];

  return (
    <div
      className={
        isFloating
          ? 'left-1/2 -translate-x-1/2 w-[94%] max-w-[640px] z-40'
          : 'left-0 right-0 w-full z-40 flex justify-center bg-transparent'
      }
    >
      <div className="relative w-[94%] max-w-[640px] bg-white border border-gray-200 rounded-[22px] shadow-md px-6 pt-8 pb-4 backdrop-blur-md">
        {/* Check-in button (center floating) */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center">
          <button
            type="button"
            aria-label="Check-in"
            onClick={() => onSelect?.('checkin')}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ring-4 ring-white ${
              active === 'checkin'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            <QrCode className="w-6 h-6" />
          </button>
        </div>

        {/* Bottom items */}
        <div className="grid grid-cols-4 gap-3 mt-2">
          {navItems.map((item) => (
            <Item
              key={item.key}
              label={item.label}
              icon={item.icon}
              active={active === item.key}
              onClick={() => onSelect?.(item.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
