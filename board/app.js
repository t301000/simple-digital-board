firebase.initializeApp(config);
const db = firebase.firestore();

;(function(db) {

  let urls = [];
  let playing = getDefaultResource();

  const template = document.querySelector('#resource-item');
  const menuContent = document.querySelector('.content');
  menuContent.addEventListener('click', menuContentClickHandler);

  const iframe = document.querySelector('iframe');

  // 觸發重新載入
  const reload = document.querySelector('.reload');
  reload.addEventListener('click', () => play());

  db.collection('channels').where('name', '==', department).limit(1).get()
    .then(docs => docs.forEach(doc => {
      getUrls(doc.id);
      listenForReload(doc.id);
    }));


  /********* 函數區 *********/

  // 取得 / 更新播放資源 url
  // 接著產生 / 更新資源選單
  // 執行播放
  function getUrls(id) {
    db.collection(`channels/${id}/resources`)
      .onSnapshot(snapshot => {
        const defaultItem = getDefaultResource();
        snapshot.docChanges().forEach(
          ({type, doc}) => {
            const obj = {id: doc.id, ...doc.data()};
            switch (type) {
              case 'added': // 初次載入或新增
                urls = [...urls, obj];
                // 設定預設，避免 localStorage 與 firestore 不一致
                if (defaultItem && defaultItem.id === doc.id) {
                  setDefaultResource(obj);
                }
                break;
              case 'modified': // 修改
                if (playing && playing.id === doc.id) {
                  // 修改到目前播放資源
                  playing = obj;
                  play();
                }

                // 修改到預設，則更新
                if (defaultItem && defaultItem.id === doc.id) {
                  setDefaultResource(obj);
                }
                const idx = urls.findIndex(item => item.id === doc.id);
                urls = [...urls.slice(0, idx), obj, ...urls.slice(idx + 1)];
                break;
              case 'removed': // 刪除
                // console.log(`id: ${doc.id} removed`);
                urls = urls.filter(item => item.id !== doc.id);

                // 刪除到預設，則移除
                if (defaultItem && defaultItem.id === doc.id) {
                  localStorage.removeItem('default');
                }
                break;
            }
          }
        );

        // 還沒播放，則開始播放
        if (!playing) {
          play();
        }
        // 產生選單
        generateMenu();
      });
  }

  // 產生 / 更新資源選單
  function generateMenu() {
    // console.log(urls);
    menuContent.innerHTML = '';
    urls.forEach(obj => {
      const wrapper = template.content.querySelector('.resource');
      const btn = template.content.querySelector('.resource-button');
      btn.textContent = obj.name;
      wrapper.setAttribute('data-id', obj.id);
      wrapper.setAttribute('data-url', obj.url);

      // 附加一個選項至 DOM
      const clone = document.importNode(template.content, true);
      menuContent.appendChild(clone);
  
      // 更新 ui 標記
      updateDefaultMark();
      updatePlayingMark();
    });
  }

  // 執行播放
  function play() {
    if (playing !== null) {
      iframe.setAttribute('src', playing.url);
    }
  }

  // 選單 click handler
  // 選單項目為動態由 template 產生
  // 未出現在 DOM 之前無法設定 事件監聽
  // 因此改採由父層監聽處理
  function menuContentClickHandler(event) {
    // 實際發出事件之物件
    const srcElm = event.target;
    // 父層物件
    const wrapper = srcElm.parentNode;

    // 按下按鈕，變更當前播放
    if (srcElm.className.indexOf('resource-button') !== -1) {
      // 更新正在播放之資源
      playing = {id: wrapper.dataset['id'], url: wrapper.dataset['url']};
      play();
      updatePlayingMark();
    }

    // 按下 radio，變更預設
    if (srcElm.className.indexOf('radio') !== -1) {
      // 設為預設值
      setDefaultResource({id: wrapper.dataset['id'], url: wrapper.dataset['url']});
      updateDefaultMark(wrapper.dataset['id']);
    }
  }

  // 更新是否為預設播放項目之標記
  function updateDefaultMark(id) {
    // 未傳入 id，則檢查是否有預設
    if (!id) {
      const defaultResource = getDefaultResource();
      if (!defaultResource) {
        return false;
      }
      id = defaultResource.id;
    }

    const radios = document.querySelectorAll('.radio');

    radios.forEach(radio => {
      const wrapper = radio.parentNode;
      if (wrapper.dataset['id'] === id) {
        if (!radio.classList.contains('default')) {
          radio.classList.add('default');
        }
      } else {
        radio.classList.remove('default');
      }
    });
  }

  // 更新是否為目前播放項目之標記
  function updatePlayingMark() {
    if (!playing) return false;

    const btns = document.querySelectorAll('.resource-button');
  
    btns.forEach(btn => {
      const wrapper = btn.parentNode;
      if (wrapper.dataset['id'] === playing.id) {
        if (!btn.classList.contains('playing')) {
          btn.classList.add('playing');
        }
      } else {
        btn.classList.remove('playing');
      }
    });
  }
  
  // 取得預設播放資源
  function getDefaultResource() {
    return JSON.parse(localStorage.getItem('default'));
  }

  // 儲存預設播放資源
  function setDefaultResource(obj) {
    localStorage.setItem('default', JSON.stringify(obj));
  }

  // 監聽 firestore document 變化
  // 由遠端控制
  // 第一次接收到為剛載入時 執行第一次播放
  // 第二次以後接收到為遠端控制 執行重新載入當前播放
  function listenForReload(id) {
    if (!id) return false;

    db.doc(`channels/${id}`)
      .onSnapshot(doc => {
        play();
        // console.log(doc.get('reloadAt'));
      });
  }

})(db);