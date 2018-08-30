const MutationPatcher = require("done-mutation/patch");
const isAttached = require("./common").isAttached;

// Read a value from the stream and pass it to the patcher
async function read(reader, patcher) {
	let {done, value} = await reader.read();

	if(done || isAttached()) {
		return false;
	}

	patcher.patch(value);
	return true;
}

async function incrementallyRender({fetch, url, onStart}) {
	let response = await fetch(url, { crendentials: "same-origin" });
	let reader = response.body.getReader();
	let patcher = new MutationPatcher(document);

	await read(reader, patcher);
	onStart();
	while(await read(reader, patcher)) {}
}

module.exports = incrementallyRender;
