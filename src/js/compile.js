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

Compile.prototype = {
	constructor : Compile,
	isElementNode : function(el){
		return !!el && el.nodeType == 1;
	},
	isTextNode : function(node){
		return !!node && node.nodeType == 3;
	},
	nodeToFragment : function(el){
		var documentFragment = document.createDocumentFragment();
		var child;

		while( child = el.firstChild){
			documentFragment.appendChild(child);
		}

		return documentFragment;
	},
	init : function(){
		this.compileElement(this.$fragment);
	},
	compileElement : function(el){
		var childNodes = el.childNodes, _this = this;
        var patter = /\{\{(.*)\}\}/;

		this.toArray(childNodes).forEach(function(node){
			var text = node.textContent;
			if(_this.isElementNode(node)){
				_this.compile(node);
			}else if(_this.isTextNode(node) && patter.test(text)){
				_this.compileText(node,RegExp.$1);				
			}

			if(node.childNodes && node.childNodes.length){
				_this.compileElement(node);
			}
		})
	},
	compile : function(node){
		var attrs = node.attributes,_this = this;
		this.toArray(attrs).forEach(function(attr){
			var attrName = attr.name,exp = attr.value,dir;
			if(_this.isDirective(attrName)){
				dir = _this.toDir(attrName);
				if(_this.isEventDirective(dir)){
					compileUtil.EventHander(node,_this.$vm,exp,dir);
				}else{
					compileUtil[dir] && compileUtil[dir](node,_this.$vm,exp,attrName);
				}
				node.removeAttribute(attrName)
			}
		})
	},
	compileText : function(node,exp){
		compileUtil.text(node,this.$vm,exp);
	},
	toArray : function(arrayLike) {
		return Array.prototype.slice.call(arrayLike);
	},
	isDirective : function(val){
		var reg = /^(v-)|(\:)|(\@)/;
		return reg.test(val.trim());
	},
	toDir : function(dir){
		dir = dir.replace(/^v-/,'');
		if(/^(bind)?\:/.test(dir.trim()))dir = 'vbind';
		return dir
	},
	isEventDirective(dir){
		var patter = /^(on)|(\@)/;
		return !!dir && patter.test(dir);
	}
	
}
 function isObject(obj){
		return Object.prototype.toString.call(obj) === '[object Object]';
	}

// 指令集合

var compileUtil = {
	EventHander : function(node,vm,exp,dir){
		var type = /^\@/.test(dir) ? dir.substring(1) : dir.split(':')[1],
		    callback = vm.$option.methods && vm.$option.methods[exp];
		    if(!callback){
		    	warn(exp)
			}
		    if (type && callback) {
		    	node.addEventListener(type,callback.bind(vm),false);
		    }
	},
	text : function(node,vm,exp){
		this.bind(node,vm,exp,'text');
	},
	html : function(node,vm,exp){
		this.bind(node,vm,exp,'html');
	},
	show : function(node,vm,exp){
		this.bind(node,vm,exp,'show');
	},
	model : function(node,vm,exp){
        this.bind(node,vm,exp,'model');
        var _this = this;
        node.value = _this._getVal(vm,exp);
        node.addEventListener('input',function(e){
        	var val = e.target.value;
        	_this._setVal(vm,exp,val);
        },false)
	},
	bind : function bind(node,vm,exp,dir,attrName){
		var updateFn = updaterUtil[dir+'UpdateFn'],_this = this,oldVal;

		updateFn && updateFn(node,this._getVal(vm,exp),oldVal,attrName);

		new Watcher(vm,exp,function(val,oldVal){
			updateFn && updateFn(node,val,oldVal,attrName);
		})
	},
	vbind : function vbind(node,vm,exp,attr){
		var _this = this,exps;
		var attrName = attr.split(':')[1];
		if(/^\[(.*)\]$/.test(exp))
			exps = RegExp.$1.split(',')
		else
			exps = exp.split(',');

		exps.forEach(function(exp){
			_this.bind(node,vm,exp,'vbind',attrName);
		})
		
	},
	_setVal : function(vm,exp,val){
		var value = vm._data;
		var exps = exp.split('.');
		exps.forEach(function(k,i){
			if(i<exps.length-1){
				value = value[k];
			}else{
			    value[k] = val;				
			}
		})
	},
	_getVal : function(vm,exp){
		var exps,val;
			exps = exp.split('.');
		    val = vm._data;
		
		exps.forEach(function(k){
			if(!val.hasOwnProperty(k)){
				warn(k);
			}
			val = val[k];
		})

		return val;
	}
}
function warn(error){
	console.log(`%c*[wue warn]: Property or method "${error}" is not defined ,Make sure to declare reactive data properties in the data option.`,'color:red')
}
//更新指令集合

var updaterUtil = {
	textUpdateFn : function(node,val){
		if(typeof val ==='object' && !!val) val = JSON.stringify(val); 
		node.textContent = typeof val === 'undefined' ? '' :val;
	},
	htmlUpdateFn : function(node,val){
		if(typeof val ==='object' && !!val) val = JSON.stringify(val); 
		node.innerHTML = typeof val === 'undefined' ? '' :val;
	},
	modelUpdateFn : function(node,val){
		node.value = typeof val === 'undefined' ? '' :val;
	},
	showUpdateFn : function(node,val){
		if(typeof val == 'string'){
            val = /^false$/.test(val.trim()) ? false : val;
		} 
        node.style.display = !!val ? 'block' : 'none';
	},
	vbindUpdateFn : function(node,val,oldVal,attrName){
		var classname = node.className,
	    arr = classname.trim().split(' '),arrfinish=[];
		if(arr.indexOf(val)!=-1)return;
		val = isObject(val) ? objToArray(val)[0] : val;
		oldVal = isObject(oldVal) ? objToArray(oldVal)[1] : oldVal;       
		if(Array.isArray(oldVal)){
			for(var i=0;i<arr.length;i++){
				for(var j = 0;j<oldVal.length;j++){
					if(arr[i] == oldVal[j]){
						arr.splice(i,1);
					}
				}
			}
		}
       if(attrName == 'class'){
			arr.forEach(function(classNameValue,k){
				if(classNameValue == oldVal ){
					arr[k] = val;
				}
			})

			if(arr.indexOf(val) ==-1){
				Array.isArray(val) ? arr = arr.concat(val) : arr.push(val);
			}
			arr.forEach(function(v,k){
				if(!arr[v]){
					arr[v] = v;
					arrfinish.push(v);
				}
			})
			val = arrfinish.join(' ')
		}

		node.setAttribute(attrName,val)
		
	}
}

//将对象属性值为真的属性名取出来
function objToArray(obj){
	var objToArrT = [],objToArrF = [];
         Object.keys(obj).forEach(function(v){
        		if(!!obj[v]){
        			objToArrT.push(v);
        		}else{
        			objToArrF.push(v);
        		}
        	})
        return [objToArrT,objToArrF];
}