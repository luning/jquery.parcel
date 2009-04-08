Screw.Unit(function() {
    function Part1() {
	    StateAware.call(this);
	    this.setupModelFields({ field: "#part1_field" });
	    this.aggregateFieldEvent("change");
	    this.setupInitialState();
    }
    $.extend(Part1.prototype, StateAware.prototype, {});

    function Part2() {
	    StateAware.call(this);
	    this.setupModelFields({
		    field:		"#part2_field",
		    dropdown:	"#dropdown",
		    radios:		":radio[name=group]",
		    radios2:	":radio[name=group2]",
		    radios3:	":radio[name=group3]"
	    });
    	
	    this.setupDerivedFields({
		    span: "#span"
	    });
    	
	    this.aggregateFieldEvent("change");
	    this.setupInitialState();
    }
    $.extend(Part2.prototype, StateAware.prototype, {});

    function PartWithDerivedField() {
	    StateAware.call(this);
	    this.setupModelFields({ field: "#part1_field" });
	    this.setupDerivedFields({ span: "#span1" });
    	
	    this.aggregateFieldEvent("change");
	    this.setupInitialState();

	    this.copyOfField = this.createDerivedField(this.field, function() {
		    return this.field.value(); // normally this would be some transform of the original value
	    });
    }
    $.extend(PartWithDerivedField.prototype, StateAware.prototype, {});

	var fixtureHtml = $("#fixture").html();

	before(function() {
		$("#fixture").html(fixtureHtml);
		$().unbind("Part1.change"); $().unbind("Part2.change"); $().unbind("PartWithDerivedField.change");
	});

	describe("A State Aware Part", function() {
		it("should get/set text input field state", function() {

			var part = new Part2();

			var expected = { dropdown: "SOMEVAL" };

			part.setState(expected);
			var state = part.getState();

			expect(state).to(contain_object, expected);
		});

		it("should set initial radio field state", function() {
			var part = new Part2();
			expect(part.initialState.radios).to(equal, "NO");
			expect(part.radios.filter(":checked").val()).to(equal, "NO");
		});

		it("should get radio field state", function() {
			var part = new Part2();
			var state = part.getState();
			expect(state.radios).to(equal, "NO");
		});

		it("should set/get radio field state", function() {
			var part = new Part2();
			var expected = { radios: "YES" };

			part.setState(expected);

			var state = part.getState();
			expect(state).to(contain_object, expected);
		});

		it("should set/get radio field state for 3 radio buttons", function() {
			var part = new Part2();

			expect(part.initialState.radios2).to(equal, "OPTION2");
			expect(part.radios2.filter(":checked").val()).to(equal, "OPTION2");

			var expected = { radios2: "OPTION3" };

			part.setState(expected);

			var state = part.getState();
			expect(state).to(contain_object, expected);
		});

		it("should set/get radio field state for an unchecked group", function() {
			var part = new Part2();

			expect(part.radios3.is(":checked")).to(be_false);
			expect(part.initialState.radios3).to(equal, null);

			part.setState({ radios3: "YES" });

			expect(part.getState().radios3).to(equal, "YES");

			part.setState({ radios3: null });

			expect(part.getState().radios3).to(equal, null);
		});

		it("should fire appropriate events when setting state on text box", function() {
			var part = new Part2();
			var changeEventCounter = 0;
			part.field.change(function() { changeEventCounter++; })

			part.setState({ field: "whatever" });

			expect(changeEventCounter).to(equal, 1);
		});

		it("should not fire events when setting the same state", function() {
			var part = new Part2();
			
			part.setState({ radios: "NO" });
			
			var changeEventCounter = 0;
			part.radios.change(function() { changeEventCounter++; });

			part.setState({ radios: "NO" });

			expect(changeEventCounter).to(equal, 0);
		});

		it("should fire appropriate events when setting state on radio button group", function() {
			var part = new Part2();
			var changeEventCounter = 0;
			part.radios.change(function() { changeEventCounter++; });

			part.setState({ radios: "YES" });

			expect(changeEventCounter).to(equal, 1);
		});

		it("should fire appropriate events when uncheck all radio buttons in group", function() {
			var part = new Part2();
			var changeEventCounter = 0;
			part.radios.change(function() { changeEventCounter++; });

			part.setState({ radios: null });

			expect(changeEventCounter).to(equal, 2);
		});

	});

});
