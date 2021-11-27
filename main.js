const fs = require('fs');
const path = require("path");
const aedes = require('aedes')();
const argv = require("yargs")(process.argv.slice(2))
    .option("port", {
        description: "port to bind",
        type: "number",
        demandOption: true,
    })
    .option("database", {
        description: "path to database file",
        type: "string",
        demandOption: true,
    })
    .option("tls", {
        description: "folder with cert.pem and privkey.pem",
        type: "string",
        default: false
    })
    .help().alias("help", "h")
    .parse();

const Database = require("@dab-co/jam-sqlite").Database;
const database = new Database(argv.database);
const AccountUtils = require("@dab-co/jam-sqlite").Utils.AccountUtils;
const accountUtils = new AccountUtils(database);
const bcrypt = require("bcrypt");

const port = argv.port;
let server = null;

if (argv.tls) {
    const options = {
        cert: fs.readFileSync(path.join(argv.tls, "cert.pem")),
        key: fs.readFileSync(path.join(argv.tls, "privkey.pem"))
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
        bcrypt.compare(password, accountUtils.getPassword(username), function (err, result) {
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

/*aedes.authorizePublish = function (client, packet, callback) {
    // https://github.com/arden/aedes#instanceauthorizepublishclient-packet-doneerr
}*/

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

/*aedes.authorizeForward = function (clientId, packet) {
    //https://github.com/arden/aedes#instanceauthorizeforwardclientid-packet
}*/

server.listen(port, function () {
    console.log('Server started and listening on port ', port);
});
