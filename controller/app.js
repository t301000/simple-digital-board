firebase.initializeApp(config);
const db = firebase.firestore();

;(async function (db) {
  const reloadTrigger = document.querySelector('.reload');
  reloadTrigger.addEventListener('click', reload);

  const msg = document.querySelector('.msg');

  const template = document.querySelector('template');
  const resources = document.querySelector('.resources');
  resources.addEventListener('click', resourcesClickHandler);

  const pageTitle = document.querySelector('title'); // <title></title> element
  pageTitle.innerText = `${department} 電子看板遙控器`;
  document.querySelector('.title-text > h1').innerText = department;

  let id = null; // channel id
  let urls = []; // 資源清單陣列

  let playing = null;
  let defaultResource = null;

  let msgTimer = null;

  showMsg('資料載入中....', 'info', 0);

  db.collection('channels').where('name', '==', department).limit(1).get()
    .then(docs => {
      // 取得 channel id
      docs.forEach(doc => id = doc.id);
      // console.log(`${department} ID : ${id}`);

      // 取得並產生 resources array
      // 監聽變化
      // 回傳 promise
      return getUrls();
    })
    .then(() => {
      // 取得、監聽 default and playing
      // 回傳 promise
      return Promise.all([listenForSetDefault(), listenForSetPlaying()]);
    })
    .then(() => {
      // console.log('Promise.all ok');
      showMsg('資料載入完成', 'success');
    })
    .finally(() => {
      // console.log('first mark default and playing');
      // ui 標記
      markDefault();
      markPlaying();
    });


  /********* 函數區 *********/

  // 更新 firestore document reloadAt 欄位以執行遠端重載
  function reload() {
    if (!id || !playing) return false;

    // 防止一直按
    if (msgTimer) return false;

    const payload = {
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.doc(`channels/${id}/actions/reload`).update(payload)
      .then(() => {
        console.log('reloaded');
        showMsg('已發出重新載入指令');
      })
      .catch(err => {
        console.log(err);
        showMsg('發生錯誤，稍後再試', 'error');
      });
  }

  // 顯示訊息區塊
  // showTime 傳入 0 則不設隱藏 timer ，未傳入則預設 3 秒後隱藏
  function showMsg(content, msgType='success', showTime=3000) {
    // 先隱藏
    hideMsg();

    msg.hidden = false;
    msg.innerHTML = `<h3>${content}</h3>`;
    msg.classList.add(msgType);
    if (showTime > 0) {
      // showTime > 0 則設定 timer 隱藏
      msgTimer = setTimeout(hideMsg, showTime);
    }
  }

  // 隱藏訊息區塊
  function hideMsg() {
    // 清除 timer
    if (msgTimer) {
      clearTimeout(msgTimer);
      msgTimer = null;
    }

    msg.innerHTML = '';
    msg.hidden = true;
    msg.className = 'msg';
  }

  // 取得資源 url 清單
  function getUrls() {
    return new Promise(resolve => {
      db.collection(`channels/${id}/resources`)
        .onSnapshot(
          snapshot => {
            snapshot.docChanges().forEach(generateUrlsArray);
            // 產生資源項目
            generateItems();
            if (defaultResource) {
              console.log('remark default');
              markDefault();
            }
            if (playing) {
              console.log('remark playing');
              markPlaying();
            }

            // urlsInited = true;
            console.log(urls);
            resolve('urls done');
          }
        );
    });
  }

  // 產生 urls 陣列
  function generateUrlsArray ({type, doc}) {
    const obj = {id: doc.id, ...doc.data()};
    switch (type) {
      case 'added':
        urls = [...urls, obj];
        break;

      case 'modified':
        if (playing && playing.id === doc.id) {
          // 修改到目前播放資源
          playing = obj;
        }

        // 修改到預設，則更新
        if (defaultResource && defaultResource.id === doc.id) {
          defaultResource = obj
        }
        const idx = urls.findIndex(item => item.id === doc.id);
        urls = [...urls.slice(0, idx), obj, ...urls.slice(idx + 1)];
        break;

      case 'removed':
        urls = urls.filter(item => item.id !== doc.id);

        if (playing && playing.id === doc.id) {
          // 刪除到目前播放資源
          playing = null;
          db.doc(`channels/${id}/actions/setPlaying`).set({id: ''});
        }

        // 刪除到預設，則移除
        if (defaultResource && defaultResource.id === doc.id) {
          defaultResource = null;
          db.doc(`channels/${id}/actions/setDefault`).set({id: ''});
        }
        break;
    }
  }

  // 產生 / 更新資源選單
  function generateItems() {
    resources.innerHTML = '';
    urls.forEach((obj, idx)=> {
      const wrapper = template.content.querySelector('.resource');
      const title = template.content.querySelector('.title');
      title.textContent = obj.name;
      wrapper.setAttribute('data-id', obj.id); // for ui 標記
      wrapper.setAttribute('data-idx', idx.toString()); // for 設定 default and playing

      // 附加一個選項至 DOM
      const clone = document.importNode(template.content, true);
      resources.appendChild(clone);
    });
  }

  // 資源項目 click handler
  // 資源項目為動態由 template 產生
  // 未出現在 DOM 之前無法設定 事件監聽
  // 因此改採由父層監聽處理
  function resourcesClickHandler() {
    // 實際發出事件之物件
    const srcElm = event.target;
    // 父層物件
    const wrapper = srcElm.parentNode.parentNode;

    // 變更 playing
    if (srcElm.classList.contains('btn-set-playing') && !srcElm.classList.contains('playing')) {
      // 更新至 firestore
      db.doc(`channels/${id}/actions/setPlaying`)
        .set({id: wrapper.dataset['id']})
        .then(() => console.log(`set playing id: ${wrapper.dataset['id']} success`))
        .catch(err => console.log(err));
    }

    // 變更 default
    if (srcElm.classList.contains('btn-set-default') && !srcElm.classList.contains('default')) {
      // 設為預設值，更新至 firestore
      db.doc(`channels/${id}/actions/setDefault`)
        .set({id: wrapper.dataset['id']})
        .then(() => console.log(`set default id: ${wrapper.dataset['id']} success`))
        .catch(err => console.log(err));
    }
  }

  // 監聽 firestore document 變化
  // 由遠端控制設定預設資源
  function listenForSetDefault() {
    if (!id) return false;

    return new Promise(resolve => {
      db.doc(`channels/${id}/actions/setDefault`)
        .onSnapshot(doc => {
          defaultResource = urls.find(item => item.id === doc.get('id'));
          console.log('get default');
          markDefault();
          resolve();
        });
    });
  }

  // 監聽 firestore document 變化
  // 由遠端控制設定目前播放資源
  function listenForSetPlaying() {
    if (!id) return false;

    return new Promise(resolve => {
      db.doc(`channels/${id}/actions/setPlaying`)
        .onSnapshot(doc => {
          playing = urls.find(item => item.id === doc.get('id'));
          console.log('get playing');
          markPlaying();
          resolve();
        });
    });
  }

  // 標記 default
  function markDefault() {
    const defaults = document.querySelectorAll('.btn-set-default');

    if (!defaultResource) {
      defaults.forEach(item => item.classList.remove('default'));
      return false;
    }

    defaults.forEach(item => {
      const wrapper = item.parentNode.parentNode;
      wrapper.dataset['id'] === defaultResource.id ? item.classList.add('default') : item.classList.remove('default');
    });
  }

  // 標記 playing
  function markPlaying() {
    const playings = document.querySelectorAll('.btn-set-playing');

    if (!playing) {
      playings.forEach(item => item.classList.remove('playing'));
      return false;
    }

    playings.forEach(item => {
      const wrapper = item.parentNode.parentNode;
      wrapper.dataset['id'] === playing.id ? item.classList.add('playing') : item.classList.remove('playing');
    });
  }

})(db);