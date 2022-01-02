const Database = require("@dab-co/jam-sqlite").Database;
const bcrypt = require("bcrypt");
const path = require("path");
const database = new Database(path.join(__dirname, "../../jam-server/sqlite/database.db"));
const AccountUtils = require("@dab-co/jam-sqlite").Utils.AccountUtils;
const accountUtils = new AccountUtils(database);
const UserFriendUtils = require("@dab-co/jam-sqlite").Utils.UserFriendsUtils;
const userFriendUtils = new UserFriendUtils(database);


async function main() {
    return new Promise(async function(resolve, reject) {
        try {
            let password = "12345678";

            if (!accountUtils.usernameExists("sender")) {
                let hash = await bcrypt.hash(password, await bcrypt.genSalt());
                accountUtils.addUser("sender@mail.com", "sender", hash);
                console.log("registered sender, with password 12345678");
            }
            else {
                console.log("username sender is taken");
            }

            if (!accountUtils.usernameExists("receiver")) {
                let hash = await bcrypt.hash(password, await bcrypt.genSalt());
                accountUtils.addUser("receiver@mail.com", "receiver", hash);
                console.log("registered receiver, with password 12345678");
            }
            else {
                console.log("username receiver is taken");
            }
            let sender_id = accountUtils.getIdByUsername("sender");
            let receiver_id = accountUtils.getIdByUsername("receiver");
            userFriendUtils.addUser(sender_id);
            userFriendUtils.addUser(receiver_id);
            userFriendUtils.addFriend(sender_id, receiver_id);
            resolve();
        }
        catch (e) {
            reject(e);
        }
    });
}

main().then();
