#!/bin/bash

# we assume --port 41371 is given as first argument
sudo_pid=$(ps aux | grep 'sudo node jam_mqtt_main.js' | awk '{if ($11 == "sudo"){print $2}}')
sudo kill -9 "$sudo_pid"

main_pid=$(ps aux | grep 'node jam_mqtt_main.js' | awk '{if ($11 == "node"){print $2}}')
sudo kill -9 "$main_pid"
