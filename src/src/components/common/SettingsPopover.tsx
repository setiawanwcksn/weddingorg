import React from "react";

/* =========================
 * ConfirmModal (pure UI)
 * ========================= */
export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

/* =========================
 * SettingsDropdown (pure UI)
 * ========================= */
export type SettingsDropdownProps = {
  open: boolean;
  source?: string;                 // label kecil buat debug
  onClose: () => void;

  // aksi di-emit ke parent (caller akan panggil API):
  onRequestDeleteAll: () => void;
  onDownloadQr: () => void;
  onBlast: () => void;
};

export function SettingsDropdown({
  open,
  source,
  onClose,
  onRequestDeleteAll,
  onDownloadQr,
  onBlast,
}: SettingsDropdownProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose]);

  if (!open) return null;

  const baseBtn =
    "w-full rounded-lg px-4 py-3 text-center text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  const violet = "bg-[#7A6EF6] hover:bg-[#6b5df2]";

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-white shadow-lg z-50"
      role="menu"
      aria-label="SETTING"
    >
      <div className="p-4 border-b border-border">
        <div className="text-xs font-semibold tracking-wide text-text">SETTING</div>        
      </div>

      <div className="p-4 space-y-3">
        <button
          type="button"
          className={`${baseBtn} ${violet}`}
          onClick={() => {
            onClose();
            onRequestDeleteAll();
          }}
        >
          Delete All
        </button>

        <button
          type="button"
          className={`${baseBtn} ${violet}`}
          onClick={() => {
            onClose();
            onDownloadQr();
          }}
        >
          Download QR-Code
        </button>

        <button
          type="button"
          className={`${baseBtn} ${violet}`}
          onClick={() => {
            onClose();
            onBlast();
          }}
        >
          WhatsApp Blast
        </button>
      </div>
    </div>
  );
}
