import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region?: string;
}

interface LanguagePickerProps {
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  availableLanguages?: Language[];
  showNativeName?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

const DEFAULT_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', region: 'Global' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', region: 'Africa' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'Europe' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'Europe' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'Europe' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'Europe' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', region: 'Europe' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'Europe' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'Asia' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'Asia' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', region: 'Asia' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'Asia' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'Middle East' },
  // Add more languages as needed
];

export const LanguagePicker: React.FC<LanguagePickerProps> = ({
  selectedLanguage,
  onLanguageChange,
  availableLanguages = DEFAULT_LANGUAGES,
  showNativeName = true,
  compact = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedLang = availableLanguages.find(lang => lang.code === selectedLanguage);

  const filteredLanguages = availableLanguages.filter(lang =>
    lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedLanguages = filteredLanguages.reduce((groups, lang) => {
    const region = lang.region || 'Other';
    if (!groups[region]) {
      groups[region] = [];
    }
    groups[region].push(lang);
    return groups;
  }, {} as Record<string, Language[]>);

  const handleLanguageSelect = (languageCode: string) => {
    onLanguageChange(languageCode);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest('.language-picker')) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (compact) {
    return (
      <div className="relative language-picker">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <GlobeAltIcon className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{selectedLang?.code.toUpperCase()}</span>
          <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="p-2">
              <input
                type="text"
                placeholder="Search languages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={handleKeyDown}
              />
            </div>
            <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
              {Object.entries(groupedLanguages).map(([region, languages]) => (
                <li key={region}>
                  <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 uppercase tracking-wide">
                    {region}
                  </div>
                  {languages.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => handleLanguageSelect(language.code)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                        selectedLanguage === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                      }`}
                      role="option"
                      aria-selected={selectedLanguage === language.code}
                    >
                      <span className="text-lg">{language.flag}</span>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{language.name}</div>
                        {showNativeName && language.nativeName !== language.name && (
                          <div className="text-xs text-gray-500">{language.nativeName}</div>
                        )}
                      </div>
                      {selectedLanguage === language.code && (
                        <CheckIcon className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative language-picker">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center justify-between w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-3">
          {selectedLang && (
            <>
              <span className="text-2xl">{selectedLang.flag}</span>
              <div>
                <div className="font-medium text-gray-900">{selectedLang.name}</div>
                {showNativeName && selectedLang.nativeName !== selectedLang.name && (
                  <div className="text-sm text-gray-500">{selectedLang.nativeName}</div>
                )}
              </div>
            </>
          )}
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search languages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {Object.entries(groupedLanguages).map(([region, languages]) => (
              <div key={region}>
                <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 uppercase tracking-wide border-b border-gray-200">
                  {region}
                </div>
                <ul role="listbox">
                  {languages.map((language) => (
                    <li key={language.code}>
                      <button
                        onClick={() => handleLanguageSelect(language.code)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                          selectedLanguage === language.code ? 'bg-blue-50' : ''
                        }`}
                        role="option"
                        aria-selected={selectedLanguage === language.code}
                      >
                        <span className="text-2xl">{language.flag}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{language.name}</div>
                          {showNativeName && language.nativeName !== language.name && (
                            <div className="text-sm text-gray-500">{language.nativeName}</div>
                          )}
                        </div>
                        {selectedLanguage === language.code && (
                          <CheckIcon className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
