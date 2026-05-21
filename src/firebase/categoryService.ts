import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    deleteDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import type { Category } from "./types";

const categoriesCollection = collection(db, "categories");

export async function addCategory(categoryName: string): Promise<Category> {
    const user = auth.currentUser;
    if (!user?.email) {
        throw new Error("यूज़र का ईमेल उपलब्ध नहीं है। कृपया लॉगिन करें।");
    }

    const normalizedName = categoryName.trim();
    if (!normalizedName) {
        throw new Error("श्रेणी का नाम खाली नहीं हो सकता।");
    }

    const currentCategories = await getCategories();
    if (currentCategories.some((category) => category.name.toLowerCase() === normalizedName.toLowerCase())) {
        throw new Error("यह श्रेणी पहले से मौजूद है।");
    }

    const categoryData: Omit<Category, "id"> = {
        name: normalizedName,
        owner: user.email,
        createdAt: new Date().toISOString(),
    };

    const categoryRef = await addDoc(categoriesCollection, categoryData);

    return {
        id: categoryRef.id,
        ...categoryData,
    };
}

export async function getCategories(): Promise<Category[]> {
    const user = auth.currentUser;
    if (!user?.email) {
        throw new Error("यूज़र का ईमेल उपलब्ध नहीं है।");
    }

    const ownerQ = query(categoriesCollection, where("owner", "==", user.email));
    const categoriesSnap = await getDocs(ownerQ);

    return categoriesSnap.docs.map((docSnap) => ({
        ...(docSnap.data() as Category),
        id: docSnap.id,
    }));
}

export async function deleteCategory(categoryId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user?.email) {
        throw new Error("यूज़र का ईमेल उपलब्ध नहीं है।");
    }

    const categoryDocRef = doc(categoriesCollection, categoryId);
    const categorySnapshot = await getDoc(categoryDocRef);

    if (!categorySnapshot.exists()) {
        throw new Error("श्रेणी नहीं मिली।");
    }

    const categoryData = categorySnapshot.data() as Category;
    if (categoryData.owner !== user.email) {
        throw new Error("आप इस श्रेणी को डिलीट नहीं कर सकते।");
    }

    await deleteDoc(categoryDocRef);
}
