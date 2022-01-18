#!/bin/bash

function kill_server(){
	main_pid=$(ps aux | grep 'node jam_mqtt_main.js' | awk '{if ($11 == "node"){print $2}}')
	kill -9 "$main_pid"
}

echo 'port=41371' > .env.local 
echo 'db_path=sqlite/database.db' >> .env.local 
if ! (node test/create_database.js); then
	echo 'error running node test/create_database.js'
	exit 1
fi
nohup node jam_mqtt_main.js --no_notification > output &
if (npm run mocha --recursive --exit); then
	kill_server
	exit 0
else
	kill_server
	echo '---server output---'
	cat output
	exit 2
fi

