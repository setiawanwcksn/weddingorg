/**
 * ToggleSwitch Component
 * Custom toggle switch that matches the provided design (check when on, X when off)
 * Used in permission management and settings forms. Accessible and keyboard-friendly.
 */

import React from 'react';
import { Check, X } from 'lucide-react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  id?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  id,
}) => {
  // Track/knob sizes aligned so the knob rests flush with 4px (1) padding
  const cfg = {
    sm: { track: 'w-9 h-5', knob: 'w-4 h-4', translate: 'translate-x-4', icon: 'w-3 h-3' },
    md: { track: 'w-11 h-6', knob: 'w-5 h-5', translate: 'translate-x-5', icon: 'w-3.5 h-3.5' },
    lg: { track: 'w-14 h-7', knob: 'w-6 h-6', translate: 'translate-x-7', icon: 'w-4 h-4' },
  } as const;

  const handleToggle = () => {
    if (!disabled) onChange(!checked);
  };

  const { track, knob, translate, icon } = cfg[size];

  return (
    <div className="flex items-center space-x-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        id={id}
        onClick={handleToggle}
        disabled={disabled}
        className={`relative inline-flex ${track} flex-shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${checked ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--text)/0.25)]'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Icons inside the track (check when on at left, X when off at right) */}
        <span className={`absolute left-2 top-1/2 -translate-y-1/2 transition-opacity ${icon} ${checked ? 'opacity-100' : 'opacity-0'}`}>
          <Check className={` ${icon} text-[hsl(var(--background))]`} />
        </span>
        <span className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity ${icon} ${!checked ? 'opacity-70' : 'opacity-0'}`}>
          <X className={` ${icon} text-[hsl(var(--text)/0.6)]`} />
        </span>

        {/* Knob */}
        <span
          className={`pointer-events-none absolute top-1 left-1 inline-block ${knob} transform rounded-full bg-accent shadow-md ring-0 transition-transform duration-300 ease-out ${checked ? translate : 'translate-x-0'}`}
        />
      </button>
      {label && (
        <label
          htmlFor={id}
          className={`text-sm font-medium text-text cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleToggle}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default ToggleSwitch;