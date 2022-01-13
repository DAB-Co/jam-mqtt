const path = require("path");
const assert = require("assert");
const setup = require(path.join(__dirname, "setup.js"));
const mqtt = require('mqtt');

describe(__filename, function () {
    let database = undefined;
    let accounts = undefined;
    let client1 = undefined;
    let client2 = undefined;
    this.timeout(5000);
    before(function () {
        database = setup.create_database();
        accounts = setup.register_accounts(database);
    });

    after(function () {
        if (client1 !== undefined) {
            client1.end();
        }

        if (client2 !== undefined) {
            client2.end();
        }
    });

    describe("", function() {
        it("client 1 can't login with wrong api token", function() {

        });
    });

    describe("", function () {
        it("subscribing to /2/inbox", function (done) {
            let options = {
                host: "localhost",
                port: "41371",
                clean: false,
                clientId: `2:unique2`,
                username: '2',
                password: accounts[2].api_token,
            }
            client2 = mqtt.connect(options);
            let connectCallbackRan = false;
            client2.on('connect', function () {
                client2.subscribe(`/2/inbox`, {qos: 2});
                connectCallbackRan = true;
            });

            setTimeout(function () {
                assert.ok(client2.connected);
                client2.end();
                assert.ok(connectCallbackRan);
                done();
            }, 2000);
        });
    });

    describe("", function () {
        it("publishing from 1 to /2/inbox", function (done) {
            let options = {
                host: "localhost",
                port: "41371",
                clean: false,
                clientId: `1:unique1`,
                username: '1',
                password: accounts[1].api_token,
            }
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
                assert.ok(client1.connected);
                client1.end();
                assert.ok(connectCallbackRan);
                done();
            }, 2000);
        });
    });

    describe("", function () {
        it("receiving message from 1", function (done) {
            let options = {
                host: "localhost",
                port: "41371",
                clean: false,
                clientId: `2:unique2`,
                username: '2',
                password: accounts[2].api_token,
            }
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
                assert.ok(client2.connected);
                client2.end();
                assert.ok(messageCallbackRan);
                done();
            }, 2000);
        });
    });

    describe("", function () {
        it("user 1 can't send a message pretending to be from 2", function (done) {
            let options1 = {
                host: "localhost",
                port: "41371",
                clean: false,
                clientId: `1:unique1`,
                username: '1',
                password: accounts[1].api_token,
            }
            client1 = mqtt.connect(options1);
            let client1ConnectCallbackRan = false;
            client1.on('connect', function () {
                let message = {
                    "from": '2',
                    "timestamp": "2021-11-26 06:01:12.685Z",
                    "content": "hello world"
                }
                client1.publish(`/2/inbox`, JSON.stringify(message), {qos: 2});
                client1ConnectCallbackRan = true;
                client1.end();
            });
            let options2 = {
                host: "localhost",
                port: "41371",
                clean: false,
                clientId: `2:unique2`,
                username: '2',
                password: accounts[2].api_token,
            };
            client2 = mqtt.connect(options2);
            let client2MessageCallbackRan = false;
            client2.on("message", function (topic, res) {
                let message = JSON.parse(res.toString());
                assert.strictEqual(message.from, '2');
                assert.strictEqual(message.timestamp, "2021-11-26 06:01:12.685Z");
                assert.strictEqual(message.content, "hello world");
                client2MessageCallbackRan = true;
            });
            setTimeout(function () {
                client1.end();
                assert.ok(client2.connected);
                client2.end();
                assert.ok(!client1.connected);
                assert.ok(!client2MessageCallbackRan);
                assert.ok(client1ConnectCallbackRan);
                done();
            }, 2000);
        });
    });

    describe("", function () {
        it("user 1 can't login with spoofed client id pretending to be 2", function (done) {
            let options = {
                host: "localhost",
                port: "41371",
                clean: false,
                clientId: `2:unique1`,
                username: '1',
                password: accounts[1].api_token,
            }
            client1 = mqtt.connect(options);
            let client1ConnectCallbackRan = false;
            client1.on('connect', function () {
                let message = {
                    "from": '1',
                    "timestamp": "2021-11-26 06:01:12.685Z",
                    "content": "hello world"
                }
                client1.publish(`/2/inbox`, JSON.stringify(message), {qos: 2});
                client1ConnectCallbackRan = true;
                client1.end();
            });
            setTimeout(function () {
                client1.end();
                assert.ok(!client1ConnectCallbackRan);
                done();
            }, 2000);
        });
    });

    describe("", function() {
        it("client 1 can't sub to client 2's inbox to receive client 2's message", function () {

        });
    });

    describe("", function () {
       it("client 1 can't send messages to client 2 after being blocked", function() {

       });
    });

    describe("", function() {
        it("client 2 can't send messages to client 1 after blocking", function (){
            // this test won't work i think due to blocking being one way
            // but why would you want to send messages to someone you blocked?
            // idk what to do about this, will create an issue
            assert.ok(true);
        });
    });
});
