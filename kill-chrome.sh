#!/bin/bash
# 關閉 chrome / chromium 並且 關機

pids=`pidof /usr/lib/chromium-browser/chromium-browser`

for pid in $pids
do
  echo $pid > /dev/null
done

kill $pid

# 等待 5 秒後關機
sleep 5

/sbin/shutdown -h now
