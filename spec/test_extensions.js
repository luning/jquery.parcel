// Turn off animation of jQuery during testing
$.fx.off = true;

// Ensure that forms are never submitted
$(document).ready(function() {
	$('form').submit(function() {
		return false;
	});
});

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

Screw.Matchers.contain_object = {
	message: "",
	match: function(expected, actual) {
		for (var p in expected) {
			if (typeof (actual[p]) === "undefined") {
				this.message = p + " is undefined in actual object";
				return false;
			}
			else if (actual[p] !== expected[p]) {
				this.message = "'" + p + "' of actual object is expected to be [" + expected[p] + "], but is [" + actual[p] + "]";
				return false;
			}
		}
		return true;
	},
	failure_message: function(expected, actual, not) {
		return this.message;
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

Screw.Matchers.be_expanded = {
	match: function(expected, actual) {
		return actual.hasClass("accordionExpanded");
	},
	failure_message: function(expected, actual, not) {
		return 'expected expanded but was not';
	}
};

Screw.Matchers.be_collapsed = {
	match: function(expected, actual) {
		return !actual.hasClass("accordionExpanded")
	},
	failure_message: function(expected, actual, not) {
		return 'expected collapsed but was not';
	}
};

Screw.Matchers.be_not_started = {
	match: function(expected, actual) {
		return actual.find(".accordionStatus:first").text() === ev.frontEnd.accordionStatus.notStarted.text;
	},
	failure_message: function(expected, actual, not) {
		return 'expected accordion status to be not started but was ' + actual.find(".accordionStatus:first").text();
	}
};

Screw.Matchers.be_completed = {
	match: function(expected, actual) {
		return actual.find(".accordionStatus:first").text() === ev.frontEnd.accordionStatus.completed.text;
	},
	failure_message: function(expected, actual, not) {
		return 'expected accordion status to be completed but was ' +  actual.find(".accordionStatus:first").text();
	}
};

Screw.Matchers.be_in_progress = {
	match: function(expected, actual) {
		return actual.find(".accordionStatus:first").text() === ev.frontEnd.accordionStatus.inProgress.text;
	},
	failure_message: function(expected, actual, not) {
	return 'expected accordion status to be in progress but was ' + actual.find(".accordionStatus:first").text();
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
