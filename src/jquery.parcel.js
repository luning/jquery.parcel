/*
 * jquery.parcel JavaScript Library v0.0.1
 * http://www.github.com/luning/jquery.parcel
 */

/* 
  Field is the core concept in jquery.parcel.
  A field is an extended jQuery object, conceptually can be:
    - Parcel, containing fields with different name
    - Array Parcel, containing sub fields with same name
    - normal jQuery object, representing any input in DOM
    - Virtual field, which is an arbitrary jQuery object under a parcel and covers many other fields.
*/ 
 
;(function($) {
  $.fn.extend({
    parcel: function(){
      if(this.length > 1){
        var args = arguments;
        return $.map(this, function(dom){
          return $.fn.parcel.apply($(dom), args);
        });
      }

      var existParcel = this.getParcel();
      if(existParcel){
        return existParcel;
      }
      
      $.extend(this, $.parcel.prototype);
      $.parcel.apply(this, arguments);
      return this.data("parcel", this);
    },
    
    sync: function(){
      return this.trigger("sync");
    },
    
    getParcel: function(){
      return this.data("parcel");
    }
  });

  // applied to all field types(jQuery, Parcel, ArrayParcel and Virtual)
  var commonFieldMixin = {
    // determine if field is still in dom tree
    dead: function(){
      return $(this.get(0)).parents().filter("body").length === 0;
    },

    // change of this field will set state of target with the state of this field
    // target - jquery selector or a field
    bindState: function(target, converter){
      target = typeof(target) === "string" ? $(target) : target;
      this.stateChange(function(e){
        var s = e.field.state();
        target.state( converter ? converter(s) : s );
      }).stateChange();
      return this;
    },

    /*
      current state will be passed to handler as the first parameter. 'this' in handler is the target DOM element.
      fire event if no handler provided.
      includingClickInIE: internal used while setting handler, 'true' will fire event on clicking radio/checkbox in IE even when the real state is not changed.
                          change event of radio/checkbox in IE is fired after losing focus, borrow click event as a workaround of potential timing issue.
    */
    stateChange: function(handler, includingClickInIE){
      var self = this;
      var newHandler = function(e){
        if(!$(e.target).parcelIgnored()) {
          e.field = self;
          handler.apply(this, [e]); 
        }
      };
      
      this.change(handler ? newHandler : undefined);
      
      if(includingClickInIE && $.browser.msie && handler){
        this.click(function(e){
          var t = e.target.type;
          if(t === "radio" || t === "checkbox"){
            newHandler.apply(this, [e]);
          }
        });
      }      
      return this;
    },
    
    parcelIgnored: function(){
      return this.is("[parcelignored],[parcelignored=],[parcelignored] *,[parcelignored=] *");
    },
    
    /*
      change of this field will show/hide target, which is a jQuery selector or a field
      in IE, checkbox/radio become checked after click event handler on it is executed, then handler in parent gets executed.
      so, showHide on checkbox/radio will not reflect corrent state in handler, call showHide on parent as a workaround.
      radio.showHide(target, "Yes") => parent.showHide(target, {radio: "Yes"})
    */
    showHide: function(target, showUpStateOrCallback, resetStateIfHidden){
      var showUp = $.isFunction(showUpStateOrCallback) ? showUpStateOrCallback : function(state){
          return $.stateContain(state, showUpStateOrCallback);
        };
        
      target = $(target);
      var handler = function(e){
        //alert($.print(e.field.closestParcel().state()));
        if(showUp(e.field.state())){
          target.show();
        } else {
          target.hide();
          if(resetStateIfHidden){
            target.resetState();
          }
        }
      };
      
      this.stateChange(handler, true).stateChange();
      return this;
    },
    
    resetState: function(){
      this.state(this.defaultState());
      return this;
    },
    
    // find closest parent parcel including itself
    closestParcel: function(){
      var parents = this.add(this.parents());
      for(var i = 0; i < parents.length; i++){
        var parcel = $(parents[i]).getParcel();
        if(parcel){
          return parcel;
        }
      }
    },	
	
    isDirty: function() {
      return !$.stateEqual(this.initialState(), this.state());
    },
	
    revertState: function(){
      this.state(this.initialState());
      return this;
    },

    initialState: function(){
      var parcel = this.closestParcel();
      if(parcel){
        return parcel.initialState(this);
      }
    },
    
    fieldDom: function(){
      return this.get();
    },
        
    // remove DOM(s) and corresponding field(s)
    removeMe: function(){
      var parcel = this.closestParcel();
      this.remove();
      if(parcel){
        parcel.sync();
      }
    },
    
    // fire change event after removal
    _removed: function(){
      var originalParents = this.get(0)._parentsSnap;
      if(originalParents){
        var closestAliveParent = $.first(originalParents, function(i, p){ return !$(p).dead(); });
        $(closestAliveParent).change();
      }
      return this;
    }
  };

  var defaultStrategy = {
    match: function(){ return true; },
    get: function(){ return this.text(); },
    set: function(s){ this.text(s); },
    getDefault: function() { return this.attr("default") !== undefined ? this.attr("default") : ""; },
    setDefault: function(s) { this.attr("default", s); }
  };

  var elementStrategies = [
  // for div and fieldset
  {
    ignoreEqualCheck: true,
    match: function(){ return $.hasTag(this, "div", "fieldset"); },
    get: function(){
      var parcel = this.closestParcel();
      if(parcel){
        return parcel.getState(this);
      }
      return this.val();
    },
    set: function(s){
      var parcel = this.closestParcel();
      if(parcel){
        parcel.setState(s, this);
      } else {
        this.val(s);
      }
    },
    getDefault: function(){
      var parcel = this.closestParcel();
      if(parcel){ return parcel.getDefaultState(this); }
    },
    setDefault: function(s){
      var parcel = this.closestParcel();
      if(parcel){ parcel.setDefaultState(s, this); }
    }
  },
  // for text input
  {
    match: function(){ return $.hasType(this, "text"); },
    get: function(){ return this.val(); },
    set: function(s){
      this.focus()
          .val(s)
          .triggerNative("change")
          .blur();
    },
    getDefault: defaultStrategy.getDefault,
    setDefault: defaultStrategy.setDefault
  },
  // for select
  {
    match: function(){ return $.hasTag(this, "select"); },
    get: function(){ return this.val(); },
    set: function(s){
      this.focus()
          .val(s)
          .triggerNative("change")
          .blur();
    },
    getDefault: function(){
      if(this.attr("default") !== undefined){
        return this.attr("default");
      }
      var theDefault = this.find("option").filter(function(){ return this.defaultSelected; });
      return theDefault.length === 0 ? null : theDefault.val();
    },
    setDefault: defaultStrategy.setDefault
  },
  // for radio
  {
    match: function(){ return $.hasType(this, "radio"); },
    get: function(){
      var checkedRadio = this.filter(":checked");
      return (checkedRadio.length > 0) ? checkedRadio.val() : null;
    },
    set: function(s){
      if (s === null) {
        this.filter("[checked]")
          .removeAttr("checked")
          .triggerNative("change");
      } else {
        this.filter("[value=" + s + "]")
          .click()
          .triggerNative("change");
      }
    },
    getDefault: function(){
      var theDefault = this.filter(function(){
        return $(this).attr("default") !== undefined;
      });
      if(theDefault.length === 0){
        theDefault = this.filter(function(){
          return this.defaultChecked;
        });
      }
      return theDefault.length === 0 ? null : theDefault.val();
    },
    setDefault: function(s){
      this.removeAttr("default").filter("[value=" + s + "]").attr("default", true);
    }
  },
  // for checkbox
  {
    match: function(){ return $.hasType(this, "checkbox"); },
    get: function(){
      return $.map(this.filter(":checked"), function(dom){ return dom.value; });
    },
    set: function(s){
      if(!$.isArray(s)){
        throw "ParcelError: set checkbox with invalid state [" + s + "]";
      }
      this.each(function(i, dom){
        if($.xor($.inArray(dom.value, s) !== -1, dom.checked)){
          $(dom)
           .click()
           .triggerNative("change");
        }
      });
    },
    getDefault: function(){
      var theDefault = $.grep(this, function(dom){
        return $(dom).attr("default") !== undefined;
      });
      if(theDefault.length === 0){
        theDefault = $.grep(this, function(dom){
          return dom.defaultChecked;
        });
      }
      return $.map(theDefault, function(dom){
        return dom.value;
      });
    },
    setDefault: function(s){
      if(!$.isArray(s)){
        throw "ParcelError: set checkbox with invalid default state [" + s + "]";
      }
      this.removeAttr("default");
      $.each(s, function(i, v){
        this.filter("[value=" + v + "]").attr("default", true);
      }.bind(this));
    }
  },
  // for all other input types
  defaultStrategy];

  // extend jQuery for jQuery field and Virtual field
  $.extend($.fn, commonFieldMixin, {
    state: function(s) {
      var matched = $.first(elementStrategies, function(i, elem){
                                            return elem.match.call(this);
                                          }.bind(this));

      if(s === undefined) {
        return matched.get.call(this);
      } else {
        if(matched.ignoreEqualCheck){
          matched.set.call(this, s);
        } else if (!$.stateEqual(s, this.state())){
          matched.set.call(this, s);
        }
        return this;
      }
    },

    defaultState: function(s){
      var matched = $.first(elementStrategies, function(i, elem){
                                            return elem.match.call(this);
                                          }.bind(this));

      if(s === undefined){
        return matched.getDefault.call(this);
      } else {
        matched.setDefault.call(this, s);
        return this;
      }
    },

    // trigger event with browser native behaviour, e.g. change does not bubble up in IE, but firefox does.
    triggerNative: function(event) {
      this.each(function(){
        if ($.browser.msie) {
          this.fireEvent("on" + event);
        } else {
          var e = document.createEvent("HTMLEvents");
          e.initEvent(event, true, true);
          this.dispatchEvent(e);
        }
      });
      return this;
    },
    // ensure change event will bubble up DOM tree, this is necessary for live event or event delegation
    ensureBubbleOnChange: function(){
      if(!$.support.bubbleOnChange){ 
        var all = this.find(":input").add(this.filter(":input"));
        all.each(function(i, dom){
          var elem = $(dom);
          // do this only once for the same DOM element
          if(!elem.data("bubbleOnChange")){
            elem.data("bubbleOnChange", true);
            elem.change(function(e){
              // only need to simulate bubbling for real user interaction, event will bubble up if triggered by jQuery trigger() method.
              if(e.hasOwnProperty("altKey")){ 
                // clone the event passed in
                var event = $.extend(true, {}, e);
                $.event.trigger(event, [event], this.parentNode || this.ownerDocument, true);
              }
            });
          }
        });
      }
      return this;
    },
    
    _preparingAsField: function(){
      return this.ensureBubbleOnChange()._snapParents();
    },

    // snap parent list, just for fire change event on proper original parent DOM after dynamicly removing a DOM
    _snapParents: function(){
      this.each(function(){
        this._parentsSnap = $(this).parents().get();
      });
      return this;
    }
  });

  // constructor for Parcel or Array Parcel
  $.parcel = function() {
    var behaviour = arguments[0], state = arguments[1];
    if(typeof behaviour !== "function"){
      behaviour = undefined;
      state = arguments[0];
    }
  
    this._nameConstraint = this._parseNameConstraint();
    this._behaviour = behaviour || this._parseBehaviour() || function(){ };
    this._initialState = state || (this._nameConstraint ? [] : {});
    this.items = this._fields = [];

    this._init();
    this.applyBehaviour(this._behaviour);
    this.state(this._initialState);
    this.captureState();
  };

  $.extend($.parcel.prototype, commonFieldMixin, {
    // TODO : consider short selector for potential better performance by sacrificing some flexibility
    FIELD_SELECTOR: ":input:not([parcelignored],[parcelignored=],[parcelignored] *,[parcelignored=] *),[parcel]:not([parcelignored],[parcelignored=],[parcelignored] *,[parcelignored=] *),[parcel=]:not([parcelignored],[parcelignored=],[parcelignored] *,[parcelignored=] *)",
    
    _parseNameConstraint: function(){
      var def, match;
      if((def = this.attr("parcel")) && (match = def.match(/\[(\w+)\]/))){
        return match[1];
      }
    },
    
    _parseBehaviour: function(){
      var behav, def, match;
      if((def = this.attr("parcel")) && (match = def.match(/^(\w+)|,(\w+)/)) && (behav = match[1] || match[2])){
        if(!$.isFunction(window[behav])){
          throw "ParcelError: behavior [" + behav + "] should be a global function.";
        }
        return window[behav];
      }
    },
    
    _init: function(){
      this.bind("sync", function(event){
        event.stopPropagation();
        this.sync(event.target);
      }.bind(this));

      this._buildFields(this);
      this._buildVirtualFields(this);
    },
    
    // sync with DOM changes
    sync: function(dom){
      if(dom === undefined){ // DOM removed
        this.clean();
      } else { // DOM added
        var elem = $(dom);
        this._buildFields(elem, true);
        elem.change();
      }
    },

    // remove fields if the corresponding DOM element(s) is(are) no longer in DOM tree.
    clean: function(){
      var deadFields = [];
      $.each(this._fields, function(n, field) {
        if(field.clean){
          field.clean();
        }
        if(field.dead()){
          deadFields.push(field);
        }
      });
      $.each(deadFields, function(n, deadField){
        for(var i = 0; i < this._fields.length; i++){
          if(this._fields[i] === deadField){
            this._fields.splice(i, 1);
            if(this[deadField.fname] === deadField){
              delete this[deadField.fname];
            }
            deadField._removed();
            break;
          }
        }
      }.bind(this));
    },

    // parameter field could be name or object
    hasField: function(field){
      return this.fieldIndex(field) >= 0;
    },
   
    // parameter field could be name or object
    fieldIndex: function(field) {
      for(var i = 0; i < this._fields.length; i++){
        var curField = typeof(field) === "string" ? this._fields[i].fname : this._fields[i];
        if(curField === field){
          return i;
        }
      }
      return -1;
    },

    applyBehaviour: function(behaviour){
      behaviour.apply(this);
      // TODO : mixin behaviour this way lose the efficiency of prototype. properties defined on this may be overwriten ON PURPOSE.
      $.extend(this, behaviour.prototype);
      return this;
    },
    // fieldDefs = { fieldName1: "selector1", fieldName2: "selector2" }, fields are ordered.
    // TODO: this method is not useful, consider to remove it.
    addFields: function(fieldDefs){
      $.each(fieldDefs, function(fname, selector){
        var elem = this.find(selector);
        if(elem.length === 0){
          throw "ParcelError: can not find [" + selector + "] in container.";
        }
        if(this.contains(elem)){
          throw "ParcelError: field for [" + selector + "] is already defined.";
        }
        if(this._nameConstraint && this._nameConstraint !== fname){
          throw "ParcelError: field with name [" + fname + "] does not match the name constraint [" + this._nameConstraint + "].";
        }
        if(!this._nameConstraint && this.hasField(fname)){
          throw "ParcelError: field with name [" + fname + "] already exist in parcel.";
        }
        this._addField(fname, elem);
      }.bind(this));
    },

    // orderFields("fieldName1", "fieldName2", ... ,"fieldNameN"), pass in only the fields need order ensurance.
    orderFields: function(){
      for(var i = 0; i < arguments.length - 1; i++){
        var cur = this.fieldIndex(arguments[i]);
        var next = this.fieldIndex(arguments[i + 1]);
        if(cur === -1 || next === -1){
          throw "ParcelError: field [" + arguments[i] + "] or [" + arguments[i + 1] + "] does not exist.";
        }
        if(cur < next){
          continue;
        }
        var nextField = this._fields[next];
        this._fields.splice(next, 1);
        this._fields.splice(this.fieldIndex(arguments[i]) + 1, 0, nextField);
      }
      return this;
    },

    // get all field DOM including container DOM for Parcel or Array Parcel
    fieldDom: function(){
      var all = this.get();
      $.each(this._fields, function(i, field) {
        all = all.concat(field.fieldDom());
      });
      return all;
    },

    state: function(s){
      return s === undefined ? this.getState() : this.setState(s);
    },
    
    getState: function(context){
      return this._stateGetActionOnFields("state", context);
    },
    
    setState: function(s, context){
      return this._stateSetActionOnFields(s, "state", context);
    },
    
    initialState: function(context){
      var fields = this._fieldsIn(context);
      var contextIsField = (fields.length === 1) && this._contextIsField(context, fields[0]);
      var state;
      if(this._nameConstraint){
        state = $.map(fields, function(field){
          return this._initialState[this.fieldIndex(field)]; 
        }.bind(this));

        return contextIsField ? state[0] : state;
      } else {
        state = {};
        $.each(fields, function(i, field){
          if(this._initialState.hasOwnProperty(field.fname)){
            state[field.fname] = this._initialState[field.fname];
          }
        }.bind(this));
        
        return contextIsField ? $.cloneState(state[fields[0].fname]) : $.cloneState(state);
      }
    },

    // store current state as initial, used later for state reverting
    captureState: function() {
      this._initialState = this.state();
      return this;
    },
    
    defaultState: function(s){
      return s === undefined ? this.getDefaultState() : this.setDefaultState(s);
    },

    getDefaultState: function(context){
      return this._stateGetActionOnFields("defaultState", context);
    },

    _stateGetActionOnFields: function(fieldMethod, context){
      var fields = this._fieldsIn(context);
      
      if(this._nameConstraint){
        return $.map(fields, function(field){
          return field[fieldMethod](); 
        });
      } else {
        var state = {};
        $.each(fields, function(i, field){
          state[field.fname] = field[fieldMethod]();
        });
        return state;
      }
    },

    setDefaultState: function(s, context){
      return this._stateSetActionOnFields(s, "defaultState", context);
    },
    
    // call field method for every matched sub-state
    _stateSetActionOnFields: function(state, fieldMethod, context){
      var fields = this._fieldsIn(context);
      if(this._nameConstraint){
        $.each(state, function(i, curState){
          if(i < fields.length){
            fields[i][fieldMethod](curState);
          }
        });
      } else {
        $.each(fields, function(i, field){
          if(state.hasOwnProperty(field.fname)){
            field[fieldMethod](state[field.fname]);
          }
        });
      }
      return this;
    },

    // check if this parcel contains any DOM in element
    contains: function(elem){
      var all = this.fieldDom();
      return !!$.first($(elem).get(), function(i, dom){
        return $.indexInArray(dom, all) !== -1;
      });
    },

    // find fields in context
    _fieldsIn: function(context){
      if(context){
        var contextDom = context.get(0);
        return $(this._fields).filter(function(){
          var parents = $(this.get(0)).parents().andSelf();
          return $.indexInArray(contextDom, parents) >= 0;
        }).get();
      } else {
        // return cloned array
        return this._fields.slice();
      }
    },

    // construct field for jQuery element
    _constructField: function(elem) {
      if(elem.is("[parcel],[parcel=]")) {
        return elem.parcel();
      } else if (elem.is(":radio")) {
        return this.find(":radio[name=" + elem.attr("name") + "]")._preparingAsField();
      } else if (elem.is(":checkbox")) {
        return this.find(":checkbox[name=" + elem.attr("name") + "]")._preparingAsField();
      } else {
        return elem._preparingAsField();
      }
    },
    
    // all fields are stored in this._fields array, and convenient field accessors on this are assigned if applicable(not conflict with existing property)
    // inferOrder is only for efficency, will add new field to the end of this._fields by default, if not specified. can always be true.
    _addField: function(fname, elem, inferOrder){
      var field = this._constructField(elem);
      field.fname = fname;

      if (!this._nameConstraint){
        if(this.hasField(fname)){
          throw "ParcelError: field with name [" + fname + "] already exists.";
        }
        if(!(fname in this)){
          this[fname] = field;
        }
      }

      var insertIndex = inferOrder ? this._suggestedIndex(field) : this._fields.length;
      this._fields.splice(insertIndex, 0, field);
    },

    // infer index of given field based on the occurance sequence in DOM
    _suggestedIndex: function(field){
      var all = this.find(this.FIELD_SELECTOR);
      var posOfField = $.indexInArray(field.get(0), all);

      var index = 0;
      for(; index < this._fields.length; index++){
        var pos = $.indexInArray(this._fields[index].get(0), all);
        if(pos > posOfField){
          break;
        }
      }
      return index;
    },

    _buildVirtualFields: function(context){
      var all = this._selectInContext(context, "[virtualfield],[virtualfield=]");
      all.each(function(i, dom){
        var virtual = $(dom);
        var fname = this._name(virtual);
        if(!fname){
          throw "ParcelError: failed to determine the name of virtual field.";
        }
        if(fname in this){
          throw "ParcelError: virtual field [" + fname + "] has name conflict with existing property of parcel.";
        }
        this[fname] = virtual;
      }.bind(this));
    },
    
    _selectInContext: function(context, selector){
      return context.filter(selector)
            .add(context.find(selector))
            .not(this);    
    },

    _buildFields: function(context, inferOrder){
      var all = this._selectInContext(context, this.FIELD_SELECTOR);
      all.each(function(i, dom){
        if(this.contains(dom)){
          return;
        }
        var elem = $(dom);
        var fname = this._name(elem);
        if(!fname || (this._nameConstraint && this._nameConstraint !== fname)){
          return; // ignore this element
        }
        this._addField(fname, elem, inferOrder);
      }.bind(this));
    },

    // infer a name for element
    _name: function(elem){
      return elem.attr("fieldname") || elem.attr("name") || elem.attr("id");
    },
    
    // check if the context is for a non-virtual field
    _contextIsField: function(context, field){
      // compare DOM with ==, === SOMETIME does not work in IE
      return context && context.get(0) == field.get(0);
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
  
  // get index of DOM in a DOM array(can be jQuery object)
  $.indexInArray = function(item, array){
    if($.support.trippleEqualOnDom){
      return $.inArray(item, array);
    } else {
      for(var i = 0; i < array.length; i++){
        if(array[i] == item){
          return i;
        }
      }
      return -1;
    }
  };
  
  // find the first item in array that matchs the filter fn.
  $.first = function(array, fn){
    for(var i = 0; i < array.length; i++){
      if(fn.call(array[i], i, array[i])){
        return array[i];
      }
    }
  };
  
  $.xor = function(a, b){
    return (a? 1:0) ^ (b? 1:0);
  };
  
  $.hasTag = function(elem){
    return $.inArray(elem[0].tagName.toLowerCase(), Array.prototype.slice.call(arguments, 1)) !== -1;
  };

  $.hasType = function(elem){
    return elem[0].tagName.toLowerCase() === "input" &&
          $.inArray(elem[0].type, Array.prototype.slice.call(arguments, 1)) !== -1;
  };

  // change event in IE doesn't bubble.
  $.support.bubbleOnChange = !$.browser.msie;
  // in IE, === will return false SOMETIME even when comparing the same DOM, use == instead.
  $.support.trippleEqualOnDom = !$.browser.msie;
})(jQuery);

if(!Function.prototype.bind){
  Function.prototype.bind = function(context) {
    var method = this;
    return function() {
      return method.apply(context, arguments);
    };
  };
}
