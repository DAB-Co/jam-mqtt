const path = require("path");
require("@dab-co/jam-sqlite").database_scripts.overwrite_database(path.join(__dirname, "..", "sqlite", "database.db"));