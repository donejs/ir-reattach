const isAttached = require("./common").isAttached;

// Get the depth of a Node
function depth(root) {
	let i = 0;
	let walker = document.createTreeWalker(root, 0xFFFFFFFF, {
		acceptNode: function(node){
			let nt = node.nodeType;
			return nt === 1 || nt === 3;
		}
	});

	while(walker.nextNode()) {
		i++;
	}
	return i;
}

function reattach(otherDocument, onComplete) {
	let observer = new MutationObserver(checkCompleteness);

	function checkCompleteness() {
		let docDepth = depth(document.documentElement);
		let fragDepth = depth(otherDocument.documentElement);
		let attached = isAttached();

		if(!attached) {
			attached = docDepth <= fragDepth;
		}

		if(attached) {
			observer.disconnect();
			// reattach now
			if(!isAttached()) {
				document.documentElement.setAttribute("data-attached", "");
				onComplete();
			}
		}
	}

	observer.observe(otherDocument, {childList: true, subtree: true});
}

module.exports = reattach;
