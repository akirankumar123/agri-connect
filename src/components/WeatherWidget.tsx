import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Cloud,
  Sun,
  CloudRain,
  Thermometer,
  Droplets,
  Wind,
  Eye,
  MapPin
} from "lucide-react";

const API_KEY = "0cd826d8ef6257fa47bdb31a6a69475a"; // Your OpenWeatherMap API key
const CITY = "Bangalore,IN"; // Change to your desired city


const WeatherWidget = () => {
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    // Fetch current weather
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric`
    )
      .then((res) => res.json())
      .then((data) => {
        setCurrentWeather({
          location: data.name + ", " + data.sys.country,
          temperature: Math.round(data.main.temp),
          condition: data.weather[0].description,
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
          visibility: Math.round(data.visibility / 1000), // meters to km
          uvIndex: "N/A"
        });
        setLoading(false);
      });

    // Fetch 5-day forecast
    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${CITY}&appid=${API_KEY}&units=metric`
    )
      .then((res) => res.json())
      .then((data) => {
        // Group forecast items by day
        const daily: Record<string, any[]> = {};
        data.list.forEach((item: any) => {
          const date = new Date(item.dt_txt);
          const day = date.toLocaleDateString("en-US", { weekday: "short" });
          if (!daily[day]) daily[day] = [];
          daily[day].push(item);
        });

        // Get next 5 days
        const days = Object.keys(daily).slice(0, 5);
        const forecastData = days.map((day) => {
          const items = daily[day];
          // Calculate min/max temp
          const temps = items.map((i) => i.main.temp);
          const temp_min = Math.min(...temps);
          const temp_max = Math.max(...temps);

          // Most frequent weather condition
          const conditions = items.map((i) => i.weather[0].main);
          const condition =
            conditions.sort(
              (a, b) =>
                conditions.filter((v) => v === a).length -
                conditions.filter((v) => v === b).length
            ).pop();

          // Average rain probability
          const pops = items.map((i) => i.pop ?? 0);
          const rain =
            pops.length > 0
              ? `${Math.round((pops.reduce((a, b) => a + b, 0) / pops.length) * 100)}%`
              : "0%";

          // Icon logic
          let icon = Cloud;
          if (condition === "Rain") icon = CloudRain;
          else if (condition === "Clear") icon = Sun;

          return {
            day,
            temp: `${Math.round(temp_max)}°/${Math.round(temp_min)}°`,
            condition,
            rain,
            icon,
          };
        });
        setForecast(forecastData);
      });
  }, []);

  return (
    <section className="py-16 bg-gradient-sky/20" id="weather">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Weather Card */}
          <Card className="lg:col-span-1 shadow-medium">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-primary" />
                  {t('currentWeather')}
                </CardTitle>
                <Badge variant="outline" className="text-xs">{t('live')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {loading ? t('loadingWeather') : currentWeather?.location}
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center mb-6">{t('loadingWeather')}</div>
              ) : (
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center mb-2">
                    <Cloud className="h-12 w-12 text-primary mr-3" />
                    <span className="text-4xl font-bold text-foreground">
                      {currentWeather.temperature}°C
                    </span>
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {currentWeather.condition}
                  </p>
                </div>
              )}
              {!loading && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('humidity')}</p>
                      <p className="font-semibold">{currentWeather.humidity}%</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wind className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('wind')}</p>
                      <p className="font-semibold">{currentWeather.windSpeed} km/h</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('visibility')}</p>
                      <p className="font-semibold">{currentWeather.visibility} km</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Sun className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('uvIndex')}</p>
                      <p className="font-semibold">{currentWeather.uvIndex}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5-Day Forecast */}
          <Card className="lg:col-span-1 shadow-medium">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{t('fiveDayForecast')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecast.length === 0 ? (
                  <div>{t('loadingForecast')}</div>
                ) : (
                  forecast.map((day, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <day.icon className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">{day.day}</p>
                          <p className="text-xs text-muted-foreground">{day.condition}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{day.temp}</p>
                        <p className="text-xs text-blue-500">{day.rain} {t('rain')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default WeatherWidget;