export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">Welcome to your PortfolioHub dashboard.</p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-6">
        <h2 className="text-sm font-medium text-slate-200">What's next</h2>
        <p className="mt-2 text-sm text-slate-400">
          Your public portfolio is live at{' '}
          <a href="/" className="font-medium text-slate-200 underline underline-offset-2 hover:text-white">
            the portfolio viewer
          </a>
          . Gallery and page management is coming in a future update.
        </p>
      </div>
    </div>
  );
}
