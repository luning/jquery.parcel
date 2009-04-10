/*!
 * Coconut JavaScript Library v0.0.1
 * http://www.github.com/luning/coconut
 */
 
;(function($) {
	$.extend($.fn, {
		part: function(){
			return new $.part(this);
		}
	});
	
	// constructor for part
	$.part = function(container) {
		this.container = $(container);
		this.fields = {};
		this.init();
	};
	
	$.extend($.part, {
		prototype: {
			init: function(){
				var all = this.container.find(":input");
				all.each(function(i, dom){
					if($.inArray(dom, this.get()) >= 0){
						return;
					}
					var fieldName = dom.name;
					if(this.fields.hasOwnProperty(fieldName)){
						throw "Coconut : field with name [" + fieldName + "] already exist in part.";
					}
					var domWrapper = $(dom);
					this[fieldName] = this.fields[fieldName] = domWrapper.is(":radio") ? this.container.find(":radio[name=" + dom.name + "]") : domWrapper;
				}.bind(this));
			},
			// return all dom elements in all fields
			get: function(){
				var all = [];
				$.each(this.fields, function(n, field) {
					all = all.concat(field.get());
				});
				return all;
			},
			getState: function(){
				var state = {};
				$.each(this.fields, function(fieldName, field){
					state[fieldName] = field.value();
				});
				return state;
			}
		}
	});

})(jQuery);

//
// extension for state aware field type of jQuery, and more
//
$.fn.extend({
	isJQuery: true,

	value: function(v) {
		if (v === undefined) {
			if (this.length === 1) {
				return this.val();
			} else if (this.is(":radio")) {
				var checkedRadio = this.filter(":checked");
				return (checkedRadio.length > 0) ? checkedRadio.val() : null;
			}
		} else if( v !== this.value() ){
			if (this.is(":text, select")) {
				this.focus()
				  .val(v)
				  .change()
				  .blur();
			} else if (this.is(":radio")) {
				if (v === null) {
					this.removeAttr("checked").change();
					var fieldDef = this.data("fieldDef");
					if (fieldDef && fieldDef.onDeselectAll) {
						fieldDef.onDeselectAll();
					}
				} else {
					this.filter("[value=" + v + "]")
					  .click()
					  .change();
				}
			} else {
				this.text(v);
			}
			return this;
		}
	},

	domElements: function() {
		return this.get();
	}
});

//
// extension for custom field
//
StateAware.dressUpField = function(field) {
	if (field.data !== undefined) {
		return;
	}
	
	$.extend(field, {
		_dataStorage: {},
		data: function(key, value) {
			if (value === undefined) {
				return field._dataStorage[key];
			} else {
				field._dataStorage[key] = value;
			}
		}
	});
};

//
// Define this.constructor.name so we can introspect an object for it's constructor's name
// (equivalent to the 'Class' name if there were classes...)
// This is necessary because IE does not define this constructor property but FF does.
//
Function.prototype.getName = function() {
	var matches = this.toString().match(/function\s+([\w\$]+)\s*\(/);
	return matches ? matches[1] : '';
};

Function.prototype.bind = function(context) {
	var __method = this;
	return function() {
		return __method.apply(context, arguments);
	};
};

//
// StateAware:
// container is optional, it's Document if not provided.
//
function StateAware(container) {
	this.fields = {};
	this.initialState = null;
	this.constructor.name = this.constructor.name || this.constructor.getName(); // IE doesn't define constructor.name
	this.container = $(container);
	this.constructor.instance = this;
}

StateAware.prototype = {
	setupModelFields: function(fieldDefs) {
		for (var p in fieldDefs) {
			if (this.hasOwnProperty(p) || this.fields.hasOwnProperty(p)) {
				throw "Coconut: The model field [" + p + "] is already defined in this object";
			}
			this[p] = this.fields[p] = this._buildFieldInstance(fieldDefs[p]);
		}
	},

	setupDerivedFields: function(fieldDefs) {
		for (var p in fieldDefs) {
			if (this.hasOwnProperty(p)) {
				throw "Coconut: The derived field [" + p + "] is already defined in this object";
			}
			this[p] = this._buildFieldInstance(fieldDefs[p]);
		}
	},

	domElements: function() {
		var result = [];
		$.each(this.fields, function(i, field) {
			result = result.concat(field.domElements());
		});
		return $.unique(result);
	},

	hasError: function() {
		return $(".error", this.container).length > 0;
	},

	showHideSection: function(sectionContainer, fieldsToReset, triggerField, showValue) {
		sectionContainer = $(sectionContainer);
		$(triggerField.domElements()).change(function() {
			var shouldShowSection = triggerField.value() === (showValue || "Yes");
			if (shouldShowSection && sectionContainer.is(":hidden")) {
				sectionContainer.slideDown("fast");
			} else if (!shouldShowSection && sectionContainer.is(":visible")) {
				sectionContainer.slideUp("fast");
				this.resetFields(fieldsToReset);
			}
		} .bind(this)).change(); // trigger change handler to setup initial state
	},

	_buildFieldDefinition: function(rawFieldDef) {
		if (rawFieldDef.field) {
			rawFieldDef.type = rawFieldDef.type || "jquery";
			return rawFieldDef;
		}

		var fieldDef = { field: rawFieldDef };
		if (typeof (rawFieldDef) === "string" || rawFieldDef.isJQuery) { // jQuery object or selector
			fieldDef.type = "jquery";
		} else if (rawFieldDef.value) { // fieldDef is not a jQuery nor dom
			fieldDef.type = "custom";
		} else {
			fieldDef.type = "dom";
		}
		return fieldDef;
	},

	//
	// fieldDef = { field:selector or an object with 'val' property }
	//
	_buildFieldInstance: function(rawFieldDef) {
		var fieldDef = this._buildFieldDefinition(rawFieldDef);

		var field;
		switch (fieldDef.type) {
			case "jquery":
				field = (typeof (fieldDef.field) === "string") ? $(fieldDef.field, this.container) : fieldDef.field;
				if (field.length === 0) {
					throw "Coconut: [" + fieldDef.field + "] cannot be found in the DOM";
				}
				break;
			case "custom":
				field = fieldDef.field;
				StateAware.dressUpField(field);
				break;
			case "dom":
				throw "Coconut: DOM type not implemented yet";
				// break;
			default:
				throw "Coconut: Unrecognized field type: " + fieldDef.type;
		}

		field.data("fieldDef", fieldDef);
		return field;
	},

	getState: function() {
		var state = {};
		for (var p in this.fields) {
			state[p] = this.fields[p].value();
		}
		return state;
	},

	setState: function(state, onChangeCompleted) {
		if (!state) {
			throw "Coconut: Invalid state";
		}
		for(var p in this.fields){
		    if(state.hasOwnProperty(p)){
		        this.fields[p].value(state[p]);
		    }
		}
	},

	needsUpdatingWith: function(state) {
		var thisState = this.getState();
		for (var p in thisState) {
			if (state.hasOwnProperty(p) && state[p] !== thisState[p]) {
				return true;
			}
		}
		return false;
	},

	createDerivedField: function(derivedFrom, func) {
		return {
			derivedFrom: derivedFrom,
			value: func.bind(this)
		};
	},

	isDirty: function() {
		var state = this.getState();
		for (var p in this.initialState) {
			if (state[p] !== this.initialState[p]) {
				return true;
			}
		}
		return false;
	},

	// specified observing fields will reflect the values of the original fields
	changes: function(target, fieldMapping, eventType) {
		$.each(fieldMapping, function(sourceFieldName, targetFieldNameOrSelector) {
			// test if it is a derived(calculated) field
			var sourceField = this.fields[sourceFieldName] || this[sourceFieldName];
			var eventSourceField = sourceField.derivedFrom || sourceField;
			var eventSource = $(eventSourceField.domElements());
			// TODO : introduce EmptyPart to remove the if check
			var doUpdate = target ?
					  function() { target.setFieldValue.call(target, targetFieldNameOrSelector, sourceField.value()); }
					: function() { $(targetFieldNameOrSelector).value(sourceField.value()); };

			eventSource.bind(eventType || 'change', doUpdate);
		} .bind(this));
		return this;
	},

	resets: function(target, propertyNames) {
		this.container.bind(this.constructor.name + ".change", function() {
			target.resetFields.call(target, propertyNames);
		});
		return this;
	},

	resetFields: function(propertyNames) {
		var originalState = this._initialStateSubset(propertyNames);
		this.setState(originalState);
	},

	_bindFieldEvent: function(fieldName, fieldEvent, eventsTreatedAsFieldEvent) {
		var constructorName = this.constructor.name;
		var field = this.fields[fieldName];
		var masterEventHandler = function() {
			this.container.trigger(constructorName + "." + fieldEvent);
		} .bind(this);

		var fieldWrapper = $(field.domElements());
		fieldWrapper.bind(fieldEvent, masterEventHandler);
		if (eventsTreatedAsFieldEvent) {
			$.each(eventsTreatedAsFieldEvent, function(i, eventType) {
				fieldWrapper.bind(eventType, masterEventHandler);
			});
		}
	},

	aggregateFieldEvent: function(fieldEvent, eventsTreatedAsFieldEvent) {
		for (var fieldName in this.fields) {
			this._bindFieldEvent(fieldName, fieldEvent, eventsTreatedAsFieldEvent);
		}
	},

	setupInitialState: function() {
		this.initialState = this.getState();
	},

	_initialStateSubset: function(propertyNames) {
		var stateSubset = {};
		$.each(propertyNames, function(i, propertyName) {
			if (this.initialState[propertyName] !== undefined) {
				stateSubset[propertyName] = this.initialState[propertyName];
			}
		} .bind(this));
		return stateSubset;
	},

	setFieldValue: function(fieldName, newValue) {
		var field = this.fields[fieldName] || this[fieldName];
		if (field.value() !== newValue) {
			field.value(newValue);
		}
	}
};
