const tls = require('tls');
const fs = require('fs');
const path = require("path");

//process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';

let options = {
    hostname: "10.185.248.64",
    key: fs.readFileSync(path.join(__dirname, "..", "certs", "client_0", "client.key")),
    cert: fs.readFileSync(path.join(__dirname, "..", "certs", "client_0", "client.crt")),
    //ca: fs.readFileSync(path.join(__dirname, "..", "certs", "ca", "ca.crt"))
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
