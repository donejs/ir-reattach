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

	function doneSsrAttach(fragment) {
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
					swap(document.head, fragment.querySelector("head"));
					swap(document.body, fragment.querySelector("body"));
					document.documentElement.setAttribute("data-attached", "");
				}
			}
		}

		mo.observe(fragment, {childList: true, subtree: true});
	}

	function isScriptOrStyle(node) {
		var nn = node.nodeName;
		return nn && (nn === "SCRIPT" || nn === "STYLE" || (nn === "LINK" && nn.rel === "stylesheet"));
	}

	function swap(parent, newParent) {
		if(!newParent) {
			return;
		}

		function loop(parent, cb) {
			var child = parent.firstChild, next;
			while(child) {
				next = child.nextSibling;
				if(!isScriptOrStyle(child)) {
					cb(child);
				}
				child = next;
			}
		}

		loop(parent, function(child){
			parent.removeChild(child);
		});

		loop(newParent, function(child){
			parent.appendChild(child);
		});
	}

	return attacher;
}
