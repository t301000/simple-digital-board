#!/bin/bash

pids=`pidof /usr/lib/chromium-browser/chromium-browser`

for pid in $pids
do
  echo $pid > /dev/null
done

kill $pid

sleep 5

/sbin/shutdown -h now
