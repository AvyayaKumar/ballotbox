'use client';
import { useFadeInOnScroll } from '@/hooks/useFadeInOnScroll';

const steps = [
  { step: '1', title: 'Enter Your Address', desc: 'Type your home address or use your current location.' },
  { step: '2', title: 'Find Your Location', desc: 'We look up your assigned polling place, early voting sites, and drop boxes.' },
  { step: '3', title: 'Go Vote', desc: 'Get directions, check hours, and head to your polling place.' },
];

function AnimatedStep({ step, title, desc, delay }: { step: string; title: string; desc: string; delay: number }) {
  const ref = useFadeInOnScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className="text-center opacity-0 translate-y-4 transition-all duration-700 ease-out"
    >
      <div className="w-12 h-12 rounded-full bg-brand-accent text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">{step}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-brand-muted text-sm">{desc}</p>
    </div>
  );
}

export default function HowItWorksSection() {
  return (
    <section className="bg-brand-card py-20">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map(({ step, title, desc }, i) => (
            <AnimatedStep key={step} step={step} title={title} desc={desc} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
