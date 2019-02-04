const render = require("./render");
const reattach = require("./reattach");

const url = document.documentElement.dataset.streamurl;

async function onAttachment() {
	let p = window.parent;
	if(p.irLinksLoaded) {
		await p.irLinksLoaded();
	}
	if(p.closeSsrIframe) {
		p.closeSsrIframe();
	}
}

render({
	fetch, url,
	onStart: () => {
		reattach(window.parent.document, onAttachment);
	},
	onError: onAttachment
});
