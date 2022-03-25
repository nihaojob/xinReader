
// storage keys
// total 总数
// index 当前

class Store {

	constructor(){
		this.prefix = 'tip-'
	}

	// 设置总数
	setTotal(total) {
		return this.setItem('total', total)
	}

	// 设置总数
	getTotal() {
		return this.getBykey('total')
	}

	getIndex() {
		return this.getBykey('index')
	}

	setIndex(index) {
		return this.setItem('index', index)
	}

	// 删除元素
	removeById(id) {
		return this.getBykey('removes').then((arr) => {
			arr.push(id)
			return this.setItem('removes', arr)
		})
	}

	clear() {
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

	getBykey(strKey) {
		const key = this.prefix + strKey
		return new Promise(function (resolve, reject) {
			chrome.storage.local.get([key], function (items) {
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
		return new Promise(function (resolve, reject) {
			chrome.storage.local.set({ [key]: item }, function () {
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

class Kindle {
	typeFile = ''
	itemTip = {}
	$message = null
	constructor(store, $message) {
		this.store = store
		this.btnBindListener()
		this.fileBindListener()
		this.readFileListener()
		this.getOne()
		this.$message = $message
	}
	// 绑定文件读取事件
	readFileListener() {
		this.reader = new FileReader();
		this.reader.onload = (event) => {
			const list = kindleParser(event.target.result)
			if (window.confirm(`共检测到${list.length}条笔记，是否导入？`)) {
				this.saveAll(list)
			}
		};
	}

	saveAll(list) {
		this.loadingShow()
		const saveArr = []
		list.forEach((item, i) => {
			saveArr.push(this.store.setItem(String(i + 1), item))
		})
		Promise.all(saveArr).then(res => this.store.setTotal(list.length))
			.then(() => this.store.setIndex(1)).then(() => {
				this.$message.success('保存成功')
				this.getOne()
				$('#loadingBox').hide()
			})
	}

	getOne() {
		return Promise.all([
			this.store.getTotal(),
			this.store.getIndex(),
			this.showTotal()
		]).then(([total, index]) => {
			if (index) {
				if (Number(index) < Number(total)) this.store.setIndex(Number(index) + 1)
				$('#backBtn').show()
				return this.store.getBykey(index)
			} else {
				$('#setBox').show()
				$('#backBtn').hide()
				return Promise.reject()
			}
		})
			.then(item => {
				this.itemTip = item
				this.showTip(item)
			})
	}

	showTotal() {
		return Promise.all([this.store.getIndex(), this.store.getTotal()]).then(([index, total]) => {
			$('#totalBox').html(`${index}/${total} 条`)
		})
	}

	showTip(item = {}) {
		const html = this.itemHtml(item)
		$('#tipText').html(html)
		$('#tipBox').show()
	}

	loadingShow() {
		$('#tipBox').hide()
		$('#setBox').hide()
		$('#loadingBox').show()
	}

	// 文件监听
	fileBindListener() {
		var eleFile = document.getElementById('upfile');
		eleFile.onchange = (event) => {
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
				if (index) {
					if (window.confirm('选择新文件后将清除原有数据，确认操作？')) {
						this.clearData()
						$('#upfile').click()
					}
				} else {
					$('#upfile').click()
				}
			})
		})

		$('#setBtn').click(() => {
			$('#tipBox').hide()
			$('#setBox').show()
		})

		$('#clearBtn').click(() => {
			if (window.confirm('确认清空所有数据？')) {
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

		// 设置flomo按钮
		$('#setFlomoBtn').click(() => {
			this.setFlomoUrl()
		})

		$('#sendFlomoBtn').click(() => {
			this.store.getBykey('flomoUrl').then((url) => {
				this.setFlomoTip(url)
			}).catch(() => this.$message.warning('还未设置，请设置以后重试'))
		})

		// 设置分页按钮
		$('#setIndexBtn').click(() => {
			this.setPageIndex()
		})

	}

	// 设置分页
	setPageIndex() {
		Promise.all([this.store.getIndex(), this.store.getTotal()])
			.then(([index, total]) => {
				const pageIndex = prompt('您要跳转到第几条笔记', index);
				const pageIndexNum = Number(pageIndex)
				if (pageIndex === null) return
				if (pageIndex && Number.isInteger(pageIndexNum) && total >= pageIndexNum) {
					this.store.setIndex(pageIndex).then(() => {
						this.getOne().then(() => this.$message.success(`成功跳转至第${pageIndexNum}条`))
					})
				} else {
					this.$message.error('格式错误')
				}

			}).catch(() => this.$message.warning('暂无数据'))
	}

	setFlomoTip(url) {

		this.store.getBykey('flomoUrl').then(nowUrl => {
			if (!nowUrl) return this.$message.warning('暂未设置API链接')
			if (window.confirm('确认发送到Flomo？')) {
				const html = `${this.itemTip.quote}
				书籍：#《${this.itemTip.book}》
				作者：${this.itemTip.author}
				时间：${this.itemTip.dateAdded}
				`
				$.post(url, { content: html }, (result) => {
					if (result.code === 0) {
						this.$message.success('发送成功')
					} else {
						this.$message.error('失败：' + result.message)
					}
				}, 'json');
			}
		})
	}

	setFlomoUrl() {
		this.store.getBykey('flomoUrl').then(nowUrl => {
			var flomoUrl = prompt('请写入你的专属flomo API', nowUrl);
			if (flomoUrl === null) return
			if (flomoUrl && flomoUrl.includes('https://flomoapp.com/')) {
				this.store.setItem('flomoUrl', flomoUrl).then(() => {
					this.$message.success('设置成功')
				})
			} else {
				this.$message.error('格式错误')
			}
		})
	}

	clearData() {
		this.store.clear().then(() => {
			$('#backBtn').hide()
			this.$message.success('数据已清空')
		})
	}
	// 文件类型判断
	isTextFile(file) {
		return file.type === 'text/plain'
	}

	// 拼接HTML模板
	itemHtml(item) {
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

const store = new Store()
const app = new Kindle(store, window.$message)

// 分享功能相关
class Share {
	constructor(app, store, $message) {
		this.app = app
		this.store = store
		this.$message = $message
		this.btnBindListener()
	}


	btnBindListener(){
		// 分享按钮
		$('#shareBtn').click(() => {
			this.showShare()
		})

		$('#shareBoxClose').click(() => {
			$('#shareBox').hide()
		})

		$('#downImg').click(() => {
			this.downImg()
		})
	}

	// 显示分享弹框
	showShare(){
		const html = this._template(this.app.itemTip)
		$('#shareBox .templ').html(html)
		$('#shareBox').show()
	}

	downImg(){
		domtoimage.toPng(document.getElementById('shareBox'))
		.then(function (dataUrl) {
			var link = document.createElement('a');
			link.download = 'xinReader.png';
			link.href = dataUrl;
			link.click();
		});
	}

	_template(data){
		console.log(data)
		const signature = '@秦少卫的书摘'
		return `<svg width="45" height="36" class="mb-5 fill-current text-orange-100"><path d="M13.415.001C6.07 5.185.887 13.681.887 23.041c0 7.632 4.608 12.096 9.936 12.096 5.04 0 8.784-4.032 8.784-8.784 0-4.752-3.312-8.208-7.632-8.208-.864 0-2.016.144-2.304.288.72-4.896 5.328-10.656 9.936-13.536L13.415.001zm24.768 0c-7.2 5.184-12.384 13.68-12.384 23.04 0 7.632 4.608 12.096 9.936 12.096 4.896 0 8.784-4.032 8.784-8.784 0-4.752-3.456-8.208-7.776-8.208-.864 0-1.872.144-2.16.288.72-4.896 5.184-10.656 9.792-13.536L38.183.001z"></path></svg><h2>《${data.book}》</h2><p>${data.quote}</p><span>${signature}</span></p>`
	}
}

const share = new Share(app, store, window.$message)