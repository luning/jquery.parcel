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
    this.captureState();
    this.container.data("linkedPart", this);
  };

  // applied to all field types(jQuery, Array, Part)
  var fieldMixin = {
    // determine if field is still in dom tree
    dead: function(){
      var context = this.container || $(this.get());
      return context.parents().filter("body").length === 0;
    },

    // change of this field will set state of target with the state of this field
    // target - jquery selector, jquery, field or part, which have state() method
    bindState: function(target, converter){
      target = typeof(target) === "string" ? $(target) : target;
      var doChange = function(){
        var s = this.state();
        target.state( converter ? converter(s) : s );
      }.bind(this);

      this.change(doChange);
      doChange();
    }
  };

  // applied to field types except jQuery (because jQuery already has the functionality)
  var fieldMixinEx = {
    // similar as change method of jQuery
    change: function(handler){
      // container - part or array field, efficent and conceptually correct
      // this.get() - array field with no specified container. will not hook to the elements added later.
      var context = this.container || $(this.get());
      context.change(handler);
      return this;
    }
  };

  $.extend($.part.prototype, fieldMixin, fieldMixinEx, {
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

    // sync with dom changes
    sync: function(element){
      if(element === undefined){ // dom removed
        this.clean();
      } else { // dom added
        this._buildFields($(element), true);
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

    // parse fieldtype property specified in dom.
    // format: "type_of_field,container_selector_of_this_field_optional"
    fieldTypeDef: function(element){
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
    
    // field is an object with format: { name: "fieldName", it: theRealField }, theRealField may be jQuery, array or part.
    // all fields are stored in this.fields array, and convenient field accessors on this are assigned if applicable(not conflict with existing property)
    // inferOrder is only for efficency, will add new field to the end of this.fields by default, if not specified. can always be true.
    _addField: function(fieldName, element, inferOrder){
      var field = this._constructField(element);
      var isDirectFieldOfThisPart = true;

      var arrayFieldName = this._plural(fieldName);
      var fieldTypeDef = this.fieldTypeDef(element);

      if(this.has(arrayFieldName, true)){ // add to existing array field
        this.fields[this.index(arrayFieldName)].it.push(field);
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
        var insertIndex = inferOrder ? this._suggestedIndex(field) : this.fields.length;
        this.fields.splice(insertIndex, 0, { name: fieldName, it: field });
      }
    },

    // infer index of given field based on the occurance sequence in dom
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
        }
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

    // remove fields if the corresponding dom element(s) is(are) no longer in dom tree.
    clean: function(){
      var deadFields = [];
      $.each(this.fields, function(n, field) {
        if(field.it.clean){
          field.it.clean();
        }
        if(field.it.dead()){
          deadFields.push(field);
        }
      });
      $.each(deadFields, function(n, deadField){
        for(var i = 0; i < this.fields.length; i++){
          if(this.fields[i] === deadField){
            this.fields.splice(i, 1);
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
        var isArray = this.fields[index].it instanceof Array;
        return arrayOrNot ? isArray : !isArray ;
      }
    },

    // return index of the field
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
        if(!$.isFunction(window[behav])){
          throw "CoconutError: behavior[" + behav + "] is not a global function."
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
        var nextField = this.fields[next];
        this.fields.splice(next, 1);
        this.fields.splice(this.index(arguments[i]) + 1, 0, nextField);
      }
      return this;
    },

    // similar as get method in jQuery
    get: function(index){
      if(index === undefined){
        var all = [];
        $.each(this.fields, function(i, field) {
          all = all.concat(field.it.get());
        });
        return all;
      }

      if(index === 0 && this.fields.length > 0){ // only for the efficiency of getting the first element
          return this.fields[0].it.get(0);
      } else {
        return this.get()[index];
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
    // e.g. resetState("field1", "field2", "field3")
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

    // store current state as initial, used later for state resetting and dirty check
    captureState: function() {
      this.initialState = this.state();
      return this;
    },

    // check is there any diff between current state and the state passed in
    needUpdateWith: function(state) {
      var thisState = this.state();
      for (var fieldName in thisState) {
        if (state.hasOwnProperty(fieldName) && state[fieldName] !== thisState[fieldName]) {
          return true;
        }
      }
      return false;
    },
    
    // check if this part contains any dom in element
    contains: function(element){
      var all = this.get();
      return $.grep($(element).get(), function(e){
        return $.inArray(e, all) !== -1;
      }).length > 0;
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

  // part field of array type, which may contain an array of other fields.
  // IE does not work with __proto__, so use this unefficent way to extend Array.
  // TODO : improve the efficency
  $.newArrayField = function(container){
    var result = [];

    for(var i = 1; i < arguments.length; i++){
      result.push(arguments[i]);
    }

    $.extend(result, arrayFieldPrototype, fieldMixin, fieldMixinEx, {
      container: container
    });
    return result;
  };

  // extension for jQuery field type of part
  $.extend($.fn, fieldMixin, {
    state: function(s) {
      if (s === undefined) {
        if (this.is(":text, select")) {
          return this.val();
        } else if(this.is(":radio")) {
          var checkedRadio = this.filter(":checked");
          return (checkedRadio.length > 0) ? checkedRadio.val() : null;
        } else {
          return this.text();
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
  };

})(jQuery);

Function.prototype.bind = function(context) {
  var method = this;
  return function() {
    return method.apply(context, arguments);
  };
};
