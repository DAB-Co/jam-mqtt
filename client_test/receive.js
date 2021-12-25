let mqtt = require('mqtt');
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });

const USERNAME = "receiver";

const options = {
    host: process.env.ip,
    port: process.env.port,
    clean: false,
    clientId: `${USERNAME}:${crypto.randomBytes(4).toString('hex')}`,
    username: USERNAME,
    password: "12345678",
    protocol: 'mqtts',
    rejectUnauthorized: false,
    cert: fs.readFileSync(path.join(__dirname, "../tls/certs/client_0/client.crt")),
    key:  fs.readFileSync(path.join(__dirname, "../tls/certs/client_0/client.key")),
    //ca: fs.readFileSync(path.join(__dirname, "../tls/certs/ca/ca.crt"))
}

let client = mqtt.connect(options);

client.on('connect', function () {
    client.subscribe(`/${USERNAME}/inbox`, {qos:2});
});

client.on('message', function (topic, message) {
    let context = message.toString();
    console.log(context);
});