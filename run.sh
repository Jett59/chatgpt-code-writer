#!/bin/sh

cd api
npx tsc --watch &
while true ; do node.exe --watch .; done &
cd ..

cd ui
npm start
