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
      reloadAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.doc(`channels/${id}`).update(payload)
      .then(() => {
        console.log('reloaded');
        reloadImg.hidden = true;
        msg.hidden = false;
        msg.innerHTML = '<h3>已發出重新載入指令</h3>';
        setTimeout(resetUI, 3000);
      });
      // .catch(consoleLogError);
  }

  function resetUI() {
    reloadImg.hidden = false;
    msg.innerHTML = '';
    msg.hidden = true;
  }
  
})(db);