import { useTranslation } from "../i18n/locale";

const LanguageSwitcher = () => {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="language-switcher" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label htmlFor="language-select" style={{ fontSize: 14, fontWeight: 500 }}>
        {t("language.label")}:
      </label>
      <select
        id="language-select"
        value={locale}
        onChange={(event) => setLocale(event.target.value as "en" | "hi")}
        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc" }}
      >
        <option value="en">{t("language.english")}</option>
        <option value="hi">{t("language.hindi")}</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
