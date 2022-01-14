const path = require("path");
const jam_sqlite = require("@dab-co/jam-sqlite");
require("dotenv").config({path: path.join(__dirname, "..", ".env.local")});
const db_path = process.env.db_path;

/**
 * creates a new database from scratch in project root -> sqlite/database.db
 *
 * @returns {DatabaseWrapper} jam-sqlite DatabaseWrapper
 */
function create_database() {
    jam_sqlite.database_scripts.overwrite_database(db_path);
    return new jam_sqlite.Database(db_path);
}

/**
 *
 * @param database
 * @returns {json} {"email": `user${i}@email.com`,
            "username": `user${i}`,
            "password": "12345678",
            "api_token": "api_token",}
 */
function register_accounts(database) {
    const accountUtils = new jam_sqlite.Utils.AccountUtils(database);
    const userFriendsUtils = new jam_sqlite.Utils.UserFriendsUtils(database);
    const accounts = {};
    for (let i=1; i<=2; i++) {
        let user = {
            "email": `user${i}@email.com`,
            "username": `user${i}`,
            "password": "12345678",
            "api_token": "api_token",
        };
        let query_res = accountUtils.addUser(user.email, user.username, user.password, user.api_token);
        userFriendsUtils.addUser(i);
        accounts[query_res.lastInsertRowid] = user;
    }
    userFriendsUtils.addFriend(1, 2);
    return accounts;
}

module.exports = {
    create_database: create_database,
    register_accounts: register_accounts,
}