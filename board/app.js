(function() {
	/* 播放項目設定 */
	// 簡報
	const slideUrl = 'https://docs.google.com/presentation/d/e/2PACX-1vT0upFE11b8SlwpGLJx4fHjTkYTlMQW2fFGAsph1gOjUjM9U2QeuXcxZIIElVH1jduKywQQZlOz_Hue/embed?loop=true&delayms=2000&rm=minimal&start=true';
	// youtube
	const youtubeUrl = 'https://www.youtube.com/embed/lgOafIYtYtU?&autoplay=1&showinfo=0&vq=highres&rel=0&loop=1&controls=0&playlist=lgOafIYtYtU';
	// 預設播放項目，值為 slide 或 youtube
	let defaultPlayType = 'slide';


	/* 以下勿動 */
	// 若 localStorage 有設定預設播放項目，則以 localStorage 為準
	defaultPlayType = localStorage.getItem('defaultPlayType') || defaultPlayType;
	// 正在播放
	let currentPlayType = defaultPlayType;

	const contentList = {
		slide: slideUrl,
		youtube: youtubeUrl
	};

	const iframe = document.querySelector('iframe');

	// 觸發重新載入
	const reloadTrigger = document.querySelector('.reload');
	reloadTrigger.addEventListener('click', () => reload());

	// 觸發載入簡報
	const slideBtn = document.querySelector('#slideBtn');
	// if (defaultPlayType === 'slide') slideBtn.classList.add('active');
	slideBtn.addEventListener('click', () => {
		reload('slide');
		setActiveClass('slide');
	});

	// 觸發載入 youtube
	const youtubeBtn = document.querySelector('#youtubeBtn');
	// if (defaultPlayType === 'youtube') youtubeBtn.classList.add('active');
	youtubeBtn.addEventListener('click', () => {
		reload('youtube');
		setActiveClass('youtube');
	});

	// 播放項目按鈕
	const resourceBtns = {
		slide: slideBtn,
		youtube: youtubeBtn
	};

	// 用來設定預設播放項目的 radio button
	const resourceRadios = Array.from(document.querySelectorAll('[type=radio]'));
	resourceRadios.forEach((radio) => {
		radio.checked = radio.value === defaultPlayType;
		radio.addEventListener('click', setDefaultTypeHandler);
	});

	reload();
	setActiveClass(defaultPlayType);


	/* 函數區 */

	// 設定 iframe src
	function reload(loadType = currentPlayType) {
		const playType = loadType;
		currentPlayType = playType;
		iframe.setAttribute('src', contentList[playType]);
		// localStorage.setItem('playType', playType);
	}

	// 設定預設播放資源類型，並更新 radio checked 狀態
	function setDefaultTypeHandler() {
		resourceRadios.forEach(radio => radio.checked = radio === this);
		localStorage.setItem('defaultPlayType', this.value);
	}

	// 設定每個播放項目按鈕是否添加 active class
	function setActiveClass(value) {
		const keys = Object.keys(resourceBtns);
		keys.forEach(key => {
			if (key === value) {
				resourceBtns[key].classList.add('active');
			} else {
				resourceBtns[key].classList.remove('active');
			}
		});
	}
})();