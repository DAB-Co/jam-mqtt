const {exec} = require('child_process');
const path = require("path");
const fs = require("fs");

function run_command(command) {
    return new Promise(function (resolve, reject) {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function generate_new_client() {
    try {
        await run_command(`rm -rf ${path.join(__dirname, "certs", "client")}`);
    } catch (e) {
        if (e.code !== 2) {
            throw e;
        }
    }

    const cert_dir = path.join(__dirname, "certs", "client");
    const inp_path = path.join(cert_dir, "inp.txt");

    await run_command(`mkdir ${cert_dir}`);
    fs.writeFileSync(inp_path, ".\n.\n.\nDab Co.\n.\n.\n.\n.\n.\n");
    await run_command(`cd ${cert_dir} && 
    openssl genrsa -out client.key 4096 && 
    openssl req -out client.csr -key client.key -new  < ${inp_path} && 
    openssl x509 -req -in client.csr -CA ../ca/ca.crt -CAkey ../ca/ca.key -CAcreateserial -out client.crt`);
    let cert = fs.readFileSync(path.join(cert_dir, "client.crt"));
    let key = fs.readFileSync(path.join(cert_dir, "client.key"));
    await run_command(`rm -rf ${path.join(__dirname, "certs", "client")}`);
    return {
        key: key,
        cert: cert
    }
}

module.exports = generate_new_client;
