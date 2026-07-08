"use client";

/** Download a CSV built from rows client-side. No server round-trip needed. */
export default function ExportCsvButton({
  filename,
  headers,
  rows,
  label = "Download CSV",
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  label?: string;
}) {
  function download() {
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-white/70 hover:bg-white/5"
    >
      ↓ {label}
    </button>
  );
}
