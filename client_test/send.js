let mqtt = require('mqtt');
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });

const from = "1"
const to = "2"

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

let sent_messages = [];

client.on('connect', function () {
    let message = {
        "from": from,
        "timestamp": "2021-11-26 06:01:12.685Z",
        "content": "ilk"
    }
    client.subscribe(`/${from}/devices/${options.clientId}`);
    client.publish(`/${to}/inbox`, JSON.stringify(message), {qos: 2});
    console.log("message sent");
});

client.on("packetsend", function (packet){
    console.log("---packet send---");
    console.log(packet.messageId, ":", packet.payload);
});

client.on("message", function(topic, payload) {
    if (topic === `/${from}/devices/${options.clientId}`) {
        console.log("ERROR:", payload.toString());
    }
});

client.on("error", function (error) {
   console.log(error);
   client.end();
});