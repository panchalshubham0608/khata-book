import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import english from "../locales/english.json";
import hindi from "../locales/hindi.json";

export type Locale = "en" | "hi";

interface LocaleContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, vars?: Record<string, string | number>) => string;
}

const translations: Record<Locale, Record<string, string>> = {
    en: english,
    hi: hindi,
};

const interpolate = (value: string, vars?: Record<string, string | number>) => {
    if (!vars) return value;
    return Object.entries(vars).reduce((result, [key, replacement]) => {
        return result.replace(new RegExp(`\\{${key}\\}`, "g"), String(replacement));
    }, value);
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocaleState] = useState<Locale>("hi");

    useEffect(() => {
        const savedLocale = localStorage.getItem("locale") as Locale | null;
        if (savedLocale === "en" || savedLocale === "hi") {
            setLocaleState(savedLocale);
        } else {
            setLocaleState("hi");
        }
    }, []);

    const setLocale = (nextLocale: Locale) => {
        setLocaleState(nextLocale);
        localStorage.setItem("locale", nextLocale);
    };

    const t = useMemo(
        () => (key: string, vars?: Record<string, string | number>) => {
            const translation = translations[locale][key] || translations.hi[key] || key;
            return interpolate(translation, vars);
        },
        [locale]
    );

    return (
        <LocaleContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LocaleContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LocaleContext);
    if (!context) {
        throw new Error("useTranslation must be used within a LocaleProvider");
    }
    return context;
};
