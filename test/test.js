var QUnit = require("steal-qunit");
var F = require("funcunit");

F.attach(QUnit);

QUnit.module("Basics", {
	setup: function(){
		F.open("//tests/basics.html");
	}
});

QUnit.test("Works", function(){
  F("#testing").exists("The instruction was added");
});
