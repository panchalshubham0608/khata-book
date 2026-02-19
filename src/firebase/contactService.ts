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
import type { Contact } from "./types";

const contactsCollection = collection(db, "contacts");

export async function addContact(contactEmail: string): Promise<Contact> {
    const user = auth.currentUser;
    if (!user?.email) {
        throw new Error("यूज़र का ईमेल उपलब्ध नहीं है। कृपया लॉगिन करें।");
    }

    const currentContacts = await getContacts();
    if (currentContacts.filter(c => c.email === contactEmail).length !== 0) {
        throw new Error("यह कांटेक्ट पहले से ही जोड़ा जा चूका है।");
    }

    const contactData: Omit<Contact, "id"> = {
        email: contactEmail,
        owner: user.email,
        createdAt: new Date().toISOString(),
    };

    const contactRef = await addDoc(contactsCollection, contactData);

    return {
        id: contactRef.id,
        ...contactData,
    };
}

export async function getContacts(): Promise<Contact[]> {
    const user = auth.currentUser;
    if (!user?.email) {
        throw new Error("यूज़र का ईमेल उपलब्ध नहीं है। कृपया लॉगिन करें।");
    }

    const ownerQ = query(contactsCollection, where("owner", "==", user.email));
    const contactsSnap = await getDocs(ownerQ);

    const contacts: Contact[] = contactsSnap.docs
        .map((d) => ({
            ...(d.data() as Contact),
            id: d.id,
        }));

    return contacts;
}

export async function deleteContact(contactId: string): Promise<void> {
    const user = auth.currentUser;

    if (!user?.email) {
        throw new Error("यूज़र का ईमेल उपलब्ध नहीं है। कृपया लॉगिन करें।");
    }

    const contactDocRef = doc(contactsCollection, contactId);
    const contactSnapshot = await getDoc(contactDocRef);

    if (!contactSnapshot.exists()) {
        throw new Error("कांटेक्ट नहीं मिला।");
    }

    const contactData = contactSnapshot.data();

    // Ensure the logged-in user owns this contact
    if (contactData.owner !== user.email) {
        throw new Error("आप इस कांटेक्ट को डिलीट नहीं कर सकते।");
    }

    await deleteDoc(contactDocRef);
}
