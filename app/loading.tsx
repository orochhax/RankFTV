export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-6 py-16">
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto size-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        <p className="mt-4 text-sm font-medium text-gray-600">Carregando…</p>
      </div>
    </main>
  );
}
