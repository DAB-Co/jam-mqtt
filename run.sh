#!/bin/bash

nohup sudo node main.js --port 41371 --database "../jam_server/sqlite/database.db" > output &

