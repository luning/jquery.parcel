Screw.Matchers.be_same_dom_element_as = {
  match: function(expected, actual) {
    if (expected instanceof Array) {
      for (var i = 0; i < actual.length; i++) {
        if (expected[i] != actual[i]) { return false; }
      }
      return actual.length == expected.length;
    }
    return actual == expected;
  },
  failure_message: function(expected, actual, not) {
    return 'expected ' + $.print(actual) + 'to' + (not ? ' not' : '') + ' be same as ' + $.print(expected);
  }
};

Screw.Matchers.be_visible = {
  match: function(expected, actual) {
    return !$(actual).is(":hidden");
  },

  failure_message: function(expected, actual, not) {
    return 'expected [' + actual + '] to be visible, but it was not.';
  }
};

Screw.Matchers.not_be_visible = {
  match: function(expected, actual) {
    return !$(actual).is(":visible");
  },

  failure_message: function(expected, actual, not) {
    return 'expected [' + actual + '] to not be visible, but it was.';
  }
};

Screw.Matchers.contain_state = {
  match: function(expected, actual) {
    return $.stateContain(actual, expected);
  },
  failure_message: function(expected, actual, not) {
    return 'expected ' + $.print(actual) + (not ? ' to not contain ' : ' to contain ') + $.print(expected);
  }
};

Screw.Matchers.equal_state = {
  match: function(expected, actual) {
    return $.stateEqual(actual, expected);
  },
  failure_message: function(expected, actual, not) {
    return 'expected ' + $.print(actual) + (not ? ' to not equal ' : ' to equal ') + $.print(expected);
  }
};

Screw.Matchers.not_be_on_the_page = {
  match: function(expected, actual) {
    return $(actual).length == 0;
  },

  failure_message: function(expected, actual, not) {
    return 'expected [' + actual + '] to not be on the page, but it was.';
  }
};

Screw.Matchers.be_enabled = {
  match: function(expected, actual) {
    return !$(actual).attr("disabled");
  },

  failure_message: function(expected, actual, not) {
    return 'expected [' + actual + '] to be enabled, but it was not.';
  }
};

Screw.Matchers.be_disabled = {
  match: function(expected, actual) {
    return $(actual).attr("disabled");
  },

  failure_message: function(expected, actual, not) {
    return 'expected [' + actual + '] to be disabled, but it was not.';
  }
};

Screw.Matchers.be_greater_than = {
  match: function(expected, actual) {
    return actual > expected;
  },
  failure_message: function(expected, actual, not) {
    return 'expected ' + actual + ' to ' +(not ? 'not' : '') + ' be greater than ' + expected;
  }

};

Screw.Matchers.start_with = {
  match: function(expected, actual) {
    return actual.substring(0, expected.length) === expected;
  },
  failure_message: function(expected, actual, not) {
    return 'expected ' + $.print(actual) + (not ? ' to not start with ' : ' to start with ') + $.print(expected);
  }
};

Screw.Matchers.end_with = {
  match: function(expected, actual) {
    if (actual.length < expected.length) return false;
  
    return actual.substring(actual.length - expected.length) === expected;
  },
  failure_message: function(expected, actual, not) {
  return 'expected ' + $.print(actual) 
    + (actual.length < expected.length ? '' : ' which ends with ' + $.print(actual.substring(actual.length - expected.length)))
    + (not ? ' to not end with ' : ' to end with ') + $.print(expected);
  }
};
