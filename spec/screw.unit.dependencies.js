addScriptTag("lib/screw.builder.js");
addScriptTag("lib/screw.matchers.js");
addScriptTag("lib/screw.events.js");
addScriptTag("lib/screw.behaviors.js");
addScriptTag("lib/screw.mocking.js");
addScriptTag("lib/smoke.core.js");
addScriptTag("lib/smoke.mock.js");
addScriptTag("lib/smoke.stub.js");
addScriptTag("lib/jquery.fn.js");
addScriptTag("lib/jquery.print.js");

document.write("<link rel=\"stylesheet\" type=\"text/css\" href=\"lib/screw.css\"/>");

function addScriptTag(file) {
	document.write("<script src=\"" + file + "\"></script>");
}