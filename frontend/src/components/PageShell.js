import Link from 'next/link';

/** Shared page frame: skip link, header, centred content surface. `wide` is for the dashboard. */
export default function PageShell({ title, intro, wide = false, children }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to main content
      </a>
      <header className="mx-auto flex w-full max-w-3xl items-center px-4 pt-6 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-brand">
          RSVR Secure Auth
        </Link>
      </header>
      <main id="main" className={`mx-auto w-full px-4 pb-12 pt-6 sm:px-6 ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        <div className="rounded-card bg-surface-card p-5 shadow-card sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {intro && <p className="mt-2 text-base leading-relaxed text-ink-muted">{intro}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </>
  );
}
