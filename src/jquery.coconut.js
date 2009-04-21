/*
 * Coconut JavaScript Library v0.0.1
 * http://www.github.com/luning/coconut
 */

/* 
  Field is the core concept in Coconut, a field in part can be of type:
    * jQuery: an extended jQuery object of input, select, checkbox, or radios with the same name, ...
    * Array: an extended Array containing other fields.
    * Part: a part can be a field as well
  and
    * Virtual: an extended jQuery object of non inputable dom element, e.g. div or fieldset, it contains other fields and acts like a normal field.
*/ 
 
;(function($) {
  $.fn.extend({
    part: function(behaviour){
      return new $.part(this, behaviour);
    },
    sync: function(){
      return this.trigger("sync");
    },
    linkedPart: function(){
      return this.data("linkedPart");
    }
  });

  // applied to all field types(jQuery, Array, Part and Virtual)
  var commonFieldMixin = {
    // determine if field is still in dom tree
    dead: function(){
      var context = this.container || $(this.get());
      return context.parents().filter("body").length === 0;
    },

    // change of this field will set state of target with the state of this field
    // target - jquery selector, jquery, field or part, which have state() method
    bindState: function(target, converter){
      target = typeof(target) === "string" ? $(target) : target;
      this.stateChange(function(state){
        target.state( converter ? converter(state) : state );
      }).stateChange();
      return this;
    },

    // current state will be passed to handler as the first parameter. 'this' in handler is the source dom element.
    // fire event if no handler
    stateChange: function(handler){
      var self = this;
      this.change(handler ? function(){ handler.apply(this, [self.state()]); } : handler);
      return this;
    },
    
    // change of this field(jQuery, part or array) will show/hide target, which is a jQuery or selector
    showHide: function(target, showUpStateOrCallback, resetStateIfHidden){
      var showUp = $.isFunction(showUpStateOrCallback) ? showUpStateOrCallback : function(state){
          return $.stateContain(state, showUpStateOrCallback);
        };
        
      target = $(target);
      this.stateChange(function(state){
        if(showUp(state)){
          target.show();
        } else {
          target.hide();
          if(resetStateIfHidden){
            target.resetState();
          }
        }
      }).stateChange();
    },
    
    // a field resets it's state, or an arbitrary jQuery object(container) resets states of fields contained by it.
    resetState: function(){
      var part = this.closestPart();
      if(part){
        part.resetState(this);
      }
      return this;
    },
    
    // find closest parent part
    closestPart: function(){
      var all = $(this.get(0)).parents().get();
      for(var i = 0; i < all.length; i++){
        var part = $(all[i]).data("linkedPart");
        if(part){
          return part;
        }
      }
    },	
	
    isDirty: function() {
      return !$.stateEqual(this.initialState(), this.state());
    },
	
    initialState: function(){
      var part = this.closestPart();
      if(part){
        return part.initialState(this);
      }
    }
  };

  // applied to field types except jQuery (because jQuery already has the functionality)
  var nonJQueryFieldMixin = {
    // similar as change method of jQuery
    change: function(handler){
      // container - part or array field, efficent and conceptually correct
      // this.get() - array field with no specified container. will not hook to the elements added later.
      var context = this.container || $(this.get());
      context.change(handler);
      return this;
    }
  };

  // applied to array field only
  var arrayFieldMixin = {
    get: function(index) {
      if(index === undefined){
        var all = [];
        $.each(this, function(i, field) {
          all = all.concat(field.get());
        });
        return all;
      }
      
      if(index === 0 && this.length > 0){ // only for the efficiency of getting the first element
        return this[0].get(0);
      } else {
        return this.get()[index];
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
        if(field.dead()){
          deadIndexex.push(i);
        }
      });
      deadIndexex.reverse();
      $.each(deadIndexex, function(i, index){
        this.splice(index, 1);
      }.bind(this));
    }
  };

  // create an array field
  $.newArrayField = function(container){
    var field = [];
    // initilize this array with implicit parameters
    for(var i = 1; i < arguments.length; i++){
      field.push(arguments[i]);
    }
    // set prototype to [] does not work in IE6, have to use this unefficent way to extend Array.
    return $.extend(field, commonFieldMixin, nonJQueryFieldMixin, arrayFieldMixin, {
      container: container
    });
  };

  // extend jQuery for jQuery field and Virtual field
  $.extend($.fn, commonFieldMixin, {
    state: function(s) {
      if (s === undefined) {
        if(this.is("div, fieldset")){
          var part = this.closestPart();
          if(part){
            return part.getState(this);
          } else {
            return this.val();
          }
        } else if (this.is(":text, select")) {
          return this.val();
        } else if(this.is(":radio")) {
          var checkedRadio = this.filter(":checked");
          return (checkedRadio.length > 0) ? checkedRadio.val() : null;
        } else {
          return this.text();
        }
      } else {
        if(this.is("div, fieldset")){
          var part = this.closestPart();
          if(part){
            part.setState(s, this);
          } else {
            this.val(s);
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
            } else {
              this.filter("[value=" + s + "]")
                .click()
                .change();
            }
          } else {
            this.text(s);
          }
        }
        return this;
      }
    }
  });

  // constructor for part
  $.part = function(container, behaviour) {
    this.container = $(container);
    this._initialState = {};
    this._fields = [];

    this.init();
    this.addBehaviour(behaviour);
    this.captureState();
    this.container.data("linkedPart", this);
  };

  $.extend($.part.prototype, commonFieldMixin, nonJQueryFieldMixin, {
    FIELD_SELECTOR: ":input, [part], [part=]",

    init: function(){
      this.container.bind("sync", function(event){
        event.stopPropagation();
        this.sync(event.target);
      }.bind(this));

      this._buildFields(this.container);
      this._buildContainers(this.container);
    },
    
    // sync with dom changes
    sync: function(dom){
      if(dom === undefined){ // dom removed
        this.clean();
      } else { // dom added
        this._buildFields($(dom), true);
      }
    },

    // remove fields if the corresponding dom element(s) is(are) no longer in dom tree.
    clean: function(){
      var deadFields = [];
      $.each(this._fields, function(n, field) {
        if(field.it.clean){
          field.it.clean();
        }
        if(field.it.dead()){
          deadFields.push(field);
        }
      });
      $.each(deadFields, function(n, deadField){
        for(var i = 0; i < this._fields.length; i++){
          if(this._fields[i] === deadField){
            this._fields.splice(i, 1);
            if(this[deadField.name] === deadField.it){
              delete this[deadField.name];
            }
            break;
          }
        }
      }.bind(this));
    },

    // return true if the field is defined by this part
    has: function(fieldName, arrayOrNot){
      var index = this.index(fieldName);
      if(index === -1){
        return false;
      } else if (arrayOrNot === undefined) {
        return true;
      } else {
        var isArray = this._fields[index].it instanceof Array;
        return arrayOrNot ? isArray : !isArray;
      }
    },
   
    // return index of the field
    index: function(fieldName) {
      for(var i = 0; i < this._fields.length; i++){
        if(this._fields[i].name === fieldName){
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
        if(!$.isFunction(window[behav])){
          throw "CoconutError: behavior[" + behav + "] is not a global function.";
        }
        behaviour = window[behav];
      }
      behaviour.call(this);
      // TODO : mixin behaviour this way lose the efficiency of prototype.
      // properties defined on this may be overwriten ON PURPOSE
      $.extend(this, behaviour.prototype);
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
          throw "CoconutError: field with name [" + fieldName + "] already exist in part.";
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
        var nextField = this._fields[next];
        this._fields.splice(next, 1);
        this._fields.splice(this.index(arguments[i]) + 1, 0, nextField);
      }
      return this;
    },

    // similar as get method in jQuery
    get: function(index){
      if(index === undefined){
        var all = [];
        $.each(this._fields, function(i, field) {
          all = all.concat(field.it.get());
        });
        return all;
      }

      if(index === 0 && this._fields.length > 0){ // only for the efficiency of getting the first element
          return this._fields[0].it.get(0);
      } else {
        return this.get()[index];
      }
    },

    state: function(s){
      if(s === undefined){
        return this.getState();
      }
      this.setState(s);
      return this;
    },
    
    getState: function(context){
      var state = {};
      $.each(this._findFields(context), function(i, field){
        state[field.name] = field.it.state();
      });
      return state;
    },
    
    setState: function(s, context){
      $.each(this._findFields(context), function(i, field){
        if(s.hasOwnProperty(field.name)){
          field.it.state(s[field.name]);
        }
      });
      return this;
    },
    
    initialState: function(context){
      var targetState = {};
      var targetFields = this._findFields(context);
      $.each(targetFields, function(i, field){
        if(this._initialState.hasOwnProperty(field.name)){
          targetState[field.name] = this._initialState[field.name];
        }
      }.bind(this));
      
      if(targetFields.length === 1 && this._contextMatchField(context, targetFields[0].it)){
        return $.cloneState(targetState[targetFields[0].name]);
      } else {
        return $.cloneState(targetState);
      }
    },

    // optional parameter : fieldNames or container jQuery object(fields contained by it will be reset) or any type of field.
    // e.g. resetState("field1", "field2", "field3"), resetState($("#dome_div_id")), resetState(part.field)
    resetState: function() {
      if(arguments.length === 0){ // reset all
        this.state(this._initialState);
        return this;
      }
      
      var fieldNames = arguments;
      if(arguments.length === 1 && typeof(arguments[0]) !== "string"){ // a context(a field or a jQuery container)
        fieldNames = this._findFieldNames(arguments[0]);
      }

      var newState = {};
      $.each(fieldNames, function(i, fieldName){
        if(!this._initialState.hasOwnProperty(fieldName)){
          throw "CoconutError: reset state with invalid field name.";
        }
        newState[fieldName] = this._initialState[fieldName];
      }.bind(this));

      this.state(newState);
      return this;
    },

    // store current state as initial, used later for state resetting and dirty check
    captureState: function() {
      this._initialState = this.state();
      return this;
    },
    
    // check if this part contains any dom in element
    contains: function(element){
      var all = this.get();
      return $.grep($(element).get(), function(dom){
        return $.indexInArray(dom, all) !== -1;
      }).length > 0;
    },
        
    // find names of fields in context
    _findFieldNames: function(context){
      return $.map(this._findFields(context), function(field){
        return field.name;
      });
    },

    // find fields in context
    _findFields: function(context){
      if(context){
        var contextDom = this._primaryDomOf(context);
        return $(this._fields).filter(function(){
          var parents = $(this.it.get(0)).parents().andSelf();
          return $.indexInArray(contextDom, parents) >= 0;
        }).get();
      } else {
        return $.makeArray(this._fields);
      }
    },

    // parse fieldtype property specified in dom.
    // format: "type_of_field,container_selector_of_this_field_optional"
    _fieldTypeDef: function(element){
      var def = element.attr("fieldtype");
      if(!def){
        return {};
      }

      var match = def.match(/^\s*([A-Za-z]+)\s*,?\s*(.*)$/);
      if(!match){
        return {};
      } else {
        var container;
        if(match[2]){
          var containerDom = element.closest(match[2])[0];
          if(!containerDom){
            throw "CoconutError: parent container selector [" + match[2] + "] specified in 'fieldtype' property in dom matchs nothing.";
          }
          container = $(containerDom);
        }
        return {
          type: match[1],
          container: container
        };
      }
    },

    // construct field for jQuery element
    _constructField: function(element) {
      if(element.attr("part") !== undefined) {
        return element.part();
      } else if (element.is(":radio")) {
        return this.container.find(":radio[name=" + element.attr("name") + "]");
      } else {
        return element;
      }
    },
    
    // field is an object with format: { name: "fieldName", it: theRealField }, theRealField may be jQuery, array or part.
    // all fields are stored in this._fields array, and convenient field accessors on this are assigned if applicable(not conflict with existing property)
    // inferOrder is only for efficency, will add new field to the end of this._fields by default, if not specified. can always be true.
    _addField: function(fieldName, element, inferOrder){
      var field = this._constructField(element);
      var isDirectFieldOfThisPart = true;

      var arrayFieldName = this._plural(fieldName);
      var fieldTypeDef = this._fieldTypeDef(element);

      if(this.has(arrayFieldName, true)){ // add to existing array field
        this._fields[this.index(arrayFieldName)].it.push(field);
        isDirectFieldOfThisPart = false;
      } else if (fieldTypeDef.type === "array") { // create new array field
        if(this.has(arrayFieldName)){
          throw "CoconutError: nonarray field [" + arrayFieldName + "] already exists, failed to create array field.";
        }
        fieldName = arrayFieldName;
        field = $.newArrayField(fieldTypeDef.container, field);
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
        var insertIndex = inferOrder ? this._suggestedIndex(field) : this._fields.length;
        this._fields.splice(insertIndex, 0, { name: fieldName, it: field });
      }
    },

    // infer index of given field based on the occurance sequence in dom
    _suggestedIndex: function(field){
      var all = this.container.find(this.FIELD_SELECTOR);
      var posOfField = $.indexInArray(field.get(0), all);

      var index = 0;
      for(; index < this._fields.length; index++){
        var pos = all.index(this._fields[index].it.get(0));
        if(pos > posOfField){
          break;
        }
      }
      return index;
    },

    // used to determine array field name from name of sub-field
    // TODO : far from mature, just for simplest cases
    _plural: function(noun){
      // e.g "hobby" -> "hobbies"
      if(noun.charAt(noun.length - 1) === 'y'){
        return noun.substr(0, noun.length - 1) + "ies";
      }
      // e.g "contact" -> "contacts"
      return noun + "s";
    },

    _buildContainers: function(context){
      var all = this._matchedInContext(context, "[fieldtype=virtual]");
      all.each(function(i, dom){
        var container = $(dom);
        var containerName = this._name(container);
        if(!containerName){
          throw "CoconutError: failed to determine the name of grouping container.";
        }
        if(containerName in this){
          throw "CoconutError: container [" + containerName + "] has name conflict with existing property of part.";
        }
        this[containerName] = container;
      }.bind(this));
    },
    
    _matchedInContext: function(context, matcher){
      return context.filter(matcher)
            .add(context.find(matcher))
            .not(this.container);    
    },

    _buildFields: function(context, inferOrder){
      var all = this._matchedInContext(context, this.FIELD_SELECTOR);
      all.each(function(i, dom){
        if(this.contains(dom)){
          return;
        }
        var element = $(dom);
        var fieldName = this._name(element);
        if(!fieldName){
          return; // ignore this dom element
        }
        this._addField(fieldName, element, inferOrder);
      }.bind(this));
    },

    // infer a name for element
    _name: function(element){
      return element.attr("fieldname") || element.attr("name") || element.attr("id");
    },
    
    // check if the context if for a non-virtual field
    _contextMatchField: function(context, field){
      // compare Dom with ==, === does not work in IE6
      return context && this._primaryDomOf(context) == this._primaryDomOf(field);
    },
    
    _primaryDomOf: function(context){
      return (context.container || context).get(0);
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

  // do state equality check recursively
  // CAUTION: only for state object, not supposed to work with circular referenced object.
  $.stateEqual = function(one, another) {
    return $.stateContain(one, another) && $.stateContain(another, one);
  };

  // do state check recursively
  // CAUTION: only for state object, not supposed to work with circular referenced object.
  $.stateContain = function(whole, subset) {
    if(!whole && subset){
      return $.stateEmpty(subset)? true : false;
    }
    if(typeof(whole) !== "object" || typeof(subset) !== "object"){
      return whole === subset;
    }
    return compare(whole, subset, $.stateContain);
  };

  // return true if no direct property defined in object
  $.stateEmpty = function(o){
    for(var p in o){
      return false;
    }
    return true;
  };
  
  // do deep clone of state
  $.cloneState = function(s){
    if(!s || typeof(s) === "string" || typeof(s) === "number"){
      return s;
    } else if(s instanceof Array){
      return $.extend(true, [], s);
    } else {
      return $.extend(true, {}, s);
    }
  };
  
  // get index of dom in a dom array(can be jQuery object)
  $.indexInArray = function(item, array){
    if($.browser.msie){ // in IE6, === will return false even when comparing the same dom, use == instead.
      for(var i = 0; i < array.length; i++){
        if(array[i] == item){
          return i;
        }
      }
      return -1;
    } else {
      return $.inArray(item, array);
    }
  };

})(jQuery);

Function.prototype.bind = function(context) {
  var method = this;
  return function() {
    return method.apply(context, arguments);
  };
};
