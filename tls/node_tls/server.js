const tls = require('tls');
const fs = require('fs');
const path = require("path");
let msg = [
    ".-..-..-.  .-.   .-. .--. .---. .-.   .---. .-.",
    ": :; :: :  : :.-.: :: ,. :: .; :: :   : .  :: :",
    ":    :: :  : :: :: :: :: ::   .': :   : :: :: :",
    ": :: :: :  : `' `' ;: :; :: :.`.: :__ : :; ::_;",
    ":_;:_;:_;   `.,`.,' `.__.':_;:_;:___.':___.':_;"
].join("\n");

let options = {
    key: fs.readFileSync(path.join(__dirname, "..", "certs", "broker", "broker.key")),
    cert: fs.readFileSync(path.join(__dirname, "..", "certs", "broker", "broker.crt")),
};

tls.createServer(options, function (s) {
    s.write(msg + "\n");
    s.pipe(s);
}).listen(8000);
