import { toLocalDateInputValue } from "../utils/reportUtils";

export interface ExtractedGeminiExpense {
    id: string;
    title: string;
    amount: number;
    type: "debit" | "credit";
    date: string; // YYYY-MM-DD
}

export interface GeminiAudioAnalysisResult {
    transcript: string;
    expenses: ExtractedGeminiExpense[];
}

const GEMINI_BASE_URL =
    "https://generativelanguage.googleapis.com/v1beta/models";

const CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
];

let cachedWorkingModel: string | null = null;

async function discoverAvailableGeminiModel(apiKey: string): Promise<string | null> {
    try {
        const res = await fetch(GEMINI_BASE_URL, {
            method: "GET",
            headers: {
                "x-goog-api-key": apiKey,
            },
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
            models?: Array<{
                name?: string;
                supportedGenerationMethods?: string[];
            }>;
        };
        const models = Array.isArray(data.models) ? data.models : [];
        const eligible = models
            .filter(
                (m) =>
                    typeof m.name === "string" &&
                    Array.isArray(m.supportedGenerationMethods) &&
                    m.supportedGenerationMethods.includes("generateContent") &&
                    !m.name.includes("tts") &&
                    !m.name.includes("image") &&
                    !m.name.includes("embedding")
            )
            .map((m) => m.name!.replace(/^models\//, ""));

        const flashModel = eligible.find((id) => id.includes("flash"));
        return flashModel || eligible[0] || null;
    } catch {
        return null;
    }
}

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB limit

const ALLOWED_AUDIO_MIME_PREFIXES = [
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/aac",
    "audio/3gpp",
    "audio/flac",
];

function resolveSupportedMimeType(rawType: string): string {
    const normalized = (rawType || "").split(";")[0].trim().toLowerCase();
    if (!normalized) {
        return "audio/webm";
    }
    const matched = ALLOWED_AUDIO_MIME_PREFIXES.find(
        (allowed) => normalized === allowed || normalized.startsWith(allowed)
    );
    if (!matched) {
        throw new Error("Unsupported audio format.");
    }
    if (matched === "audio/x-wav") return "audio/wav";
    return matched;
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            if (typeof result !== "string") {
                reject(new Error("Failed to read audio data."));
                return;
            }
            const commaIdx = result.indexOf(",");
            resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error("Failed to read audio data."));
        reader.readAsDataURL(blob);
    });
}

function sanitizeDateInput(rawDate: unknown, fallbackDate: string): string {
    if (typeof rawDate === "string") {
        const trimmed = rawDate.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return trimmed;
        }
    }
    return fallbackDate;
}

export async function analyzeExpenseAudioWithGemini(
    audioBlob: Blob,
    apiKey: string,
    locale: string = "en"
): Promise<GeminiAudioAnalysisResult> {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
        throw new Error("MISSING_API_KEY");
    }

    if (!audioBlob || audioBlob.size === 0) {
        throw new Error("EMPTY_AUDIO");
    }

    if (audioBlob.size > MAX_AUDIO_BYTES) {
        throw new Error("AUDIO_TOO_LARGE");
    }

    const mimeType = resolveSupportedMimeType(audioBlob.type);
    const base64Audio = await blobToBase64(audioBlob);
    const todayDate = toLocalDateInputValue();

    const languageInstruction =
        locale === "hi"
            ? "Keep expense titles concise in Hindi (or clear Hinglish/English if spoken in English)."
            : "Keep expense titles concise and clear (translate or transliterate naturally into English or clean title case).";

    const systemPrompt = [
        `You are an intelligent expense ledger assistant for Khata Book.`,
        `Listen carefully to the user's voice recording and extract every distinct expense or top-up/income transaction mentioned.`,
        `Today's date is ${todayDate}. If the speaker mentions a relative date (like yesterday / कल), compute the YYYY-MM-DD date; otherwise use ${todayDate}.`,
        `By default, set "type" to "debit" for expenses/spending. Only set "type" to "credit" if the speaker explicitly says they received money, added budget, or topped up.`,
        languageInstruction,
        `Return only valid JSON matching the requested schema.`,
    ].join(" ");

    const requestBody = JSON.stringify({
        contents: [
            {
                parts: [
                    { text: systemPrompt },
                    {
                        inlineData: {
                            mimeType,
                            data: base64Audio,
                        },
                    },
                ],
            },
        ],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    transcript: {
                        type: "STRING",
                        description:
                            "Transcription of what the user said in the audio.",
                    },
                    expenses: {
                        type: "ARRAY",
                        description:
                            "All individual expenses or top-ups mentioned in the audio.",
                        items: {
                            type: "OBJECT",
                            properties: {
                                title: {
                                    type: "STRING",
                                    description:
                                        "Short, descriptive name of the expense or top-up.",
                                },
                                amount: {
                                    type: "NUMBER",
                                    description:
                                        "Positive numeric amount of the expense or top-up.",
                                },
                                type: {
                                    type: "STRING",
                                    enum: ["debit", "credit"],
                                    description:
                                        "'debit' for expense/spend, 'credit' for top-up/income.",
                                },
                                date: {
                                    type: "STRING",
                                    description:
                                        "Date of the expense in YYYY-MM-DD format.",
                                },
                            },
                            required: ["title", "amount", "type"],
                        },
                    },
                },
                required: ["transcript", "expenses"],
            },
        },
    });

    // TODO(security): In a server-backed deployment, route Gemini API calls through a Backend-for-Frontend (BFF)
    // so API keys remain server-side rather than being sent from the browser client.
    const modelsToTry = cachedWorkingModel
        ? [
              cachedWorkingModel,
              ...CANDIDATE_MODELS.filter((m) => m !== cachedWorkingModel),
          ]
        : [...CANDIDATE_MODELS];

    const callModel = (modelId: string) =>
        fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(modelId)}:generateContent`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": trimmedKey,
            },
            body: requestBody,
        });

    let response: Response | null = null;
    for (const modelId of modelsToTry) {
        const candidateResponse = await callModel(modelId);
        if (candidateResponse.status === 404) {
            continue;
        }
        response = candidateResponse;
        if (candidateResponse.ok) {
            cachedWorkingModel = modelId;
        }
        break;
    }

    if (!response) {
        const discoveredModel = await discoverAvailableGeminiModel(trimmedKey);
        if (discoveredModel) {
            const discoveredResponse = await callModel(discoveredModel);
            response = discoveredResponse;
            if (discoveredResponse.ok) {
                cachedWorkingModel = discoveredModel;
            }
        }
    }

    if (!response || !response.ok) {
        const status = response?.status ?? 404;
        if (status === 400 || status === 401 || status === 403) {
            throw new Error("INVALID_API_KEY_OR_REQUEST");
        }
        throw new Error(`GEMINI_HTTP_${status}`);
    }

    const payload = await response.json();
    const rawText: unknown =
        payload?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof rawText !== "string" || !rawText.trim()) {
        return { transcript: "", expenses: [] };
    }

    let parsed: {
        transcript?: unknown;
        expenses?: unknown;
    };
    try {
        parsed = JSON.parse(rawText);
    } catch {
        throw new Error("INVALID_GEMINI_RESPONSE");
    }

    const transcript =
        typeof parsed.transcript === "string"
            ? parsed.transcript.trim().slice(0, 500)
            : "";

    const rawExpenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
    const validatedExpenses: ExtractedGeminiExpense[] = [];

    rawExpenses.forEach((entry: unknown, idx: number) => {
        if (!entry || typeof entry !== "object") return;
        const record = entry as Record<string, unknown>;
        const rawTitle =
            typeof record.title === "string"
                ? record.title.trim().slice(0, 120)
                : "";
        const rawAmount = Number(record.amount);
        if (!rawTitle || !Number.isFinite(rawAmount) || rawAmount <= 0) {
            return;
        }
        const type: "debit" | "credit" =
            record.type === "credit" ? "credit" : "debit";
        const date = sanitizeDateInput(record.date, todayDate);

        validatedExpenses.push({
            id: `gemini-exp-${Date.now()}-${idx}`,
            title: rawTitle,
            amount: Math.round(Math.abs(rawAmount) * 100) / 100,
            type,
            date,
        });
    });

    return {
        transcript,
        expenses: validatedExpenses,
    };
}
