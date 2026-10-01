import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import type { LanguageCode } from "@/lib/translations";
import {
  Sprout,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Send
} from "lucide-react";

const Footer = () => {
  const { t, currentLanguage, setLanguage, availableLanguages } = useLanguage();

  const quickLinks = [
    { key: "footerDashboard", href: "#dashboard" },
    { key: "footerLaborHiring", href: "#labour" },
    { key: "footerCropManagement", href: "#crops" },
    { key: "footerWeatherForecast", href: "#weather" },
    { key: "roverMonitor", href: "/rover-monitoring" },
    { key: "marketplace", href: "#marketplace" },
    { key: "footerKnowledgeHub", href: "/knowledge-hub" }
  ] as const;

  const supportLinks = [
    { key: "footerHelpCenter", href: "#help" },
    { key: "footerContactUs", href: "#contact" },
    { key: "footerCommunity", href: "#forum" },
    { key: "footerVideoTutorials", href: "#tutorials" },
    { key: "footerFaq", href: "#faq" },
    { key: "footerTechnicalSupport", href: "#support" }
  ] as const;

  const legalLinks = [
    { key: "footerPrivacyPolicy", href: "#privacy" },
    { key: "footerTerms", href: "#terms" },
    { key: "footerDataSecurity", href: "#security" },
    { key: "footerCookiePolicy", href: "#cookies" }
  ] as const;

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary rounded-lg">
                <Sprout className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Agri-Rover</h3>
                <p className="text-sm text-muted-foreground">{t('companyInfo')}</p>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {t('platformDescription')}
            </p>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">support@agrirover99.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">+91 8073859162</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Bangalore, India</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" size="sm" className="p-2" aria-label={t('footerFacebook')}>
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="p-2" aria-label={t('footerTwitter')}>
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="p-2" aria-label={t('footerInstagram')}>
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="p-2" aria-label={t('footerYoutube')}>
                <Youtube className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-6">{t('platform')}</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.key}>
                  {link.key === "footerKnowledgeHub" ? (
                    <Link to={link.href} className="text-muted-foreground hover:text-primary transition-colors duration-200">
                      {t(link.key)}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-muted-foreground hover:text-primary transition-colors duration-200">
                      {t(link.key)}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-6">{t('support')}</h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.key}>
                  <a href={link.href} className="text-muted-foreground hover:text-primary transition-colors duration-200">
                    {t(link.key)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-6">{t('stayUpdated')}</h4>
            <p className="text-muted-foreground mb-4 text-sm">
              {t('footerNewsletterDescription')}
            </p>

            <div className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  placeholder={t('footerEmailPlaceholder')}
                  type="email"
                  className="flex-1"
                />
                <Button size="sm" className="px-3" aria-label={t('footerSubscribe')}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('footerPrivacyNote')}
              </p>
            </div>

            <div className="mt-6">
              <h5 className="font-medium text-foreground mb-3 text-sm">{t('legal')}</h5>
              <ul className="space-y-2">
                {legalLinks.map((link) => (
                  <li key={link.key}>
                    <a href={link.href} className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200">
                      {t(link.key)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © 2024 Agri-Rover. {t('footerAllRightsReserved')} {t('footerEmpoweringFarmers')}
            </p>
            <div className="flex items-center flex-wrap justify-center gap-3">
              <span className="text-xs text-muted-foreground">{t('footerAvailableIn')}</span>
              <div className="flex flex-wrap justify-center gap-2">
                {availableLanguages.map((language) => (
                  <Button
                    key={language.code}
                    variant="outline"
                    size="sm"
                    className="text-xs px-3 py-1"
                    aria-pressed={currentLanguage === language.code}
                    onClick={() => setLanguage(language.code as LanguageCode)}
                  >
                    {language.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
