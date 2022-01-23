const path = require("path");
const assert = require("assert");
const setup = require(path.join(__dirname, "setup.js"));
const mqtt = require('mqtt');

describe(__filename, function () {
    let database = undefined;
    let accounts = undefined;
    this.timeout(2000);
    const connect_timeout = 1000;
    before(function () {
        database = setup.create_database();
        accounts = setup.register_accounts(database);
    });

    describe("", function () {
        it("send logout message to old device when new device connects", function (done) {
            let options1 = setup.deepCopy(accounts[1].mqtt_options);
            let options1v2 = setup.deepCopy(accounts[1].mqtt_options);
            options1v2.clientId += "v2";
            let client1 = mqtt.connect(options1);
            let client1ConnectCallbackRan = false;
            let client1StatusMessageReceived = false;
            client1.on("connect", function () {
                client1.subscribe(`/${options1.username}/devices/${options1.clientId}`, {qos: 0});
                client1ConnectCallbackRan = true;
            });
            client1.on("message", function (topic, res) {
                if (topic === `/${options1.username}/devices/${options1.clientId}`) {
                    let content = JSON.parse(res.toString());
                    assert.strictEqual(content.type, "error");
                    assert.strictEqual(content.handler, "authenticate");
                    assert.strictEqual(content.category, "logout");
                    assert.strictEqual(content.message, "a new device has connected, logout from this device");
                    assert.strictEqual(content.messageId, null);
                    client1StatusMessageReceived = true;
                    client1.end();
                }
            });

            let client1v2ConnectCallbackRan = false;
            let client1v2 = undefined;
            setTimeout(function () {
                client1v2 = mqtt.connect(options1v2);
                client1v2.on("connect", function () {
                    client1v2ConnectCallbackRan = true;
                });
            }, connect_timeout / 2);
            setTimeout(function () {
                client1.end();
                assert.ok(client1v2 !== undefined);
                client1v2.end();
                assert.ok(client1ConnectCallbackRan);
                assert.ok(client1v2ConnectCallbackRan);
                assert.ok(client1StatusMessageReceived);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
        it("don't send logout to same device id", function (done) {
            let options1v2 = setup.deepCopy(accounts[1].mqtt_options);
            options1v2.clientId += "v2";
            let client1v2 = mqtt.connect(options1v2);
            let client1v2ConnectCallbackRan = false;
            let client1v2StatusMessageReceived = false;
            client1v2.on("connect", function () {
                client1v2.subscribe(`/${options1v2.username}/devices/${options1v2.clientId}`);
                client1v2ConnectCallbackRan = true;
            });
            client1v2.on("message", function(topic, res) {
                assert.fail(res.toString());
                client1v2StatusMessageReceived = true;
            });
            setTimeout(function () {
                client1v2.end();
                assert.ok(client1v2ConnectCallbackRan);
                assert.ok(!client1v2StatusMessageReceived);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
        it("can't use wildcards in subscribe", function (done) {
            let options = setup.deepCopy(accounts[1].mqtt_options);
            let subscribeConditions = {
                dollarSignError: false,
                poundSignError: false,
                plusSignError: false,
            }
            let client = undefined;

            function connect(condition, subscription) {
                client = mqtt.connect(options);
                client.on("connect", function () {
                    client.subscribe(subscription);
                    client.subscribe(`/${options.username}/devices/${options.clientId}`);
                });
                client.on("message", function (topic, payload) {
                    if (topic === `/${options.username}/devices/${options.clientId}`) {
                        let content = JSON.parse(payload.toString());
                        assert.strictEqual(content.type, "error");
                        assert.strictEqual(content.handler, "authorizeSubscribe");
                        assert.strictEqual(content.category, subscription);
                        assert.strictEqual(content.message, "wildcards are not allowed in topic");
                        assert.strictEqual(content.messageId, null);
                        subscribeConditions[condition] = true;
                    }
                    client.end();
                });
            }

            connect("dollarSignError", "$SYS/");

            setTimeout(function () {
                connect("poundSignError", "#");
            }, connect_timeout*0.3);

            setTimeout(function () {

                connect("plusSignError", '/+');
            }, connect_timeout*0.6);

            setTimeout(function (){
                assert.ok(client !== undefined);
                client.end();
                assert.ok(subscribeConditions.dollarSignError);
                assert.ok(subscribeConditions.poundSignError);
                assert.ok(subscribeConditions.plusSignError);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
        it("can't use wildcards in the channel to be published", function (done) {
            let options = setup.deepCopy(accounts[1].mqtt_options);
            let publishConditions = {
                dollarSignRan: false,
                poundSignRan: false,
                plusSignRan: false,
            }
            let client = undefined;

            function connect(condition, topic, sign=undefined) {
                client = mqtt.connect(options);
                let messageId = undefined;
                client.on("connect", function () {
                    client.subscribe(`/${options.username}/devices/${options.clientId}`);
                    client.publish(topic, "8:30 reservation at Dorsia", {qos: 2});
                });
                client.on("packetsend", function (packet) {
                    if (packet.payload === "8:30 reservation at Dorsia") {
                        messageId = packet.messageId;
                        assert.ok(messageId !== undefined && messageId !== null);
                    }
                });
                client.on("message", function (topic, payload) {
                    if (topic === `/${options.username}/devices/${options.clientId}`) {
                        if (sign === '$') {
                            let content = JSON.parse(payload.toString());
                            assert.strictEqual(content.type, "error");
                            assert.strictEqual(content.handler, "authorizePublish");
                            assert.strictEqual(content.category, "topic");
                            assert.strictEqual(content.message, "wildcards are not allowed in topic");
                            assert.strictEqual(content.messageId, messageId);
                        }
                        else {
                            assert.strictEqual(payload.toString(),`${sign} is not allowed in PUBLISH`);
                        }
                        publishConditions[condition] = true;
                    }
                    client.end();
                });
            }

            connect("dollarSignRan", "/$SYS/pierce/pierce", '$');

            setTimeout(function (){connect("poundSignRan", "#", '#')}, connect_timeout*0.3);

            setTimeout(function (){
                connect("plusSignRan", '/+', '+');}, connect_timeout*0.6);

            setTimeout(function (){
                assert.ok(client !== undefined);
                client.end();
                assert.ok(publishConditions.dollarSignRan);
                assert.ok(publishConditions.poundSignRan);
                assert.ok(publishConditions.plusSignRan);
                done();
            }, connect_timeout);
        });
    });

    describe("", function () {
       it("publish to /2/devices/client_id from 1", function (done) {
           let options1 = setup.deepCopy(accounts[1].mqtt_options);
           let client1ConnectCallbackRan = false;
           let messageId = undefined;
           let client1MessageCallbackRan = false;
           let client2MessageCallbackRan = false;
           let client2ConnectCallbackRan = false;
           let client2 = mqtt.connect(accounts[2].mqtt_options);
           client2.on("connect", function () {
               client2ConnectCallbackRan = true;
           });
           client2.on("message", function (topic, payload) {
              client2MessageCallbackRan = true;
           });
           let client1 = mqtt.connect(options1);
           client1.on("connect", function () {
               client1.subscribe(`/1/devices/${options1.clientId}`);
               client1.publish(`/2/devices/2:unique`, "it's hip to be square", {qos: 2});
           });
           client1.on("packetsend", function (packet) {
               if (packet.payload === "it's hip to be square") {
                   messageId = packet.messageId;
                   assert.ok(messageId !== undefined && messageId !== null);
                   client1ConnectCallbackRan = true;
               }
           });
           client1.on("message", function (topic, payload) {
                if (topic === `/1/devices/${options1.clientId}`){
                    let content = JSON.parse(payload.toString());
                    assert.strictEqual(content.type, "error");
                    assert.strictEqual(content.handler, "authorizePublish");
                    assert.strictEqual(content.category, "topic");
                    assert.strictEqual(content.message, "can't publish to other user's channel except inbox");
                    assert.strictEqual(content.messageId, messageId);
                    client1MessageCallbackRan = true;
                }
                client1.end();
           });

           setTimeout(function () {
               client2.end();
               client1.end();
               assert.ok(client2ConnectCallbackRan);
               assert.ok(client1ConnectCallbackRan);
               assert.ok(client1MessageCallbackRan);
               assert.ok(!client2MessageCallbackRan);
               done();
           }, connect_timeout);
       });
    });
});

