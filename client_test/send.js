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
    clientId: "user1"
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

const client = mqtt.connect(options);

client.on('connect', function () {
    let message = {
        "from": "patrick@bateman.com",
        "timestamp": "2022-11-26 06:01:12.685Z",
        "content": "let's see paul allen's card"
    }
    client.publish("/paul@allen.com/inbox", JSON.stringify(message), {qos: 2});
    console.log("message sent");
    client.end();
});