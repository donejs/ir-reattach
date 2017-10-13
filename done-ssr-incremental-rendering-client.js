var apply = require("dom-patch/apply");
var createAttacher = require("./reattach");

var streamurl = document.currentScript.dataset.streamurl;
var att = createAttacher();

function isAttached() {
	return document.documentElement.hasAttribute("data-attached");
}

function render(instruction){
	apply(document, instruction);
}

function removeSelf() {
	var p = window.parent;
	if(p.closeSsrIframe) {
		p.closeSsrIframe();
	}
}

fetch(streamurl, {
	credentials: "same-origin"
}).then(function(response){
	var reader = response.body.getReader();
	var decoder = new TextDecoder();

	function read() {
		return reader.read().then(function(result){
			var resultValue = result.value || new Uint8Array();
			var chunk = decoder.decode(resultValue);

			// If already attached stop reading
			if(isAttached()) {
				return;
			}

			chunk.split("\n")
			.filter(function(str) { return str.length; })
			.map(function(itemStr){
				return JSON.parse(itemStr);
			})
			.forEach(function(instruction){
				render(instruction);
			});

			if(!result.done) {
				return read();
			}
		});
	}

	return read().catch(function(err){
		console.error(err);
	});
});

var doneSsrAttach = att.doneSsrAttach;

// Start doing reattachment
doneSsrAttach(window.parent.document.documentElement, removeSelf);
