const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Make sure this path is correct
const SUBSCRIPTION_DURATION_DAYS = 30; 
// --- Script Configuration ---
const NEW_BUSINESS_NAME = "Karmine Corp"; // CHANGE: The name of the new business
const NEW_ADMIN_EMAIL = "haceneamrane22@gmail.com"; // CHANGE: Email for the business admin
const NEW_ADMIN_PASSWORD = "123456"; // CHANGE: Strong temporary password for admin
const NEW_ADMIN_DISPLAY_NAME = "Hacene Amrane"; // CHANGE: Display name for the admin user

// Sample employees to create for this business
const SAMPLE_EMPLOYEES = [
  { email: "employee1@examplecorp.com", password: "PasswordEmployee1!", displayName: "Alice Employee", role: "employee", /* add other employee fields if needed */ },
  { email: "employee2@examplecorp.com", password: "PasswordEmployee2!", displayName: "Bob Worker", role: "employee", /* e.g., position: 'Cashier' */ },
  // Add more sample employees as needed
];

// Optional: Initial location settings
const INITIAL_LOCATION_SETTINGS = {
  latitude: 45.894817,
  longitude:4.777297,
  radiusKm: 0.2, // 500 meters
  name: "Sera",
};
// --- End Configuration ---


// Initialize Firebase Admin SDK
try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK Initialized.");
} catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    console.error("Ensure 'serviceAccountKey.json' is present and valid.");
    process.exit(1); // Exit if initialization fails
}


const db = admin.firestore();
const auth = admin.auth();

/**
 * Creates a user in Firebase Auth if they don't already exist by email.
 * @param {object} userDetails - Contains email, password, displayName.
 * @returns {Promise<admin.auth.UserRecord | null>} UserRecord if created/exists, null on error.
 */
async function findOrCreateAuthUser(userDetails) {
  const { email, password, displayName } = userDetails;
  try {
    // Check if user exists first to avoid errors and potentially update display name
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`Auth user with email ${email} already exists (UID: ${userRecord.uid}). Updating display name if needed.`);
      if (userRecord.displayName !== displayName) {
        await auth.updateUser(userRecord.uid, { displayName });
        console.log(`Updated display name for ${email}.`);
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`Creating new Auth user for ${email}...`);
        userRecord = await auth.createUser({
          email: email,
          password: password,
          displayName: displayName,
          emailVerified: false, // Or true if you have verification flow
          disabled: false,
        });
        console.log(`Successfully created Auth user ${email} (UID: ${userRecord.uid})`);
      } else {
        // Rethrow other errors (e.g., invalid email format)
        throw error;
      }
    }
    return userRecord;
  } catch (error) {
    console.error(`Error finding or creating Auth user ${email}:`, error.message);
    // Consider how to handle this - stop script or continue with others?
    // Returning null allows the script to potentially continue for other users.
    return null;
  }
}

/**
 * Sets custom claims for a Firebase Auth user.
 * @param {string} uid - User ID.
 * @param {object} claims - Claims object (e.g., { businessId: '...', role: '...' }).
 * @returns {Promise<void>}
 */
async function setUserClaims(uid, claims) {
  try {
    await auth.setCustomUserClaims(uid, claims);
    console.log(`Set custom claims for UID ${uid}:`, claims);
  } catch (error) {
    console.error(`Error setting custom claims for UID ${uid}:`, error);
    // Decide if this is a critical failure
  }
}

/**
 * Sets up a new business tenant in Firestore and Firebase Auth.
 */
async function setupNewBusiness() {
  console.log(`\nStarting setup for business: ${NEW_BUSINESS_NAME}`);

  // 1. Generate a new Business ID
  const businessDocRef = db.collection('business').doc(); // Generate reference with unique ID
  const newBusinessId = businessDocRef.id;
  console.log(`Generated new Business ID: ${newBusinessId}`);

  // --- Use a Firestore Batch for atomic writes where possible ---
  const batch = db.batch();

  // Calculate initial subscription end date
  const now = new Date();
  const endDate = new Date(now.setDate(now.getDate() + SUBSCRIPTION_DURATION_DAYS));
  const subscriptionEndDateTimestamp = admin.firestore.Timestamp.fromDate(endDate);
  console.log(`Setting initial subscription end date to: ${endDate.toISOString()}`);


  // 2. Prepare Business Document (ADD subscriptionEndDate)
  const businessData = {
      name: NEW_BUSINESS_NAME,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      subscriptionEndDate: subscriptionEndDateTimestamp, // <-- ADD THIS FIELD
      isActive: true // Optional: Flag for manually disabling a business later
      // adminUids: [] // Will be added later
  };
  batch.set(businessDocRef, businessData);
  console.log(`Prepared business document with subscription end date for batch.`);
  // 3. Create/Find Auth Users (Admin + Employees)
  const adminUserRecord = await findOrCreateAuthUser({
    email: NEW_ADMIN_EMAIL,
    password: NEW_ADMIN_PASSWORD,
    displayName: NEW_ADMIN_DISPLAY_NAME
  });

  if (!adminUserRecord) {
     console.error("CRITICAL: Failed to create admin user. Aborting setup.");
     return; // Stop if admin creation fails
  }

   // Add admin UID to business data (now that we have it)
   batch.update(businessDocRef, { adminUids: admin.firestore.FieldValue.arrayUnion(adminUserRecord.uid) });

  const employeeRecords = [];
  for (const empDetails of SAMPLE_EMPLOYEES) {
    const empRecord = await findOrCreateAuthUser(empDetails);
    if (empRecord) {
      employeeRecords.push({ ...empDetails, uid: empRecord.uid }); // Store details along with UID
    } else {
      console.warn(`Skipping setup for employee ${empDetails.email} due to auth error.`);
    }
  }
  console.log(`Processed ${employeeRecords.length} sample employee auth accounts.`);


  // 4. Prepare Firestore Documents for Users (in batch)

  // Admin User Documents
  const adminGlobalUserRef = db.doc(`users/${adminUserRecord.uid}`);
  batch.set(adminGlobalUserRef, {
    email: adminUserRecord.email,
    displayName: adminUserRecord.displayName,
    businessId: newBusinessId,
    role: 'employer_admin', // Explicitly set admin role
    // Add other global user fields if needed (e.g., createdAt)
  });
  const adminBusinessEmployeeRef = db.doc(`business/${newBusinessId}/employees/${adminUserRecord.uid}`);
  batch.set(adminBusinessEmployeeRef, {
    name: adminUserRecord.displayName, // Or specific employee name field
    email: adminUserRecord.email,
    role: 'employer_admin', // Role within the business context
    // Add other business-specific employee fields
  });
  console.log(`Prepared admin user documents for batch (UID: ${adminUserRecord.uid}).`);

  // Employee User Documents
  for (const emp of employeeRecords) {
    const globalUserRef = db.doc(`users/${emp.uid}`);
    batch.set(globalUserRef, {
      email: emp.email,
      displayName: emp.displayName,
      businessId: newBusinessId,
      role: emp.role || 'employee', // Use provided role or default
    });
    const businessEmployeeRef = db.doc(`business/${newBusinessId}/employees/${emp.uid}`);
    batch.set(businessEmployeeRef, {
      name: emp.displayName,
      email: emp.email,
      role: emp.role || 'employee',
      // Add other fields from emp object if they exist (like position)
      position: emp.position || null, // Example
    });
    console.log(`Prepared employee documents for batch (UID: ${emp.uid}).`);
  }

  // 5. Prepare Optional Config Documents (in batch)
  if (INITIAL_LOCATION_SETTINGS) {
      const locationConfigRef = db.doc(`business/${newBusinessId}/settings/location`);
      batch.set(locationConfigRef, INITIAL_LOCATION_SETTINGS);
      console.log(`Prepared location config document for batch.`);
  }
  // Add other config docs (e.g., positions, initial shifts?) here if needed

  // 6. Commit the Firestore Batch
  try {
    await batch.commit();
    console.log("Firestore batch committed successfully.");
  } catch (error) {
    console.error("CRITICAL: Firestore batch commit failed:", error);
    // If the batch fails, Auth users might exist without proper Firestore setup.
    // Custom claims setting below might also fail or be inconsistent.
    // Manual cleanup might be required.
    return; // Stop the script here
  }

  // 7. Set Custom Claims (after users exist and Firestore docs are likely created)
  // Admin Claims
  await setUserClaims(adminUserRecord.uid, {
    businessId: newBusinessId,
    role: 'employer_admin'
  });

  // Employee Claims
  for (const emp of employeeRecords) {
    await setUserClaims(emp.uid, {
      businessId: newBusinessId,
      role: emp.role || 'employee'
    });
  }

  console.log(`\n✅ Setup completed for business "${NEW_BUSINESS_NAME}" (ID: ${newBusinessId})`);
  console.log(`   Admin User: ${NEW_ADMIN_EMAIL} (UID: ${adminUserRecord.uid})`);
  employeeRecords.forEach(emp => {
    console.log(`   Employee User: ${emp.email} (UID: ${emp.uid})`);
  });

}

// --- Run the Setup ---
setupNewBusiness().catch(error => {
  console.error("\n❌ An unexpected error occurred during business setup:", error);
});