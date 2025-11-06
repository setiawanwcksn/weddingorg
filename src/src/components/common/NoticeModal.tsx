/**
 * NoticeModal component
 * A simple, accessible modal used to present important notices across pages.
 * It renders a centered dialog with semantic design tokens and handles close via overlay or button.
 */
import React from 'react';

export interface NoticeModalProps {
  open: boolean;
  title?: string;
  confirmLabel?: string;
  onClose: () => void;
  children?: React.ReactNode;
}

export function NoticeModal({ open, title, confirmLabel = 'OK', onClose, children }: NoticeModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Dialog */}
      <div className="relative min-h-full w-full flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-lg rounded-xl bg-background shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
          {title && (
            <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border">
              <h3 className="text-lg sm:text-xl font-semibold text-text">{title}</h3>
            </div>
          )}
          <div className="px-4 sm:px-6 py-4 sm:py-5 text-sm sm:text-base text-text/80 leading-relaxed">
            {children}
          </div>
          <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-primary text-background text-sm sm:text-base font-medium shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary transition-opacity min-h-[44px]"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
