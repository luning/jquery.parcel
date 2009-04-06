addScriptTag("screw.builder.js");
addScriptTag("screw.matchers.js");
addScriptTag("screw.events.js");
addScriptTag("screw.behaviors.js");
addScriptTag("screw.mocking.js");
addScriptTag("smoke.core.js");
addScriptTag("smoke.mock.js");
addScriptTag("smoke.stub.js");
addScriptTag("jquery.fn.js");
addScriptTag("jquery.print.js");

document.write("<link rel=\"stylesheet\" type=\"text/css\" href=\"lib/screw.css\"/>");

function addScriptTag(file) {
	document.write("<script src=\"" + file + "\"></script>");
}