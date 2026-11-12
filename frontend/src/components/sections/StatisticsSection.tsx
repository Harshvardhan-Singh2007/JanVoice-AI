const capabilities = [
  { title: 'Citizen-submitted reports', detail: 'Reports and status history are stored by the backend in MongoDB.' },
  { title: 'Human-managed workflow', detail: 'Admin and authority roles can assign departments and record status updates inside JAN Voice AI.' },
  { title: 'Transparent suggestions', detail: 'AI recommendations and possible duplicates are shown for review; they do not decide or resolve a report.' },
];

export function StatisticsSection() {
  return <section id="about" className="bg-slate-900 py-20 text-white sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-400">What the prototype supports</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A working civic reporting workflow.</h2></div><p className="max-w-md text-sm leading-6 text-slate-300">This buildathon product demonstrates reporting and staff workflow in one application. It does not connect to a municipality or measure real-world civic outcomes.</p></div><div className="mt-12 grid gap-4 border-t border-white/10 pt-10 md:grid-cols-3">{capabilities.map((capability) => <article key={capability.title} className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><h3 className="font-bold">{capability.title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{capability.detail}</p></article>)}</div></div></section>;
}
