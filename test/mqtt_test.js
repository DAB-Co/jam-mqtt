const path = require("path");
const assert = require("assert");
const setup = require(path.join(__dirname, "setup.js"));
const mqtt = require('mqtt');
const crypto = require("crypto");

describe(__filename, function() {
    let database = undefined;
    let accounts = undefined;
    let client1 = undefined;
    let client2 = undefined;
    before(function() {
        database = setup.create_database();
        accounts = setup.register_accounts(database, 2);
    });

    describe("", function() {
       it("subscribing to /2/inbox", function(done) {
           let options = {
               host: "localhost",
               port: "41371",
               clean: false,
               clientId: `2:${crypto.randomBytes(4).toString('hex')}`,
               username: 2,
               password: accounts[2].api_token,
           }
           client2 = mqtt.connect(options);
           let connectCallbackRan = false;
           client2.on('connect', function () {
               client1.subscribe(`/${accounts[2].username}/inbox`, {qos:2});
               connectCallbackRan = true;
           });
           setTimeout(function() {
               assert.ok(client2.connected);
               assert.ok(connectCallbackRan);
               done();
           }, 2000);
       });
    });

    describe("", function() {
       it("publishing from 1 to /2/inbox", function(done) {
           let options = {
               host: "localhost",
               port: "41371",
               clean: false,
               clientId: `1:${crypto.randomBytes(4).toString('hex')}`,
               username: 1,
               password: accounts[1].api_token,
           }
           client1 = mqtt.connect(options);
           let connectCallbackRan = false;
           client1.on('connect', function () {
               let message = {
                   "from": accounts[1].username,
                   "timestamp": "2021-11-26 06:01:12.685Z",
                   "content": "hello world"
               }
               client1.publish(`/1/inbox`, JSON.stringify(message), {qos: 2});
               connectCallbackRan = true;
           });
           setTimeout(function() {
               assert.ok(client1.connected);
               assert.ok(connectCallbackRan);
               client1.end();
               done();
           }, 2000);
       });
    });

    describe("", function() {
        it("receiving message from 1", function(done) {
            let messageCallbackRan = false;
            client2.on('message', function (res) {
                let message = res.toString();
                assert.strictEqual(message.from, accounts[2].username);
                assert.strictEqual(message.timestamp, "2021-11-26 06:01:12.685Z");
                assert.strictEqual(message.content, "hello world");
                messageCallbackRan = true;
            });
            setTimeout(function() {
                assert.ok(client2.connected);
                assert.ok(messageCallbackRan);
                client2.end();
                done();
            }, 2000);
        });
    });
});
