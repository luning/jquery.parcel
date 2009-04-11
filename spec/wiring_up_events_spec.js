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
		    return this.field.state(); // normally this would be some transform of the original value
	    });
    }
    $.extend(PartWithDerivedField.prototype, StateAware.prototype, {});

	var fixtureHtml = $("#fixture").html();

	before(function() {
		$("#fixture").html(fixtureHtml);
		$().unbind("Part1.change"); $().unbind("Part2.change"); $().unbind("PartWithDerivedField.change");
	});

	describe("Changing a Part with dependent Parts", function() {
		it("should reset text field to default value", function() {
			var part = new Part1();
			var targetPart = new Part2();

			part.resets(targetPart, ["field"]);

			targetPart.field.state("whatever");
			part.field.state("whatever").change();

			expect(targetPart.field.state()).to(equal, "DEFAULT");
		});

		it("should reset dropdown to 'please select' if dependent element changes", function() {
			var part = new Part1();
			var targetPart = new Part2();

			part.resets(targetPart, ["dropdown"]);

			targetPart.dropdown.state("SOMEVAL");
			part.field.state("new value").change();

			expect(targetPart.dropdown.state()).to(equal, "please select");
		});

		it("should reset radio button groups to default values", function() {
			var part = new Part1();
			var targetPart = new Part2();

			part.resets(targetPart, ["radios", "radios2", "radios3"]);

			targetPart.setState({ radios: "YES", radios2: "OPTION1", radios3: "YES" });

			part.setState({ field: "new" });

			expect(targetPart.getState()).to(contain_object, { radios: "NO", radios2: "OPTION2", radios3: null });
		});

		it("should update dependent MODEL/DERIVED fields by a DERIVED field", function() {
			var part = new PartWithDerivedField();
			var targetPart = new Part2();

			part.changes(targetPart, { copyOfField: "field" });
			part.changes(targetPart, { copyOfField: "span" });

			part.setState({ field: "GOOD" });

			expect(targetPart.field.state()).to(equal, "GOOD");
			expect(targetPart.span.text()).to(equal, "GOOD");
		});

		it("should update dependent MODEL/DERIVED fields by a MODEL field", function() {
			var part = new PartWithDerivedField();
			var targetPart = new Part2();

			part.changes(targetPart, { field: "field" });
			part.changes(targetPart, { field: "span" });

			part.setState({ field: "GOOD" });

			expect(targetPart.field.state()).to(equal, "GOOD");
			expect(targetPart.span.text()).to(equal, "GOOD");
		});

		it("should update dependent input specified by selector by a MODEL field", function() {
			var part = new Part2();

			part.changes(null, { field: "#part1_field" });

			part.setState({ field: "GOOD" });

			expect($("#part1_field").val()).to(equal, "GOOD");
		});

		it("should update dependent input specified by selector by a DERIVED field", function() {
			var part = new PartWithDerivedField();

			part.changes(null, { copyOfField: "#span" });

			part.setState({ field: "GOOD" });

			expect($("#span").text()).to(equal, "GOOD");
		});

		it("should update dependent field with specific event indicating a change", function() {
			var part = new Part1();
			var targetPart = new Part2();

			part.changes(targetPart, { field: "field" }, "blur");

			part.field.state("VALUE").blur().change();

			expect(targetPart.field.state()).to(equal, "VALUE");
		});
	});
	
	describe("Show / Hide extra fields group", function() {

		it("should show extra fields if condition is satisfied", function() {
			var part1 = new Part1();
			var part2 = new Part2();

			part1.showHideSection("#container", ["field"], part2.radios2, "OPTION2");

			part2.setState({ radios2: "OPTION1" });
			expect(part1.field).to_not(be_visible);

			part2.setState({ radios2: "OPTION2" });
			expect(part1.field).to(be_visible);
		});

		it("should trigger show/hide while setting up show hide section", function() {
			var part1 = new Part1();
			var part2 = new Part2();

			expect(part1.field).to(be_visible);

			part1.showHideSection("#container", ["field"], part2.radios2, "OPTION3");

			expect(part1.field).to_not(be_visible);
		});
	});

});
