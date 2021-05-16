
// storage keys
// total 总数
// index 当前

class Store {

	prefix = 'tip-'

	// 设置总数
	setTotal(total){
		return this.setItem('total', total)
	}

	// 设置总数
	getTotal(){
		return this.getBykey('total')
	}

	getIndex(){
		return this.getBykey('index')
	}

	setIndex(index){
		return this.setItem('index', index)
	}

	// 删除元素
	removeById(id) {
		return this.getBykey('removes').then((arr) => {
			arr.push(id)
			return this.setItem('removes', arr)
		})
	}

	clear(){
		return new Promise((resolve, reject) => {
			chrome.storage.local.clear(() => {
				let err = chrome.runtime.lastError;
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	getBykey(strKey){
		const key = this.prefix + strKey
		return new Promise(function(resolve, reject) {
			chrome.storage.local.get([key], function(items) {
				let err = chrome.runtime.lastError;
				if (err) {
					reject(err);
				} else {
					resolve(items[key]);
				}
			})
		})
	}

	setItem(strKey, item) {
		const key = this.prefix + strKey
		return new Promise(function(resolve, reject) {
			chrome.storage.local.set({ [key]: item }, function() {
				let err = chrome.runtime.lastError;
				if (err) {
					reject(err);
				} else {
					resolve(key);
				}
			})
		})
	}
}

const store = new Store()


// function showTip(i, cb){
// 	const key = 'tip-' + i
// 	chrome.storage.local.get([key], function(data) {
// 		if(data[key]){
// 			$('#tip').html('<div class="memo">' + data[key] + '</div>')
// 			cb()
// 		}
// 	})
// }

// function flomoParser(strHtml) {
// 	const memos = $(strHtml).find('.memo');
// 	const all = []
// 	memos.each((i) => {
// 		all.push(i)
// 		const str = memos.eq(i).html()
// 		chrome.storage.local.set({ ['tip-' + i]: str }, function() {
// 			console.log('保存成功！');
// 		});
// 		if(i === memos.length-1){
// 			alert('保存成功！')
// 			chrome.storage.local.set({ all }, function() {
// 				console.log('保存成功！');
// 			});
// 			chrome.storage.local.set({ allNum: all.length  }, function() {
// 				console.log('保存成功！');
// 			});
// 		}
// 	})
// }


class Kindle {
	typeFile = ''
	constructor(store){
		this.store = store
		this.btnBindListener()
		this.fileBindListener()
		this.readFileListener()
		this.getOne()
	}
	// 绑定文件读取事件
	readFileListener() {
		this.reader = new FileReader();
		this.reader.onload =  (event) => {
			const list = kindleParser(event.target.result)
			if (window.confirm(`共检测到${list.length}条笔记，是否导入？`)) {
				this.saveAll(list)
			}
		};
	}

	saveAll(list){
		this.loadingShow()
		const saveArr = []
		list.forEach((item, i) => {
			saveArr.push(this.store.setItem(String(i + 1), item))
		})
		Promise.all(saveArr).then(res => this.store.setTotal(list.length))
		.then(() => this.store.setIndex(1)).then(() => {
			alert('保存成功')
			this.getOne()
			$('#loadingBox').hide()
		})
	}

	getOne(){
		this.store.getIndex().then(index => {
			if(index) {
				this.store.setIndex(index + 1)
				$('#backBtn').show()
				return this.store.getBykey(index)
			}else{
				$('#setBox').show()
				$('#backBtn').hide()
				return Promise.reject()
			}
		})
		.then(item => {
			this.showTip(item)
			this.showTotal(item)
		})
	}

	showTotal(){
		Promise.all([this.store.getIndex(), this.store.getTotal()]).then(([index, total]) => {
			$('#totalBox').html(`${index-1}/${total} 条`)
		})
	}

	showTip(item){
		const html = this.itemHtml(item)
		$('#tipText').html(html)
		$('#tipBox').show()
	}

	loadingShow(){
		$('#tipBox').hide()
		$('#setBox').hide()
		$('#loadingBox').show()
	}

	// 文件监听
	fileBindListener(){
		var eleFile = document.getElementById('upfile');
		eleFile.onchange =  (event) =>  {
			var file = event.target.files[0];
			if (this.isTextFile(file)) {
				this.typeFile = 'text'
				this.reader.readAsText(file);
			}
		};
	}

	// 绑定文件按钮事件
	btnBindListener() {
		$('#selectFileBtn').click(() => {
			this.store.getIndex().then(index => {
				if(index) {
					if(window.confirm('选择新文件后将清除原有数据，确认操作？')) {
						this.clearData()
						$('#upfile').click()
					}
				} else{
					$('#upfile').click()
				}
			})
		})

		$('#setBtn').click(() => {
			$('#tipBox').hide()
			$('#setBox').show()
		})

		$('#clearBtn').click(() => {
			if(window.confirm('确认清空所有数据？')){
				this.clearData()
			}
		})

		$('#backBtn').click(() => {
			$('#tipBox').show()
			$('#setBox').hide()
		})

		$('#refreshBtn').click(() => {
			this.getOne()
		})
	}

	clearData(){
		this.store.clear().then(() =>{
			$('#backBtn').hide()
			 alert('数据已清空')
		})
	}
	// 文件类型判断
	isTextFile(file){
		return file.type === 'text/plain'
	}

	// 拼接HTML模板
	itemHtml(item){
		return `
		<p class="text-xl text-black font-semibold leading-10 mb-5">
		${item.quote}
        </p>
        <p class="text-gray-500 text-sm font-medium leading-5">
          书籍：《${item.book}》
        </p>
        <p class="text-gray-500 text-sm font-medium leading-5">
          作者：${item.author}
        </p>
        <p class="text-gray-500 text-sm font-medium leading-5">
          时间：${item.dateAdded}
        </p>
		`
	}
}
const app = new Kindle(store)