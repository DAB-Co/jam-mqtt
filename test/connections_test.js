const path = require("path");
const assert = require("assert");
const setup = require(path.join(__dirname, "setup.js"));
const mqtt = require('mqtt');

describe (__filename, function() {
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
        it("client can't attempt to log in more than 10 times", function () {

        });
    });

    describe("", function (){
       it("send logout message to old device when new device connects", function () {

       });
    });

    describe("", function () {
        it("(see above) the old device receives the logout message even when offline", function () {

        });
    });

    describe("", function () {
       it("can't use wildcards in user_id", function () {

       });
    });

    describe("", function () {
       it("can't use wildcards in subscribe", function () {

       });
    });

    describe("", function (){
       it("can't use wildcards in the channel to be published", function () {

       });
    });
});

