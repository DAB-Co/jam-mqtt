const path = require("path");
const aedes = require("aedes")();
require("dotenv").config({path: path.join(__dirname, ".env.local")});

const server = require('net').createServer(aedes.handle);

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
