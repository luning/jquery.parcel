﻿/*
* jQuery.parcel JavaScript Library v0.1
* http://www.github.com/luning/jquery.parcel
*/

/*
Field is the core concept in jquery.parcel.
A field is a jQuery object(extended), and conceptually can be:
- a parcel, containing fields with different name.
- an array parcel, containing sub fields with same name.
- a normal jQuery object, representing single input or input group in DOM.
- a virtual field, which is any jQuery object(div, fieldset) containing other fields.
*/

; (function($) {
  $.fn.extend({
    parcel: function() {
      if (this.length > 1) {
        var args = arguments;
        return $.map(this, function(dom) {
          return $.fn.parcel.apply($(dom), args);
        });
      }

      var existParcel = this.getParcel();
      if (existParcel) {
        return existParcel;
      }

      $.extend(this, $.parcel.prototype);
      $.parcel.apply(this, arguments);
      // test if in onfly mode, no side effect is introduced into existing DOM elements in onfly mode
      if (arguments[0] !== true) {
        // this.attr(key, value) will convert value to string, so set attribute directly as below
        this[0].parcelinstance = this;
      }
      return this;
    },

    sync: function() {
      var addedFields = [];
      this.trigger("sync", [addedFields]);
      return addedFields;
    },

    getParcel: function() {
      return this.attr("parcelinstance");
    }
  });

  // applied to all field types(jQuery, Parcel, ArrayParcel and Virtual)
  var fieldMixin = {
    // determine if field is still in dom tree
    dead: function() {
      return $(this.get(0)).closest("body").length === 0;
    },

    // change of this field will set state of target with the state of this field
    // target - jquery selector or a field
    bindState: function(target, converter) {
      target = typeof (target) === "string" ? $(target) : target;
      this.stateChange(function(e) {
        var s = e.field.state();
        target.state(converter ? converter(s) : s);
      }).stateChange();
      return this;
    },

    /*
    current state will be passed to handler as the first parameter. 'this' in handler is the target DOM element.
    fire event if no handler provided.
    includingClickInIE: internal used while setting handler, 'true' will fire event on clicking radio/checkbox in IE even when the real state is not changed.
    change event of radio/checkbox in IE is fired after losing focus, borrow click event as a workaround of potential timing issue.
    */
    stateChange: function(handler, includingClickInIE) {
      var self = this;
      var newHandler = function(e) {
        if (!$(e.target).parcelIgnored()) {
          e.field = self;
          handler.apply(this, arguments);
        }
      };

      this.change(handler ? newHandler : undefined);

      if (includingClickInIE && $.browser.msie && handler) {
        this.click(function(e) {
          var t = e.target.type;
          if (t === "radio" || t === "checkbox") {
            newHandler.apply(this, arguments);
          }
        });
      }
      return this;
    },

    // this event is fired on parcel
    beforeSetState: function(handler) {
      var self = this;
      this.bind("beforeSetState", function(e) {
        e.field = self;
        handler.apply(this, arguments);
      });
    },

    // this event is fired on parcel
    afterSetState: function(handler) {
      var self = this;
      this.bind("afterSetState", function(e) {
        e.field = self;
        handler.apply(this, arguments);
      });
    },

    parcelIgnored: function() {
      return this.is("[parcelignored],[parcelignored] *");
    },

    /*
    change of this field will show/hide target, which is a jQuery selector or a field
    showHide(target, showUp, resetTarget[optional], callback[optional])
    showUp can be a state object or a function return boolean which accepts a state as parameter.
    callback is executed whenever the animation completes, 'this' in callback body is the dom element of target.
      
    in IE, checkbox/radio become checked after the click event handler on it is executed, then the click handler in parent DOM gets executed.
    so, click handler directly on checkbox/radio will not reflect the new state, this causes a problem if call showHide on checkbox/radio, call showHide on parent DOM as a workaround.
    radio.showHide(target, "Yes") => parent.showHide(target, {radio: "Yes"})
    */
    showHide: function(target, showUp) {
      var showUpFn = $.isFunction(showUp) ? showUp : function(state) {
        return $.stateContain(state, showUp);
      };

      var resetTarget = arguments[2], callback = arguments[3];
      if ($.isFunction(resetTarget)) {
        callback = resetTarget;
        resetTarget = false;
      }

      target = $(target);
      var handler = function(e) {
        var show = showUpFn(e.field.state());
        // check display style to see if container *should* be visible rather than whether it is actually visible
        if (show && !target.displayed()){
          target.slideDown("fast", callback);
        } else if(!show && target.displayed()){
          if (resetTarget) {
            var old = callback;
            callback = function() {
              target.resetState();
              if (old) { old.apply(this, arguments); }
            }
          }
          target.slideUp("fast", callback);
        }
      };

      this.stateChange(handler, true).stateChange();
      return this;
    },

    resetState: function() {
      this.state(this.defaultState());
      return this;
    },

    // find closest parent parcel including itself
    closestParcel: function(excludeThis) {
      var start = excludeThis ? this.parent() : this;
      return start.closest("[parcelinstance]").getParcel();
    },

    // find all top level parcel objects under this jQuery object
    // return empty set if this jQuery object is a parcel of under any parcel
    childParcels: function() {
      return $.map(this.find("[parcelinstance]:not([parcelinstance] *)"), function(dom) {
        return $(dom).getParcel();
      });
    },

    isDirty: function() {
      return !$.stateEqual(this.initialState(), this.state());
    },

    revertState: function() {
      this.state(this.initialState());
      return this;
    },

    initialState: function() {
      var parcel = this.closestParcel();
      if (parcel) {
        return parcel.initialState(this);
      }
    },

    // return true if the state of this field will be updated/changed if set with the state passed in
    willUpdateWith: function(state) {
      var cur = this.state();
      for (var k in cur) {
        if (!$.stateContain(cur[k], state[k])) {
          return true;
        }
      }
      return false;
    },

    fieldDom: function() {
      return this.get();
    },

    // remove DOM(s) and corresponding field(s)
    removeMe: function() {
      var parcel = this.closestParcel(true);
      this.remove();
      if (parcel) {
        parcel.sync();
      }
    }
  };

  var defaultStrategy = {
    match: function() { return true; },
    get: function() { return this.text(); },
    set: function(s, option) {
      if (s !== undefined) {
        this.text(s);
      }
    },
    getDefault: function() {
      return this.attr("default") !== undefined ?
        this.attr("default")
        : (this.is(":input") ? "" : undefined);
    },
    setDefault: function(s) { this.attr("default", s); }
  };

  var elementStrategies = [
  // for div and fieldset
  {
    isContainer: true,
    match: function() { return $.hasTag(this, "div", "fieldset"); },
    get: function() {
      var parcel = this.closestParcel();
      if (parcel) {
        return parcel.getState(this);
      }
      // implicitly creating parcel on the fly
      return this.parcel(true).state();
    },
    set: function(s, option) {
      var parcel = this.closestParcel();
      if (parcel) {
        parcel.setState(s, option, this);
      } else {
        // implicitly creating parcel on the fly
        this.parcel(true).state(s, option);
      }
    },
    getDefault: function() {
      var parcel = this.closestParcel();
      if (parcel) {
        return parcel.getDefaultState(this);
      }
      // implicitly creating parcel on the fly
      return this.parcel(true).defaultState();
    },
    setDefault: function(s) {
      var parcel = this.closestParcel();
      if (parcel) {
        parcel.setDefaultState(s, this);
      } else {
        // implicitly creating parcel on the fly
        this.parcel(true).defaultState(s);
      }
    }
  },
  // for text input
  {
    match: function() { return $.hasType(this, "text"); },
    get: function() { return this.val(); },
    set: function(s, option) {
     this.focus()
      .click()
      .val(s === null ? "" : s)
      .triggerNative("keydown")
      .click()
      .triggerNative("change")
      .blur();
    },
    getDefault: defaultStrategy.getDefault,
    setDefault: defaultStrategy.setDefault
  },
  // for hidden input
  {
    match: function() { return $.hasType(this, "hidden"); },
    get: function() { return this.val(); },
    set: function(s, option) { this.val(s === null ? "" : s); },
    getDefault: defaultStrategy.getDefault,
    setDefault: defaultStrategy.setDefault
  },
  // for select
  {
    match: function() { return $.hasTag(this, "select"); },
    get: function() { return this.val(); },
    set: function(s, option) {
      var first = this[0].options[0];
      this.focus()
        // TODO : clarify the setting logic below
        .val((s === null || s === "") ? (first.value === "" ? first.text : first.value) : s)
        .triggerNative("change")
        .blur();
    },
    getDefault: function() {
      if (this.attr("default") !== undefined) {
        return this.attr("default");
      }
      var theDefault = this.find("option").filter(function() { return this.defaultSelected; });
      return theDefault.length === 0 ? null : theDefault.val();
    },
    setDefault: defaultStrategy.setDefault
  },
  // for radio
  {
    match: function() { return $.hasType(this, "radio"); },
    get: function() {
      var checkedRadio = this.filter(":checked");
      return (checkedRadio.length > 0) ? checkedRadio.val() : null;
    },
    set: function(s, option) {
      if (s === null) {
        if(option.editable){
          throw "ParcelError: can not uncheck all radios in group under config";
        }
        this.filter("[checked]")
          .removeAttr("checked")
          .triggerNative("change");
      } else {
        var r = this.filter("[value=" + s + "]");
        if(option.editable && !r.editable()){
          throw "ParcelError: the radio is hidden or disabled, can not check it";
        }
        r.click().triggerNative("change");
      }
    },
    getDefault: function() {
      var theDefault = this.filter(function() {
        return $(this).attr("default") !== undefined;
      });
      if (theDefault.length === 0) {
        theDefault = this.filter(function() {
          return this.defaultChecked;
        });
      }
      return theDefault.length === 0 ? null : theDefault.val();
    },
    setDefault: function(s) {
      this.removeAttr("default").filter("[value=" + s + "]").attr("default", true);
    }
  },
  // for checkbox
  {
    match: function() { return $.hasType(this, "checkbox"); },
    get: function() {
      return $.map(this.filter(":checked"), function(dom) { return dom.value; });
    },
    set: function(s, option) {
      if (!$.isArray(s)) {
        throw "ParcelError: set checkbox with invalid state [" + s + "]";
      }
      this.each(function(i, dom) {
        if ($.xor($.inArray(dom.value, s) !== -1, dom.checked)) {
          var elem = $(dom);
          if (option.editable && !elem.editable()) {
            throw "ParcelError: the checkbox [" + dom.value + "] is hidden or disabled, can not [" + (dom.checked ? "uncheck":"check") + "] it under config";
          }
          elem.click().triggerNative("change");
        }
      });
    },
    getDefault: function() {
      var theDefault = $.grep(this, function(dom) {
        return $(dom).attr("default") !== undefined;
      });
      if (theDefault.length === 0) {
        theDefault = $.grep(this, function(dom) {
          return dom.defaultChecked;
        });
      }
      return $.map(theDefault, function(dom) {
        return dom.value;
      });
    },
    setDefault: function(s) {
      if (!$.isArray(s)) {
        throw "ParcelError: set checkbox with invalid default state [" + s + "]";
      }
      this.removeAttr("default");
      $.each(s, function(i, v) {
        this.filter("[value=" + v + "]").attr("default", true);
      } .bind(this));
    }
  },
  // for all other input types
  defaultStrategy];

  // extend jQuery for jQuery field and Virtual field
  $.extend($.fn, fieldMixin, {
    state: function(s, option) {
      var matched = $.first(elementStrategies, function(i, strategy) { return strategy.match.call(this); } .bind(this));

      var customGet = ($.config.elementStrategy && $.config.elementStrategy.get) || emptyFn;
      var customSet = ($.config.elementStrategy && $.config.elementStrategy.set) || emptyFn;

      if (s === undefined) {
        var ret = customGet.call(this);
        return ret === undefined ? matched.get.call(this) : ret;
      } else {
        option = option || {};
        // remember old settings, will set them back after setting state
        var oldSetting = { async: $.ajaxSettings.async, off: $.fx.off };
        if (option.sync) {
          // turn off async of ajax and animation
          $.ajaxSetup({ async: false });
          $.fx.off = true;
        }
        try {
          if (customSet.call(this, s, option) === undefined) {
            if (matched.isContainer) {
              matched.set.call(this, s, option);
            } else if (!$.stateEqual(s, this.state())) {
              if (option.editable && this.length === 1 && !this.editable()) {
                throw "ParcelError: the field is hidden or disabled, can not be assigned with state " + $.print(s) + " under config";
              }
              matched.set.call(this, s, option);
            }
          }
          if (option.verify && !matched.isContainer && !$.stateContain(this.state(), s)) {
            throw "ParcelError: failed to set state with [" + $.print(s) + "], the current state is [" + $.print(this.state()) + "]";
          }
        } finally {
          if (option.sync) {
            // revert settings after setting state
            $.ajaxSetup({ async: oldSetting.async });
            $.fx.off = oldSetting.off;
          }
        }
        return this;
      }
    },

    defaultState: function(s) {
      var matched = $.first(elementStrategies, function(i, elem) { return elem.match.call(this); } .bind(this));

      var customGetDefault = ($.config.elementStrategy && $.config.elementStrategy.getDefault) || emptyFn;
      var customSetDefault = ($.config.elementStrategy && $.config.elementStrategy.setDefault) || emptyFn;

      if (s === undefined) {
        var ret = customGetDefault.call(this);
        return ret === undefined ? matched.getDefault.call(this) : ret;
      } else {
        if (customSetDefault.call(this, s) === undefined) {
          matched.setDefault.call(this, s);
        }
        return this;
      }
    },

    editable: function(){
      return !this.is(":hidden") && !this.attr("disabled");
    },

    // trigger event with browser native behaviour, e.g. change does not bubble up in IE, but firefox does.
    triggerNative: function(event) {
      this.each(function() {
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
    ensureBubbleOnChange: function() {
      if (!$.support.bubbleOnChange) {
        var all = this.find(":input").add(this.filter(":input"));
        all.each(function(i, dom) {
          var elem = $(dom);
          // do this only once for the same DOM element
          if (!elem.data("bubbleOnChange")) {
            elem.data("bubbleOnChange", true);
            elem.change(function(e) {
              // only need to simulate bubbling for real user interaction, event will bubble up if triggered by jQuery trigger() method.
              if (e.hasOwnProperty("altKey")) {
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

    _preparingAsField: function() {
      return this.ensureBubbleOnChange()._snapParents();
    },

    // snap parent list, just for fire change event on proper original parent DOM after dynamicly removing a DOM
    _snapParents: function() {
      this.each(function() {
        this._parentsSnap = $(this).parents().get();
      });
      return this;
    },

    // events can be a single event or multiple ones seperated with space
    fireChangeEventOn: function(events) {
      this.bind(events, function() {
        this.change();
      }.bind(this));
    },

    displayed: function() {
      return this.css("display") !== "none";
    }
  });

  // constructor for Parcel or Array Parcel
  $.parcel = function() {
    // no side effect is introduced into existing DOM elements in onfly mode
    this.onfly = arguments[0] === true;
    var nextIndex = typeof arguments[0] === 'boolean' ? 1 : 0;
    var behaviour = arguments[nextIndex++], state = arguments[nextIndex];
    if (typeof behaviour !== "function") {
      state = behaviour;
      behaviour = undefined;
    }

    this._nameConstraint = this._parseNameConstraint();
    this._behaviour = behaviour || this._parseBehaviour() || function() { };
    this._initialState = undefined;
    this.items = this.fields = [];

    this._init();
    this._applyExtension();
    this.applyBehaviour(this._behaviour);
    if (state !== undefined) {
      this.state(state, { initial: true });
    }
    this.captureState();
  };

  // as an extension point
  $.parcelFn = $.parcel.prototype;

  $.extend($.parcelFn, fieldMixin, {
    // TODO : consider short selector for potential better performance by sacrificing some flexibility
    FIELD_SELECTOR: ":input:not(:button,:submit,[parcelignored],[parcelignored] *)"
     + ",[parcel]:not([parcelignored],[parcelignored] *)"
     + ",[parcel=]:not([parcelignored],[parcelignored] *)"
     + ",[parcelfield]:not([parcelignored],[parcelignored] *)",

    // sync with DOM changes
    sync: function(dom) {
      if (dom === undefined) { // DOM removed
        var parentSnaps = [];
        this._clean(parentSnaps);

        var closestAliveParents = [];
        $.each(parentSnaps, function(i, snap) {
          var alive = $.first(snap, function(i, p) { return !$(p).dead(); });
          if ($.inDOMArray(alive, closestAliveParents) === -1) {
            closestAliveParents.push(alive);
          }
        });

        $.each(closestAliveParents, function(i, alive) {
          $(alive).change();
        });
      } else { // DOM added
        var elem = $(dom);
        var addedFields = this._buildFields(elem, true);
        elem.change();
        return addedFields;
      }
    },

    // parameter field could be name or object
    hasField: function(field) {
      return this.fieldIndex(field) >= 0;
    },

    // parameter field could be name or object
    fieldIndex: function(field) {
      for (var i = 0; i < this.fields.length; i++) {
        var curField = typeof (field) === "string" ? this.fields[i].fname : this.fields[i];
        if (curField === field) {
          return i;
        }
      }
      return -1;
    },

    applyBehaviour: function(behaviour, args) {
      // TODO : mixin behaviour this way lose the efficiency of prototype. properties defined on this may be overwriten ON PURPOSE.
      $.extend(this, behaviour.prototype);
      behaviour.apply(this, args || []);
      return this;
    },

    _applyExtension: function() {
      if ($.config.behaviours) {
        $.each($.config.behaviours, function(i, behav) {
          if (!$.isFunction(behav)) {
            throw "ParcelError: invalid behaviour [" + behav + "] in parcel config.";
          }
          this.applyBehaviour(behav);
        } .bind(this));
      }
    },

    _buildFields: function(context, inferOrder) {
      var addedFields = [];
      var all = this._selectInContext(context, this.FIELD_SELECTOR);
      all.each(function(i, dom) {
        if (this.contains(dom)) {
          return;
        }
        var elem = $(dom);
        var fname = this._name(elem);
        if (!fname || (this._nameConstraint && this._nameConstraint !== fname)) {
          return; // ignore this element
        }
        addedFields.push(this._addField(elem, fname, inferOrder));
      } .bind(this));
      return addedFields;
    },

    // all fields are stored in this.fields array, and convenient field accessors on this are assigned if applicable(not conflict with existing property)
    // inferOrder is only for efficency, will add new field to the end of this.fields by default, if not specified. can always be true.
    _addField: function(elem, fname, inferOrder) {
      var field = this._constructField(elem, fname);

      if (!this._nameConstraint) {
        if (this.hasField(fname)) {
          throw "ParcelError: field with name [" + fname + "] already exists.";
        }
        if (!(fname in this)) {
          this[fname] = field;
        }
      }

      var insertIndex = inferOrder ? this._suggestedIndex(field) : this.fields.length;
      this.fields.splice(insertIndex, 0, field);
      return field;
    },

    // orderFields("fieldName1", "fieldName2", ... ,"fieldNameN"), pass in only the fields need order ensurance.
    orderFields: function() {
      for (var i = 0; i < arguments.length - 1; i++) {
        var cur = this.fieldIndex(arguments[i]);
        var next = this.fieldIndex(arguments[i + 1]);
        if (cur === -1 || next === -1) {
          throw "ParcelError: field [" + arguments[i] + "] or [" + arguments[i + 1] + "] does not exist.";
        }
        if (cur < next) {
          continue;
        }
        var nextField = this.fields[next];
        this.fields.splice(next, 1);
        this.fields.splice(this.fieldIndex(arguments[i]) + 1, 0, nextField);
      }
      return this;
    },

    // setting: { newName1: "oldName1", newName2: "oldName2" }
    renameFields: function(setting) {
      $.each(setting, function(newName, oldName) {
        if (newName !== oldName && this._field(newName)) {
          throw "ParcelError: failed to rename [" + oldName + "] to [" + newName + "], due to name conflict.";
        }
        var f = this._field(oldName);
        if (f) {
          if (this._nameConstraint) {
            throw "ParcelError: can not rename fields of a parcel with name constraint.";
          }
          f.fname = newName;
          if (this[oldName] === f) {
            delete this[oldName];
          }
          if (this[newName] === undefined) {
            this[newName] = f;
          }
        }
      } .bind(this));
      return this;
    },

    // get all field DOM including container DOM for Parcel or Array Parcel
    fieldDom: function() {
      var all = this.get();
      $.each(this.fields, function(i, field) {
        all = all.concat(field.fieldDom());
      });
      return all;
    },

    state: function(s, option) {
      if (s === undefined) {
        return this.getState();
      } else {
        option = option || {};
        var willUpdate;
        if (option.beforeEvent || option.afterEvent) {
          willUpdate = this.willUpdateWith(s);
        }
        if (option.beforeEvent && willUpdate) {
          this.trigger("beforeSetState");
        }
        this.setState(s, option);
        if (option.afterEvent && willUpdate) {
          this.trigger("afterSetState");
        }
        return this;
      }
    },

    getState: function(context) {
      return this._stateGetActionOnFields("state", context);
    },

    // setting state for inexistent field is not allowed if option.exist is true
    setState: function(s, option, context) {
      option = option || {};
      // set on this array parcel, will add/remove field if needed
      if (this._nameConstraint && this._contextIsThis(context)) {
        assertIsArray(s);
        $.each(s, function(i, itemState) {
          if (i < this.fields.length) {
            this.fields[i].state(itemState, option);
          } else {
            // try add an item to array field
            this.trigger(option.initial ? "addItemInitial" : "addItem");
            if (this.onfly) {
              this.sync(this);
            }
            // do set action on the newly added item
            if (this.fields[i]) {
              this.fields[i].state(itemState, option);
            }
            // throw if ensure existent is specified in option and failed to do this setting eventually
            else if (option.verify || option.exist) {
              throw "ParcelError: no UI element found while setting state for the [" + (i + 1) + "th] " + this._nameConstraint + " with " + $.print(s[i]);
            }
          }
        } .bind(this));
        // try to remove fields
        $.each(this.fields.slice(s.length), function(i, field) {
          field.trigger("removeItem");
          if (this.onfly) {
            this.sync();
          }
          if (option.verify && $.inArray(field, this.fields) !== -1) {
            throw "ParcelError: failed to remove the [" + (s.length + i + 1) + "th] " + this._nameConstraint + " while setting state with " + $.print(s);
          }
        } .bind(this));
      }
      // set on part of this array parcel
      else if (this._nameConstraint) {
        assertIsArray(s);
        var fields = this._fieldsIn(context);
        $.each(s, function(i, itemState) {
          if (i < fields.length) {
            fields[i].state(itemState, option);
          } else if (option.exist) {
            throw "ParcelError: no UI element found while setting state for the [" + (i + 1) + "th] " + this._nameConstraint + " with " + $.print(s[i]);
          }
        } .bind(this));
      }
      // set on this non-array parcel
      else {
        if (option.exist) {
          s = $.cloneState(s, true);
        }
        $.each(this._fieldsIn(context), function(i, field) {
          if (s.hasOwnProperty(field.fname)) {
            field.state(s[field.fname], option);
            if (option.exist) {
              delete s[field.fname];
            }
          }
        });
        if (option.exist && !$.objectEmpty(s)) {
          for (var key in s) {
            throw "ParcelError: no UI element found while setting state for [" + key + "] with " + $.print(s[key]);
          }
        }
      }
      return this;
    },

    initialState: function(context) {
      var fields = this._fieldsIn(context);
      var contextIsField = (fields.length === 1) && this._contextIsField(context, fields[0]);
      var state;
      if (this._nameConstraint) {
        state = $.map(fields, function(field) {
          return this._initialState[this.fieldIndex(field)];
        } .bind(this));

        return contextIsField ? state[0] : state;
      } else {
        state = {};
        $.each(fields, function(i, field) {
          if (this._initialState.hasOwnProperty(field.fname)) {
            state[field.fname] = this._initialState[field.fname];
          }
        } .bind(this));

        return contextIsField ? $.cloneState(state[fields[0].fname]) : $.cloneState(state);
      }
    },

    // store current state as initial, used later for state reverting
    captureState: function() {
      this._initialState = this.state();
      return this;
    },

    defaultState: function(s) {
      return s === undefined ? this.getDefaultState() : this.setDefaultState(s);
    },

    getDefaultState: function(context) {
      return this._stateGetActionOnFields("defaultState", context);
    },

    setDefaultState: function(s, context) {
      var fields = this._fieldsIn(context);
      // set on this array parcel
      if (this._nameConstraint) {
        assertIsArray(s);
        $.each(s, function(i, itemState) {
          if (i < fields.length) {
            fields[i].defaultState(itemState);
          }
        });
      }
      // set on this non-array parcel
      else {
        $.each(fields, function(i, field) {
          if (s.hasOwnProperty(field.fname)) {
            field.defaultState(s[field.fname]);
          }
        });
      }
      return this;
    },

    // check if this parcel contains any DOM in element
    contains: function(elem) {
      var all = this.fieldDom();
      return !!$.first($(elem).get(), function(i, dom) {
        return $.inDOMArray(dom, all) !== -1;
      });
    },

    _init: function() {
      if (!this.onfly) {
        this.bind("sync", function(event, addedFields) {
          event.stopPropagation();
          var added = this.sync(event.target);
          $.each(added, function() {
            addedFields.push(this);
          });
        } .bind(this));
      }

      this._buildFields(this);
      this._buildVirtualFields(this);
    },

    _parseNameConstraint: function() {
      var def, match;
      if ((def = this.attr("parcel")) && (match = def.match(/\[(\w+)\]/))) {
        return match[1];
      }
    },

    _parseBehaviour: function() {
      var behav, def, match;
      if ((def = this.attr("parcel")) && (match = def.match(/^(\w+)|,(\w+)/)) && (behav = match[1] || match[2])) {
        if (!$.isFunction(window[behav])) {
          throw "ParcelError: behavior [" + behav + "] should be a global function.";
        }
        return window[behav];
      }
    },

    _stateGetActionOnFields: function(fieldMethod, context) {
      var fields = this._fieldsIn(context);

      if (this._nameConstraint) {
        return $.map(fields, function(field) {
          return field[fieldMethod]();
        });
      } else {
        var state = {};
        $.each(fields, function(i, field) {
          state[field.fname] = field[fieldMethod]();
        });
        return state;
      }
    },

    _field: function(fname) {
      return this.fields[this.fieldIndex(fname)];
    },

    _contextIsThis: function(context) {
      return !context || $.sameDOM(context[0], this[0]);
    },

    // find fields in context
    _fieldsIn: function(context) {
      if (this._contextIsThis(context)) {
        return this.fields.slice(0);
      } else {
        var contextDom = context.get(0);
        return $(this.fields).filter(function() {
          var parents = $(this.get(0)).parents().andSelf();
          return $.inDOMArray(contextDom, parents) >= 0;
        }).get();
      }
    },

    // construct field for jQuery element
    _constructField: function(elem, fname) {
      var field;
      if (elem.attr("parcel") !== undefined) {
        field = elem.parcel(this.onfly);
      } else {
        if ($.hasType(elem, "radio")) {
          field = this.find(":radio[name=" + elem.attr("name") + "]");
        } else if ($.hasType(elem, "checkbox")) {
          field = this.find(":checkbox[name=" + elem.attr("name") + "]");
        } else {
          field = elem;
        }
        if (!this.onfly) {
          field._preparingAsField();
        }
      }
      field.fname = fname;
      return field;
    },

    // infer index of given field based on the occurance sequence in DOM
    _suggestedIndex: function(field) {
      var all = this.find(this.FIELD_SELECTOR);
      var posOfField = $.inDOMArray(field.get(0), all);

      var index = 0;
      for (; index < this.fields.length; index++) {
        var pos = $.inDOMArray(this.fields[index].get(0), all);
        if (pos > posOfField) {
          break;
        }
      }
      return index;
    },

    _buildVirtualFields: function(context) {
      var all = this._selectInContext(context, "[virtualfield],[virtualfield=]");
      all.each(function(i, dom) {
        var virtual = $(dom);
        var fname = this._name(virtual);
        if (!fname) {
          throw "ParcelError: failed to determine the name of virtual field.";
        }
        if (fname in this) {
          throw "ParcelError: virtual field [" + fname + "] has name conflict with existing property of parcel.";
        }
        this[fname] = virtual;
      } .bind(this));
    },

    _selectInContext: function(context, selector) {
      return context.filter(selector)
            .add(context.find(selector))
            .not(this);
    },

    // remove fields if the corresponding DOM element(s) is(are) no longer in DOM tree.
    _clean: function(parentSnapsOfDeadFields) {
      var deadFields = [];
      $.each(this.fields, function(n, field) {
        if (field._clean) {
          field._clean(parentSnapsOfDeadFields);
        }
        if (field.dead()) {
          deadFields.push(field);
        }
      });
      $.each(deadFields, function(n, deadField) {
        for (var i = 0; i < this.fields.length; i++) {
          if (this.fields[i] === deadField) {
            this.fields.splice(i, 1);
            if (this[deadField.fname] === deadField) {
              delete this[deadField.fname];
            }
            var snap = deadField.get(0)._parentsSnap;
            // only input field has _parentsSnap
            if (snap) {
              parentSnapsOfDeadFields.push(snap);
            }
            break;
          }
        }
      } .bind(this));
    },

    // infer a name for element
    _name: function(elem) {
      return elem.attr("fieldname") || elem.attr("name") || elem.attr("id");
    },

    // check if the context is for a non-virtual field
    _contextIsField: function(context, field) {
      // compare DOM with ==, === SOMETIME does not work in IE
      return context && context.get(0) == field.get(0);
    }
  });

  var emptyFn = function() { };

  $.config = {
    // the behaviours will be applied to all created parcels
    behaviours: [],
    // extend state() and defaultState() for input elements
    elementStrategy: {
      get: emptyFn,
      set: emptyFn,
      getDefault: emptyFn,
      setDefault: emptyFn
    }
  };

  // do state equality check recursively
  // CAUTION: only for state object, not supposed to work with circular referenced object.
  $.stateEqual = function(one, another) {
    return $.stateContain(one, another) && $.stateContain(another, one);
  };

  // do state check recursively
  // CAUTION: only for state object, not supposed to work with circular referenced object.
  $.stateContain = function(whole, subset) {
    if (subset === undefined) {
      return true;
    }
    if (whole === undefined && typeof (subset) === "object" && subset !== null && !$.isArray(subset)) {
      return $.objectEmpty(subset) ? true : false;
    }
    if (whole === null || subset === null || typeof (whole) !== "object" || typeof (subset) !== "object") {
      return whole === subset;
    }
    if($.isArray(subset)){
      if(!$.isArray(whole)){
        return false;
      }
      for(var i = 0; i < subset.length; i++){
        if (typeof(subset[i]) === "object") {
          if (!$.stateContain(whole[i], subset[i])) {
            return false;
          }
        } else if (whole[i] !== subset[i]) {
          return false;
        }
      }
    } else {
      if($.isArray(whole)){
        return false;
      }
      for (var p in subset) {
        if (typeof(subset[p]) === "object") {
          if (!$.stateContain(whole[p], subset[p])) {
            return false;
          }
        } else if (whole[p] !== subset[p]) {
          return false;
        }
      }
    }
    return true;
  };

  // return true for object without own property
  $.objectEmpty = function(s) {
    for (var p in s) {
      return false;
    }
    return true;
  };

  // do deep clone of state unless shallow is true
  $.cloneState = function(s, shallow) {
    if (!s || typeof (s) === "string" || typeof (s) === "number") {
      return s;
    } else if ($.isArray(s)) {
      return $.extend(!shallow, [], s);
    } else {
      return $.extend(!shallow, {}, s);
    }
  };

  // get index of DOM in a DOM array(can be jQuery object)
  $.inDOMArray = function(item, domArray) {
    for (var i = 0; i < domArray.length; i++) {
      if ($.sameDOM(domArray[i], item)) {
        return i;
      }
    }
    return -1;
  };

  // return true if the two DOM elements are same one
  $.sameDOM = function(one, another) {
    return $.support.trippleEqualOnDom ? one === another : one == another;
  };

  // find the first item in array that matchs the filter fn.
  $.first = function(array, fn) {
    for (var i = 0; i < array.length; i++) {
      if (fn.call(array[i], i, array[i])) {
        return array[i];
      }
    }
  };

  $.xor = function(a, b) {
    return (a ? 1 : 0) ^ (b ? 1 : 0);
  };

  $.hasTag = function(elem) {
    return $.inArray(elem[0].tagName.toLowerCase(), Array.prototype.slice.call(arguments, 1)) !== -1;
  };

  $.hasType = function(elem) {
    return elem[0].tagName.toLowerCase() === "input" &&
          $.inArray(elem[0].type, Array.prototype.slice.call(arguments, 1)) !== -1;
  };

  // jquery.print.js is optional
  if (!$.print) {
    $.print = function(o) {
      return o.toString();
    };
  }

  function assertIsArray(a) {
    if (!$.isArray(a)) {
      throw "ParcelError: array is expected, but was [" + $.print(a) + "]";
    }
  }

  // change event in IE doesn't bubble.
  $.support.bubbleOnChange = !$.browser.msie;
  // in IE, === will return false SOMETIME even when comparing the same DOM, use == instead.
  $.support.trippleEqualOnDom = !$.browser.msie;

})(jQuery);

if (!Function.prototype.bind) {
  Function.prototype.bind = function(context) {
    var method = this;
    return function() {
      return method.apply(context, arguments);
    };
  };
}
