// Turn off animation of jQuery during testing
$.fx.off = true;

// Ensure that forms are never submitted
$(document).ready(function() {
  $('form').submit(function() {
    return false;
  });
});

var errorOfExpect = function(fn){
  try{
    fn();
  } catch(ex) {
    return ex.toString();
  }
}