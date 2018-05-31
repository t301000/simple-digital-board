;(function(db) {

  let urls = [];
  let playing = JSON.parse(localStorage.getItem('default'));

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


  /* 函數區 */

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
      const btn = template.content.querySelector('.resource-button');
      btn.textContent = obj.name;
      btn.setAttribute('data-id', obj.id);
      btn.setAttribute('data-url', obj.url);

      const radio = template.content.querySelector('.radio');
      radio.setAttribute('data-id', obj.id);
      radio.setAttribute('data-url', obj.url);

      // 附加一個選項至 DOM
      const clone = document.importNode(template.content, true);
      menuContent.appendChild(clone);
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
    const srcElm = event.srcElement;

    // 按下按鈕
    if (srcElm.className.indexOf('resource-button') !== -1) {
      // 更新正在播放之資源
      playing = {id: srcElm.dataset['id'], url: srcElm.dataset['url']};
      play();
      updatePlayingMark();
    }

    // 按下 radio
    if (srcElm.className.indexOf('radio') !== -1) {
      // 設為預設值
      localStorage.setItem('default', JSON.stringify({id: srcElm.dataset['id'], url: srcElm.dataset['url']}));
      updateDefaultMark(srcElm.dataset['id']);
    }
  }

  // 更新是否為預設播放項目之標記
  function updateDefaultMark(id) {

  }

  // 更新是否為目前播放項目之標記
  function updatePlayingMark() {

  }

})(db);