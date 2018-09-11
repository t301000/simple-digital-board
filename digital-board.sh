#!/bin/bash

#url='https://digital-board-yljh.firebaseapp.com'
url='simple-digital-board/board/index.html'

#/usr/bin/chromium-browser --incognito --start-fullscreen http://163.20.124.10/digital-board
#/usr/bin/chromium-browser --start-fullscreen $url
# 參考：
#     https://ssk7833.github.io/blog/2016/08/02/setup-Google-Chrome-as-kiosk-application-settings/
# 可按 F11 離開全螢幕
/usr/bin/chromium-browser --start-fullscreen $url --user-data-dir="chrome-user-data-dir" --disable-web-security --test-type --disable-translate
# 運行 kiosk 模式
# 開啟時直接進入全螢幕模式，且無法利用 F11 跟 ESC 來離開全螢幕模式，可以用 ALT + F4 或 CTRL + W 來關閉。
# 在參數列加上 --kiosk 即可。
#/usr/bin/chromium-browser --kiosk $url --user-data-dir="chrome-user-data-dir" --disable-web-security --test-type --disable-translate
