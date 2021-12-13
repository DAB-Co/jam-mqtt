let mqtt = require('mqtt');

let me = "test_user1"

const options = {
    host: "rocketdodgegame.com",
    port: "41371",
    clean: false,
    clientId: `${me}:1768209775a80e7c`,
    username: me,
    password: "12345678",
    //protocol: 'mqtts'
}

let client = mqtt.connect(options);

client.on('connect', function () {
    client.subscribe(`/${me}/inbox`, {qos:2});
});

client.on('message', function (topic, message) {
    let context = message.toString();
    console.log(context);
});