import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LanguageCode } from '@/lib/translations';
import { ArrowUp, Bot, Bug, ChevronDown, Leaf, MessageCircle } from 'lucide-react';

type Message = {
  id: number;
  from: 'assistant' | 'user';
  text: string;
};

type AssistantCopy = {
  title: string;
  subtitle: string;
  greeting: string;
  placeholder: string;
  send: string;
  reportIssue: string;
  quickQuestions: string[];
  unknown: string;
  issuePrompt: string;
  cropHelp: string;
  roverHelp: string;
  weatherHelp: string;
  jobsHelp: string;
  marketHelp: string;
  accountHelp: string;
  languageHelp: string;
  issueSubject: string;
  pageLabel: string;
};

const assistantCopy: Record<LanguageCode, AssistantCopy> = {
  en: {
    title: 'Farm Assistant', subtitle: 'Help for Agri-Rover',
    greeting: 'Hello! Ask me about crops, rover monitoring, weather, jobs, or using the marketplace. For a page problem, use “Report issue” and your current page will be included.',
    placeholder: 'Type your question...', send: 'Send message', reportIssue: 'Report issue',
    quickQuestions: ['Crop or plant health', 'Rover monitoring', 'Weather and alerts', 'Jobs and marketplace'],
    unknown: 'I don’t have a verified answer for that yet. Try asking about crops, rover monitoring, weather, jobs, or the marketplace. You can also report a site problem using the button below.',
    issuePrompt: 'Tell me what went wrong, then choose “Report issue” to open an email to the support team with this page and your description included.',
    cropHelp: 'Open Crop Guide to browse growing advice by crop, or Plant Scanner to check a plant for possible disease and treatment guidance.',
    roverHelp: 'Open Rover Monitor to view the monitoring dashboard and rover controls. If readings look wrong, report the issue and include what you expected to see.',
    weatherHelp: 'The home page shows current weather and a five-day forecast. Alerts can show weather warnings; allow browser notifications if you want them.',
    jobsHelp: 'Use Post Job to publish farm work, Find Jobs to browse available work, or View Matches to review job matches. Sign in may be required.',
    marketHelp: 'Open Marketplace to browse produce. To offer produce for sale, sign in and use Add Listing from the marketplace workflow.',
    accountHelp: 'Use Login in the header to sign in or create an account. After signing in, use My Profile to manage your farmer details.',
    languageHelp: 'Use the language selector in the header to switch between English, Hindi, Telugu, Tamil, and Kannada.',
    issueSubject: 'Agri-Rover website issue', pageLabel: 'Page',
  },
  hi: {
    title: 'कृषि सहायक', subtitle: 'एग्री-रोवर सहायता',
    greeting: 'नमस्ते! फसल, रोवर निगरानी, मौसम, काम या बाज़ार के उपयोग के बारे में पूछें। वेबसाइट की समस्या बताने के लिए “समस्या रिपोर्ट करें” दबाएँ; वर्तमान पेज रिपोर्ट में शामिल होगा।',
    placeholder: 'अपना सवाल लिखें...', send: 'संदेश भेजें', reportIssue: 'समस्या रिपोर्ट करें',
    quickQuestions: ['फसल या पौधे का स्वास्थ्य', 'रोवर निगरानी', 'मौसम और अलर्ट', 'काम और बाज़ार'],
    unknown: 'मेरे पास अभी इसका सत्यापित उत्तर नहीं है। फसल, रोवर निगरानी, मौसम, काम या बाज़ार के बारे में पूछें। वेबसाइट की समस्या नीचे दिए बटन से भेजें।',
    issuePrompt: 'क्या समस्या हुई, बताएं। फिर “समस्या रिपोर्ट करें” दबाएँ; ईमेल में यह पेज और आपका विवरण शामिल होगा।',
    cropHelp: 'फसल के अनुसार खेती की जानकारी के लिए Crop Guide खोलें। पौधे की संभावित बीमारी और उपचार जानकारी के लिए Plant Scanner खोलें।',
    roverHelp: 'निगरानी डैशबोर्ड और रोवर नियंत्रण देखने के लिए Rover Monitor खोलें। रीडिंग गलत हो तो अपेक्षित परिणाम के साथ समस्या रिपोर्ट करें।',
    weatherHelp: 'होम पेज पर वर्तमान मौसम और पांच दिन का पूर्वानुमान दिखता है। मौसम चेतावनी के लिए Alerts देखें।',
    jobsHelp: 'खेती का काम पोस्ट करने के लिए Post Job, काम खोजने के लिए Find Jobs और मेल देखने के लिए View Matches चुनें। साइन इन आवश्यक हो सकता है।',
    marketHelp: 'उत्पाद देखने के लिए Marketplace खोलें। उत्पाद बेचने के लिए साइन इन करके Add Listing का उपयोग करें।',
    accountHelp: 'साइन इन या खाता बनाने के लिए Header में Login चुनें। साइन इन के बाद My Profile से किसान की जानकारी बदलें।',
    languageHelp: 'Header के भाषा चयन से हिंदी, अंग्रेज़ी, तेलुगु, तमिल या कन्नड़ चुनें।',
    issueSubject: 'एग्री-रोवर वेबसाइट समस्या', pageLabel: 'पेज',
  },
  te: {
    title: 'వ్యవసాయ సహాయకుడు', subtitle: 'అగ్రి-రోవర్ సహాయం',
    greeting: 'నమస్కారం! పంటలు, రోవర్ పర్యవేక్షణ, వాతావరణం, పనులు లేదా మార్కెట్ గురించి అడగండి. వెబ్‌సైట్ సమస్య కోసం “సమస్యను నివేదించండి” ఎంచుకోండి; ప్రస్తుత పేజీ నివేదికలో చేర్చబడుతుంది.',
    placeholder: 'మీ ప్రశ్నను టైప్ చేయండి...', send: 'సందేశం పంపండి', reportIssue: 'సమస్యను నివేదించండి',
    quickQuestions: ['పంట లేదా మొక్క ఆరోగ్యం', 'రోవర్ పర్యవేక్షణ', 'వాతావరణం మరియు హెచ్చరికలు', 'పనులు మరియు మార్కెట్'],
    unknown: 'దీనికి ధృవీకరించిన సమాధానం ప్రస్తుతం లేదు. పంటలు, రోవర్, వాతావరణం, పనులు లేదా మార్కెట్ గురించి అడగండి. వెబ్‌సైట్ సమస్యను క్రింది బటన్ ద్వారా నివేదించండి.',
    issuePrompt: 'ఏమి తప్పు జరిగిందో వివరించండి. తర్వాత “సమస్యను నివేదించండి” ఎంచుకుంటే ఈ పేజీ, మీ వివరణతో మద్దతు బృందానికి ఇమెయిల్ తెరుచుకుంటుంది.',
    cropHelp: 'పంటల వారీ సాగు సూచనల కోసం Crop Guide తెరవండి. మొక్కల వ్యాధి, చికిత్స సూచనల కోసం Plant Scanner తెరవండి.',
    roverHelp: 'పర్యవేక్షణ డాష్‌బోర్డ్, రోవర్ నియంత్రణల కోసం Rover Monitor తెరవండి. రీడింగ్‌లు తప్పుగా ఉంటే సమస్యను నివేదించండి.',
    weatherHelp: 'హోమ్ పేజీలో ప్రస్తుత వాతావరణం, ఐదు రోజుల అంచనా ఉంటాయి. హెచ్చరికల కోసం Alerts చూడండి.',
    jobsHelp: 'పని పోస్ట్ చేయడానికి Post Job, పనులు వెతకడానికి Find Jobs, సరిపోలికల కోసం View Matches ఉపయోగించండి. సైన్ ఇన్ అవసరం కావచ్చు.',
    marketHelp: 'ఉత్పత్తులను చూడటానికి Marketplace తెరవండి. అమ్మకానికి ఉత్పత్తి జాబితా చేయడానికి సైన్ ఇన్ చేసి Add Listing ఎంచుకోండి.',
    accountHelp: 'సైన్ ఇన్ లేదా ఖాతా సృష్టించడానికి Header లో Login ఎంచుకోండి. సైన్ ఇన్ తర్వాత My Profile ద్వారా రైతు వివరాలను నిర్వహించండి.',
    languageHelp: 'Header లోని భాష ఎంపిక ద్వారా తెలుగు, హిందీ, ఇంగ్లీష్, తమిళం లేదా కన్నడ ఎంచుకోండి.',
    issueSubject: 'అగ్రి-రోవర్ వెబ్‌సైట్ సమస్య', pageLabel: 'పేజీ',
  },
  ta: {
    title: 'விவசாய உதவியாளர்', subtitle: 'அக்ரி-ரோவர் உதவி',
    greeting: 'வணக்கம்! பயிர்கள், ரோவர் கண்காணிப்பு, வானிலை, வேலைகள் அல்லது சந்தை பயன்பாடு பற்றி கேளுங்கள். இணையதளச் சிக்கலுக்கு “சிக்கலைப் புகாரளி” என்பதைத் தேர்ந்தெடுக்கவும்; தற்போதைய பக்கம் புகாரில் சேர்க்கப்படும்.',
    placeholder: 'உங்கள் கேள்வியை எழுதுங்கள்...', send: 'செய்தி அனுப்பு', reportIssue: 'சிக்கலைப் புகாரளி',
    quickQuestions: ['பயிர் அல்லது தாவர ஆரோக்கியம்', 'ரோவர் கண்காணிப்பு', 'வானிலை மற்றும் எச்சரிக்கைகள்', 'வேலைகள் மற்றும் சந்தை'],
    unknown: 'இதற்கான சரிபார்க்கப்பட்ட பதில் என்னிடம் இன்னும் இல்லை. பயிர்கள், ரோவர், வானிலை, வேலைகள் அல்லது சந்தை பற்றி கேளுங்கள். இணையதளச் சிக்கலை கீழே புகாரளிக்கலாம்.',
    issuePrompt: 'என்ன சிக்கல் ஏற்பட்டது என்று எழுதுங்கள். பிறகு “சிக்கலைப் புகாரளி” என்பதைத் தேர்ந்தெடுத்தால் இந்தப் பக்கம் மற்றும் உங்கள் விளக்கத்துடன் ஆதரவு மின்னஞ்சல் திறக்கும்.',
    cropHelp: 'பயிர் சாகுபடி ஆலோசனைக்கு Crop Guide-ஐத் திறக்கவும். தாவர நோய் மற்றும் சிகிச்சை தகவலுக்கு Plant Scanner-ஐத் திறக்கவும்.',
    roverHelp: 'கண்காணிப்பு பலகை மற்றும் ரோவர் கட்டுப்பாடுகளுக்கு Rover Monitor-ஐத் திறக்கவும். அளவீடுகள் தவறாக இருந்தால் புகாரளிக்கவும்.',
    weatherHelp: 'முகப்புப் பக்கத்தில் தற்போதைய வானிலை மற்றும் ஐந்து நாள் முன்னறிவிப்பு இருக்கும். எச்சரிக்கைகளுக்கு Alerts-ஐப் பார்க்கவும்.',
    jobsHelp: 'வேலை வெளியிட Post Job, வேலை தேட Find Jobs, பொருத்தங்களைப் பார்க்க View Matches பயன்படுத்தவும். உள்நுழைவு தேவைப்படலாம்.',
    marketHelp: 'விளைபொருட்களைப் பார்க்க Marketplace-ஐத் திறக்கவும். விற்பனைப் பட்டியல் சேர்க்க உள்நுழைந்து Add Listing பயன்படுத்தவும்.',
    accountHelp: 'உள்நுழைய அல்லது கணக்கு உருவாக்க Header-இல் Login தேர்ந்தெடுக்கவும். பின்னர் My Profile மூலம் விவசாயி விவரங்களை நிர்வகிக்கலாம்.',
    languageHelp: 'Header மொழித் தேர்வில் தமிழ், ஆங்கிலம், இந்தி, தெலுங்கு அல்லது கன்னடம் தேர்ந்தெடுக்கவும்.',
    issueSubject: 'அக்ரி-ரோவர் இணையதளச் சிக்கல்', pageLabel: 'பக்கம்',
  },
  kn: {
    title: 'ಕೃಷಿ ಸಹಾಯಕ', subtitle: 'ಅಗ್ರಿ-ರೋವರ್ ಸಹಾಯ',
    greeting: 'ನಮಸ್ಕಾರ! ಬೆಳೆಗಳು, ರೋವರ್ ಮೇಲ್ವಿಚಾರಣೆ, ಹವಾಮಾನ, ಕೆಲಸಗಳು ಅಥವಾ ಮಾರುಕಟ್ಟೆ ಬಳಕೆಯ ಬಗ್ಗೆ ಕೇಳಿ. ವೆಬ್‌ಸೈಟ್ ಸಮಸ್ಯೆಗೆ “ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ” ಆಯ್ಕೆಮಾಡಿ; ಪ್ರಸ್ತುತ ಪುಟ ವರದಿಯಲ್ಲಿ ಸೇರಿಸಲಾಗುತ್ತದೆ.',
    placeholder: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ...', send: 'ಸಂದೇಶ ಕಳುಹಿಸಿ', reportIssue: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
    quickQuestions: ['ಬೆಳೆ ಅಥವಾ ಸಸ್ಯ ಆರೋಗ್ಯ', 'ರೋವರ್ ಮೇಲ್ವಿಚಾರಣೆ', 'ಹವಾಮಾನ ಮತ್ತು ಎಚ್ಚರಿಕೆಗಳು', 'ಕೆಲಸಗಳು ಮತ್ತು ಮಾರುಕಟ್ಟೆ'],
    unknown: 'ಇದಕ್ಕೆ ಪರಿಶೀಲಿಸಿದ ಉತ್ತರ ನನ್ನ ಬಳಿ ಇನ್ನೂ ಇಲ್ಲ. ಬೆಳೆ, ರೋವರ್, ಹವಾಮಾನ, ಕೆಲಸ ಅಥವಾ ಮಾರುಕಟ್ಟೆಯ ಬಗ್ಗೆ ಕೇಳಿ. ವೆಬ್‌ಸೈಟ್ ಸಮಸ್ಯೆಯನ್ನು ಕೆಳಗಿನ ಬಟನ್ ಮೂಲಕ ವರದಿ ಮಾಡಿ.',
    issuePrompt: 'ಏನು ತಪ್ಪಾಗಿದೆ ಎಂದು ವಿವರಿಸಿ. ನಂತರ “ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ” ಆಯ್ಕೆ ಮಾಡಿದರೆ ಈ ಪುಟ ಮತ್ತು ನಿಮ್ಮ ವಿವರಣೆಯೊಂದಿಗೆ ಬೆಂಬಲ ಇಮೇಲ್ ತೆರೆಯುತ್ತದೆ.',
    cropHelp: 'ಬೆಳೆವಾರು ಕೃಷಿ ಸಲಹೆಗಾಗಿ Crop Guide ತೆರೆಯಿರಿ. ಸಸ್ಯದ ರೋಗ ಮತ್ತು ಚಿಕಿತ್ಸೆಯ ಮಾಹಿತಿಗಾಗಿ Plant Scanner ತೆರೆಯಿರಿ.',
    roverHelp: 'ಮೇಲ್ವಿಚಾರಣಾ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಮತ್ತು ರೋವರ್ ನಿಯಂತ್ರಣಗಳಿಗಾಗಿ Rover Monitor ತೆರೆಯಿರಿ. ಓದುಗಳು ತಪ್ಪಾಗಿದ್ದರೆ ವರದಿ ಮಾಡಿ.',
    weatherHelp: 'ಮುಖಪುಟದಲ್ಲಿ ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಮತ್ತು ಐದು ದಿನಗಳ ಮುನ್ಸೂಚನೆ ಇದೆ. ಎಚ್ಚರಿಕೆಗಳಿಗಾಗಿ Alerts ನೋಡಿ.',
    jobsHelp: 'ಕೆಲಸ ಪ್ರಕಟಿಸಲು Post Job, ಕೆಲಸ ಹುಡುಕಲು Find Jobs, ಹೊಂದಾಣಿಕೆಗಳಿಗೆ View Matches ಬಳಸಿ. ಸೈನ್ ಇನ್ ಅಗತ್ಯವಾಗಬಹುದು.',
    marketHelp: 'ಉತ್ಪನ್ನಗಳನ್ನು ನೋಡಲು Marketplace ತೆರೆಯಿರಿ. ಮಾರಾಟಕ್ಕೆ ಪಟ್ಟಿ ಸೇರಿಸಲು ಸೈನ್ ಇನ್ ಮಾಡಿ Add Listing ಬಳಸಿ.',
    accountHelp: 'ಸೈನ್ ಇನ್ ಅಥವಾ ಖಾತೆ ರಚಿಸಲು Header ನಲ್ಲಿ Login ಆಯ್ಕೆಮಾಡಿ. ನಂತರ My Profile ಮೂಲಕ ರೈತರ ವಿವರಗಳನ್ನು ನಿರ್ವಹಿಸಿ.',
    languageHelp: 'Header ಭಾಷಾ ಆಯ್ಕೆಯಲ್ಲಿ ಕನ್ನಡ, ಇಂಗ್ಲಿಷ್, ಹಿಂದಿ, ತೆಲುಗು ಅಥವಾ ತಮಿಳು ಆಯ್ಕೆಮಾಡಿ.',
    issueSubject: 'ಅಗ್ರಿ-ರೋವರ್ ವೆಬ್‌ಸೈಟ್ ಸಮಸ್ಯೆ', pageLabel: 'ಪುಟ',
  },
};

const HelpAssistant = () => {
  const { currentLanguage } = useLanguage();
  const location = useLocation();
  const copy = assistantCopy[currentLanguage];
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: 'assistant', text: copy.greeting },
  ]);
  const nextMessageId = useRef(1);
  const conversationEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const getReply = (question: string) => {
    const text = question.toLocaleLowerCase();
    if (/crop|plant|disease|pest|fertili|फसल|पौध|పంట|మొక్క|பயிர்|தாவர|ಬೆಳೆ|ಸಸ್ಯ/.test(text)) return copy.cropHelp;
    if (/rover|sensor|monitor|ரோவர்|ரோவர|ರೋವರ್|నిఘా|పర్యవేక్షణ|ಮೇಲ್ವಿಚಾರಣ|கண்காணிப்ப/.test(text)) return copy.roverHelp;
    if (/weather|forecast|rain|alert|மழை|வானிலை|ಮಳೆ|ಹವಾಮಾನ|వాతావరణ|వర్ష|मौसम|बारिश|अलर्ट/.test(text)) return copy.weatherHelp;
    if (/job|labou?r|worker|काम|नौकरी|வேலை|தொழிலாளர்|ಕೆಲಸ|ಕೆಲಸಗಾರ|పని|ఉద్యోగ/.test(text)) return copy.jobsHelp;
    if (/market|sell|buy|product|produce|listing|बाजार|बेच|खरीद|சந்தை|விற்பனை|ಮಾರುಕಟ್ಟೆ|ಮಾರಾಟ|మార్కెట్|అమ్మ/.test(text)) return copy.marketHelp;
    if (/login|sign.?in|account|profile|खाता|लॉगिन|உள்நுழை|கணக்கு|ಲಾಗಿನ್|ಖಾತೆ|లాగిన్|ఖాతా/.test(text)) return copy.accountHelp;
    if (/language|தமிழ்|ಕನ್ನಡ|తెలుగు|हिंदी|भाषा|மொழி|ಭಾಷೆ|భాష/.test(text)) return copy.languageHelp;
    if (/issue|problem|bug|error|not work|broken|சிக்கல்|பிரச்சனை|ಸಮಸ್ಯೆ|సమస్య|समस्या|दिक्कत/.test(text)) return copy.issuePrompt;
    return copy.unknown;
  };

  const sendMessage = (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;
    const id = nextMessageId.current;
    nextMessageId.current += 2;
    setMessages((current) => [
      ...current,
      { id, from: 'user', text },
      { id: id + 1, from: 'assistant', text: getReply(text) },
    ]);
    setInput('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  const reportIssue = () => {
    const recentQuestion = [...messages].reverse().find((message) => message.from === 'user')?.text ?? '';
    const page = `${window.location.origin}${location.pathname}${location.search}`;
    const body = `${copy.pageLabel}: ${page}\n\nIssue description:\n${recentQuestion || 'Please describe the issue here.'}`;
    window.location.href = `mailto:support@agrirover99.com?subject=${encodeURIComponent(copy.issueSubject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-green-700 px-5 py-3 text-white shadow-lg transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          aria-label={copy.title}
          title={copy.title}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-semibold">{copy.title}</span>
        </button>
      )}

      {isOpen && (
        <section
          className="fixed bottom-3 right-3 z-50 flex h-[min(640px,calc(100dvh-1.5rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl sm:bottom-5 sm:right-5"
          aria-label={copy.title}
        >
          <header className="flex items-center justify-between gap-3 bg-green-800 px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Leaf className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{copy.title}</h2>
                <p className="truncate text-xs text-green-100">{copy.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close assistant"
            >
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-2 ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.from === 'assistant' && (
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-800">
                    <Bot className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${message.from === 'user' ? 'rounded-br-sm bg-green-800 text-white' : 'rounded-bl-sm border bg-background text-foreground'}`}>
                  {message.text}
                </p>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pl-9">
                {copy.quickQuestions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() => sendMessage(question)}
                    className="rounded-full border border-green-700/30 bg-background px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
            <div ref={conversationEnd} />
          </div>

          <div className="border-t bg-background p-3">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <label className="sr-only" htmlFor="help-assistant-input">{copy.placeholder}</label>
              <textarea
                id="help-assistant-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder={copy.placeholder}
                rows={1}
                className="max-h-24 min-h-11 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-green-600"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label={copy.send}
                title={copy.send}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-800 text-white transition-colors hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUp className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
            <button
              type="button"
              onClick={reportIssue}
              className="mt-2 inline-flex items-center gap-1.5 rounded text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              <Bug className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.reportIssue}
            </button>
          </div>
        </section>
      )}
    </>
  );
};

export default HelpAssistant;