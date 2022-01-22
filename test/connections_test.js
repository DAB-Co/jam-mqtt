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
                client1.subscribe(`/1/status`, {qos: 0});
                client1ConnectCallbackRan = true;
            });
            client1.on("message", function (topic, res) {
                if (topic === `/1/status`) {
                    let content = JSON.parse(res.toString());
                    assert.strictEqual(content.to, options1.clientId);
                    assert.strictEqual(content.status, "logout");
                    assert.strictEqual(content.data, "a new device has connected, logout from this device");
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
                client1v2.subscribe(`/1/status`);
                client1v2ConnectCallbackRan = true;
            });
            client1v2.on("message", function(topic, res) {
                let content = JSON.parse(res.toString());
                assert.fail(content);
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
                    client.end();
                });
                client.on("error", function (error) {
                    console.log(error);
                    assert.strictEqual(error.code, 6);
                    subscribeConditions[condition] = true;
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

            function connect(condition, topic) {
                client = mqtt.connect(options);
                client.on("connect", function () {
                    client.publish(topic, "8:30 reservation at Dorsia");
                    publishConditions[condition] = true;
                    client.end();
                });
                client.on("error", function (error) {
                    console.log(error);
                    assert.strictEqual(error.code, 5);
                    client.end();
                });
            }

            connect("dollarSignRan", "$SYS/");

            connect("poundSignRan", "#");

            connect("plusSignRan", '/+');

            setTimeout(function (){
                assert.ok(client !== undefined);
                client.end();
                assert.ok(!publishConditions.dollarSignRan);
                assert.ok(!publishConditions.poundSignRan);
                assert.ok(!publishConditions.plusSignRan);
                done();
            }, connect_timeout);
        });
    });
});

