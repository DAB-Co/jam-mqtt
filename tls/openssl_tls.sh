#!/bin/bash

rm -rf certs
mkdir certs
cd certs
mkdir ca
cd ca/
echo "creating ca"
openssl req -new -x509 -nodes -extensions v3_ca -keyout ca.key -out ca.crt
cd ..

mkdir broker
cd broker
openssl genrsa -out broker.key 4096
echo "creating broker"
openssl req -out broker.csr -key broker.key -new
openssl x509 -req -in broker.csr -CA ../ca/ca.crt -CAkey ../ca/ca.key -CAcreateserial -out broker.crt
cd ..

mkdir client
cd client
openssl genrsa -out client.key 4096
openssl req -out client.csr -key client.key -new
echo "creating client"
openssl x509 -req -in client.csr -CA ../ca/ca.crt -CAkey ../ca/ca.key -CAcreateserial -out client.crt
cd ..
tree .

