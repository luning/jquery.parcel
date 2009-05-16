// Turn off animation of jQuery during testing
$.fx.off = true;

// Ensure that forms are never submitted
$(document).ready(function() {
  $('form').submit(function() {
    return false;
  });
});

// screw does not report error of screw expect() call if it's in an event handler, use method below as a workaround
var errorOfExpect = function(expectFn){
  try{
    expectFn();
  } catch(ex) {
    return ex.toString();
  }
}