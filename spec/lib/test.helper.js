// extend jQuery for some test helper methods
(function($) {
  $.fn.extend({
    fireNativeEvent: function(type) {
      this.each(function(){
        if (document.createEvent) { // W3C compatible, firefox
          var e = document.createEvent("HTMLEvents");
          e.initEvent(type, true, true);
          this.dispatchEvent(e);
        } else if (document.createEventObject) { // IE
          this.fireEvent("on" + type);
        }
      });
    }
  });
})(jQuery);