/**
 * Toast notification component
 * Shows temporary success/error messages with auto-dismiss functionality
 */
import React from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps): JSX.Element {
  React.useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type];

  const icon = {
    success: '✓',
    error: '✕',
    info: 'i'
  }[type];

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 rounded-lg ${bgColor} text-white px-4 py-3 shadow-lg animate-slide-in`}>
      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
        {icon}
      </div>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/80 hover:text-white">
        ✕
      </button>
    </div>
  );
}