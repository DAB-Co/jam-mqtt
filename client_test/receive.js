let mqtt = require('mqtt');

let me = "username"

const options = {
    host: "localhost",
    port: "80",
    clean: false,
    clientId: `${me}:1768209775a80e7c`,
    username: me,
    password: "password",
    protocol: 'mqtts'
}
let client = mqtt.connect(options);

client.on('connect', function () {
    client.subscribe(`/${me}/inbox`, {qos:2});
});

client.on('message', function (topic, message) {
    let context = message.toString();
    console.log(context);
});