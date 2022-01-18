const path = require("path");
const fs = require('fs');
firebase_admin = require("firebase-admin");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });

// enter phone's firebase token
const token = process.env.firebase_phone_token;

const service_account_key = JSON.parse(fs.readFileSync(path.join(__dirname, process.env.firebase_account_key_path), "utf8"));
firebase_admin.initializeApp({
    credential: firebase_admin.credential.cert(service_account_key),
});

const message = {
    "data": {
        "fromId": "2",
    },
};

const options = {
    priority: "high",
    timeToLive: 60 * 60 * 24,
};

firebase_admin.messaging().sendToDevice(token, message, options)
    .then(response => {
        console.log(response);
    })
    .catch(error => {
        console.log(error);
    });
