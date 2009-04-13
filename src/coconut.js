/*
 * Coconut JavaScript Library v0.0.1
 * http://www.github.com/luning/coconut
 */
 
;(function($) {
	$.fn.extend({
		part: function(behaviour){
			return new $.part(this, behaviour);
		},
		sync: function(){
			this.trigger("sync");
			return this;
		},
		linkedPart: function(){
			return this.data("linkedPart");
		}
	});
	
	// constructor for part
	$.part = function(container, behaviour) {
		this.container = $(container);
		this.fields = [];
		this.initialState = {};
		
		this.init();
		this.addBehaviour(behaviour);
		this.captureInitialState();
		this.container.data("linkedPart", this);
	};
	
	$.extend($.part, {
		prototype: {
			FIELD_SELECTOR: ":input, [part], [part=]",
			
			init: function(){
				this.container.bind("sync", function(event){
					event.stopPropagation();
					this.sync(event.target);
				}.bind(this));
				
				this._buildFields(this.container);
			},
			
			_buildFields: function(context, inferOrder){
				var all = context.filter(this.FIELD_SELECTOR)
							.add(context.find(this.FIELD_SELECTOR))
							.not(this.container);
							
				all.each(function(i, e){
					if(this.contains(e)){
						return;
					}
					var element = $(e);
					var fieldName = element.attr("fieldname") || element.attr("name") || element.attr("id");
					if(!fieldName){
						return; // ignore this dom element
					}
					this._addField(fieldName, element, inferOrder);
				}.bind(this));
			},
			
			sync: function(element){
				if(element === undefined){ // dom removed
					this.clean();
				} else { // dom added
					this._buildFields($(element), true);
				}
			},
			
			_constructField: function(element) {
				if(element.attr("part") !== undefined) {
					return element.part();
				} else if (element.is(":radio")) {
					return this.container.find(":radio[name=" + element.attr("name") + "]");
				} else {
					return element;
				}
			},
			// inferOrder is only for efficency, will add to end by default if not specified. can always be true.
			_addField: function(fieldName, element, inferOrder){
				var field = this._constructField(element);
				var isDirectFieldOfThisPart = true;
				var arrayFieldName = this._plural(fieldName);
				
				if(this.has(arrayFieldName, true)){ // add to existing array field
					this.fields[this.index(arrayFieldName)].it.push(field);
					isDirectFieldOfThisPart = false;
				} else if (element.attr("fieldtype") === "array") { // create new array field
					if(this.has(arrayFieldName)){
						throw "CoconutError: nonarray field [" + arrayFieldName + "] already exists, failed to create array field.";
					}
					fieldName = arrayFieldName;
					field = $.newArrayField(field);
					if(!(fieldName in this)){
						this[fieldName] = field;
					}
				} else { // non-array field
					if (this.has(fieldName)){
						throw "CoconutError: field with name [" + fieldName + "] already exists.";
					}
					if(!(fieldName in this)){
						this[fieldName] = field;
					}
				}
				
				if(isDirectFieldOfThisPart){
					var insertIndex = inferOrder ? this._suggestedIndex(field) : this.fields.length;
					this.fields.splice(insertIndex, 0, { name: fieldName, it: field });
				}
			},
			
			_suggestedIndex: function(field){
				var all = this.container.find(this.FIELD_SELECTOR);
				var posOfField = all.index(field.get(0));
				
				if($.browser.msie && posOfField === -1){
					var dom = field.get(0);
					for(var i = 0; i < all.length; i++){
						if(all[i] == dom){
							posOfField = i;
							break;
						}
					};
				}
				
				var index = 0;
				for(; index < this.fields.length; index++){
					var pos = all.index(this.fields[index].it.get(0));
					if(pos > posOfField){
						break;
					}
				}
				return index;
			},
			
			_plural: function(noun){
				if(noun.charAt(noun.length - 1) === 'y'){
					return noun.substr(0, noun.length - 1) + "ies";
				}
				return noun + "s";
			},
			
			clean: function(){
				var deadFields = [];
				$.each(this.fields, function(i, field) {
					if(field.it.clean){
						field.it.clean();
					}
					if($.dead(field.it)){
						deadFields.push(field);
					}
				});
				$.each(deadFields, function(i, deadField){
					for(var i = 0; i < this.fields.length; i++){
						if(this.fields[i] === deadField){
							this.fields.splice(i, 1);
							if(this[deadField.name] === deadField.it){
								delete this[deadField.name];
							}
							break;
						}
					};
				}.bind(this));
			},
						
			has: function(fieldName, arrayOrNot){
				var index = this.index(fieldName);
				if(index === -1){
					return false;
				} else if (arrayOrNot === undefined) {
					return true;
				} else {
					var isArray = this.fields[index].it instanceof Array;
					return arrayOrNot ? isArray : !isArray ;
				}
			},
			
			index: function(fieldName) {
				for(var i = 0; i < this.fields.length; i++){
					if(this.fields[i].name === fieldName){
						return i;
					}
				}
				return -1;
			},
			
			addBehaviour: function(behaviour){
				if(behaviour === undefined){
					var behav = this.container.attr("part");
					if(!behav){
						return this;
					}
					eval("behaviour = window." + behav + ";");
				}
				behaviour.call(this);
				// TODO : mixin behaviour this way lose the efficiency of prototype. treat behaviour as the first class constructor??
				$.each(behaviour.prototype, function(name, value){
					this[name] = value;
				}.bind(this));
				return this;
			},
			// fieldDefs = { fieldName1: "selector1", fieldName2: "selector2" }, fields are ordered.
			// TODO: this method is not useful, consider to remove it.
			addFields: function(fieldDefs){
				$.each(fieldDefs, function(fieldName, selector){
					var element = $(selector, this.container);
					if(element.length === 0){
						throw "CoconutError: can not find [" + selector + "] in container.";
					}
					if(this.contains(element)){
						throw "CoconutError: field for element [" + selector + "] is already defined.";
					}
					if(this.has(fieldName)){
						throw "CoconutError: field with name [" + fieldName + "] already exist in part."
					}
					this._addField(fieldName, element);
				}.bind(this));				
			},
			
			// orderFields("field1", "field2", ... ,"fieldN"), pass in only the fields need order ensurance.
			orderFields: function(){
				for(var i = 0; i < arguments.length - 1; i++){
					var cur = this.index(arguments[i]);
					var next = this.index(arguments[i + 1]);
					if(cur === -1 || next === -1){
						throw "CoconutError: field with specified name does not exist.";
					}
					if(cur < next){
						continue;
					}
					var nextField = this.fields[next];
					this.fields.splice(next, 1);
					this.fields.splice(this.index(arguments[i]) + 1, 0, nextField);
				}
				return this;
			},
			// return all dom elements in all fields
			// index is optional and can only be 0 if provided.
			get: function(index){
				if(index === undefined){
					var all = [];
					$.each(this.fields, function(i, field) {
						all = all.concat(field.it.get());
					});
					return all;
				}
				if(index !== 0){
					throw "CoconutError: index can only be 0 under current implementation.";
				}
				if(this.fields.length > 0){
					return this.fields[0].it.get(0);
				}
			},
			
			state: function(s){
				if(s === undefined){
					var state = {};
					$.each(this.fields, function(i, field){
						state[field.name] = field.it.state();
					});
					return state;
				}

				$.each(this.fields, function(i, field){
					if(s.hasOwnProperty(field.name)){
						field.it.state(s[field.name]);
					}
				});
				return this;
			},
			
			isDirty: function() {
				return !$.objectEqual(this.initialState, this.state());
			},
			
			// optional parameter : fieldNames
			// eg. resetState("field1", "field2", "field3")
			resetState: function() {
				if(arguments.length === 0){
					this.state(this.initialState);
					return this;
				}

				var newState = {};
				$.each(arguments, function(i, fieldName){
					if(!this.initialState.hasOwnProperty(fieldName)){
						throw "CoconutError: reset state with invalid field name.";
					}
					newState[fieldName] = this.initialState[fieldName];
				}.bind(this));
				
				return this.state(newState); 
			},
			
			captureInitialState: function() {
				this.initialState = this.state();
				return this;
			}, 
			
			needUpdateWith: function(state) {
				var thisState = this.state();
				for (var fieldName in thisState) {
					if (state.hasOwnProperty(fieldName) && state[fieldName] !== thisState[fieldName]) {
						return true;
					}
				}
				return false;
			}, 
			// does this part contains any dom in element
			contains: function(element){
				var all = this.get();
				return $.grep($(element).get(), function(e){ 
					return $.inArray(e, all) !== -1;
				}).length > 0;
			}
		}
	});

	var arrayFieldPrototype = {
		get: function(index) {
			if(index === undefined){
				var all = [];
				$.each(this, function(i, field) {
					all = all.concat(field.get());
				});
				return all;
			}
			if(index !== 0){
				throw "CoconutError: index can only be 0 under current implementation.";
			}
			if(this.length > 0){
				return this[0].get(0);
			}
		},
		
		state: function(s) {
			if(s === undefined){
				var state = [];
				$.each(this, function(i, field){
					state.push(field.state());
				});
				return state;
			}

			$.each(s, function(i, s){
				if(i < this.length){
					this[i].state(s);
				}
			}.bind(this));
			return this;
		},
		
		clean: function(){
			var deadIndexex = [];
			$.each(this, function(i, field) {
				if(field.clean){
					field.clean();
				}
				if($.dead(field)){
					deadIndexex.push(i);
				}
			});
			deadIndexex.reverse();
			$.each(deadIndexex, function(i, index){
				this.splice(index, 1);
			}.bind(this));
		}
	};
	
	// part field of array type, which may contain an array of other fields.
	// IE does not work with __proto__, so use this unefficent way to extend Array.
	// TODO : improve the efficency
	$.newArrayField = function(){
		var result = new Array();
		
		$.each(arguments, function(i, f){
			result.push(f);
		});
		
		$.extend(result, arrayFieldPrototype);
		return result;
	};

	// extension for jQuery field type of part
	$.fn.extend({
		state: function(s) {
			if (s === undefined) {
				if (this.length === 1) {
					return this.val();
				} else if (this.is(":radio")) {
					var checkedRadio = this.filter(":checked");
					return (checkedRadio.length > 0) ? checkedRadio.val() : null;
				}
			} else if( s !== this.state() ){
				if (this.is(":text, select")) {
					this.focus()
					  .val(s)
					  .change()
					  .blur();
				} else if (this.is(":radio")) {
					if (s === null) {
						this.removeAttr("checked").change();
						var fieldDef = this.data("fieldDef");
						if (fieldDef && fieldDef.onDeselectAll) {
							fieldDef.onDeselectAll();
						}
					} else {
						this.filter("[value=" + s + "]")
						  .click()
						  .change();
					}
				} else {
					this.text(s);
				}
				return this;
			}
		}
	});

	var compare = function(one, another, recursiveCallback){
		for (var p in another) {
			if(another[p] instanceof Object){
				if(!recursiveCallback(one[p], another[p])){
					return false;
				}
			} else if (one[p] !== another[p]) {
				return false;
			}
		}
		return true;
	};
	
	// do value equality check recursively
	// CAUTION: only suitable for tree structured simple object. cycle reference will cause infinite recursion.
	$.objectEqual = function(one, another) {
		if(!one && another){
			return $.objectEmpty(another)? true : false;
		}
		return compare(one, another, $.objectEqual) && compare(another, one, $.objectEqual);
	};
	
	// do value check recursively
	// CAUTION: only suitable for tree structured simple object. cycle reference will cause infinite recursion.
	$.objectContain = function(whole, subset) {
		return compare(whole, subset, $.objectContain);
	};
	
	$.objectEmpty = function(o){
		for(var p in o){
			return false;
		}
		return true;
	}	
	
	$.dead = function(field){
		var all = field.get();
		for(var i = 0; i < all.length; i++){
			var node = all[i];
			while(node){
				if(node.tagName === "BODY"){
					return false;
				}
				node = node.parentNode;
			}
		}
		return true;
	}

})(jQuery);

Function.prototype.bind = function(context) {
	var __method = this;
	return function() {
		return __method.apply(context, arguments);
	};
};
