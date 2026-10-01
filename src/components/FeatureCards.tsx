import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Users,
  Leaf,
  Cloud,
  ShoppingCart,
  BookOpen,
  Bell,
  ArrowRight,
  Briefcase,
  Bug,
  DollarSign
} from "lucide-react";

const FeatureCards = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const features = [
    {
      icon: Users,
      title: t('featureLabourTitle'),
      description: "Find and hire skilled farm workers quickly. Post job requirements, review profiles, and connect with available labours in your area.",
      color: "text-primary",
      bgColor: "bg-primary/10",
      actionText: t('postJob'),
      href: "/post-job"
    },
    {
      icon: Leaf,
      title: t('featureCropTitle'),
      description: "Get AI-powered insights for crop cultivation, seasonal planning, and early pest detection. Scan plants for disease identification and get treatment recommendations.",
      color: "text-success",
      bgColor: "bg-success/10",
      actionText: "Manage Crops",
      href: "/crop-guide"
    },
    {
      icon: Cloud,
      title: t('featureWeatherTitle'),
      description: "Access real-time, location-based weather data and forecasts. Plan your farming activities with confidence.",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      actionText: "Check Weather",
      href: " https://share.google/dMhF0wc4BC2hrJCj2 "
    },
    {
      icon: ShoppingCart,
      title: t('featureMarketplaceTitle'),
      description: "Connect directly with buyers and suppliers. List your produce, negotiate prices, and eliminate middlemen costs.",
      color: "text-warning",
      bgColor: "bg-warning/10",
      actionText: t('marketplace'),
      href: "/marketplace"
    },
    {
      icon: BookOpen,
      title: t('featureKnowledgeTitle'),
      description: "Access comprehensive farming guides, video tutorials, and expert advice on sustainable agriculture practices.",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      actionText: "Learn More",
      href: "/knowledge-hub"
    },
    {
      icon: Bell,
      title: t('featureAlertTitle'),
      description: "Receive timely notifications about weather warnings, pest outbreaks, government schemes, and market price updates.",
      color: "text-red-600",
      bgColor: "bg-red-100",
      actionText: t('alerts'),
      href: "/alerts"
    }
  ];

  return (
    <section className="py-20 bg-muted/30" id="features">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('completeFarmingSolutions')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('completeFarmingDescription')}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-medium transition-all duration-300 border-border/50 hover:border-primary/20">
              <CardHeader className="pb-4">
                <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-muted-foreground mb-6 leading-relaxed">
                  {feature.description}
                </CardDescription>
                {feature.href ? (
                  feature.href.startsWith('/') ? (
                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-200"
                      onClick={() => navigate(feature.href)}
                    >
                      {feature.actionText}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-200"
                    >
                      <a href={feature.href} target="_blank" rel="noopener noreferrer">
                        {feature.actionText}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </Button>
                  )
                ) : (
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-200"
                  >
                    {feature.actionText}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-16 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Briefcase className="h-5 w-5 text-primary mr-2" />
              <span className="text-2xl font-bold text-foreground">150+</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Jobs Posted</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Bug className="h-5 w-5 text-success mr-2" />
              <span className="text-2xl font-bold text-foreground">80%</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Pest Detection Rate</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-5 w-5 text-warning mr-2" />
              <span className="text-2xl font-bold text-foreground">₹50K+</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Monthly Trade Volume</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-2xl font-bold text-foreground">25+</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Crop Guides</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;