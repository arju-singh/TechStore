"use client";

export default function InvoicePrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 print:hidden"
    >
      Print / Save PDF
    </button>
  );
}
