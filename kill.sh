#!/bin/bash

main_pid=$(ps aux | grep 'node jam_mqtt_main.js' | awk '{if ($11 == "node"){print $2}}')
kill -9 "$main_pid"

