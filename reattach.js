module.exports = createAttacher;

function createAttacher() {
	var attacher = Object.create(null);
	attacher.attached = false;
	attacher.doneSsrAttach = doneSsrAttach;

	// Get the depth of a Node
	function depth(root) {
		var i = 0;
		var walker = document.createTreeWalker(root, 0xFFFFFFFF, {
			acceptNode: function(node){
				var nt = node.nodeType;
				return nt === 1 || nt === 3;
			}
		});

		while(walker.nextNode()) {
			i++;
		}
		return i;
	}

	function isAttached() {
		return document.documentElement.hasAttribute("data-attached");
	}

	function doneSsrAttach(fragment, callback) {
		if(!callback) { callback = Function.prototype; }
		var mo = new MutationObserver(checkCompleteness);

		function checkCompleteness() {
			var docDepth = depth(document);
			var fragDepth = depth(fragment);
			var attached = isAttached();

			if(!attached) {
				attached = docDepth <= fragDepth;
			}

			if(attached) {
				mo.disconnect();
				// reattach now
				if(!isAttached()) {
					document.documentElement.setAttribute("data-attached", "");
					callback();
				}
			}
		}

		mo.observe(fragment, {childList: true, subtree: true});
	}

	return attacher;
}
