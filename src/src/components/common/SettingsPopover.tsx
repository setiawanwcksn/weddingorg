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

export function ConfirmModal({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  loading,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onCancel]);

  if (!open) return null;

  const dangerBtn = "bg-red-600 hover:bg-red-700";
  const primaryBtn = "bg-[#7A6EF6] hover:bg-[#6b5df2]";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-[101] w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="px-6 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description ? <div className="mt-2 text-sm text-gray-600">{description}</div> : null}
        </div>
        <div className="px-6 py-5 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={!!loading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={!!loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
              variant === "danger" ? dangerBtn : primaryBtn
            } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

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
