const fs = require('fs');
const path = require("path");
const aedes = require('aedes')();
require("dotenv").config({ path: path.join(__dirname, ".env.local") });
const argv = require("yargs")(process.argv.slice(2))
    .option("tls", {
        description: "run with tls",
        type: "boolean",
        default: false
    })
    .option("no_notification", {
        description: "don't send notification token",
        type: "boolean",
        default: false
    })
    .help().alias("help", "h")
    .parse();

const Database = require("@dab-co/jam-sqlite").Database;
const database = new Database(process.env.db_path);
const AccountUtils = require("@dab-co/jam-sqlite").Utils.AccountUtils;
const accountUtils = new AccountUtils(database);
const UserFriendsUtils = require("@dab-co/jam-sqlite").Utils.UserFriendsUtils;
const userFriendsUtils = new UserFriendsUtils(database);
const bcrypt = require("bcrypt");

const port = process.env.port;

let firebase_admin = undefined;
if (!argv.no_notification) {
    firebase_admin = require("firebase-admin");
    const service_account_key = JSON.parse(fs.readFileSync(process.env.firebase_account_key_path, "utf8"));
    firebase_admin.initializeApp({
        credential: firebase_admin.credential.cert(service_account_key),
    });
}


let server = null;

if (argv.tls) {
    const options = {
        cert: fs.readFileSync(process.env.tls_cert),
        key: fs.readFileSync(process.env.tls_key)
    };

    server = require('tls').createServer(options, aedes.handle);
}
else {
    server = require('net').createServer(aedes.handle)
}

aedes.authenticate = function (client, user_id, password, callback) {
    // https://github.com/arden/aedes#instanceauthenticateclient-username-password-doneerr-successful
    let user_password_hash = accountUtils.getPassword(user_id);
    if (user_password_hash === undefined) {
        console.log(`unknown user_id: ${user_id}: ${client.id}`);
        let error = new Error("Auth error");
        error.returnCode = 4;
        callback(error, null);
    }
    else {
        bcrypt.compare(password, user_password_hash, function (err, result) {
            if (result) {
                console.log(`connected: ${user_id}: ${client.id}`);
                callback(null, true);
            } else {
                console.log(`wrong password: ${user_id}: ${client.id}`);
                let error = new Error("Auth error");
                error.returnCode = 4;
                callback(error, null);
            }
        });
    }
}

aedes.authorizePublish = function (client, packet, callback) {
    // https://github.com/arden/aedes#instanceauthorizepublishclient-packet-doneerr
    let receiver = packet.topic.split("/")[1];
    let sender = client.id.split(":")[0];
    let senderName;
    try {
        senderName = JSON.parse(packet.payload.toString()).from;
    } catch(e) {
        console.log(e);
    }
    console.log("publishing content...");
    console.log("sender: " + sender);
    console.log("receiver: " + receiver);
    let receiverFriends = userFriendsUtils.getFriends(receiver);
    if (receiverFriends !== undefined && sender in receiverFriends && !receiverFriends[sender]["blocked"]) {
        let token = accountUtils.getNotificationToken(receiver);
        if (token === undefined) {
            return callback(new Error('no token'));
        }
        const message = {
            notification: {
                title: `You have messages from ${senderName}!`,
                //body: "body",
            },
        };
        const options = {
            priority: "high",
            timeToLive: 60 * 60 * 24,
        };
        if (firebase_admin !== undefined) {
            firebase_admin.messaging().sendToDevice(token, message, options)
                .then(response => {
                    console.log(response);
                })
                .catch(error => {
                    console.log(error);
                });
        }
        callback(null);
    }
    else {
        console.log(sender, "not friends with", receiver);
        let error = new Error("Auth error");
        error.returnCode = 5;
        callback(error, null);
    }

}

aedes.authorizeSubscribe = function (client, sub, callback) {
    // https://github.com/arden/aedes#instanceauthorizesubscribeclient-pattern-doneerr-pattern
    console.log(client.id, "subscribing to", sub.topic);
    if (client.id.split(':')[0] === sub.topic.split('/')[1]) {
        console.log("subbed");
        callback(null, sub);
    }
    else {
        console.log("sub error");
        let error = new Error("Auth error");
        error.returnCode = 4;
        callback(error, null);
    }
}

server.listen(port, function () {
    console.log('Server started and listening on port ', port);
});
