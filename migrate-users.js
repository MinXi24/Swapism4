const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Adjust path if needed

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://wardrobe-plug-fyp-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.firestore();
const rtdb = admin.database();

// CHANGE THESE:
const oldKey = 'ijxM4kMEVha4en6V2P3KKSlnxGs1'; // e.g. 'test@example.com' or old UID
const newUid = 'k81jBzIPiQXTPByxPUWHrtJJEWe2';   // The new Auth UID

async function copyFirestoreUser() {
  const oldDoc = await db.collection('users').doc(oldKey).get();
  if (oldDoc.exists) {
    const data = oldDoc.data();
    await db.collection('users').doc(newUid).set(data, { merge: true });
    console.log(`Copied Firestore data from ${oldKey} to ${newUid}`);
    // Optionally delete old doc:
    await db.collection('users').doc(oldKey).delete();
  } else {
    console.log(`No Firestore doc found for ${oldKey}`);
  }
}

async function copyRealtimeUser() {
  const oldRef = rtdb.ref('users/' + oldKey);
  const snapshot = await oldRef.once('value');
  if (snapshot.exists()) {
    const data = snapshot.val();
    await rtdb.ref('users/' + newUid).set(data);
    console.log(`Copied RTDB data from ${oldKey} to ${newUid}`);
    // Optionally delete old data:
    // await oldRef.remove();
  } else {
    console.log(`No RTDB data found for ${oldKey}`);
  }
}

async function main() {
  await copyFirestoreUser();
  await copyRealtimeUser();
  process.exit();
}

main();