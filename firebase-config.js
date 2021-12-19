const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "jam-app-service-account-key.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports.admin = admin