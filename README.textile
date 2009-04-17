Coconut is a <b>jQuery plugin</b>, it is designed to simplify and guide the <b>Object-Oriented</b> encapsulation of client side Javascript code. It's specially useful when creating complicated <b>Form</b> based app with rich client side logic.

h1. Get Started

h2. Two Minutes' Tour

h3. Build a Part

Given partial page as below:

<pre>
<div id="person">
    <input type="text" name="name"/>
    <select name="title">
        <option>Mr</option>
        <option>Mrs</option>
    </select>
    <input type="radio" value="Male" name="gender">Male</input>
    <input type="radio" value="Female" checked="checked" name="gender">Female</input>
</div>
</pre>

Then:

<pre>
var person = $("#person").part();
</pre>

Will build a <b>PART</b> representing person with all fields set up automatically, you can do:

h3. State and Field Operations

<pre>
person.name.state();
# returns "luning", name is there and you can get it's state
# similar as val() on jQuery

person.name.state("smith");
# set state of a field
# similar as val("smith") on jQuery,
# but with proper events fired like what happens in real user interactions

person.state();
# returns { name: "", title: "Mr", gender: "Female" }, get state of the part

person.state({name: "luning", gender: "Male"});
# set the new state of person part
# with events(e.g. change, blur) fired, which will trigger proper handlers

person.isDirty();
# returns true, since the state of person is changed after initialization

person.resetState();
# set state back to the initial one { name: "", title: "Mr", gender: "Female" }
</pre>

h3. Binding and Event Operations

<pre>
person.name.bindState("#id_of_a_label");
# change of name will update the value of target label

person.bindState("#id_of_summary_span", function(s){
    return "summary: " + s.title + " " + s.name + " (" + s.gender + ")";
});
# any field change in person will update summary with a converter function

person.name.change(function(){ /* custom logic */});
person.change(function(){ /* custom logic */});
# change of field or person part will trigger custom handlers
</pre>

h2. Learn More

h3. Mixin Behaviors

You can extend part by mixing in behavior(s).

<pre>
// define a behavior(function)
function Person(){
    this.summary = function(){
        var s = this.state();
        return s.title + " " + s.name + " (" + s.gender + ")";
    }
}

var person = $("#person").part(Person);
person.summary();
# summary method is there for your use
</pre>

Behavior is actually the place you should arrange custom client side logic about person part.

You can also specify the behavior(function) in Dom element by setting the custom "part" property:

<pre>
# <div id="person" part="Person">

var person = $("#person").part();
person.summary();
</pre>

Coconut will pick the behavior up and apply it for you automatically.

h3. Build a Composite Part

You are allowed to build a composite part with another part as field by setting up "part" property on any Dom element which can be used as a container.

<pre>
// add Dom below under person div
# <div part="" name="contact">
#	<input type="text" name="number"/>
#	<input type="text" name="type"/>
# </div>

var person = $("#person").part();

person.state();
# returns { name: "", title: "Mr", gender: "Female", contact: {number: "", type: ""} }

person.contact.state();
# returns {number: "", type: ""}, get state of contact part

person.contact.number.state();
# returns "", get state of the number field in contact part
</pre>

Build a part with a field containing an array of sub-fields with the same name (e.g. person may have multiple emails) by setting "fieldtype" property to "array" on Dom element.

<pre>
// add Dom below under person div
# <input type="text" fieldtype="array" value="a@my.com" name="email"/>
# <input type="text" value="b@my.com" name="email"/> // no need to set fieldtype redundantly

var person = $("#person").part();

person.state();
# returns { name: "", title: "Mr", gender: "Female", emails: ["a@my.com", "b@my.com"] }

person.emails.state();
# returns ["a@my.com", "b@my.com"], get state of emails field which is an array, 

person.emails[0].state();
# returns "a@my.com", get state of the first email
</pre>

h3. Dynamic Behavior (Sync Between Dom and Part)

Adding Dom element(s) dynamically will add corresponding field(s) as well, any event registered on part works for the newly added field(s).

<pre>
# given we have two emails in Dom already
var person = $("#person").part();

var newEmail = $("<input type="text" name="email"></input>");
person.container.append(newEmail);
# Dom is added

newEmail.sync();
# sync() extends jQuery, call it after you add Dom

person.emails.length;
# returns 3, reflects the new email
</pre>

The same thing happens when removing Dom element(s) from Dom, field(s) will be removed.

<pre>
# given we have two emails in Dom already
var person = $("#person").part();

person.container.find("input[name=email]:last").remove();
# last email is removed

person.sync();
# call sync() on part after you remove Dom

person.emails.length;
# returns 1, reflects the removal
</pre>

h1. Rationale

h1. Design Suggestions

h1. API Reference

h1. Q&A
