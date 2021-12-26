const tls = require('tls');
const fs = require('fs');
const path = require("path");

let options = {
    hostname: "localhost",
    key: fs.readFileSync(path.join(__dirname, "..", "certs", "client_0", "client.key")),
    cert: fs.readFileSync(path.join(__dirname, "..", "certs", "client_0", "client.crt")),
    //ca: fs.readFileSync(path.join(__dirname, "..", "certs", "ca", "ca.crt")),
    //rejectUnauthorized: false,
};

let conn = tls.connect(8000, options, function () {
    if (conn.authorized) {
        console.log("Connection authorized by a Certificate Authority.");
    } else {
        console.log("Connection not authorized: " + conn.authorizationError)
    }
    console.log();
});

conn.on("data", function (data) {
    console.log(data.toString());
    conn.end();
});
