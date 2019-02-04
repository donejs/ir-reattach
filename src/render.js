const MutationPatcher = require("done-mutation/patch");
const isAttached = require("./common").isAttached;

//!steal-remove-start
const { Logger } = require("done-mutation/log");
const log = new Logger();
//!steal-remove-end

// Read a value from the stream and pass it to the patcher
async function read(reader, patcher) {
	let {done, value} = await reader.read();

	if(done || isAttached()) {
		return false;
	}

	//!steal-remove-start
	log.mutations(value);
	//!steal-remove-end

	patcher.patch(value);
	return true;
}

async function incrementallyRender({fetch, url, onStart, onError}) {
	let response = await fetch(url, { crendentials: "same-origin" });

	// If we get a non-200 response then there's nothing to do here.
	if(!response.ok) {
		onError();
		return;
	}

	let reader = response.body.getReader();
	let patcher = new MutationPatcher(document);

	await read(reader, patcher);
	onStart();
	while(await read(reader, patcher)) {}
}

module.exports = incrementallyRender;
