import { motion } from 'framer-motion';
import { Icon, type IconName } from '../ui/Icon';

const features: { icon: IconName; title: string; text: string }[] = [
  { icon: 'brain', title: 'Reviewable AI suggestions', text: 'Gemini can suggest a category, department, priority, language, and summary for a citizen to review or edit.' },
  { icon: 'route', title: 'Staff-managed assignment', text: 'Admins can assign reports to an existing authority department in this application.' },
  { icon: 'mic', title: 'Editable speech transcript', text: 'Where the browser supports speech recognition, citizens can dictate text and edit it before submission.' },
  { icon: 'tracking', title: 'Report status history', text: 'Citizens can review persisted status and staff updates. No external government delivery is connected.' },
  { icon: 'map', title: 'Optional GPS and map', text: 'Citizens choose whether to share GPS. Map markers use approximate coordinates and only exist for reports with coordinates.' },
  { icon: 'community', title: 'Possible-duplicate warning', text: 'Text and proximity can surface similar reports. Citizens may still submit; reports are never merged or rejected automatically.' },
];

export function FeaturesSection() {
  return <section id="features" className="bg-white py-20 dark:bg-slate-950 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-600 dark:text-cyan-400">Implemented capabilities</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Tools for a clearer report<br />and a visible workflow.</h2><p className="mt-5 text-slate-600 dark:text-slate-300">Features currently available in this prototype. Staff updates are recorded inside JAN Voice AI; no public-service system receives them automatically.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map((feature, index) => <motion.article key={feature.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: index * 0.06 }} className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-cyan-300 hover:bg-white hover:shadow-xl hover:shadow-cyan-900/5 dark:border-white/10 dark:bg-white/[.03] dark:hover:border-cyan-400/40 dark:hover:bg-white/[.06]"><div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-100 text-cyan-700 transition group-hover:bg-cyan-500 group-hover:text-slate-950 dark:bg-cyan-400/10 dark:text-cyan-300"><Icon name={feature.icon} /></div><h3 className="mt-5 text-lg font-bold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{feature.text}</p></motion.article>)}</div></div></section>;
}
