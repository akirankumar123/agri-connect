import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { Play, ArrowRight, Users, TrendingUp, Shield, X } from "lucide-react";
import heroImage from "@/assets/hero-farming.jpg";

const HeroSection = () => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-background to-accent/20">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Agri-Rover Farming Technology"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/70"></div>
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Shield className="w-4 h-4 mr-2" />
            {t('trustedByFarmers')}
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            {t('heroGrowing')}
            <span className="text-primary block">{t('sustainableFarming')}</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8 py-6 font-semibold" onClick={() => navigate('/rover-monitoring')}>
              {t('getStartedFree')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 font-semibold">
                  <Play className="mr-2 h-5 w-5" />
                  {t('watchDemo')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 mx-4">
                <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold">{t('demoTitle')}</DialogTitle>
                </DialogHeader>
                <div className="relative w-full aspect-video px-0">
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/heTxEsrPVdQ?autoplay=1"
                    title="Smart Agriculture Platform Demo"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-b-lg"
                  ></iframe>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-primary mr-2" />
                <span className="text-2xl font-bold text-foreground">100+</span>
              </div>
              <p className="text-muted-foreground font-medium">{t('activeFarmers')}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-success mr-2" />
                <span className="text-2xl font-bold text-foreground">35%</span>
              </div>
              <p className="text-muted-foreground font-medium">{t('avgYieldIncrease')}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Shield className="h-6 w-6 text-warning mr-2" />
                <span className="text-2xl font-bold text-foreground">24/7</span>
              </div>
              <p className="text-muted-foreground font-medium">{t('expertSupport')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;