import React from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LanguageCode } from '@/lib/translations';

const LanguageSelector: React.FC = () => {
    const { currentLanguage, setLanguage, availableLanguages, t } = useLanguage();

    const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                    aria-label={t('language')}
                >
                    <Languages className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentLang?.flag}</span>
                    <span className="hidden md:inline">{currentLang?.name}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {availableLanguages.map((language) => (
                    <DropdownMenuItem
                        key={language.code}
                        onClick={() => setLanguage(language.code as LanguageCode)}
                        className={`flex items-center space-x-2 cursor-pointer ${currentLanguage === language.code ? 'bg-accent' : ''
                            }`}
                    >
                        <span>{language.flag}</span>
                        <span>{language.name}</span>
                        {currentLanguage === language.code && (
                            <span className="ml-auto text-green-600">✓</span>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default LanguageSelector;