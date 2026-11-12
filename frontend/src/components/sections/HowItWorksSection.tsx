import { motion } from 'framer-motion';
import { Icon, type IconName } from '../ui/Icon';

const steps: { number: string; title: string; text: string; icon: IconName }[] = [
  { number: '01', title: 'Submit a report', text: 'Write a description, attach an image, and optionally share GPS or dictate a transcript.', icon: 'mic' },
  { number: '02', title: 'Review suggestions', text: 'Gemini may suggest report details. You decide whether to use or edit them before submission.', icon: 'brain' },
  { number: '03', title: 'Staff manage it here', text: 'An admin can assign a department; authorized staff can record workflow updates in JAN Voice AI.', icon: 'building' },
  { number: '04', title: 'Follow the history', text: 'Citizens can check report status and saved updates. The platform is not connected to government systems.', icon: 'check' },
];

export function HowItWorksSection() {
  return <section id="how-it-works" className="py-20 dark:bg-slate-950 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-600 dark:text-cyan-400">Prototype workflow</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">From report to recorded update.</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Workflow states reflect actions recorded by users with staff permissions in the platform. They are not proof of official receipt or government resolution.</p></div><div className="relative mt-14 grid gap-5 md:grid-cols-4"><div className="absolute left-[12%] right-[12%] top-10 hidden border-t border-dashed border-cyan-300 md:block dark:border-cyan-400/30" />{steps.map((step, index) => <motion.article key={step.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className="relative rounded-2xl bg-slate-100 p-6 dark:bg-white/[.04]"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-full bg-cyan-500 font-bold text-slate-950"><Icon name={step.icon} /></span><span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{step.number}</span></div><h3 className="mt-7 text-xl font-bold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.text}</p></motion.article>)}</div></div></section>;
}
