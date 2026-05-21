import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing required Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
    process.exit(1);
}

const key = privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey;

admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: key,
    }),
});

const db = admin.firestore();
const enableDelete = process.env.ENABLE_DELETE === "true";

function getThresholdIso() {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 60);
    return thresholdDate.toISOString();
}

async function countExpenses(reportId) {
    const expensesRef = db.collection("reports").doc(reportId).collection("expenses");
    const snapshot = await expensesRef.get();
    return snapshot.size;
}

async function deleteExpenses(reportId) {
    const expensesRef = db.collection("reports").doc(reportId).collection("expenses");
    const snapshot = await expensesRef.get();
    if (snapshot.empty) return 0;

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    return snapshot.size;
}

async function runCleanup() {
    const thresholdIso = getThresholdIso();
    const reportsRef = db.collection("reports");

    const querySnapshot = await reportsRef
        .where("deleted", "==", true)
        .where("deletedAt", "<=", thresholdIso)
        .get();

    console.log(`Running cleanup in ${enableDelete ? "delete" : "dry-run"} mode.`);

    if (querySnapshot.empty) {
        console.log("No stale deleted reports found.");
        return;
    }

    console.log(`Found ${querySnapshot.size} deleted report(s) older than 60 days.`);

    let deletedCount = 0;
    let expenseDeletes = 0;

    for (const reportDoc of querySnapshot.docs) {
        const reportId = reportDoc.id;
        const expenseCount = await countExpenses(reportId);
        expenseDeletes += expenseCount;

        if (enableDelete) {
            await deleteExpenses(reportId);
            await reportDoc.ref.delete();
            deletedCount += 1;
            console.log(`Deleted report ${reportId} and ${expenseCount} expense(s).`);
        } else {
            console.log(`Dry run: report ${reportId} would be deleted, with ${expenseCount} expense(s) to remove.`);
        }
    }

    if (enableDelete) {
        console.log(`Cleanup complete: ${deletedCount} report(s) removed, ${expenseDeletes} expense(s) removed.`);
    } else {
        console.log(`Dry run complete: ${querySnapshot.size} report(s) matched, ${expenseDeletes} expense(s) counted. No documents were deleted.`);
    }
}

runCleanup()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Cleanup failed:", error);
        process.exit(1);
    });
