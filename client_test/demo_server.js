const path = require("path");
const fs = require("fs");
const aedes = require("aedes")();
const mqtt = require("mqtt");
require("dotenv").config({path: path.join(__dirname, ".env.local")});
const argv = require("yargs")(process.argv.slice(2))
    .option("tls", {
        description: "run with tls",
        type: "boolean",
        default: false
    })
    .help().alias("help", "h")
    .parse();

let server = null;

if (argv.tls) {
    const options = {
        cert: fs.readFileSync(process.env.tls_cert),
        key: fs.readFileSync(process.env.tls_key)
    };

    server = require('tls').createServer(options, aedes.handle);
} else {
    server = require('net').createServer(aedes.handle)
}

server.listen(process.env.port, function () {
    console.log('Server started and listening on port ', process.env.port);
});

aedes.on("publish", function(packet, client) {
    console.log("------publish------");
    console.log("---packet---");
    console.log(packet);
    if (packet && packet.payload) {
        console.log("payload:", packet.payload.toString());
    }
    console.log("---client---");
    if (client && client.id) {
        console.log(client.id);
    }
});

const user_id = process.env.to_id;

const options = {
    host: process.env.ip,
    port: process.env.port,
    clean: false,
    clientId: `${user_id}:unique`,
    username: user_id,
    password: "api_token",
    protocol: 'tls',
    rejectUnauthorized: false,
    //cert: fs.readFileSync(process.env.client_0_cert),
    //key:  fs.readFileSync(process.env.client_0_key),
    //ca: fs.readFileSync(process.env.ca_cert)
}

let client = mqtt.connect(options);

client.on('connect', function () {
    client.subscribe(`/${user_id}/inbox`, {qos: 2});
    client.subscribe(`/${user_id}/devices/${options.clientId}`, {qos: 0});
    client.end();
});

