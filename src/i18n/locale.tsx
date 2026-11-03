import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import english from "../locales/english.json";
import hindi from "../locales/hindi.json";

export type Locale = "en" | "hi";

export const MIN_FONT_SCALE = 0.85;
export const MAX_FONT_SCALE = 1.5;
export const DEFAULT_FONT_SCALE = 1;
export const FONT_SCALE_STEP = 0.05;

export const FONT_SCALE_PRESETS = [
    { value: 1, label: "100%" },
    { value: 1.15, label: "115%" },
    { value: 1.3, label: "130%" },
    { value: 1.45, label: "145%" },
] as const;

export function sanitizeFontScale(raw: unknown): number {
    if (raw === null || raw === undefined || raw === "") {
        return DEFAULT_FONT_SCALE;
    }
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_FONT_SCALE;
    const clamped = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, parsed));
    return Math.round(clamped * 100) / 100;
}

function applyFontScaleToDocument(scale: number): void {
    if (typeof document === "undefined") return;
    const safeScale = sanitizeFontScale(scale);
    document.documentElement.style.setProperty(
        "--font-scale",
        String(safeScale)
    );
    document.documentElement.setAttribute(
        "data-font-scale-large",
        safeScale >= 1.15 ? "true" : "false"
    );
}

interface LocaleContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    fontScale: number;
    setFontScale: (scale: number) => void;
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
    const [fontScale, setFontScaleState] = useState<number>(() => {
        if (typeof window === "undefined") return DEFAULT_FONT_SCALE;
        return sanitizeFontScale(localStorage.getItem("fontScale"));
    });

    useEffect(() => {
        const savedLocale = localStorage.getItem("locale") as Locale | null;
        if (savedLocale === "en" || savedLocale === "hi") {
            setLocaleState(savedLocale);
        } else {
            setLocaleState("hi");
        }
    }, []);

    useEffect(() => {
        applyFontScaleToDocument(fontScale);
    }, [fontScale]);

    const setLocale = (nextLocale: Locale) => {
        setLocaleState(nextLocale);
        localStorage.setItem("locale", nextLocale);
    };

    const setFontScale = (nextScale: number) => {
        const safeScale = sanitizeFontScale(nextScale);
        setFontScaleState(safeScale);
        localStorage.setItem("fontScale", String(safeScale));
        applyFontScaleToDocument(safeScale);
    };

    const t = useMemo(
        () => (key: string, vars?: Record<string, string | number>) => {
            const translation = translations[locale][key] || translations.hi[key] || key;
            return interpolate(translation, vars);
        },
        [locale]
    );

    return (
        <LocaleContext.Provider
            value={{ locale, setLocale, fontScale, setFontScale, t }}
        >
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
