import MutationEncoder from "./encoder.mjs";

export function generateMutation(cb) {
	const doc = document.implementation.createHTMLDocument("Server document");
	doc.documentElement.innerHTML = document.documentElement.innerHTML;

	async function startAttaching() {
		await import("../ir-reattach.mjs");
		window.dispatchEvent(new CustomEvent("reattach-listening"));
	}

	new MutationObserver(records => {
		mockFetch(doc, [records]);

		startAttaching();
	}).observe(doc, { childList: true, subtree: true });

	cb(doc);
}

export function mockFetch(document, mutations) {
	const oldFetch = self.fetch;
	const encoder = new MutationEncoder(document);
	const records = mutations.map(m => encoder.encode(m));

	self.fetch = function(url){
		class Reader {
			constructor() {
				this.records = records;
			}

			async read() {
				let bytes = this.records.shift();
				if(!bytes) {
					return { done: true };
				}

				return { value: bytes };
			}
		}

		let response = {
			body: {
				getReader() {
					return new Reader();
				}
			}
		};

		return Promise.resolve(response);
	};

	return () => self.fetch = oldFetch;
}

// This is mostly for debugging
export function listNodes(doc) {
	let walker = doc.createTreeWalker(doc, -1);
	let index = 0;
	let currentNode = walker.nextNode();

	let nodes = [];

	while(currentNode) {
		index++;
		nodes.push(currentNode);
		currentNode = walker.nextNode();
	}

	console.log(nodes);
	return nodes;
}
