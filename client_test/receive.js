let mqtt = require('mqtt');
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });

const USERNAME = "receiver"

const options = {
    host: process.env.ip,
    port: process.env.port,
    clean: false,
    clientId: `${USERNAME}:${crypto.randomBytes(16).toString('hex')}`,
    username: USERNAME,
    password: "12345678",
    //protocol: 'mqtts'
}

let client = mqtt.connect(options);

client.on('connect', function () {
    client.subscribe(`/${USERNAME}/inbox`, {qos:2});
});

client.on('message', function (topic, message) {
    let context = message.toString();
    console.log(context);
});