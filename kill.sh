#!/bin/bash

# we assume --port 41371 is given as first argument
sudo_pid=$(ps aux | grep 'sudo node main.js' | awk '{if ($11 == "sudo" && $15 == "41371"){print $2}}')
sudo kill -9 "$sudo_pid"

main_pid=$(ps aux | grep 'node main.js' | awk '{if ($11 == "node" && $14 == "41371"){print $2}}')
sudo kill -9 "$main_pid"
