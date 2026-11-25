const STYLES = {
  error: { box: 'border-danger-line bg-danger-soft text-danger', icon: '✕', label: 'Error' },
  success: { box: 'border-success-line bg-success-soft text-success', icon: '✓', label: 'Success' },
  warning: { box: 'border-warning-line bg-warning-soft text-warning', icon: '!', label: 'Notice' },
  info: { box: 'border-line bg-brand-soft text-ink', icon: 'i', label: 'Info' },
};

/** Status message. Uses an icon + label as well as colour so colour is never the only signal. */
export default function Alert({ tone = 'info', children, id }) {
  const s = STYLES[tone];
  return (
    <div
      id={id}
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed ${s.box}`}
    >
      <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
        {s.icon}
      </span>
      <div className="min-w-0 break-words">
        <span className="sr-only">{s.label}: </span>
        {children}
      </div>
    </div>
  );
}
