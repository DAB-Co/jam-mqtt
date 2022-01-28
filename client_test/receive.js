let mqtt = require('mqtt');
const fs = require("fs");
const path = require("path");
require("dotenv").config({path: path.join(__dirname, ".env.local")});

const user_id = process.env.to_id;

const options = {
    host: process.env.ip,
    port: process.env.port,
    clean: false,
    clientId: `${user_id}:unique`,
    username: user_id,
    password: "api_token",
    //protocol: 'mqtts',
    //rejectUnauthorized: false,
    //cert: fs.readFileSync(process.env.client_0_cert),
    //key:  fs.readFileSync(process.env.client_0_key),
    //ca: fs.readFileSync(process.env.ca_cert)
}

let client = mqtt.connect(options);

client.on('connect', function () {
    client.subscribe(`/${user_id}/inbox`, {qos: 2});
    client.subscribe(`/${user_id}/devices/${options.clientId}`, {qos: 0});
});

client.on("packetreceive", function (packet) {
    console.log("---packet receive---");
    console.log(packet);
});

client.on('message', function (topic, message) {
    let context = message.toString();
    console.log(topic + ": " + context);
});

client.on("error", function (error) {
    console.log(error);
    client.end();
});
