const fs = require('fs');
const path = require("path");
const aedes = require('aedes')();
require("dotenv").config({path: path.join(__dirname, ".env.local")});
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
} else {
    server = require('net').createServer(aedes.handle)
}

/*
user_id: client_id
 */
let last_connected_device = {};

/*
client_id: false
 */
let is_connected = {};

/*
client_id: number
 */
let failed_attempt_count = {};

aedes.preConnect = function (client, packet, callback) {
    console.log("---preConnect handler---");
    let client_id = packet.clientId;
    console.log("preConnect:", packet.clientId);
    if (!(client_id in failed_attempt_count)) {
        failed_attempt_count[client_id] = 0;
    }

    if (failed_attempt_count[client_id] > 10) {
        console.log("not going forward with:", client_id, "due to exceeding number of auth fails");
        let message = {
            data: "too many attempts to connect to mqtt",
            status: "logout",
        }
        aedes.publish({
            cmd: 'publish',
            qos: 2,
            topic: `/${client_id.split(':')[0]}/status`,
            payload: Buffer.from(JSON.stringify(message)),
            retain: false
        }, (err) => {
            if (err) {
                console.log("Error sending logout:", err);
            }
        });
        return callback(new Error("Spam error"), null);
    }
    callback(null, true);
};

aedes.authenticate = function (client, user_id, api_token, callback) {
    // https://github.com/arden/aedes#instanceauthenticateclient-username-password-doneerr-successful
    console.log("---authenticate handler---");
    // id matches with username
    if (client.id.split(':')[0] !== user_id) {
        console.log("client id doesn't match user id:", user_id, ":", client.id);
        let error = new Error("Id error");
        error.returnCode = 4;
        failed_attempt_count[client.id]++;
        return callback(error, null);
    }

    // wildcards are not allowed
    if (user_id.indexOf('$') !== -1 || user_id.indexOf('#') !== -1 || user_id.indexOf('+') !== -1) {
        console.log("user id has forbidden wildcard:", user_id);
        let error = new Error("Id error");
        error.returnCode = 4;
        failed_attempt_count[client.id]++;
        return callback(error);
    }

    // api token format is valid
    if (api_token.toString() === "" || api_token.toString() === null || api_token.toString() === undefined) {
        console.log("Wrong api token format:", api_token.toString);
        let error = new Error("Token error");
        error.returnCode = 4;
        failed_attempt_count[client.id]++;
        return callback(error, null);
    }

    let correct_api_token = accountUtils.getApiToken(user_id);
    if (correct_api_token === undefined) {
        console.log(`unknown user_id: ${user_id}: ${client.id}`);
        let error = new Error("Auth error");
        error.returnCode = 5;
        failed_attempt_count[client.id]++;
        callback(error, null);
    } else {
        if (api_token.toString() === correct_api_token) {
            // user is attempting to connect with a different device
            if (user_id in last_connected_device && last_connected_device[user_id] !== client.id) {
                console.log("a different device was connected with this id, sending logout for that device");
                let message = {
                    data: "a new device has connected, logout from this device",
                    status: "logout",
                }
                aedes.publish({
                    cmd: 'publish',
                    qos: 2,
                    topic: `/${user_id}/status`,
                    payload: Buffer.from(JSON.stringify(message)),
                    retain: false
                }, (err) => {
                    if (err) {
                        console.log("Error sending logout:", err);
                    }
                });
            }
            is_connected[client.id] = true;
            last_connected_device[user_id] = client.id;
            console.log(`connected: ${user_id}: ${client.id}`);
            failed_attempt_count[client.id] = 0;
            callback(null, true);
        } else {
            console.log(`wrong api_token: ${user_id}: ${client.id}`);
            let error = new Error("Auth error");
            error.returnCode = 5;
            failed_attempt_count[client.id]++;
            callback(error, null);
        }
    }
}

aedes.on("clientDisconnect", function (client) {
    console.log("---client disconnect---");
    is_connected[client.id] = false;
    console.log(client.id, "disconnected");
});

aedes.authorizePublish = function (client, packet, callback) {
    // https://github.com/arden/aedes#instanceauthorizepublishclient-packet-doneerr
    console.log("---publish handler---");

    let packet_contents = packet.topic.split("/");
    let receiver_id = packet_contents[1];
    let user_id = client.id.split(":")[0];
    let senderId = undefined;
    console.log("publishing content...");
    console.log("sender_id: " + user_id);
    console.log("receiver_id: " + receiver_id);
    console.log("content:", packet.payload.toString());

    // wildcards are not allowed
    if (packet.topic.indexOf('$') !== -1 || packet.topic.indexOf('#') !== -1 || packet.topic.indexOf('+') !== -1) {
        console.log("tried to publish a channel with forbidden wildcard:", packet.topic);
        let error = new Error("Topic forbidden");
        error.returnCode = 5;
        return callback(error);
    }

    // only user can publish to their own channels other than their inbox
    if (senderId !== receiver_id && packet_contents[2] !== "inbox") {
        console.log("tried to publish to", packet.topic);
        let error = new Error("Topic forbidden");
        error.returnCode = 5;
        return callback(error);
    }

    // couldn't get sender id in message
    try {
        senderId = JSON.parse(packet.payload.toString()).from;
    } catch (e) {
        console.log("unable to parse, maybe a will message?");
        return callback(null);
    }

    // check if message sender id is same as client's id
    if (senderId !== user_id) {
        console.log("wrong senderId:", senderId);
        let error = new Error("Auth error");
        error.returnCode = 5;
        return callback(error);
    }

    let receiverFriends = userFriendsUtils.getFriends(receiver_id);
    if (receiverFriends !== undefined && user_id in receiverFriends && !receiverFriends[user_id]["blocked"]) {
        if (is_connected[client.id]) {
            callback(null);
        } else {
            let token = accountUtils.getNotificationToken(receiver_id);
            if (token === undefined) {
                console.log("receiver id token is undefined, is receiver not in database?");
                let error = new Error("Auth error");
                error.returnCode = 5;
                return callback(error);
            }
            const message = {
                "data": {
                    "fromId": user_id,
                },
            };
            const options = {
                priority: "high",
                timeToLive: 60 * 60 * 24,
            };
            if (firebase_admin !== undefined &&  token !== undefined && token !== null && token !== "") {
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
    } else {
        console.log(user_id, "not friends with", receiver_id);
        let error = new Error("Auth error");
        error.returnCode = 5;
        callback(error);
    }
}

aedes.authorizeSubscribe = function (client, sub, callback) {
    // https://github.com/arden/aedes#instanceauthorizesubscribeclient-pattern-doneerr-pattern
    console.log("---subscribe handler---");
    if (sub.topic.indexOf('$') !== -1 || sub.topic.indexOf('#') !== -1 || sub.topic.indexOf('+') !== -1) {
        console.log("tried to subscribe to a channel with forbidden wildcard:", sub.topic);
        return callback(new Error("Topic forbidden"));
    }

    console.log(client.id, "subscribing to", sub.topic);
    if (client.id.split(':')[0] === sub.topic.split('/')[1]) {
        console.log("subbed");
        callback(null, sub);
    } else {
        console.log("sub error");
        let error = new Error("Auth error");
        error.returnCode = 5;
        callback(error, null);
    }
}

server.listen(port, function () {
    console.log('Server started and listening on port ', port);
});
