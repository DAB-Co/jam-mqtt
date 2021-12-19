const fs = require('fs');
const path = require("path");
const aedes = require('aedes')();
require("dotenv").config({path: path.join(__dirname, ".env.local")});
const argv = require("yargs")(process.argv.slice(2))
    .option("tls", {
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
const bcrypt = require("bcrypt");

const port = process.env.port;
const firebase_admin = argv.no_notification ? undefined : require('./firebase-config').admin;

let server = null;

if (argv.tls) {
    const options = {
        cert: fs.readFileSync(process.env.tls_cert_path),
        key: fs.readFileSync(process.env.tls_privkey_path)
    };

    server = require('tls').createServer(options, aedes.handle);
} else {
    server = require('net').createServer(aedes.handle)
}

aedes.authenticate = function (client, username, password, callback) {
    // https://github.com/arden/aedes#instanceauthenticateclient-username-password-doneerr-successful
    if (client.id.split(":")[0] !== username) {
        console.log("client id and username doesn't match");
        console.log(`client id: ${client.id}, username: ${username}`);
        let error = new Error("Auth error");
        error.returnCode = 4;
        callback(error, null);
    } else if (!accountUtils.usernameExists(username)) {
        console.log(`unknown username: ${username}: ${client.id}`);
        let error = new Error("Auth error");
        error.returnCode = 4;
        callback(error, null);
    } else {
        bcrypt.compare(password, accountUtils.getPasswordFromUsername(username), function (err, result) {
            if (result) {
                console.log(`connected: ${username}: ${client.id}`);
                callback(null, true);
            } else {
                console.log(`wrong password: ${username}: ${client.id}`);
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
    console.log("receiver: " + receiver);
    console.log("sender: " + sender);
    let token = accountUtils.getNotificationToken(receiver);
    if (token == null) return;
    const message = {
        notification: {
            title: `You have messages from ${sender}!`,
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

aedes.authorizeSubscribe = function (client, sub, callback) {
    // https://github.com/arden/aedes#instanceauthorizesubscribeclient-pattern-doneerr-pattern
    console.log(client.id, "subscribing to", sub.topic);
    if (client.id.split(':')[0] === sub.topic.split('/')[1]) {
        console.log("subbed");
        callback(null, sub);
    } else {
        console.log("error");
        let error = new Error("Auth error");
        error.returnCode = 4;
        callback(error, null);
    }
}

/*aedes.authorizeForward = function (clientId, packet) {
    //https://github.com/arden/aedes#instanceauthorizeforwardclientid-packet
}*/

server.listen(port, function () {
    console.log('Server started and listening on port ', port);
});
