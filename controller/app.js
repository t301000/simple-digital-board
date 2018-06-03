firebase.initializeApp(config);
const db = firebase.firestore();

;(async function (db) {
  const reloadTrigger = document.querySelector('.reload');
  reloadTrigger.addEventListener('click', reload);

  const msg = document.querySelector('.msg');

  const template = document.querySelector('template');
  const resources = document.querySelector('.resources');
  resources.addEventListener('click', resourcesClickHandler);

  let id = null; // channel id
  let urls = []; // 資源清單陣列
  // let urlsInited = false; //urls 陣列是否初始化完成
  let playing = null;
  let defaultResource = null;

  db.collection('channels').where('name', '==', department).limit(1).get()
    .then(docs => {
      docs.forEach(doc => id = doc.id);
      getUrls();

      setTimeout(() => {
        listenForSetDefault();
        listenForSetPlaying();
      }, 1000);
    });

  // 定時檢查 urls 陣列是否初始化完成
  // 初始化之後開始監聽 setDefault and setPlaying
  // let timer = setInterval(() => {
  //   console.log(urlsInited, urls, defaultResource, playing);
  //   if (urlsInited && defaultResource && playing) {
  //     console.log('clear', urlsInited, urls, defaultResource, playing);
  //     // listenForSetDefault();
  //     // listenForSetPlaying();
  //     clearInterval(timer);
  //   }
  // },100);



  /********* 函數區 *********/

  // 更新 firestore document reloadAt 欄位以執行遠端重載
  function reload() {
    if (!id) return false;

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

  // 重設 UI
  function resetUI() {
    msg.innerHTML = '';
    msg.hidden = true;
    msg.className = 'msg';
  }

  // 顯示訊息區塊
  function showMsg(content, msgType='success', showTime=3000) {
    msg.hidden = false;
    msg.innerHTML = `<h3>${content}</h3>`;
    msg.classList.add(msgType);
    setTimeout(resetUI, showTime);
  }

  // 取得資源 url 清單
  function getUrls() {

    db.collection(`channels/${id}/resources`)
      .onSnapshot(
        snapshot => {
          snapshot.docChanges().forEach(generateUrlsArray);
          // 產生資源項目
          generateItems();

          // urlsInited = true;
        }
      );

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
          }

          // 刪除到預設，則移除
          if (defaultResource && defaultResource.id === doc.id) {
            defaultResource = null;
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

    db.doc(`channels/${id}/actions/setDefault`)
      .onSnapshot(doc => {
        defaultResource = urls.find(item => item.id === doc.get('id'));
        // console.log('default: ', defaultResource);
        markDefault();
      });
  }

  // 監聽 firestore document 變化
  // 由遠端控制設定目前播放資源
  function listenForSetPlaying() {
    if (!id) return false;

    db.doc(`channels/${id}/actions/setPlaying`)
      .onSnapshot(doc => {
        playing = urls.find(item => item.id === doc.get('id'));
        // console.log('playing: ', playing);
        markPlaying();
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