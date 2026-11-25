export default function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
    />
  );
}
