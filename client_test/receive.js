let mqtt = require('mqtt');
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });

const USERNAME = "2";

const options = {
    host: process.env.ip,
    port: process.env.port,
    clean: false,
    clientId: `${USERNAME}:${crypto.randomBytes(4).toString('hex')}`,
    username: USERNAME,
    password: "12345678",
    //protocol: 'mqtts',
    //rejectUnauthorized: false,
    //cert: fs.readFileSync(process.env.client_0_cert),
    //key:  fs.readFileSync(process.env.client_0_key),
    //ca: fs.readFileSync(process.env.ca_cert)
}

let client = mqtt.connect(options);

client.on('connect', function () {
    client.subscribe(`/${USERNAME}/inbox`, {qos:2});
});

client.on('message', function (topic, message) {
    let context = message.toString();
    console.log(context);
});