import Spinner from './Spinner';

/** Disables itself while `loading` so a request cannot be submitted twice. */
export default function Button({ variant = 'primary', loading = false, loadingText, children, disabled, type = 'button', className = '', ...rest }) {
  return (
    <button
      type={type}
      className={`btn ${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}
