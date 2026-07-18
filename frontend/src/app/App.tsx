import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { FeaturesSection } from '../components/sections/FeaturesSection';
import { HeroSection } from '../components/sections/HeroSection';
import { HowItWorksSection } from '../components/sections/HowItWorksSection';
import { StatisticsSection } from '../components/sections/StatisticsSection';

export function LandingPage() {
  return (
    <div className="app-shell landing-page">
      <main className="min-h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <HeroSection />
        <FeaturesSection />
        <StatisticsSection />
        <HowItWorksSection />
        <Footer />
      </main>
    </div>
  );
}
