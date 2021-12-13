let mqtt = require('mqtt');

let from = "test_user0"
let to = "test_user1"

const options = {
    host: "rocketdodgegame.com",
    port: "41371",
    clean: false,
    clientId: `${from}:1768209775a80e7c`,
    username: from,
    password: "12345678",
    //protocol: 'mqtts'
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