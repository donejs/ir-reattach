const render = require("./render");
const reattach = require("./reattach");

const url = document.documentElement.dataset.streamurl;

function removeSelf() {
	let p = window.parent;
	if(p.closeSsrIframe) {
		p.closeSsrIframe();
	}
}

render({
	fetch, url, onStart: () => {
		reattach(window.parent.document, removeSelf);
	}
});
