# wue
仿VUE框架，实现数据双向绑定

写在前面的东西
=======
   Vue.js自从在github上开源以来就受到各方的极大关注，并在短暂的时间里立即火了起来，现在已成为最流行的前端框架之一；我也使用vue有一段时间了，对vue的双向绑定有一定的理解，在这和大家分享我的愚见，有错误的地方望大家给予指正。

1、概述
----
     让我们先来看一下官网的这张数据绑定的说明图：
   ![图片描述][1]
    原理图告诉我们，a对象下面的b属性定义了getter、setter对属性进行劫持，当属性值改变是就会notify通知watch对象，而watch对象则会notify到view上对应的位置进行更新（这个地方还没讲清下面再讲），然后我们就看到了视图的更新了，反过来当在视图(如input)输入数据时，也会触发订阅者watch，更新最新的数据到data里面(图中的a.b),这样model数据就能实时响应view上的数据变化了，这样一个过程就是数据的双向绑定了。
   看到这里就会第一个疑问：那么setter、getter是怎样实现的劫持的呢？答案就是vue运用了es5中Object.defineProperty()这个方法，所以要想理解双向绑定就得先知道Object.defineProperty是怎么一回事了；

## 2.Object.defineProperty ##
  它是es5一个方法，可以直接在一个对象上定义一个新属性，或者修改一个已经存在的属性， 并返回这个对象，对象里目前存在的属性描述符有两种主要形式：数据描述符和存取描述符。数据描述符是一个拥有可写或不可写值的属性。存取描述符是由一对 getter-setter 函数功能来描述的属性。描述符必须是两种形式之一；**不能同时是两者**。
  属性描述符包括：configurable(可配置性相当于属性的总开关，只有为true时才能设置，而且不可逆)、Writable(是否可写，为false时将不能够修改属性的值)、Enumerable(是否可枚举，为false时for..in以及Object.keys()将不能枚举出该属性)、get(一个给属性提供 getter 的方法)、set(一个给属性提供 setter 的方法)


```
var o = {name:'vue'};
Object.defineProperty(o, "age",{ value : 3,
                               writable : true,//可以修改属性a的值
                               enumerable : true,//能够在for..in或者Object.keys()中枚举
                               configurable : true//可以配置
                               });

Object.keys(o)//['name','age']
o.age = 4;
console.log(o.age) //4

var bValue;
Object.defineProperty(o, "b", {
                               get : function(){
                                         return bValue;
                                     },
                               set : function(newValue){
                                       console.log('haha..')
                                       bValue = newValue;
                                     },
                               enumerable : true,//默认值是false 及不能被枚举
                               configurable : true//默认也是false
                               });
 o.b = 'something';
//haha..

```
上面分别给出了对象属性描述符的数据描述符和存取描述的例子，注意一点是这两种不能同时拥有，也就是value\writable不能和get\set同时具备。在这里只是很粗浅的说了一下Object.defineProperty这个方法，要了解更多可以点击[这里][2]


3.实现observer
==========
  我们在上面一部分讲到了es5的Object.defineProperty()这个方法，vue正式通过它来实现对一个对象属性的劫持的，在创建实例的时候vue会对option中的data对象进行一次数据格式化或者说初始化，给每个data的属性都设置上get/set进行对象劫持，代码如下：



```
function Observer(data){
	this.data = data;
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
		Object.defineProperty(data,key,{
			configurable:false,
			enumerable:true,
			get:function(){
                console.log(`i get the ${key}-->${val}`)
				return val;
			},
			set:function(newVal){
				if(newVal == val)return;
				console.log(`haha.. ${key} changed oldVal-->${val} newVal-->${newVal}`);
				val = newVal;
                observer(newVal);//在这里对新设置的属性再一次进行get/set
			}
		})
	},
	observeArray:function observeArray(items){
		for (var i = 0, l = items.length; i < l; i++) {
    		observer(items[i]);
 		}
	}
}
function observer(data){
	if(!data || typeof data !=='object')return;
	return new Observer(data);
}
//让我们来试一下
var obj = {name:'jasonCloud'};
var ob = observer(obj);
obj.name = 'wu';
//haha.. name changed oldVal-->jasonCloud newVal-->wu
obj.name;
//i get the name-->wu
```
 到这一步我们只实现了对属性的set/get监听，但并没实现变化后notify，那该怎样去实现呢？在VUE里面使用了订阅器Dep，让其维持一个订阅数组，但有订阅者时就通知相应的订阅者notify。

```
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
```
在这里构造器Dep,维持内部一个数组subs，当有订阅时就addSub进去，通知订阅者更新时就会调用notify方法通知到订阅者；我们现在合并一下这两段代码

```
function Observer(data){
	//省略的代码..
	this.dep = new Dep();
	//省略的代码..

}

Observer.prototype = {

    //省略的代码..

	defineReactive:function defineReactive(data,key,val){

		//省略的代码..

		var dep = new Dep();

		Object.defineProperty(data,key,{
			configurable:false,
			enumerable:true,
			get:function(){
				if(Dep.target){
					dep.depend();
					//省略的代码..
				}
				return val;
			},
			set:function(newVal){
				//省略的代码..
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

function observer(data){
	if(!data || typeof data !=='object')return;
	return new Observer(data);
}
```

上面代码中有一个protoAugment方法，在vue中是实现对数组一些方法的重写，但他并不是直接在Array.prototype.[xxx]直接进行重写这样会影响到所有的数组中的方法，显然是不明智的，vue很巧妙的进行了处理，使其并不会影响到所有的Array上的方法，代码可以点击[这里][3]

到这里我们实现了数据的劫持，并定义了一个订阅器来存放订阅者，那么谁是订阅者呢？那就是Watcher,下面让我们看看怎样实现watcher

4.实现一个Watcher
-----------
watcher是实现view视图指令及数据和model层数据联系的管道，当在执行编译时候，他会把对应的属性创建一个Watcher对象让他和数据层model建立起联系。但数据发生变化是会触发update方法更新到视图上view中，反过来亦然。

```
function Watcher(vm,expOrFn,cb){
	this.vm = vm;
	this.cb = cb;
	this.expOrFn = expOrFn;
	this.depIds = {};
	var value = this.get(),valuetemp;
	if(typeof value === 'object' && value !== null){
		if(Array.isArray(value)){
			valuetemp = [];
			for(var i = 0,len = value.length;i<len;i++){
				valuetemp.push(value[i]);
			}
		}else{
			valuetemp = {};
			for(var j in value){
				valuetemp[j] = value[j];
			}
		}
		this.value = valuetemp;
	}else{
		this.value = value;
	}

};
Watcher.prototype = {
	update:function(){
		this.run();
	},
	run:function(){
		var val = this.get(),valuetemp;
		var oldVal = this.value;
		if(val!==oldVal){
			if(typeof val === 'object' && val !== null){
				if(Array.isArray(val)){
					valuetemp = [];
					for(var i = 0,len = val.length;i<len;i++){
						valuetemp.push(val[i]);
					}
				}else{
					valuetemp = {};
					for(var j in val){
						valuetemp[j] = val[j];
					}
				}
				this.value = valuetemp;
			}else{
				this.value = val;
			}
			this.cb.call(this,val,oldVal);
		}
	},
	get:function(){
		Dep.target = this;
		var val = this.getVMVal();
		Dep.target = null;
		return val;
	},
	getVMVal:function(){
		var exps = this.expOrFn.split('.');
		var val = this.vm._data;
		exps.forEach(function(key){
			val = val[key];
		})

		return val;
	},
	addDep:function(dep){
		if(!this.depIds.hasOwnProperty(dep.id)){
			dep.addSub(this);
			this.depIds[dep.id] = dep;
		}
	}

}
```

到现在还差一步就是将我们在容器中写的指令和{{}}让他和我们的model建立起连续并转化成，我们平时熟悉的html文档，这个过程也就是编译；编译简单的实现就是将我们定义的容器里面所有的子节点都获取到，然后通过对应的规则进行转换编译，为了提高性能，先创建一个文档碎片createDocumentFragment（），然后操作都在碎片中进行，等操作成功后一次性appendChild进去；

```
function Compile(el,vm){
	this.$vm = vm;
	this.$el = this.isElementNode(el) ? el : document.querySelector(el);
	if(this.$el){
		this.$fragment = this.nodeToFragment(this.$el);
		this.init();
		this.$el.appendChild(this.$fragment);
	    this.$vm.$option['mount'] && this.$vm.$option['mount'].call(this.$vm);
	}
}
```
## 5.实现一个简易版的vue ##

 到目前为止我们可以实现一个简单的数据双向绑定了，接下来要做的就是对这一套流程进行整合了，不多说上码

```
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
```
在这里定义了一个Wue构造函数，当实例化的时候他会对option的data属性进行格式化（劫持），然后再进行编译，让数据和视图建立起联系；在这里用_proxy进行数据代理是为了当访问数据时可以直接vm.xx而不需要vm._data.xx;

源码放在[这里][4]

## 后话 ##

  在这里只是很初步的实现了一些vue的功能，而且还很残缺，比如对象的深层绑定，以及计算属性都还没有加入，作为后续部分吧，最后得膜拜一下尤神，太牛叉了！

参考资料：
 1.[https://segmentfault.com/a/1190000006599500][5]
 2.[https://segmentfault.com/a/1190000004384515][6]
 3.[https://github.com/youngwind/blog/issues/87][7]


  [1]: /img/bVx1bI
  [2]: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
  [3]: https://github.com/JasonCloud/wue/blob/master/src/js/observer.js
  [4]: https://github.com/JasonCloud/wue
  [5]: https://segmentfault.com/a/1190000006599500
  [6]: https://segmentfault.com/a/1190000004384515
  [7]: https://github.com/youngwind/blog/issues/87
