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