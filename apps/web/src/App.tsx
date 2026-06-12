import { useState } from 'react';
import type { Tenant } from '@portfoliohub/shared';

function App() {
  const [tenant] = useState<Tenant | null>(null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
      <h1 className="text-2xl font-semibold">PortfolioHub — {tenant?.name ?? 'no tenant loaded'}</h1>
    </main>
  );
}

export default App;
