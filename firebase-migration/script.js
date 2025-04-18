const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Use a fixed business ID if you're just starting with multi-tenancy
const DEFAULT_BUSINESS_ID = "business1";

async function migrateCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();

  if (snapshot.empty) {
    console.log(`Collection ${collectionName} is empty, skipping`);
    return;
  }

  // Use batched writes for atomicity, with a limit of 500 operations per batch
  let batch = db.batch();
  let operationCount = 0;
  const batchLimit = 500;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const newRef = db.doc(`business/${DEFAULT_BUSINESS_ID}/${collectionName}/${doc.id}`);

    batch.set(newRef, data);
    operationCount++;

    // Commit batch if we hit the limit and start a new one
    if (operationCount >= batchLimit) {
      await batch.commit();
      console.log(`Committed batch of ${operationCount} operations for ${collectionName}`);
      batch = db.batch();
      operationCount = 0;
    }
  }

  // Commit any remaining operations
  if (operationCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${operationCount} operations for ${collectionName}`);
  }

  console.log(`Migrated ${snapshot.size} documents from ${collectionName}`);
}

async function migrateAllCollections() {
  const collections = [
    'users', 'shifts', 'messages', 'contracts', 'positions',
    'absences', 'accessRequests', 'badgedShifts', 'chatRooms',
    'closingPeriods', 'settings'
  ];

  for (const collection of collections) {
    await migrateCollection(collection);
  }
}

// Optional: Create a document for the business itself
async function createBusinessDocument() {
  await db.doc(`business/${DEFAULT_BUSINESS_ID}`).set({
    name: "My Business",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    // Add other business metadata as needed
  });
  console.log("Created business document");
}

async function runMigration() {
  try {
    await createBusinessDocument();
    await migrateAllCollections();
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

runMigration();
