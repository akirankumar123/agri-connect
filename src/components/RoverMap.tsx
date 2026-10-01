import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import {
  Thermometer,
  Droplets,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Play,
  Square,
  Navigation,
  Volume2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRover } from "@/contexts/RoverContext";
import { languages, type LanguageCode } from "@/lib/translations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ---------------------------------------------------------------------------
// This is a self-contained simulation so the UI is fully interactive on its
// own. To wire it to a real rover:
//  - Replace the sensor drift in `useSensors` with values pushed from your
//    soil/temperature sensors (e.g. over a WebSocket).
//  - Replace the movement loop with a call to your rover's control API
//    (REST endpoint, MQTT topic, ROS service, serial command, etc) when a
//    direction is held, instead of updating local x/y/heading directly.
//  - Keep broadcasting rover x/y/heading back from the rover so the land
//    visual reflects its *actual* position rather than the local simulation.
// ---------------------------------------------------------------------------

const MOVE_STEP = 2.2; // units per tick while a direction is held
const TURN_STEP = 5; // degrees per tick while turning
const TICK_MS = 80;

const voiceGuideCopy: Record<LanguageCode, {
  title: string;
  description: string;
  voiceLanguage: string;
  readAll: string;
  stop: string;
  listen: string;
  currentReading: string;
  unsupported: string;
  voiceUnavailable: string;
  noReading: string;
  offlineEstimated: string;
  sensorNames: string[];
  explanations: string[];
}> = {
  en: {
    title: "Sensor voice guide",
    description: "Listen to what each reading tells you about your field.",
    voiceLanguage: "Voice language",
    readAll: "Read all sensors",
    stop: "Stop reading",
    listen: "Listen",
    currentReading: "Current reading:",
    unsupported: "Voice playback is not available in this browser.",
    voiceUnavailable: "No browser voice is available for this language. Try another voice language.",
    noReading: "No reading",
    offlineEstimated: "Offline estimate",
    sensorNames: ["Soil sensor raw value", "Air temperature", "Air humidity", "Distance"],
    explanations: [
      "This is the raw analog value reported by the soil sensor. Its conversion to a moisture percentage depends on the sensor and its calibration.",
      "This is the temperature of the air around the rover. Very hot or cold conditions can stress crops, so use it to plan watering and field work.",
      "This measures moisture in the air around the rover and is reported as a percentage.",
      "This is the distance reported by the rover's distance sensor. A missing reading means no distance value is currently available.",
    ],
  },
  hi: {
    title: "सेंसर की आवाज़ में जानकारी",
    description: "सुनें कि खेत के बारे में हर रीडिंग क्या बताती है।",
    voiceLanguage: "आवाज़ की भाषा",
    readAll: "सभी सेंसर सुनें",
    stop: "सुनना बंद करें",
    listen: "सुनें",
    currentReading: "अभी की रीडिंग:",
    unsupported: "इस ब्राउज़र में आवाज़ चलाने की सुविधा उपलब्ध नहीं है।",
    voiceUnavailable: "इस भाषा के लिए ब्राउज़र में आवाज़ उपलब्ध नहीं है। आवाज़ की दूसरी भाषा चुनें।",
    noReading: "रीडिंग उपलब्ध नहीं",
    offlineEstimated: "ऑफ़लाइन अनुमान",
    sensorNames: ["मिट्टी सेंसर का कच्चा मान", "हवा का तापमान", "हवा की नमी", "दूरी"],
    explanations: [
      "यह मिट्टी सेंसर से मिला कच्चा एनालॉग मान है। इसे नमी के प्रतिशत में बदलने के लिए सेंसर के अनुसार कैलिब्रेशन चाहिए।",
      "यह रोवर के आसपास की हवा का तापमान है। बहुत गर्मी या ठंड फसल को नुकसान पहुँचा सकती है। सिंचाई और खेत के काम की योजना में इसका उपयोग करें।",
      "यह रोवर के आसपास की हवा में नमी का प्रतिशत मापता है।",
      "यह रोवर के दूरी सेंसर का मान है। रीडिंग न मिलने का अर्थ है कि दूरी का मान अभी उपलब्ध नहीं है।",
    ],
  },
  te: {
    title: "సెన్సార్ వాయిస్ గైడ్",
    description: "మీ పొలం గురించి ప్రతి కొలత ఏమి చెబుతుందో వినండి.",
    voiceLanguage: "వాయిస్ భాష",
    readAll: "అన్ని సెన్సార్లను వినండి",
    stop: "వినడం ఆపండి",
    listen: "వినండి",
    currentReading: "ప్రస్తుత కొలత:",
    unsupported: "ఈ బ్రౌజర్‌లో వాయిస్ ప్లేబ్యాక్ అందుబాటులో లేదు.",
    voiceUnavailable: "ఈ భాషకు బ్రౌజర్ వాయిస్ అందుబాటులో లేదు. మరో వాయిస్ భాషను ఎంచుకోండి.",
    noReading: "కొలత అందుబాటులో లేదు",
    offlineEstimated: "ఆఫ్‌లైన్ అంచనా",
    sensorNames: ["నేల సెన్సార్ ముడి విలువ", "గాలి ఉష్ణోగ్రత", "గాలి తేమ", "దూరం"],
    explanations: [
      "ఇది నేల సెన్సార్ ఇచ్చిన ముడి అనలాగ్ విలువ. తేమ శాతంగా మార్చడానికి సెన్సార్‌కు తగిన కాలిబ్రేషన్ అవసరం.",
      "ఇది రోవర్ చుట్టూ ఉన్న గాలి ఉష్ణోగ్రత. అధిక వేడి లేదా చలి పంటపై ప్రభావం చూపవచ్చు. నీటి సరఫరా, పొలం పనులను ప్లాన్ చేయడానికి దీన్ని ఉపయోగించండి.",
      "ఇది రోవర్ చుట్టూ ఉన్న గాలిలో తేమ శాతాన్ని కొలుస్తుంది.",
      "ఇది రోవర్ దూర సెన్సార్ ఇచ్చిన విలువ. రీడింగ్ లేకపోతే దూర విలువ ప్రస్తుతం అందుబాటులో లేదు.",
    ],
  },
  ta: {
    title: "சென்சார் குரல் வழிகாட்டி",
    description: "உங்கள் வயலைப் பற்றி ஒவ்வொரு அளவீடும் என்ன சொல்கிறது என்று கேளுங்கள்.",
    voiceLanguage: "குரல் மொழி",
    readAll: "அனைத்து சென்சார்களையும் கேளுங்கள்",
    stop: "கேட்பதை நிறுத்து",
    listen: "கேளுங்கள்",
    currentReading: "தற்போதைய அளவு:",
    unsupported: "இந்த உலாவியில் குரல் இயக்கம் கிடைக்கவில்லை.",
    voiceUnavailable: "இந்த மொழிக்கான உலாவிக் குரல் கிடைக்கவில்லை. வேறு குரல் மொழியைத் தேர்ந்தெடுக்கவும்.",
    noReading: "அளவீடு இல்லை",
    offlineEstimated: "இணைப்பில்லா தோராய மதிப்பு",
    sensorNames: ["மண் சென்சார் மூல மதிப்பு", "காற்று வெப்பநிலை", "காற்றின் ஈரப்பதம்", "தூரம்"],
    explanations: [
      "இது மண் சென்சார் வழங்கும் மூல அனலாக் மதிப்பு. ஈரப்பத சதவீதமாக மாற்ற சென்சாருக்கான அளவுத்திருத்தம் தேவை.",
      "இது ரோவரைச் சுற்றியுள்ள காற்றின் வெப்பநிலை. அதிக வெப்பமோ குளிரோ பயிரைப் பாதிக்கலாம். நீர்ப்பாசனம் மற்றும் வயல் பணிகளைத் திட்டமிட இதைப் பயன்படுத்துங்கள்.",
      "இது ரோவரைச் சுற்றியுள்ள காற்றின் ஈரப்பத சதவீதத்தை அளவிடுகிறது.",
      "இது ரோவரின் தூர சென்சார் வழங்கும் மதிப்பு. அளவீடு இல்லையெனில் தூர மதிப்பு தற்போது கிடைக்கவில்லை.",
    ],
  },
  kn: {
    title: "ಸೆನ್ಸರ್ ಧ್ವನಿ ಮಾರ್ಗದರ್ಶಿ",
    description: "ನಿಮ್ಮ ಹೊಲದ ಬಗ್ಗೆ ಪ್ರತಿ ಅಳತೆ ಏನು ಹೇಳುತ್ತದೆ ಎಂದು ಕೇಳಿ.",
    voiceLanguage: "ಧ್ವನಿ ಭಾಷೆ",
    readAll: "ಎಲ್ಲಾ ಸೆನ್ಸರ್‌ಗಳನ್ನು ಕೇಳಿ",
    stop: "ಕೇಳುವುದನ್ನು ನಿಲ್ಲಿಸಿ",
    listen: "ಕೇಳಿ",
    currentReading: "ಪ್ರಸ್ತುತ ಅಳತೆ:",
    unsupported: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಪ್ಲೇಬ್ಯಾಕ್ ಲಭ್ಯವಿಲ್ಲ.",
    voiceUnavailable: "ಈ ಭಾಷೆಗೆ ಬ್ರೌಸರ್ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ. ಬೇರೆ ಧ್ವನಿ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    noReading: "ಅಳತೆ ಲಭ್ಯವಿಲ್ಲ",
    offlineEstimated: "ಆಫ್‌ಲೈನ್ ಅಂದಾಜು",
    sensorNames: ["ಮಣ್ಣಿನ ಸೆನ್ಸರ್‌ನ ಮೂಲ ಮೌಲ್ಯ", "ಗಾಳಿಯ ತಾಪಮಾನ", "ಗಾಳಿಯ ತೇವಾಂಶ", "ದೂರ"],
    explanations: [
      "ಇದು ಮಣ್ಣಿನ ಸೆನ್ಸರ್ ನೀಡುವ ಮೂಲ ಅನಲಾಗ್ ಮೌಲ್ಯ. ತೇವಾಂಶದ ಶೇಕಡಾವಾರು ಪಡೆಯಲು ಸೆನ್ಸರ್‌ಗೆ ತಕ್ಕ ಮಾಪನಾಂಕ ನಿರ್ಣಯ ಬೇಕು.",
      "ಇದು ರೋವರ್ ಸುತ್ತಲಿನ ಗಾಳಿಯ ತಾಪಮಾನ. ಹೆಚ್ಚು ಬಿಸಿ ಅಥವಾ ಚಳಿ ಬೆಳೆಗೆ ಒತ್ತಡ ಉಂಟುಮಾಡಬಹುದು. ನೀರಾವರಿ ಮತ್ತು ಹೊಲದ ಕೆಲಸವನ್ನು ಯೋಜಿಸಲು ಇದನ್ನು ಬಳಸಿ.",
      "ಇದು ರೋವರ್ ಸುತ್ತಲಿನ ಗಾಳಿಯ ತೇವಾಂಶದ ಶೇಕಡಾವಾರನ್ನು ಅಳೆಯುತ್ತದೆ.",
      "ಇದು ರೋವರ್‌ನ ದೂರ ಸೆನ್ಸರ್ ನೀಡುವ ಮೌಲ್ಯ. ಅಳತೆ ಇಲ್ಲದಿದ್ದರೆ ದೂರದ ಮೌಲ್ಯ ಈಗ ಲಭ್ಯವಿಲ್ಲ.",
    ],
  },
};

const speechLocales: Record<LanguageCode, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
  ta: "ta-IN",
  kn: "kn-IN",
};

const spokenUnits: Record<LanguageCode, { raw: string; percent: string; celsius: string; centimeters: string }> = {
  en: { raw: "raw sensor value", percent: "percent", celsius: "degrees Celsius", centimeters: "centimeters" },
  hi: { raw: "कच्चा सेंसर मान", percent: "प्रतिशत", celsius: "डिग्री सेल्सियस", centimeters: "सेंटीमीटर" },
  te: { raw: "ముడి సెన్సార్ విలువ", percent: "శాతం", celsius: "డిగ్రీల సెల్సియస్", centimeters: "సెంటీమీటర్లు" },
  ta: { raw: "சென்சார் மூல மதிப்பு", percent: "சதவீதம்", celsius: "டிகிரி செல்சியஸ்", centimeters: "சென்டிமீட்டர்கள்" },
  kn: { raw: "ಸೆನ್ಸರ್ ಮೂಲ ಮೌಲ್ಯ", percent: "ಶೇಕಡಾ", celsius: "ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್", centimeters: "ಸೆಂಟಿಮೀಟರ್" },
};

const roverPageCopy: Record<LanguageCode, {
  title: string;
  subtitle: string;
  live: string;
  connecting: string;
  offline: string;
  noReading: string;
  sensorLabels: string[];
  landView: string;
  holdingPosition: string;
  roverStopped: string;
  plotArea: string;
  controls: string;
  controlsHelp: string;
  roverStarted: string;
  start: string;
  stop: string;
  commands: Record<string, string>;
}> = {
  en: {
    title: "Rover Monitor", subtitle: "field unit", live: "Live", connecting: "Connecting", offline: "Offline - estimated", noReading: "No reading",
    sensorLabels: ["Soil sensor (raw)", "Ambient temp", "Air humidity", "Distance"],
    landView: "Land view — live position", holdingPosition: "Holding position", roverStopped: "Rover stopped", plotArea: "plot ~2 acres",
    controls: "Controls", controlsHelp: "Press and hold, or use arrow keys", roverStarted: "Rover started", start: "Start", stop: "Stop",
    commands: { fwd: "Forward", rev: "Reverse", left: "Turning left", right: "Turning right" },
  },
  hi: {
    title: "रोवर मॉनिटर", subtitle: "खेत की इकाई", live: "लाइव", connecting: "कनेक्ट हो रहा है", offline: "ऑफ़लाइन - अनुमानित", noReading: "रीडिंग उपलब्ध नहीं",
    sensorLabels: ["मिट्टी सेंसर (कच्चा मान)", "हवा का तापमान", "हवा की नमी", "दूरी"],
    landView: "खेत का दृश्य — वर्तमान स्थिति", holdingPosition: "एक ही जगह पर", roverStopped: "रोवर रुका हुआ है", plotArea: "खेत ~2 एकड़",
    controls: "नियंत्रण", controlsHelp: "दबाकर रखें या तीर वाली कुंजियों का उपयोग करें", roverStarted: "रोवर चालू है", start: "शुरू करें", stop: "रोकें",
    commands: { fwd: "आगे", rev: "पीछे", left: "बाएँ मुड़ रहा है", right: "दाएँ मुड़ रहा है" },
  },
  te: {
    title: "రోవర్ మానిటర్", subtitle: "పొలం యూనిట్", live: "ప్రత్యక్షం", connecting: "కనెక్ట్ అవుతోంది", offline: "ఆఫ్‌లైన్ - అంచనా", noReading: "కొలత అందుబాటులో లేదు",
    sensorLabels: ["నేల సెన్సార్ (ముడి విలువ)", "గాలి ఉష్ణోగ్రత", "గాలి తేమ", "దూరం"],
    landView: "పొలం దృశ్యం — ప్రస్తుత స్థానం", holdingPosition: "ఒకే చోట ఉంది", roverStopped: "రోవర్ ఆగి ఉంది", plotArea: "పొలం ~2 ఎకరాలు",
    controls: "నియంత్రణలు", controlsHelp: "నొక్కి పట్టుకోండి లేదా బాణం కీలను ఉపయోగించండి", roverStarted: "రోవర్ ప్రారంభమైంది", start: "ప్రారంభించు", stop: "ఆపు",
    commands: { fwd: "ముందుకు", rev: "వెనక్కి", left: "ఎడమవైపు తిరుగుతోంది", right: "కుడివైపు తిరుగుతోంది" },
  },
  ta: {
    title: "ரோவர் கண்காணிப்பு", subtitle: "வயல் அலகு", live: "நேரலை", connecting: "இணைக்கிறது", offline: "இணைப்பில் இல்லை - தோராயம்", noReading: "அளவீடு இல்லை",
    sensorLabels: ["மண் சென்சார் (மூல மதிப்பு)", "காற்று வெப்பநிலை", "காற்றின் ஈரப்பதம்", "தூரம்"],
    landView: "வயல் காட்சி — தற்போதைய நிலை", holdingPosition: "ஒரே இடத்தில் உள்ளது", roverStopped: "ரோவர் நிறுத்தப்பட்டது", plotArea: "வயல் ~2 ஏக்கர்",
    controls: "கட்டுப்பாடுகள்", controlsHelp: "அழுத்திப் பிடிக்கவும் அல்லது அம்புக்குறி விசைகளைப் பயன்படுத்தவும்", roverStarted: "ரோவர் தொடங்கியது", start: "தொடங்கு", stop: "நிறுத்து",
    commands: { fwd: "முன்னோக்கி", rev: "பின்னோக்கி", left: "இடப்புறம் திரும்புகிறது", right: "வலப்புறம் திரும்புகிறது" },
  },
  kn: {
    title: "ರೋವರ್ ಮಾನಿಟರ್", subtitle: "ಹೊಲದ ಘಟಕ", live: "ನೇರಪ್ರಸಾರ", connecting: "ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ", offline: "ಆಫ್‌ಲೈನ್ - ಅಂದಾಜು", noReading: "ಅಳತೆ ಲಭ್ಯವಿಲ್ಲ",
    sensorLabels: ["ಮಣ್ಣಿನ ಸೆನ್ಸರ್ (ಮೂಲ ಮೌಲ್ಯ)", "ಗಾಳಿಯ ತಾಪಮಾನ", "ಗಾಳಿಯ ತೇವಾಂಶ", "ದೂರ"],
    landView: "ಹೊಲದ ನೋಟ — ಪ್ರಸ್ತುತ ಸ್ಥಾನ", holdingPosition: "ಒಂದೇ ಸ್ಥಳದಲ್ಲಿದೆ", roverStopped: "ರೋವರ್ ನಿಂತಿದೆ", plotArea: "ಹೊಲ ~2 ಎಕರೆ",
    controls: "ನಿಯಂತ್ರಣಗಳು", controlsHelp: "ಒತ್ತಿಹಿಡಿಯಿರಿ ಅಥವಾ ಬಾಣದ ಕೀಲಿಗಳನ್ನು ಬಳಸಿ", roverStarted: "ರೋವರ್ ಪ್ರಾರಂಭವಾಗಿದೆ", start: "ಪ್ರಾರಂಭಿಸಿ", stop: "ನಿಲ್ಲಿಸಿ",
    commands: { fwd: "ಮುಂದಕ್ಕೆ", rev: "ಹಿಂದಕ್ಕೆ", left: "ಎಡಕ್ಕೆ ತಿರುಗುತ್ತಿದೆ", right: "ಬಲಕ್ಕೆ ತಿರುಗುತ್ತಿದೆ" },
  },
};

// Field is modeled as a bounded ~90m x 90m plot (8,100 m² ≈ 2 acres),
// centered on the rover's starting point. Swap BASE_LAT/BASE_LNG for the
// real GPS fix from your rover's receiver — these are placeholder origin
// coordinates only, used to derive a live lat/long from local x/y meters.
const FIELD_HALF = 45;
const ROVER_MARGIN = 5;
const BASE_LAT = 41.8781;
const BASE_LNG = -93.0977;
const METERS_PER_DEG_LAT = 111320;

function toLatLng(x, y) {
  const lat = BASE_LAT - y / METERS_PER_DEG_LAT;
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((BASE_LAT * Math.PI) / 180);
  const lng = BASE_LNG + x / metersPerDegLng;
  return { lat, lng };
}

function formatCoord(v, posLabel, negLabel) {
  return `${Math.abs(v).toFixed(6)}° ${v >= 0 ? posLabel : negLabel}`;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function StatCard({ icon: Icon, label, value, unit, accent }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 3,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 11 }}>
        <Icon size={13} style={{ color: accent }} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 500, color: "var(--text)", lineHeight: 1 }}>
          {value}
        </span>
        {unit && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--muted)" }}>{unit}</span>}
      </div>
    </div>
  );
}

function RoverBadge({ size = 40 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <polygon
        points="50,4 96,90 4,90"
        fill="none"
        stroke="var(--rust)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* top-down rover glyph: chassis, four wheels, solar deck, antenna */}
      <g transform="translate(50,52)">
        <line x1="0" y1="-26" x2="0" y2="-16" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="0" cy="-27" r="2.4" fill="var(--ok)" />
        <rect x="-17" y="-15" width="34" height="24" rx="3" fill="var(--rust)" />
        <rect x="-12" y="-10" width="24" height="14" rx="1.5" fill="var(--bg)" opacity="0.85" />
        <circle cx="-20" cy="-11" r="4" fill="var(--text)" />
        <circle cx="20" cy="-11" r="4" fill="var(--text)" />
        <circle cx="-20" cy="11" r="4" fill="var(--text)" />
        <circle cx="20" cy="11" r="4" fill="var(--text)" />
      </g>
    </svg>
  );
}

function CtrlButton({ onDown, onUp, children, disabled }) {
  return (
    <button
      disabled={disabled}
      onMouseDown={disabled ? undefined : onDown}
      onMouseUp={disabled ? undefined : onUp}
      onMouseLeave={disabled ? undefined : onUp}
      onTouchStart={(e) => {
        if (disabled) return;
        e.preventDefault();
        onDown();
      }}
      onTouchEnd={(e) => {
        if (disabled) return;
        e.preventDefault();
        onUp();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        background: "var(--track)",
        border: "1px solid var(--line)",
        color: disabled ? "var(--muted)" : "var(--text)",
        opacity: disabled ? 0.4 : 1,
        borderRadius: 3,
        padding: "12px 0",
        fontSize: 12,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {children}
    </button>
  );
}

function StartStopButton({ running, onToggle, copy }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        background: running ? "rgba(214,82,74,0.14)" : "rgba(90,196,120,0.16)",
        border: `1px solid ${running ? "var(--crit)" : "var(--ok)"}`,
        color: running ? "var(--crit)" : "var(--ok)",
        borderRadius: 3,
        padding: "12px 0",
        fontSize: 12,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 600,
        cursor: "pointer",
        userSelect: "none",
        touchAction: "none",
        transition: "background .2s ease, color .2s ease",
      }}
    >
      {running ? <Square size={14} /> : <Play size={14} />}
      {running ? copy.stop : copy.start}
    </button>
  );
}

export default function RoverMonitor() {
  const { currentLanguage } = useLanguage();
  const [speakingSensor, setSpeakingSensor] = useState<number | "all" | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceLanguage, setVoiceLanguage] = useState<LanguageCode>(currentLanguage);
  const voiceLanguageManuallyChanged = useRef(false);
  const pageCopy = roverPageCopy[currentLanguage];
  const { rover, sensorConnection } = useRover();
  const { soilMoisture, temperature, humidity, distance } = rover.monitoringData;
  const [approximateSensors, setApproximateSensors] = useState({
    soilMoisture: 650,
    temperature: 24.8,
    humidity: 55,
    distance: 60,
  });
  const posRef = useRef({ x: 0, y: 0, heading: 0 });
  const [pose, setPose] = useState({ x: 0, y: 0, heading: 0 });
  const [trail, setTrail] = useState([{ x: 0, y: 0 }]);
  const heldRef = useRef({ fwd: false, rev: false, left: false, right: false });
  const [activeCmd, setActiveCmd] = useState(null);
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);

  const voiceGuide = voiceGuideCopy[currentLanguage];
  const spokenGuide = voiceGuideCopy[voiceLanguage];
  const isApproximate = sensorConnection !== "connected";
  const displayedSoilMoisture = isApproximate ? approximateSensors.soilMoisture : soilMoisture;
  const displayedTemperature = isApproximate ? approximateSensors.temperature : temperature;
  const displayedHumidity = isApproximate ? approximateSensors.humidity : humidity;
  const displayedDistance = isApproximate ? approximateSensors.distance : distance;
  const locale = speechLocales[voiceLanguage];
  const languageVoice = availableVoices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase())
    ?? availableVoices.find((voice) => voice.lang.toLowerCase().startsWith(locale.slice(0, 2)));
  const units = spokenUnits[voiceLanguage];
  const estimatePrefix = isApproximate ? "~" : "";
  const moistureReading = displayedSoilMoisture === null ? pageCopy.noReading : `${estimatePrefix}${displayedSoilMoisture.toFixed(0)}`;
  const ambientReading = displayedTemperature === null ? pageCopy.noReading : `${estimatePrefix}${displayedTemperature.toFixed(1)}`;
  const humidityReading = displayedHumidity === null ? pageCopy.noReading : `${estimatePrefix}${displayedHumidity.toFixed(1)}`;
  const distanceReading = displayedDistance === null || (!isApproximate && displayedDistance < 0)
    ? pageCopy.noReading
    : `${estimatePrefix}${displayedDistance.toFixed(1)}`;
  const sensorValues = [
    moistureReading,
    `${ambientReading} °C`,
    `${humidityReading} %`,
    distanceReading === pageCopy.noReading ? distanceReading : `${distanceReading} cm`,
  ];
  const spokenReadings = [
    displayedSoilMoisture === null ? spokenGuide.noReading : `${moistureReading} ${units.raw}`,
    displayedTemperature === null ? spokenGuide.noReading : `${ambientReading} ${units.celsius}`,
    displayedHumidity === null ? spokenGuide.noReading : `${humidityReading} ${units.percent}`,
    distanceReading === pageCopy.noReading ? spokenGuide.noReading : `${distanceReading} ${units.centimeters}`,
  ];
  const sensorSpeech = spokenGuide.explanations.map((explanation, index) =>
    `${isApproximate ? `${spokenGuide.offlineEstimated}. ` : ""}${spokenGuide.sensorNames[index]}. ${spokenGuide.currentReading} ${spokenReadings[index]}. ${explanation}`
  );
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!voiceLanguageManuallyChanged.current) setVoiceLanguage(currentLanguage);
  }, [currentLanguage]);

  useEffect(() => {
    if (!isApproximate) return;
    const id = setInterval(() => {
      setApproximateSensors((previous) => ({
        soilMoisture: Math.round(clamp(previous.soilMoisture + (Math.random() - 0.5) * 24, 250, 900)),
        temperature: Number(clamp(previous.temperature + (Math.random() - 0.5) * 0.4, 10, 40).toFixed(1)),
        humidity: Number(clamp(previous.humidity + (Math.random() - 0.5) * 1.2, 25, 90).toFixed(1)),
        distance: Number(clamp(previous.distance + (Math.random() - 0.5) * 8, 10, 150).toFixed(1)),
      }));
    }, 1400);
    return () => clearInterval(id);
  }, [isApproximate]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const updateVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
  }, []);

  const speak = (text: string, sensor: number | "all") => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.voice = languageVoice ?? null;
    utterance.onend = () => setSpeakingSensor(null);
    utterance.onerror = () => setSpeakingSensor(null);
    setSpeakingSensor(sensor);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSupported) window.speechSynthesis.cancel();
    setSpeakingSensor(null);
  };

  useEffect(() => () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  // movement loop: applies whatever direction is currently held, every tick,
  // so it behaves like a live remote-control link rather than one-shot steps.
  // Gated on `running` — the rover only responds to input once started.
  useEffect(() => {
    const id = setInterval(() => {
      if (!runningRef.current) return;
      const held = heldRef.current;
      if (!held.fwd && !held.rev && !held.left && !held.right) return;
      const p = posRef.current;
      let heading = p.heading;
      if (held.left) heading -= TURN_STEP;
      if (held.right) heading += TURN_STEP;
      heading = ((heading % 360) + 360) % 360;

      let x = p.x;
      let y = p.y;
      if (held.fwd || held.rev) {
        const dir = held.fwd ? 1 : -1;
        const rad = (heading * Math.PI) / 180;
        x += Math.sin(rad) * MOVE_STEP * dir;
        y -= Math.cos(rad) * MOVE_STEP * dir;
      }
      x = clamp(x, -FIELD_HALF + ROVER_MARGIN, FIELD_HALF - ROVER_MARGIN);
      y = clamp(y, -FIELD_HALF + ROVER_MARGIN, FIELD_HALF - ROVER_MARGIN);

      posRef.current = { x, y, heading };
      setPose({ x, y, heading });
      if (held.fwd || held.rev) {
        setTrail((t) => [...t.slice(-80), { x, y }]);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const setHeld = useCallback((key, val) => {
    if (val && !runningRef.current) return; // ignore drive input while stopped
    heldRef.current[key] = val;
    const anyHeld = Object.values(heldRef.current).some(Boolean);
    setActiveCmd(anyHeld ? key : null);
  }, []);

  const stopAll = useCallback(() => {
    heldRef.current = { fwd: false, rev: false, left: false, right: false };
    setActiveCmd(null);
  }, []);

  const toggleRunning = useCallback(() => {
    setRunning((r) => {
      const next = !r;
      runningRef.current = next;
      if (!next) stopAll(); // stopping the rover also releases any held direction
      return next;
    });
  }, [stopAll]);

  // keyboard support: arrow keys mirror the on-screen d-pad
  useEffect(() => {
    const keyMap = { ArrowUp: "fwd", ArrowDown: "rev", ArrowLeft: "left", ArrowRight: "right" };
    const onDown = (e) => {
      const k = keyMap[e.key];
      if (k) {
        e.preventDefault();
        setHeld(k, true);
      }
      if (e.key === " ") stopAll();
    };
    const onUp = (e) => {
      const k = keyMap[e.key];
      if (k) setHeld(k, false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [setHeld, stopAll]);

  // camera-follow viewbox centered on the rover, so the land visual reads as
  // a live feed of the ground moving beneath/around it
  const cx = pose.x;
  const cy = pose.y;
  const view = 90;
  const toLocal = (p) => ({ x: p.x - cx, y: p.y - cy });
  const trailPts = trail.map(toLocal);
  const pathStr = trailPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const connectionLabel = sensorConnection === "connected"
    ? pageCopy.live
    : sensorConnection === "connecting" ? pageCopy.connecting : pageCopy.offline;
  const connectionColor = sensorConnection === "connected"
    ? "var(--ok)"
    : sensorConnection === "connecting" ? "var(--warn)" : "var(--crit)";

  // field boundary in local (camera-relative) coordinates, plus live GPS
  const fieldLeft = -FIELD_HALF - cx;
  const fieldTop = -FIELD_HALF - cy;
  const fieldSize = FIELD_HALF * 2;
  const { lat, lng } = toLatLng(pose.x, pose.y);

  return (
    <div
      style={{
        "--bg": "#F7FBF7",
        "--panel": "#FFFFFF",
        "--line": "#D9E6DA",
        "--track": "#EDF5EE",
        "--text": "#16241A",
        "--muted": "#5F7864",
        "--rust": "#B85A22",
        "--ok": "#2F9E52",
        "--warn": "#C98A1D",
        "--crit": "#C23B33",
        background: "radial-gradient(circle at 18% -10%, #E3F3E6 0%, transparent 55%), var(--bg)",
        color: "var(--text)",
        minHeight: "auto",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: 0,
      } as CSSProperties}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap');
        button { font-family: inherit; }
      `}</style>

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <RoverBadge />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 22, lineHeight: 1 }}>{pageCopy.title}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--muted)" }}>{pageCopy.subtitle}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
          <span style={{ width: 6, height: 6, borderRadius: 1, background: connectionColor, display: "inline-block" }} />
          {connectionLabel}
        </div>
      </div>

      {/* sensors */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 10 }}>
        <StatCard icon={Droplets} label={pageCopy.sensorLabels[0]} value={moistureReading} unit={displayedSoilMoisture === null ? "" : "ADC"} accent="var(--ok)" />
        <StatCard icon={Thermometer} label={pageCopy.sensorLabels[1]} value={ambientReading} unit={displayedTemperature === null ? "" : "°C"} accent="var(--warn)" />
        <StatCard icon={Droplets} label={pageCopy.sensorLabels[2]} value={humidityReading} unit={displayedHumidity === null ? "" : "%"} accent="var(--ok)" />
        <StatCard icon={Navigation} label={pageCopy.sensorLabels[3]} value={distanceReading} unit={distanceReading === pageCopy.noReading ? "" : "cm"} accent="var(--rust)" />
      </div>

      <section
        aria-labelledby="sensor-voice-title"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 3,
          padding: "14px 16px",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <h2 id="sensor-voice-title" style={{ margin: 0, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 600 }}>
              {voiceGuide.title}
            </h2>
            <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 12 }}>{voiceGuide.description}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label htmlFor="sensor-voice-language" style={{ color: "var(--muted)", fontSize: 10 }}>
                {voiceGuide.voiceLanguage}
              </label>
              <Select
                value={voiceLanguage}
                onValueChange={(value) => {
                  voiceLanguageManuallyChanged.current = true;
                  setVoiceLanguage(value as LanguageCode);
                }}
              >
                <SelectTrigger id="sensor-voice-language" aria-label={voiceGuide.voiceLanguage} className="h-8 w-[136px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      {language.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => speak(sensorSpeech.join(". "), "all")}
              disabled={!speechSupported}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 10px", border: "1px solid var(--ok)", borderRadius: 3, background: "rgba(90,196,120,0.12)", color: "var(--ok)", cursor: speechSupported ? "pointer" : "not-allowed", font: "inherit", fontSize: 12 }}
              aria-label={voiceGuide.readAll}
            >
              <Volume2 size={15} />
              {voiceGuide.readAll}
            </button>
            {speakingSensor !== null && (
              <button
                type="button"
                onClick={stopSpeaking}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 3, background: "var(--track)", color: "var(--text)", cursor: "pointer", font: "inherit", fontSize: 12 }}
              >
                <Square size={13} />
                {voiceGuide.stop}
              </button>
            )}
          </div>
        </div>
        {!speechSupported && <p role="status" style={{ margin: "0 0 8px", color: "var(--crit)", fontSize: 12 }}>{voiceGuide.unsupported}</p>}
        {speechSupported && availableVoices.length > 0 && !languageVoice && (
          <p role="status" style={{ margin: "0 0 8px", color: "var(--warn)", fontSize: 12 }}>{voiceGuide.voiceUnavailable}</p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
          {voiceGuide.sensorNames.map((name, index) => (
            <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 9 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{name}</div>
                <div style={{ marginTop: 3, color: "var(--muted)", fontSize: 11 }}>{sensorValues[index]}</div>
              </div>
              <button
                type="button"
                onClick={() => speak(sensorSpeech[index], index)}
                disabled={!speechSupported}
                aria-label={`${voiceGuide.listen}: ${name}`}
                title={`${voiceGuide.listen}: ${name}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 3, background: speakingSensor === index ? "var(--track)" : "var(--panel)", color: "var(--text)", cursor: speechSupported ? "pointer" : "not-allowed", font: "inherit", fontSize: 11 }}
              >
                <Volume2 size={14} />
                {voiceGuide.listen}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* land visual + controls */}
      <div style={{ display: "grid", gridTemplateColumns: "2.1fr 1fr", gap: 10 }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 3, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 11, color: "var(--muted)" }}>
              {pageCopy.landView}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--muted)" }}>
              <Navigation size={12} style={{ transform: `rotate(${pose.heading}deg)`, color: "var(--rust)" }} />
              {pose.heading.toFixed(0)}°
            </div>
          </div>

          <div
            style={{
              perspective: "1300px",
              height: 420,
              overflow: "hidden",
              borderRadius: 4,
              position: "relative",
              background: "#6E7A4A",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: "rotateX(44deg) scale(2.05)",
                transformOrigin: "50% 50%",
              }}
            >
              <svg viewBox={`${-view} ${-view} ${view * 2} ${view * 2}`} width="100%" height="100%" style={{ display: "block" }}>
                <defs>
                  {/* top-down furrowed field: alternating soil ridges, like the rows
                      a rover drives between. Offset by +3 so the rover always sits
                      centered in the gap between two ridges, panning as it moves. */}
                  <pattern
                    id="rows"
                    width="13"
                    height="13"
                    patternUnits="userSpaceOnUse"
                    patternTransform={`translate(${-cx + 3} 0)`}
                  >
                    <rect width="13" height="13" fill="#4E3D28" />
                    <rect x="0" width="7" height="13" fill="#5E4A30" />
                    <rect x="7" width="2" height="13" fill="#372A1B" opacity="0.6" />
                  </pattern>
                  <pattern
                    id="plants"
                    width="13"
                    height="11"
                    patternUnits="userSpaceOnUse"
                    patternTransform={`translate(${-cx + 3} ${-cy})`}
                  >
                    <circle cx="3.5" cy="2.5" r="1" fill="#5FAE5C" />
                    <circle cx="3.5" cy="8" r="1" fill="#5FAE5C" />
                  </pattern>
                  <pattern id="fleck" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform={`translate(${-cx % 9} ${-cy % 9})`}>
                    <circle cx="2" cy="2" r="0.5" fill="#6B5638" opacity="0.4" />
                    <circle cx="6" cy="6" r="0.4" fill="#2E2418" opacity="0.5" />
                  </pattern>
                </defs>
                <rect x={-view} y={-view} width={view * 2} height={view * 2} fill="#8A9463" />
                <rect x={-view} y={-view} width={view * 2} height={view * 2} fill="url(#fleck)" opacity="0.5" />

                {/* the bounded plot itself — roughly 90m x 90m, ~2 acres */}
                <rect x={fieldLeft} y={fieldTop} width={fieldSize} height={fieldSize} fill="url(#rows)" />
                <rect x={fieldLeft} y={fieldTop} width={fieldSize} height={fieldSize} fill="url(#plants)" />
                <rect x={fieldLeft} y={fieldTop} width={fieldSize} height={fieldSize} fill="url(#fleck)" />

                {/* traversed trail */}
                <path d={pathStr} fill="none" stroke="var(--ok)" strokeWidth="1" opacity="0.7" />

                {/* fence line marking the 4 edges of the plot */}
                <rect
                  x={fieldLeft}
                  y={fieldTop}
                  width={fieldSize}
                  height={fieldSize}
                  fill="none"
                  stroke="#3B2A18"
                  strokeWidth="2.2"
                />
                <rect
                  x={fieldLeft}
                  y={fieldTop}
                  width={fieldSize}
                  height={fieldSize}
                  fill="none"
                  stroke="#D8C48A"
                  strokeWidth="0.6"
                  strokeDasharray="3 2"
                />
                {/* corner posts */}
                {[
                  [fieldLeft, fieldTop],
                  [fieldLeft + fieldSize, fieldTop],
                  [fieldLeft, fieldTop + fieldSize],
                  [fieldLeft + fieldSize, fieldTop + fieldSize],
                ].map(([px, py], i) => (
                  <rect key={i} x={px - 1.4} y={py - 1.4} width="2.8" height="2.8" fill="#3B2A18" />
                ))}

                {/* rover, always centered; rotates with heading — drawn as a small
                    top-down rover instead of a directional arrow */}
                <g transform={`rotate(${pose.heading})`}>
                  <circle r="11" fill="none" stroke="var(--rust)" strokeWidth="0.6" opacity="0.4" />
                  <line x1="0" y1="-9" x2="0" y2="-6" stroke="var(--ok)" strokeWidth="1" strokeLinecap="round" />
                  <circle cx="0" cy="-9.5" r="0.9" fill="var(--ok)" />
                  <rect x="-6" y="-5.5" width="12" height="9" rx="1.2" fill="var(--rust)" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.4" />
                  <rect x="-4" y="-3.5" width="8" height="5" rx="0.6" fill="var(--bg)" opacity="0.85" />
                  <circle cx="-7" cy="-4" r="1.5" fill="#111" />
                  <circle cx="7" cy="-4" r="1.5" fill="#111" />
                  <circle cx="-7" cy="4" r="1.5" fill="#111" />
                  <circle cx="7" cy="4" r="1.5" fill="#111" />
                </g>
              </svg>
            </div>

            {/* sky-ish fade at the top edge to sell the tilt as depth, not just a skewed image */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "26%",
                background: "linear-gradient(to bottom, rgba(150,168,188,0.4), rgba(150,168,188,0))",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                boxShadow: "inset 0 0 60px 20px rgba(0,0,0,0.55)",
                pointerEvents: "none",
              }}
            />
          </div>

          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 11, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
            <span>
              {formatCoord(lat, "N", "S")}, {formatCoord(lng, "E", "W")}
            </span>
            <span>{running ? (activeCmd ? pageCopy.commands[activeCmd] : pageCopy.holdingPosition) : pageCopy.roverStopped}</span>
          </div>
          <div style={{ marginTop: 3, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
            <span>x {pose.x.toFixed(1)}m  y {pose.y.toFixed(1)}m</span>
            <span>{pageCopy.plotArea}</span>
          </div>
        </div>

        {/* controls */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 3, padding: "14px 16px", display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
            {pageCopy.controls} — {pageCopy.controlsHelp}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, flex: 1, alignContent: "start" }}>
            <div />
            <CtrlButton disabled={!running} onDown={() => setHeld("fwd", true)} onUp={() => setHeld("fwd", false)}>
              <ArrowUp size={16} />
            </CtrlButton>
            <div />

            <CtrlButton disabled={!running} onDown={() => setHeld("left", true)} onUp={() => setHeld("left", false)}>
              <ArrowLeft size={16} />
            </CtrlButton>
            <StartStopButton running={running} onToggle={toggleRunning} copy={pageCopy} />
            <CtrlButton disabled={!running} onDown={() => setHeld("right", true)} onUp={() => setHeld("right", false)}>
              <ArrowRight size={16} />
            </CtrlButton>

            <div />
            <CtrlButton disabled={!running} onDown={() => setHeld("rev", true)} onUp={() => setHeld("rev", false)}>
              <ArrowDown size={16} />
            </CtrlButton>
            <div />
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: running ? "var(--ok)" : "var(--muted)",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 1,
                background: running ? "var(--ok)" : "var(--muted)",
                display: "inline-block",
              }}
            />
            {running ? pageCopy.roverStarted : pageCopy.roverStopped}
          </div>
        </div>
      </div>
    </div>
  );
}
