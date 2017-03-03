

/*
 *@param{target} Array 
  @param{src} Object
  用对象的__proto__属性实现继承
*/
function protoAugment(target,src){
	target.__proto__ = src;
}
/*
*@param{obj} Object
* def用于定义对象的属性值，enumerable控制是否可枚举
*/
function def(obj,key,value,enumerable){
	Object.defineProperty(obj,key,{
    value: value,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

let _id = 0;
/*
  Dep构造器用于维持$watcher检测队列；
*/
function Dep(){
	this.id = _id++;
	this.subs = [];
}

Dep.prototype = {
	constructor:Dep,
	addSub:function(sub){
		this.subs.push(sub);
	},
	notify:function(){
		this.subs.forEach(function(sub){
			if(typeof sub.update == 'function')
			sub.update();
		})
	},
	removeSub:function(sub){
		var index = this.subs.indexOf(sub);
		if(index >-1)
		this.subs.splice(index,1);
	},
	depend:function(){
		Dep.target.addDep(this);
	}
}

Dep.target = null; //定义Dep的一个属性，当watcher时Dep.targert=watcher实例对象

var arrayProto = Array.prototype;
var arrayMethods = Object.create(arrayProto);//arrayMethods实现对Array.prototype原型方法的拷贝;

['push','pop','shift','unshift','sort','reverse','splice'].forEach(function(method){
	var original = arrayProto[method];
	def(arrayMethods,method,function mutator(){
		var args = Array.prototype.slice.call(arguments);
	    var result = original.apply(this, args);
	    var ob = this.__ob__;
	    var inserted;
	    switch (method) {  //对数组新加的值做处理
	    	case 'push' :
	    	inserted = args;
	    	break;
	    	case 'unshift' :
	    	inserted = args;
	    	break;
	    	case 'splice' :
	    	inserted = args.slice(2);
	    	break;
	    }

	    if(inserted){
	    	ob.observeArray(inserted);//对新增加的值进行set,get设置
	    }
	    ob.dep.notify();
	    return result;
	})
})

function Observer(data){
	this.data = data;
	this.dep = new Dep();
	def(data,'__ob__',this);
	if(Array.isArray(data)){
		protoAugment(data,arrayMethods); //arrayMethods实现对Array.prototype原型方法的拷贝;
		this.observeArray(data);
	}else{
		this.walk(data);
	}
	
}

Observer.prototype = {
	walk:function walk(data){
		var _this = this;
		Object.keys(data).forEach(function(key){
			_this.convert(key,data[key]);
		})
	},
	convert:function convert(key,val){
		this.defineReactive(this.data,key,val);
	},
	defineReactive:function defineReactive(data,key,val){
		var ochildOb = observer(val);
		var _this = this;
		var dep = new Dep();
		Object.defineProperty(data,key,{
			configurable:false,
			enumerable:true,
			get:function(){
				if(Dep.target){
					dep.depend();
					if (Array.isArray(val)) {
						ochildOb.dep = dep;
          				dependArray(val);
       				}
				}
				return val;
			},
			set:function(newVal){
				if(newVal == val)return;
				val = newVal;
                observer(newVal);
                dep.notify();		 
			}			
		})
	},
	observeArray:function observeArray(items){
		for (var i = 0, l = items.length; i < l; i++) {
    		observer(items[i]);
 		}
	}
}

function dependArray (value) {
  for (var e = (void 0), i = 0, l = value.length; i < l; i++) {
    e = value[i];
    e && e.__ob__ && e.__ob__.dep.depend();
    if (Array.isArray(e)) {
      dependArray(e);
    }
  }
}

function observer(data){
	if(!data || typeof data !=='object')return;
	var ob;
	if(data.hasOwnProperty('__ob__') && data.__ob__ instanceof Observer){
		ob = data.__ob__;
	}else{
		ob = new Observer(data);
	}
	return ob;
}


