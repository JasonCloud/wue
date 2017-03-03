function Wue(option){
	this.$option = option;
	var data = this._data = this.$option.data;
	var _this = this;

	//数据代理实现数据从vm.xx == vm.$data.xx;
	Object.keys(data).forEach(function(val){
		_this._proxy(val)
	});

	observer(data)
	this.$compile = new Compile(this.$option.el , this);
}

Wue.prototype = {
	$watch:function(expOrFn,cb){
		return new Watcher(this,expOrFn,cb);
	},
	_proxy:function(key){
		var _this = this;
		Object.defineProperty(_this,key,{
			configurable: false,
            enumerable: true,
            get:function(){
            	return _this._data[key];
            },
            set:function(newVal){
            	_this._data[key] = newVal;
            }
		})
	}
}