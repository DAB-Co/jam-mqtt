const path = require("path");
const fs = require('fs');
const firebase_admin = require("firebase-admin");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });

const username = process.env.account_username;

const Database = require("@dab-co/jam-sqlite").Database;
const database = new Database(process.env.db_path);

const AccountUtils = require("@dab-co/jam-sqlite").Utils.AccountUtils;
const accountUtils = new AccountUtils(database);

const userId = accountUtils.getIdByUsername(username);

const firebase_token = accountUtils.getNotificationToken(userId);

const service_account_key = JSON.parse(fs.readFileSync(path.join(__dirname, process.env.firebase_account_key_path), "utf8"));
firebase_admin.initializeApp({
    credential: firebase_admin.credential.cert(service_account_key),
});

const message = {
    "data": {
        "fromId": userId,
    },
};

const options = {
    priority: "high",
    timeToLive: 60 * 60 * 24,
};

firebase_admin.messaging().sendToDevice(firebase_token, message, options)
    .then(response => {
        console.log(response);
    })
    .catch(error => {
        console.log(error);
    });
