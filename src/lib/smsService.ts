// Mock SMS service for demonstration
// In a real application, this would integrate with services like Twilio, AWS SNS, etc.

export interface SMSMessage {
    id: string;
    to: string;
    message: string;
    timestamp: Date;
    status: 'sent' | 'delivered' | 'failed';
    alertId?: string;
}

class SMSService {
    private messages: SMSMessage[] = [];

    constructor() {
        // Load existing messages from localStorage
        const stored = localStorage.getItem('sms_messages');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                this.messages = parsed.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
            } catch (error) {
                console.error('Error loading SMS messages:', error);
            }
        }
    }

    async sendSMS(to: string, message: string, alertId?: string): Promise<SMSMessage> {
        // Try to send via backend first (if available)
        try {
            const res = await fetch('/api/send-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, message })
            });

            if (res.ok) {
                const data = await res.json();
                const smsMessage: SMSMessage = {
                    id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    to,
                    message,
                    timestamp: new Date(),
                    status: data && data.success ? 'delivered' : 'failed',
                    alertId: data && data.sid ? String(data.sid) : alertId
                };

                this.messages.unshift(smsMessage);
                this.saveMessages();

                console.log(`📱 SMS ${smsMessage.status.toUpperCase()}: (via backend)`, {
                    to: smsMessage.to,
                    message: smsMessage.message,
                    timestamp: smsMessage.timestamp.toLocaleString(),
                    meta: data
                });

                return smsMessage;
            }
        } catch (error) {
            console.warn('Backend SMS send failed, falling back to local simulation:', error);
        }

        // Fallback simulation when backend unavailable or failed
        await new Promise(resolve => setTimeout(resolve, 800));

        const smsMessage: SMSMessage = {
            id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            to,
            message,
            timestamp: new Date(),
            status: Math.random() > 0.05 ? 'delivered' : 'failed', // 95% success rate
            alertId
        };

        this.messages.unshift(smsMessage);
        this.saveMessages();

        console.log(`📱 SMS ${smsMessage.status.toUpperCase()}: (simulated)`, {
            to: smsMessage.to,
            message: smsMessage.message,
            timestamp: smsMessage.timestamp.toLocaleString()
        });

        return smsMessage;
    }

    getMessages(phoneNumber?: string): SMSMessage[] {
        if (phoneNumber) {
            return this.messages.filter(msg => msg.to === phoneNumber);
        }
        return this.messages;
    }

    getRecentMessages(limit: number = 10): SMSMessage[] {
        return this.messages.slice(0, limit);
    }

    private saveMessages(): void {
        localStorage.setItem('sms_messages', JSON.stringify(this.messages));
    }

    // Clear old messages (keep last 100)
    clearOldMessages(): void {
        if (this.messages.length > 100) {
            this.messages = this.messages.slice(0, 100);
            this.saveMessages();
        }
    }
}

// Export singleton instance
export const smsService = new SMSService();

// Helper function to format alert messages for SMS
export const formatAlertForSMS = (alert: any): string => {
    const maxLength = 160; // SMS character limit
    const message = `🌾 AgriAlert: ${alert.title}\n${alert.message}\n💡 ${alert.recommendation}`;

    if (message.length <= maxLength) {
        return message;
    }

    // Truncate if too long
    return message.substring(0, maxLength - 3) + '...';
};

// Send farming alert via SMS
export const sendFarmingAlertSMS = async (phoneNumber: string, alert: any): Promise<SMSMessage | null> => {
    try {
        const message = formatAlertForSMS(alert);
        return await smsService.sendSMS(phoneNumber, message, alert.id);
    } catch (error) {
        console.error('Failed to send farming alert SMS:', error);
        return null;
    }
};

// Send weather alert via SMS
export const sendWeatherAlertSMS = async (phoneNumber: string, reason: string, severity: 'light' | 'moderate' | 'heavy'): Promise<SMSMessage | null> => {
    try {
        const icon = severity === 'heavy' ? '🌧️' : severity === 'moderate' ? '🌦️' : '☔';
        const message = `${icon} Weather Alert: ${reason}\nStay safe and protect your crops!`;
        return await smsService.sendSMS(phoneNumber, message, `weather_${Date.now()}`);
    } catch (error) {
        console.error('Failed to send weather alert SMS:', error);
        return null;
    }
};
