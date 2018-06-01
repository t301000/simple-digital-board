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
    .then(docs => docs.forEach(doc => getUrls(doc.id)));

  play();


  /********* 函數區 *********/

  // 取得 / 更新播放資源 url
  // 接著產生 / 更新資源選單
  // 執行播放
  function getUrls(id) {
    db.collection(`channels/${id}/resources`)
      .onSnapshot(snapshot => {
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
                  playing = obj;
                  play();
                }
                const idx = urls.findIndex(item => item.id === doc.id);
                urls = [...urls.slice(0, idx), obj, ...urls.slice(idx + 1)];
                break;
              case 'removed': // 刪除
                // console.log(`id: ${doc.id} removed`);
                urls = urls.filter(item => item.id !== doc.id);
                break;
            }
          }
        );

        if (!playing) {
          play();
        }
        generateMenu();
      });
  }

  // 產生 / 更新資源選單
  function generateMenu() {
    // console.log(urls);
    menuContent.innerHTML = '';
    urls.forEach(obj => {
      // const btn = template.content.querySelector('.resource-button');
      // btn.textContent = obj.name;
      // btn.setAttribute('data-id', obj.id);
      // btn.setAttribute('data-url', obj.url);
      //
      // const radio = template.content.querySelector('.radio');
      // radio.setAttribute('data-id', obj.id);
      // radio.setAttribute('data-url', obj.url);
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
  function menuContentClickHandler(event) {
    const srcElm = event.target;
    const wrapper = srcElm.parentNode;

    // 按下按鈕
    if (srcElm.className.indexOf('resource-button') !== -1) {
      // 更新正在播放之資源
      playing = {id: wrapper.dataset['id'], url: wrapper.dataset['url']};
      play();
      updatePlayingMark();
    }

    // 按下 radio
    if (srcElm.className.indexOf('radio') !== -1) {
      // 設為預設值
      localStorage.setItem('default', JSON.stringify({id: wrapper.dataset['id'], url: wrapper.dataset['url']}));
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

})(db);