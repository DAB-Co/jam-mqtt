const path = require("path");
const assert = require("assert");
const setup = require(path.join(__dirname, "setup.js"));
const mqtt = require('mqtt');

const UserFriendsUtils = require("@dab-co/jam-sqlite").Utils.UserFriendsUtils;

describe(__filename, function () {
    let database = undefined;
    let accounts = undefined;
    let client1 = undefined;
    let client2 = undefined;
    this.timeout(2000);
    const connect_timeout = 1000;
    before(function () {
        database = setup.create_database();
        accounts = setup.register_accounts(database);
    });

    describe("", function () {
        it("client 1 can't login with wrong api token", function (done) {
            let options = setup.deepCopy(accounts[1].mqtt_options);
            options.password = "wrong_api_token";
            client1 = mqtt.connect(options);
            let connectCallbackRan = false;
            let errorCallbackRan = false;
            client1.on('connect', function () {
                connectCallbackRan = true;
                client1.end();
            });
            client1.on('error', function (error) {
                errorCallbackRan = true;
                assert.strictEqual(error.code, 5);
            });
            setTimeout(function () {
                client1.end();
                assert.ok(!connectCallbackRan);
                assert.ok(errorCallbackRan);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
        it("subscribing to /2/inbox", function (done) {
            let options = setup.deepCopy(accounts[2].mqtt_options);
            client2 = mqtt.connect(options);
            let connectCallbackRan = false;
            client2.on('connect', function () {
                client2.subscribe(`/2/inbox`, {qos: 2});
                connectCallbackRan = true;
            });

            setTimeout(function () {
                client2.end();
                assert.ok(connectCallbackRan);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
        it("publishing from 1 to /2/inbox", function (done) {
            let options = setup.deepCopy(accounts[1].mqtt_options);
            client1 = mqtt.connect(options);
            let connectCallbackRan = false;
            client1.on('connect', function () {
                let message = {
                    "from": '1',
                    "timestamp": "2021-11-26 06:01:12.685Z",
                    "content": "hello world"
                }
                client1.publish(`/2/inbox`, JSON.stringify(message), {qos: 2});
                connectCallbackRan = true;
            });
            setTimeout(function () {
                client1.end();
                assert.ok(connectCallbackRan);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
        it("receiving message from 1", function (done) {
            let options = setup.deepCopy(accounts[2].mqtt_options);
            client2 = mqtt.connect(options);
            let messageCallbackRan = false;
            client2.on('message', function (topic, res) {
                let message = JSON.parse(res.toString());
                assert.strictEqual(message.from, '1');
                assert.strictEqual(message.timestamp, "2021-11-26 06:01:12.685Z");
                assert.strictEqual(message.content, "hello world");
                messageCallbackRan = true;
            });
            setTimeout(function () {
                client2.end();
                assert.ok(messageCallbackRan);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
        it("user 1 can't send a message pretending to be from 2", function (done) {
            let options1 = setup.deepCopy(accounts[1].mqtt_options);
            client1 = mqtt.connect(options1);
            let client1ConnectCallbackRan = false;
            let messageId = undefined;
            let client1PacketCallbackRan = false;
            let client1MessageCallbackRan = false;
            let message = JSON.stringify({
                "from": '2',
                "timestamp": "2021-11-26 06:01:12.685Z",
                "content": "hello world"
            });
            client1.on('connect', function () {
                client1.subscribe(`/1/devices/${options1.clientId}`);
                client1.publish(`/2/inbox`, message, {qos: 2});
                client1ConnectCallbackRan = true;
            });
            client1.on("packetsend", function (packet) {
                if (packet.payload === message) {
                    messageId = packet.messageId;
                    client1PacketCallbackRan = true;
                }
            });
            client1.on("message", function (topic, res) {
                let message = JSON.parse(res.toString());
                assert.strictEqual(topic, `/1/devices/${options1.clientId}`);
                assert.strictEqual(message.type, "error");
                assert.strictEqual(message.handler, "authorizePublish");
                assert.strictEqual(message.category, "payload");
                assert.strictEqual(message.message, "payload sender id mismatch");
                assert.strictEqual(message.messageId, messageId);
                client1MessageCallbackRan = true;
            });
            let options2 = setup.deepCopy(accounts[2].mqtt_options);
            client2 = mqtt.connect(options2);
            let client2MessageCallbackRan = false;
            client2.on("connect", function () {
                client2.subscribe("/2/inbox");
            });
            client2.on("message", function (topic, res) {
                client2MessageCallbackRan = true;
            });
            setTimeout(function () {
                client1.end();
                client2.end();
                assert.ok(messageId !== undefined && messageId !== null);
                assert.ok(!client2MessageCallbackRan);
                assert.ok(client1PacketCallbackRan);
                assert.ok(client1MessageCallbackRan);
                assert.ok(client1ConnectCallbackRan);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
        it("user 1 can't login with spoofed client id pretending to be 2", function (done) {
            let options = setup.deepCopy(accounts[1].mqtt_options);
            options.clientId = `2:unique1`;
            client1 = mqtt.connect(options);
            let client1ConnectCallbackRan = false;
            let client1ErrorCallbackRan = false;
            client1.on('connect', function () {
                client1ConnectCallbackRan = true;
                client1.end();
            });
            client1.on("error", function (error) {
                client1ErrorCallbackRan = true;
                assert.strictEqual(error.code, 4);
            });
            setTimeout(function () {
                client1.end();
                assert.ok(!client1ConnectCallbackRan);
                assert.ok(client1ErrorCallbackRan);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
        it("client 1 can't sub to client 2's inbox to receive client 2's message", function (done) {
            let options = setup.deepCopy(accounts[1].mqtt_options);
            client1 = mqtt.connect(options);
            let connectCallbackRan = false;
            let messageCallbackRan = false;
            client1.on("connect", function () {
                client1.subscribe(`/2/inbox`);
                connectCallbackRan = true;
            });
            client1.on("message", function (topic, payload) {
                if (topic === `/1/devices/${options.clientId}`) {
                    let content = JSON.parse(payload.toString());
                    assert.strictEqual(content.type, "error");
                    assert.strictEqual(content.handler, "authorizeSubscribe");
                    assert.strictEqual(content.category, "/2/inbox");
                    assert.strictEqual(content.message, "not authorized");
                    assert.strictEqual(content.messageId, null);
                    messageCallbackRan = true;
                }
            });
            setTimeout(function () {
                client1.end();
                assert.ok(connectCallbackRan);
                assert.ok(messageCallbackRan);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
        it("client 1 can't send messages to client 2 after being blocked", function (done) {
            const userFriendsUtils = new UserFriendsUtils(database);
            userFriendsUtils.blockUser(2, 1);
            let options1 = setup.deepCopy(accounts[1].mqtt_options);
            client1 = mqtt.connect(options1);
            let client1ConnectCallbackRan = false;
            let client1MessageCallbackRan = false;
            let client1PacketCallbackRan = false;
            let messageId = undefined;
            let message = JSON.stringify({
                "from": '1',
                "timestamp": "2021-11-26 06:01:12.685Z",
                "content": "hello world"
            });
            client1.on("connect", function () {
                client1.publish("/2/inbox", message, {qos: 2});
                client1ConnectCallbackRan = true;
            });
            client1.on("packetsend", function (packet) {
                if (packet.payload === message) {
                    messageId = packet.messageId;
                    client1PacketCallbackRan = true;
                }
            });
            client1.on("message", function (topic, payload) {
                if (topic === `/1/devices/${options1.clientId}`) {
                    let message = JSON.parse(payload.toString());
                    assert.strictEqual(message.type, "error");
                    assert.strictEqual(message.handler, "authorizePublish");
                    assert.strictEqual(message.category, "friends");
                    assert.strictEqual(message.message, "not friends with the receiver");
                    assert.strictEqual(message.messageId, messageId);
                    client1MessageCallbackRan = true;
                }
            });

            let options2 = setup.deepCopy(accounts[2].mqtt_options);
            client2 = mqtt.connect(options2);
            let client2MessageCallbackRan = false;
            client2.on("message", function (topic, res) {
                client2MessageCallbackRan = true;
            });
            setTimeout(function () {
                client1.end();
                client2.end();
                assert.ok(messageId !== undefined && messageId !== null);
                assert.ok(client1PacketCallbackRan);
                assert.ok(client1ConnectCallbackRan);
                assert.ok(client1MessageCallbackRan);
                assert.ok(!client2MessageCallbackRan);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
        it("client 2 can't send messages to client 1 after blocking", function () {
            // this test won't work due to blocking being one way
            // but why would you want to send messages to someone you blocked?
        });
    });
});
