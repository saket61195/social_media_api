const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://socialape-1434c.firebaseio.com",
});

const db = admin.firestore();

module.exports = { admin, db };



// const admin = require('firebase-admin');

// admin.initializeApp();

// const db = admin.firestore();

// module.exports = { admin, db };