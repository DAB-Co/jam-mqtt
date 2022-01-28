let mqtt = require('mqtt');
const fs = require("fs");
const path = require("path");
require("dotenv").config({path: path.join(__dirname, ".env.local")});

const from = process.env.from_id;
const to = process.env.to_id;

const options = {
    host: process.env.ip,
    port: process.env.port,
    clean: false,
    clientId: `${from}:unique${from}`,
    username: from,
    password: "api_token",
    //protocol: 'mqtts',
    //rejectUnauthorized: false,
    //cert: fs.readFileSync(process.env.client_1_cert),
    //key:  fs.readFileSync(process.env.client_1_key),
    //ca: fs.readFileSync(process.env.ca_cert)
}

const client = mqtt.connect(options);

let message = {
    "from": from,
    "timestamp": "2021-11-26 06:01:12.685Z",
    "content": "ilk"
}

setInterval(function () {
    client.publish(`/${to}/inbox`, JSON.stringify(message), {qos: 2});
}, 10000);

client.on('connect', function () {
    client.subscribe(`/${from}/devices/${options.clientId}`);
});

client.on("packetsend", function (packet) {
    console.log("---packet send---");
    console.log(packet);
});

client.on("packetreceive", function (packet) {
    console.log("---packet receive---");
    console.log(packet);
})

client.on("message", function (topic, payload) {
    console.log("---message---");
    if (topic === `/${from}/devices/${options.clientId}`) {
        console.log("ERROR:", payload.toString());
    }
});

client.on("error", function (error) {
    console.log("---error---");
    console.log(error);
    client.end();
    process.exit();
});
