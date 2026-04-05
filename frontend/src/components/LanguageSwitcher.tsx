import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "ru", label: "РУС" },
  { code: "kk", label: "ҚАЗ" },
  { code: "en", label: "ENG" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="lang-switcher">
      {LANGS.map((lang) => (
        <button
          key={lang.code}
          className={`lang-btn ${i18n.language === lang.code ? "active" : ""}`}
          onClick={() => i18n.changeLanguage(lang.code)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
