let mqtt = require('mqtt');
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });

const from = "sender"
const to = "receiver"

const options = {
    host: process.env.ip,
    port: process.env.port,
    clean: false,
    clientId: `${from}:${crypto.randomBytes(4).toString('hex')}`,
    username: from,
    password: "12345678",
    protocol: 'mqtts',
    cert: fs.readFileSync(path.join(__dirname, "../tls/certs/client_1/client.crt"), "utf-8"),
    key:  fs.readFileSync(path.join(__dirname, "../tls/certs/client_1/client.key"), "utf-8"),
}

const client = mqtt.connect(options);

client.on('connect', function () {
    let message = {
        "from": from,
        "timestamp": "2021-11-26 06:01:12.685Z",
        "content": "ilk"
    }
    client.publish(`/${to}/inbox`, JSON.stringify(message), {qos: 2});
    console.log("message sent");
    client.end();
});