'use client';
import { useFadeInOnScroll } from '@/hooks/useFadeInOnScroll';

const steps = [
  { step: '1', title: 'Enter your address', desc: 'Type your registered address or use your current location. Nothing you enter is stored.' },
  { step: '2', title: 'See every election', desc: 'We ask election officials, live, for each election scheduled for your address: the date, every contest on your ballot, and where you can vote in it.' },
  { step: '3', title: 'Research, then vote', desc: 'Follow official and nonpartisan links to learn about the candidates and measures, then get directions and hours.' },
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
