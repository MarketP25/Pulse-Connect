import { useLanguage } from "@/context/LanguageProvider";

  const { lang, setLang } = useLanguage();
export default function LocaleSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="locale-select" className="text-sm font-medium text-gray-700">
        🌐 Language
      </label>
      <select
        id="locale-select"
        value={lang}
        onChange={e => setLang(e.target.value)}
        className="border px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="en">English</option>
        <option value="sw">Swahili</option>
        <option value="yo">Yoruba</option>
        <option value="ar">Arabic</option>
        <option value="pt">Portuguese</option>
        <option value="hi">Hindi</option>
      </select>
    </div>
  );
}
