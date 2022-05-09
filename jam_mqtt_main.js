const fs = require('fs');
const path = require("path");
const mqtt = require("mqtt");
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
const UserDevicesUtils = require("@dab-co/jam-sqlite").Utils.UserDevicesUtils;
const userDevicesUtils = new UserDevicesUtils(database);

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
    server = require('net').createServer(aedes.handle);
}

function send_server_message(topic, message) {
    console.log("sending server message", message, "to", topic);
    aedes.publish({
        cmd: 'publish',
        qos: 0,
        topic: topic,
        payload: Buffer.from(message),
        retain: false
    }, (err) => {
        if (err) {
            console.log("Error sending server message:", err);
        }
    });
}

/**
 *
 * @param callback
 * @param success
 * @param handler
 * @param category
 * @param message
 * @param returnCode
 * @param messageId
 */
function errorHandler(callback, success, handler, category, message, returnCode=5, messageId=null) {
    let content = {
        "type": "error",
        "handler": handler,
        "category": category,
        "message": message,
        "messageId": messageId,
    }
    let error = new Error("Error");
    error.message = JSON.stringify(content);
    error.returnCode = returnCode;
    if (success === undefined) {
        callback(error);
    }
    else {
        callback(error, success);
    }
}

/*
{
    user_id: {
        is_connected: false,
        last_connected: "1:2as8few"
    }
}
 */
let connected_users = {};

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
        // some error messages like this are kind of pointless since the device is not even authorized and subscribed
        return errorHandler(callback, null, "preConnect", "spam", "too many failed auth attempts", 4, packet.messageId);
    }
    return callback(null, true);
};

aedes.authenticate = function (client, user_id, api_token, callback) {
    // https://github.com/arden/aedes#instanceauthenticateclient-username-password-doneerr-successful
    console.log("---authenticate handler---");
    // id matches with username
    if (client.id.split(':')[0] !== user_id) {
        console.log("client id doesn't match user id:", user_id, ":", client.id);
        return errorHandler(callback, null,"authenticate", "id", "client id and user id don't match", 4);
    }

    // api token format is invalid
    if (api_token.toString() === "" || api_token.toString() === null || api_token.toString() === undefined) {
        console.log("Wrong api token format:", api_token.toString);
        failed_attempt_count[client.id]++;
        return errorHandler(callback, null,"authenticate", "api_token", "wrong api token format", 4);
    }

    let correct_api_token = accountUtils.getApiToken(user_id);
    if (correct_api_token === undefined) {
        console.log(`unknown user_id: ${user_id}: ${client.id}`);
        failed_attempt_count[client.id]++;
        return errorHandler(callback, null, "authenticate", "id", "unknown user id", 5);
    } else {
        if (api_token.toString() === correct_api_token) {
            // user is attempting to connect with a different device
            if (user_id in connected_users && connected_users[user_id].is_connected && connected_users[user_id].last_connected !== client.id) {
                console.log(`${connected_users[user_id].last_connected} was connected with the same user id, sending logout`);
                let logout_message = JSON.stringify({
                    type: "error",
                    handler: "authenticate",
                    category: "logout",
                    message: "a new device has connected",
                    messageId: null,
                });
                send_server_message(`/${user_id}/devices/${connected_users[user_id].last_connected}`, logout_message);
            }
            if (user_id in connected_users) {
                connected_users[user_id].is_connected = true;
                connected_users[user_id].last_connected = client.id;
            }
            else {
                connected_users[user_id] = {
                    is_connected: true,
                    last_connected: client.id,
                }
            }
            console.log(`connected: ${user_id}: ${client.id}`);
            failed_attempt_count[client.id] = 0;
            return callback(null, true);
        } else {
            console.log(`wrong api_token: ${user_id}: ${client.id}`);
            failed_attempt_count[client.id]++;
            return errorHandler(callback, null, "authenticate", "api_token", "wrong api token", 5);
        }
    }
}

aedes.on("clientDisconnect", function (client) {
    console.log("---client disconnect---");
    let user_id = client.id.split(':')[0];
    if (user_id in connected_users) {
        connected_users[user_id].is_connected = false;
    }
    else {
        console.log("ERROR!!! THIS USER WAS NOT REGISTERED AS CONNECTED!");
    }
    console.log(client.id, "disconnected");
});

aedes.on("clientError", function (client, error) {
    console.log("---error handler---");
    console.log(client.id, ":", error.message);
    if (error.code !== "ECONNRESET") {
        send_server_message(`/${client.id.split(':')[0]}/devices/${client.id}`, error.message);
    }
});

aedes.authorizePublish = function (client, packet, callback) {
    // https://github.com/arden/aedes#instanceauthorizepublishclient-packet-doneerr
    console.log("---publish handler---");

    let topic_contents = packet.topic.split("/");
    if (topic_contents.length < 3) {
        return errorHandler(callback, undefined, "authorizePublish", "topic", "not enough topic levels", 4, packet.messageId);
    }
    topic_contents = topic_contents.slice(1);
    let receiver_id = topic_contents[0];
    let user_id = client.id.split(":")[0];
    let senderId = undefined;
    console.log("publishing content...");
    console.log("sender_id: " + user_id);
    console.log("receiver_id: " + receiver_id);
    // console.log("content:", packet.payload.toString());

    // wildcards are not allowed
    if (packet.topic.indexOf('$') !== -1 || packet.topic.indexOf('#') !== -1 || packet.topic.indexOf('+') !== -1) {
        console.log("tried to publish a channel with forbidden wildcard:", packet.topic);
        return errorHandler(callback, undefined, "authorizePublish", "topic", "wildcards are not allowed in topic", 5, packet.messageId);
    }

    // only user can publish to their own channels other than their inbox
    if (senderId !== receiver_id && topic_contents[1] !== "inbox") {
        console.log("tried to publish to", packet.topic);
        return errorHandler(callback, undefined,"authorizePublish", "topic", "can't publish to other user's channel except inbox", 5, packet.messageId);
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
        return errorHandler(callback, undefined,"authorizePublish", "payload", "payload sender id mismatch", 4, packet.messageId);
    }

    let receiverFriends = userFriendsUtils.getFriends(receiver_id);
    if (receiverFriends !== undefined && user_id in receiverFriends && !receiverFriends[user_id]["blocked"]) {
        if (receiver_id in connected_users && connected_users[receiver_id].is_connected) {
            return callback(null);
        } else {
            let token = accountUtils.getNotificationToken(receiver_id);
            console.log(`${receiver_id} is not connected`);
            if (firebase_admin !== undefined && token !== undefined && token !== null && token !== "") {
                console.log("found notification token, sending notification");
                const message = {
                    "data": {
                        "fromId": user_id,
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
                        console.log("deleting notification token for receiver");
                        accountUtils.updateNotificationToken(receiver_id, null);
                    });
            }
        }
        return callback(null);
    } else {
        console.log(user_id, "not friends with", receiver_id);
        return errorHandler(callback, undefined, "authorizePublish", "friends", "not friends with the receiver", 5, packet.messageId);
    }
}

aedes.authorizeSubscribe = function (client, sub, callback) {
    // https://github.com/arden/aedes#instanceauthorizesubscribeclient-pattern-doneerr-pattern
    console.log("---subscribe handler---");
    if (sub.topic.indexOf('$') !== -1 || sub.topic.indexOf('#') !== -1 || sub.topic.indexOf('+') !== -1) {
        console.log("tried to subscribe to a channel with forbidden wildcard:", sub.topic);
        return errorHandler(callback, null,"authorizeSubscribe", sub.topic, "wildcards are not allowed in topic");
    }

    console.log(client.id, "subscribing to", sub.topic);
    let topic_levels = sub.topic.split('/');

    if (topic_levels.length < 2) {
        return errorHandler(callback, null, "authorizeSubscribe", sub.topic, "not enough topic levels");
    }
    topic_levels = topic_levels.slice(1);

    if (client.id.split(':')[0] === topic_levels[0]) {
        console.log("subbed");
        return callback(null, sub);
    } else {
        console.log("sub error");
        return errorHandler(callback, null,"authorizeSubscribe", sub.topic, "not authorized");
    }
}

server.listen(port, function () {
    console.log('Server started and listening on port ', port);

    let devices = userDevicesUtils.getAllDeviceIds();
    for (let i=0; i<devices.length; i++) {
        const user_id = devices[i].user_id;
        const device_id = devices[i].device_id;
        if (user_id === undefined || user_id === null || user_id === ''
            || device_id === undefined || device_id === null || device_id === '') {
            continue;
        }
        let options = {
            host: "localhost",
            port: process.env.port,
            clean: false,
            clientId: `${user_id}:${device_id}`,
            username: user_id.toString(),
            password: accountUtils.getApiToken(user_id),
            protocol: 'mqtt',
            rejectUnauthorized: false,
        };
        if (argv.tls) {
            options.protocol = "tls";
        }

        let client = mqtt.connect(options);

        client.on('connect', function () {
            client.subscribe(`/${user_id}/inbox`, {qos: 1});
            client.subscribe(`/${user_id}/devices/${options.clientId}`, {qos: 0});
            client.end();
        });

        client.on("error", function (error) {
            console.log("error subbing", options.clientId);
            console.log(error);
        });
    }
});

