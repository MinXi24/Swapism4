/**
 * Script to Update Existing Items with Size and Condition
 * 
 * This script helps you add size and condition to items that were created
 * before these fields existed.
 * 
 * HOW TO USE:
 * 1. Open Firebase Console: https://console.firebase.google.com/
 * 2. Go to Firestore Database
 * 3. Find your collection: wardrobe-plug-fyp/user/images
 * 4. For each item you want to update, click on it
 * 5. Click "Add field" and add:
 *    - Field: size, Value: M (or XS, S, L, XL)
 *    - Field: condition, Value: Wore it once (or other conditions)
 * 6. Save
 * 
 * OR use this script programmatically (requires Firebase Admin SDK setup)
 */

// Manual steps to update in Firebase Console:
// 1. Navigate to: https://console.firebase.google.com/project/YOUR_PROJECT/firestore
// 2. Go to: wardrobe-plug-fyp → user → images
// 3. Click on each document (item)
// 4. Add fields:
//    - size: "M" (or XS, S, L, XL, XXL)
//    - condition: "Wore it once" (or other condition)
//    - additionalDetails: "" (optional)

/**
 * Available Sizes:
 * - XS
 * - S
 * - M
 * - L
 * - XL
 * - XXL
 */

/**
 * Available Conditions:
 * - Brand new
 * - Wore it once
 * - Wore it 2-5 times
 * - Wore it more than 5 times
 * - Well-worn
 */

// Example: If you want to use Firebase Admin to update programmatically
const exampleUpdates = {
  "item1_id": {
    size: "M",
    condition: "Wore it once",
    additionalDetails: "Perfect condition"
  },
  "item2_id": {
    size: "L", 
    condition: "Brand new",
    additionalDetails: ""
  },
  // Add more items...
};

console.log('To update items, follow the manual steps in the comments above');
console.log('Or implement the Firebase Admin SDK code below\n');

// If you want to run this programmatically:
/*
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateItems() {
  const batch = db.batch();
  
  // Update each item
  for (const [itemId, updates] of Object.entries(exampleUpdates)) {
    const itemRef = db.doc(`wardrobe-plug-fyp/user/images/${itemId}`);
    batch.update(itemRef, updates);
  }
  
  await batch.commit();
  console.log('Items updated successfully!');
}

updateItems().catch(console.error);
*/
