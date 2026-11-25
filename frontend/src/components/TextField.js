import { useId } from 'react';

/** Labelled input with an accessible hint and error message. */
export default function TextField({ label, error, hint, required = false, optional = false, id, ...inputProps }) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      <input
        id={inputId}
        className="field-input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        required={required}
        {...inputProps}
      />
      {hint && <p id={hintId} className="mt-1.5 text-sm text-ink-muted">{hint}</p>}
      {error && (
        <p id={errorId} className="mt-1.5 flex gap-1.5 text-sm font-medium text-danger">
          <span aria-hidden="true">✕</span>
          <span className="break-words">{error}</span>
        </p>
      )}
    </div>
  );
}
