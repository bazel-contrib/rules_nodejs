!function() {
    "use strict";
    console.log("Hello, Alice in Wonderland");
    var A = function() {
        function A() {}
        A.prototype.a = function() {
            return document.a;
        };
        return A;
    }();
    console.error(new A().a());
}();