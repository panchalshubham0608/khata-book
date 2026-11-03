import {
    doc,
    getDoc,
    setDoc,
    arrayUnion,
    arrayRemove,
    deleteField,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import type { UserProfile } from "./types";

const USERS_COLLECTION = "users";

function resolveUserEmail(email?: string): string {
    const resolved = email || auth.currentUser?.email;
    if (!resolved) {
        throw new Error("यूज़र का ईमेल उपलब्ध नहीं है। कृपया लॉगिन करें।");
    }
    return resolved;
}

export async function getUserProfile(email?: string): Promise<UserProfile> {
    const userEmail = resolveUserEmail(email);
    const profileRef = doc(db, USERS_COLLECTION, userEmail);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
        return {
            id: userEmail,
            owner: userEmail,
            archivedReports: [],
            updatedAt: new Date().toISOString(),
        };
    }

    const data = profileSnap.data() as Partial<UserProfile>;
    return {
        id: profileSnap.id,
        owner: data.owner || userEmail,
        archivedReports: Array.isArray(data.archivedReports)
            ? data.archivedReports
            : [],
        geminiApiKey:
            typeof data.geminiApiKey === "string" && data.geminiApiKey.trim()
                ? data.geminiApiKey.trim()
                : undefined,
        updatedAt: data.updatedAt || new Date().toISOString(),
    };
}

export async function saveGeminiApiKeyForUser(
    apiKey: string,
    email?: string
): Promise<void> {
    const userEmail = resolveUserEmail(email);
    const profileRef = doc(db, USERS_COLLECTION, userEmail);
    const trimmed = apiKey.trim();

    await setDoc(
        profileRef,
        {
            owner: userEmail,
            geminiApiKey: trimmed ? trimmed : deleteField(),
            updatedAt: new Date().toISOString(),
        },
        { merge: true }
    );
}

export async function archiveReportForUser(
    reportId: string,
    email?: string
): Promise<void> {
    const userEmail = resolveUserEmail(email);
    const profileRef = doc(db, USERS_COLLECTION, userEmail);

    await setDoc(
        profileRef,
        {
            owner: userEmail,
            archivedReports: arrayUnion(reportId),
            updatedAt: new Date().toISOString(),
        },
        { merge: true }
    );
}

export async function unarchiveReportForUser(
    reportId: string,
    email?: string
): Promise<void> {
    const userEmail = resolveUserEmail(email);
    const profileRef = doc(db, USERS_COLLECTION, userEmail);

    await setDoc(
        profileRef,
        {
            owner: userEmail,
            archivedReports: arrayRemove(reportId),
            updatedAt: new Date().toISOString(),
        },
        { merge: true }
    );
}
