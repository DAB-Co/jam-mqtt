const Database = require("@dab-co/jam-sqlite").Database;
const path = require("path");
const db_path = path.join(__dirname, "..", "sqlite", "database.db");
require("@dab-co/jam-sqlite").database_scripts.overwrite_database(db_path);
const database = new Database(db_path);
const AccountUtils = require("@dab-co/jam-sqlite").Utils.AccountUtils;
const accountUtils = new AccountUtils(database);
const UserFriendUtils = require("@dab-co/jam-sqlite").Utils.UserFriendsUtils;
const userFriendUtils = new UserFriendUtils(database);


let password = "12345678";
let api_token = "api_token";

if (!accountUtils.usernameExists("sender")) {
    accountUtils.addUser("sender@mail.com", "sender", password, api_token);
    console.log("registered sender, with api_token: \"api_token\"");
}
else {
    console.log("username sender is taken");
}

if (!accountUtils.usernameExists("receiver")) {
    accountUtils.addUser("receiver@mail.com", "receiver", password, api_token);
    console.log("registered receiver, with api_token: \"api_token\"");
}
else {
    console.log("username receiver is taken");
}
let sender_id = accountUtils.getIdByUsername("sender");
let receiver_id = accountUtils.getIdByUsername("receiver");
userFriendUtils.addUser(sender_id);
userFriendUtils.addUser(receiver_id);
userFriendUtils.addFriend(sender_id, receiver_id);
