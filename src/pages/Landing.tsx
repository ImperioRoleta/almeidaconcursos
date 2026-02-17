import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingMethod from "@/components/landing/LandingMethod";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingPlans from "@/components/landing/LandingPlans";
import LandingPromotions from "@/components/landing/LandingPromotions";
import LandingTestimonials from "@/components/landing/LandingTestimonials";
import LandingCTA from "@/components/landing/LandingCTA";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <LandingHeader />
      <LandingHero />
      <LandingFeatures />
      <LandingMethod />
      <LandingPlans />
      <LandingPromotions />
      <LandingTestimonials />
      <LandingCTA />

      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 Almeida Concursos — Preparação Estratégica para Soldado PM Bahia.
        </div>
      </footer>
    </div>
  );
}
