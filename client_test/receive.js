let mqtt = require('mqtt');
/*const argv = require("yargs")(process.argv.slice(2))
    .option("ip", {
        description: "ip address or domain of server",
        type: "string",
        demandOption: true,
    })
    .option("port", {
        description: "port to bind",
        type: "string",
        demandOption: true,
    })
    .help().alias("help", "h")
    .parse();
const options = {
    host: argv.host,
    port: argv.port,
    clean: false,
    clientId: "user2"
}
 */

const options = {
    host: "rocketdodgegame.com",
    port: "41371",
    clean: false,
    clientId: 'patrick@bateman.com:pc',
    username: "patrick@bateman.com",
    password: ""
}
let client = mqtt.connect(options);

client.on('connect', function () {
    client.subscribe({"/patrick@bateman.com/inbox": {qos:2}});
});

client.on('message', function (topic, message) {
    let context = message.toString();
    console.log(context);
});