firebase.initializeApp(config);
const db = firebase.firestore();

;(function (db) {
  const reloadTrigger = document.querySelector('.reload');
  reloadTrigger.addEventListener('click', reload);

  const reloadImg = document.querySelector('.reload-img');
  const msg = document.querySelector('.msg');

  let id = null;

  db.collection('channels').where('name', '==', department).limit(1).get()
    .then(docs => docs.forEach(doc => id = doc.id));



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
        reloadImg.hidden = true;
        showMsg('已發出重新載入指令');
      })
      .catch(err => {
        console.log(err);
        reloadImg.hidden = true;
        showMsg('發生錯誤，稍後再試', 'error');
      });
  }

  // 重設 UI
  function resetUI() {
    reloadImg.hidden = false;
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
  
})(db);