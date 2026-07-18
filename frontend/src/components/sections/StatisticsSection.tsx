import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const visible = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => { if (!visible) return; const started = Date.now(); const id = window.setInterval(() => { const progress = Math.min((Date.now() - started) / 1200, 1); setCount(Math.floor(value * progress)); if (progress === 1) window.clearInterval(id); }, 16); return () => window.clearInterval(id); }, [value, visible]);
  return <p ref={ref} className="text-3xl font-bold tracking-tight sm:text-5xl">{count.toLocaleString()}{suffix}</p>;
}

const statistics = [{ label: 'Citizens empowered', value: 50000, suffix: '+' }, { label: 'Complaints raised', value: 120000, suffix: '+' }, { label: 'Issues resolved', value: 85000, suffix: '+' }, { label: 'Cities connected', value: 42, suffix: '' }];

export function StatisticsSection() {
  return <section id="about" className="bg-slate-900 py-20 text-white dark:bg-slate-900 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-400">Impact in motion</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A louder voice for every community.</h2></div><p className="max-w-md text-sm leading-6 text-slate-300">Technology should make public services more responsive. These are the people and places making that possible.</p></div><div className="mt-12 grid gap-8 border-t border-white/10 pt-10 sm:grid-cols-2 lg:grid-cols-4">{statistics.map((stat, index) => <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}><Counter value={stat.value} suffix={stat.suffix} /><p className="mt-2 text-sm text-slate-400">{stat.label}</p></motion.div>)}</div></div></section>;
}
