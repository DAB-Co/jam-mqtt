const fs = require('fs');
const path = require("path");
const aedes = require('aedes')();
require("dotenv").config({ path: path.join(__dirname, ".env.local") });
const admin = require('./firebase-config').admin;
const argv = require("yargs")(process.argv.slice(2))
    .option("tls", {
        description: "run with tls",
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
let server = null;

if (argv.tls) {
    const options = {
        cert: fs.readFileSync(path.join(process.env.tls_cert, "cert.pem")),
        key: fs.readFileSync(path.join(process.env.tls_key))
    };

    server = require('tls').createServer(options, aedes.handle);
}
else {
    server = require('net').createServer(aedes.handle)
}

aedes.authenticate = function (client, username, password, callback) {
    // https://github.com/arden/aedes#instanceauthenticateclient-username-password-doneerr-successful
    if (!accountUtils.usernameExists(username)) {
        console.log(`unknown username: ${username}: ${client.id}`);
        let error = new Error("Auth error");
        error.returnCode = 4;
        callback(error, null);
    }
    else {
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
    let token = accountUtils.getNotificationTokenByUsername(receiver);
    if (token === undefined) {
        return callback(new Error('no token'));
    }
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
    admin.messaging().sendToDevice(token, message, options)
        .then(response => {
            console.log(response);
        })
        .catch(error => {
            console.log(error);
        });
    callback(null);
}

aedes.authorizeSubscribe = function (client, sub, callback) {
    // https://github.com/arden/aedes#instanceauthorizesubscribeclient-pattern-doneerr-pattern
    console.log(client.id, "subscribing to", sub.topic);
    if (client.id.split(':')[0] === sub.topic.split('/')[1]) {
        console.log("subbed");
        callback(null, sub);
    }
    else {
        console.log("error");
        let error = new Error("Auth error");
        error.returnCode = 4;
        callback(error, null);
    }
}

server.listen(port, function () {
    console.log('Server started and listening on port ', port);
});
