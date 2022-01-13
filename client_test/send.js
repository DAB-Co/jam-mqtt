let mqtt = require('mqtt');
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });

const from = "1"
const to = "2"

const options = {
    host: process.env.ip,
    port: process.env.port,
    clean: false,
    clientId: `${from}:${crypto.randomBytes(4).toString('hex')}`,
    username: from,
    password: "api_token",
    //protocol: 'mqtts',
    //rejectUnauthorized: false,
    //cert: fs.readFileSync(process.env.client_1_cert),
    //key:  fs.readFileSync(process.env.client_1_key),
    //ca: fs.readFileSync(process.env.ca_cert)
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
    //client.end();
});



setTimeout(function() {
    console.log(client.connected);
    client.end();
}, 2000);

