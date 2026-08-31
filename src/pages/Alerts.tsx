import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import Header from '@/components/Header';
import { getCurrentWeather, WeatherData } from '@/lib/weatherService';
import { generateFarmingAlerts, getAlertPreferences, saveAlertPreferences, FarmingAlert, AlertPreferences } from '@/lib/farmingAlerts';
import { smsService, SMSMessage } from '@/lib/smsService';
import {
    getAlarmSettings,
    saveAlarmSettings,
    shouldTriggerAlarm,
    triggerWeatherAlarm,
    logAlarmActivity,
    type AlarmSettings
} from '@/lib/weatherAlarm';
import { Bell, AlertTriangle, Info, AlertCircle, Settings, CloudRain, Thermometer, Wind, Droplets, Phone, MessageSquare, CheckCircle, XCircle, Volume2, VolumeX } from 'lucide-react';

const Alerts: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [alerts, setAlerts] = useState<FarmingAlert[]>([]);
    const [smsMessages, setSmsMessages] = useState<SMSMessage[]>([]);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [farmingTips, setFarmingTips] = useState<any[]>([]);
    const [preferences, setPreferences] = useState<AlertPreferences>({
        temperatureAlerts: true,
        rainAlerts: true,
        windAlerts: true,
        humidityAlerts: true,
        frostAlerts: true,
        droughtAlerts: true,
        pestAlerts: true,
        phoneNumber: '',
        smsEnabled: true,
        emailEnabled: true
    });
    const [alarmSettings, setAlarmSettings] = useState<AlarmSettings>({
        enabled: true,
        rainyWeatherAlarm: true,
        heavyRainThreshold: 5,
        volume: 0.7,
        soundEnabled: true,
        smsEnabled: false,
    });
    const [alarmActive, setAlarmActive] = useState(false);
    const [alarmReason, setAlarmReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('tips');

    // Load user preferences and alarm settings on component mount
    useEffect(() => {
        if (user?.id) {
            const userPrefs = getAlertPreferences(user.id);
            // If user hasn't set a phone in preferences, default to their account phone
            if ((!userPrefs.phoneNumber || userPrefs.phoneNumber === '') && user.phone) {
                const merged = { ...userPrefs, phoneNumber: user.phone };
                setPreferences(merged);
                saveAlertPreferences(user.id, merged);
            } else {
                setPreferences(userPrefs);
            }

            const userAlarmSettings = getAlarmSettings(user.id);
            setAlarmSettings(userAlarmSettings);
        }
    }, [user]);

    // Generate alerts, load weather data, and SMS messages when component mounts
    useEffect(() => {
        generateAlerts();
        loadWeatherData();
        loadSMSMessages();
    }, [user]);

    const loadWeatherData = async () => {
        try {
            const weather = await getCurrentWeather();
            setWeatherData(weather);
            const tips = generateFarmingTips(weather);
            setFarmingTips(tips);

            // Check if alarm should be triggered
            if (user?.id) {
                const alarmCheck = shouldTriggerAlarm(weather, alarmSettings);
                    if (alarmCheck.trigger) {
                    setAlarmActive(true);
                    setAlarmReason(alarmCheck.reason);

                    // Trigger alarm sound and notification
                        const smsResult = await triggerWeatherAlarm(alarmCheck.reason, alarmCheck.severity, alarmSettings, user?.phone);

                        // If SMS was enabled, show feedback to user
                        if (alarmSettings.smsEnabled) {
                            const targetPhone = preferences.phoneNumber || user?.phone;
                            if (smsResult) {
                                showToast({ type: 'success', title: 'SMS Sent', message: `Weather alert SMS sent to ${targetPhone}`, duration: 4000 });
                            } else {
                                showToast({ type: 'error', title: 'SMS Failed', message: `Failed to send SMS to ${targetPhone}`, duration: 5000 });
                            }
                            // Refresh SMS history
                            loadSMSMessages();
                        }

                    // Log the alarm
                    logAlarmActivity('triggered', {
                        reason: alarmCheck.reason,
                        severity: alarmCheck.severity,
                        weather: {
                            precipitation: weather.precipitation,
                            condition: weather.condition,
                        },
                    });

                    // Show toast notification
                    showToast({
                        type: 'error',
                        title: '🌧️ Rainy Weather Alert!',
                        message: alarmCheck.reason,
                        duration: 5000,
                    });
                } else {
                    setAlarmActive(false);
                    setAlarmReason('');
                }
            }
        } catch (error) {
            console.error('Failed to load weather data:', error);
        }
    };

    const loadSMSMessages = () => {
        if (user) {
            const phone = preferences.phoneNumber || user.phone;
            if (phone) {
                const messages = smsService.getMessages(phone);
                setSmsMessages(messages);
            }
        }
    };

    const generateAlerts = async () => {
        setLoading(true);
        try {
            const weatherData = await getCurrentWeather();
            const newAlerts = generateFarmingAlerts(weatherData);
            setAlerts(newAlerts);
        } catch (error) {
            showToast({
                type: 'error',
                title: 'Error',
                message: 'Failed to fetch weather data for alerts',
                duration: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePreferenceChange = (key: keyof AlertPreferences, value: boolean | string) => {
        const newPreferences = { ...preferences, [key]: value };
        setPreferences(newPreferences);

        if (user?.id) {
            saveAlertPreferences(user.id, newPreferences);
            showToast({
                type: 'success',
                title: 'Preferences Updated',
                message: 'Your alert preferences have been saved',
                duration: 2000
            });
        }
    };

    const handleAlarmSettingChange = (key: keyof AlarmSettings, value: boolean | number) => {
        const newSettings = { ...alarmSettings, [key]: value };
        setAlarmSettings(newSettings);

        if (user?.id) {
            saveAlarmSettings(user.id, newSettings);
            logAlarmActivity('settings_changed', { [key]: value });
            showToast({
                type: 'success',
                title: 'Alarm Settings Updated',
                message: 'Your weather alarm settings have been saved',
                duration: 2000
            });
        }
    };

    const dismissAlarm = () => {
        setAlarmActive(false);
        logAlarmActivity('dismissed', { reason: alarmReason });
        showToast({
            type: 'info',
            title: 'Alarm Dismissed',
            message: 'Weather alarm has been dismissed',
            duration: 2000
        });
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'critical':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'info':
                return <Info className="h-5 w-5 text-blue-500" />;
            default:
                return <Bell className="h-5 w-5 text-gray-500" />;
        }
    };

    const getAlertColor = (type: string) => {
        switch (type) {
            case 'critical':
                return 'border-red-200 bg-red-50';
            case 'warning':
                return 'border-yellow-200 bg-yellow-50';
            case 'info':
                return 'border-blue-200 bg-blue-50';
            default:
                return 'border-gray-200 bg-gray-50';
        }
    };

    const generateFarmingTips = (weather: WeatherData) => {
        const tips = [];

        // Wheat harvesting tip
        if (
            weather.temperature >= 20 &&
            weather.temperature <= 30 &&
            weather.humidity < 80 &&
            weather.precipitation === 0
        ) {
            tips.push({
                type: "warning",
                title: "Ideal Conditions for Wheat Harvesting",
                message: "Current weather conditions are perfect for wheat harvesting. Low humidity and suitable temperature will help maintain grain quality.",
                icon: "🌾",
                bg: "bg-yellow-50 border-yellow-400",
                crops: ["wheat", "barley"]
            });
        }

        // Irrigation tip
        if (weather.windSpeed < 10 && weather.humidity < 85) {
            tips.push({
                type: "info",
                title: "Good Time for Irrigation",
                message: "Low wind speeds make this an excellent time for irrigation. Water will be absorbed efficiently without much evaporation.",
                icon: "💧",
                bg: "bg-blue-50 border-blue-400",
                crops: ["rice", "wheat", "cotton", "sugarcane"]
            });
        }

        // Pesticide application tip
        const rainInForecast = weather.forecast.some(f => f.precipitation > 0);
        if (!rainInForecast && weather.windSpeed < 15) {
            tips.push({
                type: "success",
                title: "Perfect Weather for Pesticide Application",
                message: "No rain in the forecast and moderate wind speeds make this ideal for applying pesticides and fertilizers.",
                icon: "🚜",
                bg: "bg-green-50 border-green-400",
                crops: ["cotton", "rice", "maize", "vegetables"]
            });
        }

        // Seed sowing tip
        if (weather.temperature >= 15 && weather.temperature <= 25 && weather.humidity >= 60) {
            tips.push({
                type: "info",
                title: "Favorable Conditions for Seed Sowing",
                message: "Temperature and humidity levels are optimal for seed germination. Consider sowing seeds for seasonal crops.",
                icon: "🌱",
                bg: "bg-green-50 border-green-400",
                crops: ["maize", "vegetables", "pulses"]
            });
        }

        // Fallback tip
        if (tips.length === 0) {
            tips.push({
                type: "info",
                title: "General Farming Tip",
                message: "Monitor soil moisture regularly. Current conditions are stable for most farming activities.",
                icon: "ℹ️",
                bg: "bg-gray-50 border-gray-400",
                crops: ["all crops"]
            });
        }

        return tips;
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <div className="max-w-4xl mx-auto p-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4">Please Login</h1>
                        <p className="text-muted-foreground">You need to be logged in to access farming alerts.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="max-w-6xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Farming Alerts & Notifications</h1>
                    <p className="text-muted-foreground">Stay informed about weather conditions that affect your crops</p>
                </div>

                {/* Active Alarm Banner */}
                {alarmActive && (
                    <Card className="mb-6 border-red-500 border-2 bg-red-50 animate-pulse">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-red-500 text-white p-3 rounded-full">
                                        <CloudRain className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-red-900">⚠️ RAINY WEATHER ALARM</h3>
                                        <p className="text-red-700 font-medium">{alarmReason}</p>
                                        <p className="text-sm text-red-600 mt-1">
                                            Take necessary precautions to protect your crops from rain damage
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={dismissAlarm}
                                    variant="destructive"
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Dismiss Alarm
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="alerts" className="flex items-center space-x-2">
                            <Bell className="h-4 w-4" />
                            <span>Current Alerts</span>
                        </TabsTrigger>
                        <TabsTrigger value="tips" className="flex items-center space-x-2">
                            <Info className="h-4 w-4" />
                            <span>Farming Tips</span>
                        </TabsTrigger>
                        <TabsTrigger value="sms" className="flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4" />
                            <span>SMS History</span>
                        </TabsTrigger>
                        <TabsTrigger value="preferences" className="flex items-center space-x-2">
                            <Settings className="h-4 w-4" />
                            <span>Preferences</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Alerts Tab */}
                    <TabsContent value="alerts" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Current Farming Alerts</h2>
                            <Button onClick={generateAlerts} disabled={loading}>
                                {loading ? 'Refreshing...' : 'Refresh Alerts'}
                            </Button>
                        </div>

                        {alerts.length === 0 ? (
                            <Card>
                                <CardContent className="text-center py-8">
                                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Active Alerts</h3>
                                    <p className="text-muted-foreground">Weather conditions are favorable for farming activities.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {alerts.map((alert) => (
                                    <Card key={alert.id} className={`border-l-4 ${getAlertColor(alert.type)}`}>
                                        <CardContent className="p-6">
                                            <div className="flex items-start space-x-4">
                                                {getAlertIcon(alert.type)}
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="font-semibold text-lg">{alert.title}</h3>
                                                        <Badge variant={alert.type === 'critical' ? 'destructive' : 'secondary'}>
                                                            Priority {alert.priority}/10
                                                        </Badge>
                                                    </div>

                                                    <p className="text-muted-foreground mb-3">{alert.message}</p>

                                                    <div className="bg-white/50 p-3 rounded-lg mb-3">
                                                        <h4 className="font-medium mb-1">Recommendation:</h4>
                                                        <p className="text-sm">{alert.recommendation}</p>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        <span className="text-sm font-medium">Affected Crops:</span>
                                                        {alert.crops.map((crop) => (
                                                            <Badge key={crop} variant="outline" className="text-xs">
                                                                {crop}
                                                            </Badge>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                        <span>Weather: {alert.weatherCondition}</span>
                                                        <span>{alert.timestamp.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Farming Tips Tab */}
                    <TabsContent value="tips" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Weather-Based Farming Tips</h2>
                            <Button onClick={loadWeatherData} disabled={!weatherData}>
                                {weatherData ? 'Refresh Tips' : 'Loading...'}
                            </Button>
                        </div>

                        {!weatherData ? (
                            <Card>
                                <CardContent className="text-center py-8">
                                    <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">Loading Weather Data</h3>
                                    <p className="text-muted-foreground">Fetching current weather conditions...</p>
                                </CardContent>
                            </Card>
                        ) : farmingTips.length === 0 ? (
                            <Card>
                                <CardContent className="text-center py-8">
                                    <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Specific Tips</h3>
                                    <p className="text-muted-foreground">Weather conditions are normal. Continue with regular farming activities.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {farmingTips.map((tip, index) => (
                                    <Card key={index} className={`border-l-4 ${tip.bg}`}>
                                        <CardContent className="p-6">
                                            <div className="flex items-start space-x-4">
                                                <span className="text-2xl">{tip.icon}</span>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg mb-2">{tip.title}</h3>
                                                    <p className="text-muted-foreground mb-3">{tip.message}</p>

                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        <span className="text-sm font-medium">Recommended for:</span>
                                                        {tip.crops.map((crop: string) => (
                                                            <Badge key={crop} variant="outline" className="text-xs">
                                                                {crop}
                                                            </Badge>
                                                        ))}
                                                    </div>

                                                    {weatherData && (
                                                        <div className="bg-white/50 p-3 rounded-lg">
                                                            <h4 className="font-medium mb-1">Current Conditions:</h4>
                                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                                <div>Temperature: {weatherData.temperature}°C</div>
                                                                <div>Humidity: {weatherData.humidity}%</div>
                                                                <div>Wind Speed: {weatherData.windSpeed} km/h</div>
                                                                <div>Precipitation: {weatherData.precipitation}mm</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Preferences Tab */}
                    <TabsContent value="preferences" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Settings className="h-5 w-5" />
                                    <span>Alert Preferences</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Alert Types */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold">Alert Types</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Thermometer className="h-4 w-4 text-red-500" />
                                                <div>
                                                    <Label>Temperature Alerts</Label>
                                                    <p className="text-sm text-muted-foreground">Heat waves, frost warnings</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={preferences.temperatureAlerts}
                                                onCheckedChange={(checked) => handlePreferenceChange('temperatureAlerts', checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <CloudRain className="h-4 w-4 text-blue-500" />
                                                <div>
                                                    <Label>Rain Alerts</Label>
                                                    <p className="text-sm text-muted-foreground">Heavy rain, drought warnings</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={preferences.rainAlerts}
                                                onCheckedChange={(checked) => handlePreferenceChange('rainAlerts', checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Wind className="h-4 w-4 text-gray-500" />
                                                <div>
                                                    <Label>Wind Alerts</Label>
                                                    <p className="text-sm text-muted-foreground">High wind warnings</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={preferences.windAlerts}
                                                onCheckedChange={(checked) => handlePreferenceChange('windAlerts', checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Droplets className="h-4 w-4 text-cyan-500" />
                                                <div>
                                                    <Label>Humidity Alerts</Label>
                                                    <p className="text-sm text-muted-foreground">High/low humidity warnings</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={preferences.humidityAlerts}
                                                onCheckedChange={(checked) => handlePreferenceChange('humidityAlerts', checked)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Notification Methods */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold">Notification Methods</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="phone" className="flex items-center space-x-2">
                                                <Phone className="h-4 w-4" />
                                                <span>Phone Number for SMS</span>
                                            </Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                value={preferences.phoneNumber}
                                                onChange={(e) => handlePreferenceChange('phoneNumber', e.target.value)}
                                                placeholder="+91 9876543210"
                                                className="mt-1"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label>SMS Notifications</Label>
                                                <p className="text-sm text-muted-foreground">Receive alerts via SMS</p>
                                            </div>
                                            <Switch
                                                checked={preferences.smsEnabled}
                                                onCheckedChange={(checked) => handlePreferenceChange('smsEnabled', checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label>Email Notifications</Label>
                                                <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                                            </div>
                                            <Switch
                                                checked={preferences.emailEnabled}
                                                onCheckedChange={(checked) => handlePreferenceChange('emailEnabled', checked)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Alarm Settings Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Bell className="h-5 w-5" />
                                    <span>Weather Alarm Settings</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="flex items-center space-x-2">
                                                <Bell className="h-4 w-4" />
                                                <span>Enable Weather Alarms</span>
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Master switch for all weather alarms
                                            </p>
                                        </div>
                                        <Switch
                                            checked={alarmSettings.enabled}
                                            onCheckedChange={(checked) => handleAlarmSettingChange('enabled', checked)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="flex items-center space-x-2">
                                                <CloudRain className="h-4 w-4 text-blue-500" />
                                                <span>Rainy Weather Alarm</span>
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Alert when rain is detected or forecasted
                                            </p>
                                        </div>
                                        <Switch
                                            checked={alarmSettings.rainyWeatherAlarm}
                                            onCheckedChange={(checked) => handleAlarmSettingChange('rainyWeatherAlarm', checked)}
                                            disabled={!alarmSettings.enabled}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="flex items-center space-x-2">
                                                {alarmSettings.soundEnabled ? (
                                                    <Volume2 className="h-4 w-4" />
                                                ) : (
                                                    <VolumeX className="h-4 w-4" />
                                                )}
                                                <span>Sound Enabled</span>
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Play alarm sound when triggered
                                            </p>
                                        </div>
                                        <Switch
                                            checked={alarmSettings.soundEnabled}
                                            onCheckedChange={(checked) => handleAlarmSettingChange('soundEnabled', checked)}
                                            disabled={!alarmSettings.enabled}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="flex items-center space-x-2">
                                                <MessageSquare className="h-4 w-4 text-green-500" />
                                                <span>SMS Enabled</span>
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Send SMS alerts when triggered
                                            </p>
                                        </div>
                                        <Switch
                                            checked={alarmSettings.smsEnabled}
                                            onCheckedChange={(checked) => handleAlarmSettingChange('smsEnabled', checked)}
                                            disabled={!alarmSettings.enabled}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="threshold">
                                            Heavy Rain Threshold: {alarmSettings.heavyRainThreshold}mm
                                        </Label>
                                        <Input
                                            id="threshold"
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={alarmSettings.heavyRainThreshold}
                                            onChange={(e) => handleAlarmSettingChange('heavyRainThreshold', parseFloat(e.target.value))}
                                            disabled={!alarmSettings.enabled}
                                            className="mt-1"
                                        />
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Precipitation level to trigger heavy rain alarm
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="volume">
                                            Alarm Volume: {Math.round(alarmSettings.volume * 100)}%
                                        </Label>
                                        <Input
                                            id="volume"
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={alarmSettings.volume}
                                            onChange={(e) => handleAlarmSettingChange('volume', parseFloat(e.target.value))}
                                            disabled={!alarmSettings.enabled || !alarmSettings.soundEnabled}
                                            className="mt-1"
                                        />
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Adjust the alarm sound volume
                                        </p>
                                    </div>

                                    {alarmActive && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="flex items-center space-x-2 text-red-700 mb-2">
                                                <AlertCircle className="h-5 w-5" />
                                                <span className="font-semibold">Alarm Currently Active</span>
                                            </div>
                                            <p className="text-sm text-red-600">{alarmReason}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SMS History Tab */}
                    <TabsContent value="sms" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">SMS Notification History</h2>
                            <Button onClick={loadSMSMessages} variant="outline">
                                Refresh
                            </Button>
                        </div>

                        {!preferences.phoneNumber ? (
                            <Card>
                                <CardContent className="text-center py-8">
                                    <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Phone Number</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Add your phone number in preferences to receive SMS alerts.
                                    </p>
                                    <Button onClick={() => setActiveTab('preferences')}>
                                        Go to Preferences
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : smsMessages.length === 0 ? (
                            <Card>
                                <CardContent className="text-center py-8">
                                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No SMS Messages</h3>
                                    <p className="text-muted-foreground">
                                        SMS alerts will appear here when weather conditions trigger notifications.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {smsMessages.map((message) => (
                                    <Card key={message.id} className="border-l-4 border-l-blue-500">
                                        <CardContent className="p-6">
                                            <div className="flex items-start space-x-4">
                                                {message.status === 'delivered' ? (
                                                    <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 text-red-500 mt-1" />
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="font-medium">To: {message.to}</span>
                                                            <Badge variant={message.status === 'delivered' ? 'default' : 'destructive'}>
                                                                {message.status}
                                                            </Badge>
                                                        </div>
                                                        <span className="text-sm text-muted-foreground">
                                                            {message.timestamp.toLocaleString()}
                                                        </span>
                                                    </div>

                                                    <div className="bg-gray-50 p-3 rounded-lg">
                                                        <p className="text-sm whitespace-pre-line">{message.message}</p>
                                                    </div>

                                                    {message.alertId && (
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            Alert ID: {message.alertId}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Alerts;