firebase.initializeApp(config);
const db = firebase.firestore();

;(function(db) {

  let urls = [];
  let playing = null;
  let defaultResource = null;

  const template = document.querySelector('#resource-item');
  const menuContent = document.querySelector('.content');
  menuContent.addEventListener('click', menuContentClickHandler);

  const iframe = document.querySelector('iframe');

  // 觸發重新載入
  const reload = document.querySelector('.reload');
  reload.addEventListener('click', () => play());

  db.collection('channels').where('name', '==', department).limit(1).get()
    .then(docs => docs.forEach(doc => {
      getUrls(doc.id); // 取得資源清單並產生選單
      iframe.setAttribute('data-id', doc.id);

      // TODO: maybe setTimeout....
      listenForReload(doc.id); // 監聽來自遠端的重載指示
      // listenForSetDefault(doc.id); // 監聽來自遠端的設定預設資源指示
      // listenForSetPlaying(doc.id); // 監聽來自遠端的設定目前播放資源指示
      setTimeout(() => listenForSetDefault(doc.id), 1000);
      setTimeout(() => listenForSetPlaying(doc.id), 3000);
    }));


  /********* 函數區 *********/

  // 取得 / 更新播放資源 url
  // 接著產生 / 更新資源選單
  // 執行播放
  function getUrls(id) {
    db.collection(`channels/${id}/resources`)
      .onSnapshot(snapshot => {
        // const defaultItem = getDefaultResource();
        snapshot.docChanges().forEach(
          ({type, doc}) => {
            const obj = {id: doc.id, ...doc.data()};
            switch (type) {
              case 'added': // 初次載入或新增
                urls = [...urls, obj];
                break;

              case 'modified': // 修改
                if (playing && playing.id === doc.id) {
                  // 修改到目前播放資源
                  setPlayingResource(obj);
                  play();
                }

                // 修改到預設，則更新
                if (defaultResource && defaultResource.id === doc.id) {
                  setDefaultResource(obj);
                }
                const idx = urls.findIndex(item => item.id === doc.id);
                urls = [...urls.slice(0, idx), obj, ...urls.slice(idx + 1)];
                break;

              case 'removed': // 刪除
                // console.log(`id: ${doc.id} removed`);
                urls = urls.filter(item => item.id !== doc.id);

                if (playing && playing.id === doc.id) {
                  // 刪除到目前播放資源
                  setPlayingResource(null);
                  play();
                }

                // 刪除到預設，則移除
                if (defaultResource && defaultResource.id === doc.id) {
                  setDefaultResource(null);
                }
                break;
            }
          }
        );

        // 產生選單
        generateMenu();
      });
  }

  // 產生 / 更新資源選單
  function generateMenu() {
    // console.log(urls);
    menuContent.innerHTML = '';
    urls.forEach((obj, idx)=> {
      const wrapper = template.content.querySelector('.resource');
      const btn = template.content.querySelector('.resource-button');
      btn.textContent = obj.name;
      wrapper.setAttribute('data-id', obj.id); // for ui 標記
      wrapper.setAttribute('data-idx', idx.toString()); // for 設定 default and playing

      // 附加一個選項至 DOM
      const clone = document.importNode(template.content, true);
      menuContent.appendChild(clone);
    });
  }

  // 執行播放
  // 播放指定資源
  // 第一次載入時播放預設資源
  function play() {
    if (playing !== null) {
      iframe.setAttribute('src', playing.url);
      updatePlayingMark();
    } else {
      // 第一次載入時播放預設資源
      if (defaultResource !== null) {
        playing = defaultResource;
        play();
      } else {
        iframe.setAttribute('src', '');
      }
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
    if (srcElm.classList.contains('resource-button') && !srcElm.classList.contains('playing')) {
      // 更新正在播放之資源，並播放
      setPlayingResource(urls[wrapper.dataset['idx']]);
      play();
    }

    // 按下 radio，變更預設
    if (srcElm.classList.contains('radio') && !srcElm.classList.contains('default')) {
      // 設為預設值，更新至 firestore
      db.doc(`channels/${iframe.dataset['id']}/actions/setDefault`)
        .set({id: wrapper.dataset['id']})
        .then(() => console.log(`set default id: ${wrapper.dataset['id']}`))
        .catch(err => console.log(err));
    }
  }

  // 更新是否為預設播放項目之標記
  function updateDefaultMark() {
    const radios = document.querySelectorAll('.radio');

    if (!defaultResource) {
      radios.forEach(radio => radio.classList.remove('default'));
      return false;
    }
    const id = defaultResource.id;

    radios.forEach(radio => {
      const wrapper = radio.parentNode;
      wrapper.dataset['id'] === defaultResource.id ? radio.classList.add('default') : radio.classList.remove('default');
    });
  }

  // 更新是否為目前播放項目之標記
  function updatePlayingMark() {
    const btns = document.querySelectorAll('.resource-button');

    if (!playing) {
      btns.forEach(btn => btn.classList.remove('playing'));
      return false;
    }

    btns.forEach(btn => {
      const wrapper = btn.parentNode;
      wrapper.dataset['id'] === playing.id ? btn.classList.add('playing') : btn.classList.remove('playing');
    });
  }
  
  // 設定預設播放資源
  function setDefaultResource(obj) {
    defaultResource = obj ? obj : null;
    updateDefaultMark();
  }

  // 設定目前播放資源
  function setPlayingResource(obj) {
    playing = obj;
  }

  // 設定目前播放資源
  function setPlayingResource(obj) {
    playing = obj;
  }

  // 監聽 firestore document 變化
  // 由遠端控制重載
  // 第一次接收到為剛載入時 略過
  // 第二次以後接收到為遠端控制 執行重新載入當前播放
  function listenForReload(id) {
    if (!id) return false;

    let count = 0;
    db.doc(`channels/${id}/actions/reload`)
      .onSnapshot(doc => {
        count++;
        if (count > 1) play();
      });
  }

  // 監聽 firestore document 變化
  // 由遠端控制設定預設資源
  function listenForSetDefault(id) {
    if (!id) return false;

    db.doc(`channels/${id}/actions/setDefault`)
      .onSnapshot(doc => {
        const obj = urls.find(item => item.id === doc.get('id'));
        setDefaultResource(obj);
      });
  }

  // 監聽 firestore document 變化
  // 由遠端控制設定目前播放資源
  function listenForSetPlaying(id) {
    if (!id) return false;

    db.doc(`channels/${id}/actions/setPlaying`)
      .onSnapshot(doc => {
        const obj = urls.find(item => item.id === doc.get('id'));

        if (playing && obj) {
          setPlayingResource(obj);
        }
        play();
      });
  }

})(db);