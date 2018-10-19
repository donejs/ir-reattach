const Instructions = {
	Zero: 0,
	Insert: 1,
	Remove: 2,
	Move: 3,
	Text: 4,
	SetAttr: 5,
	RemoveAttr: 6,
	Prop: 7
};

var doneMutation_1_1_0_tags = Instructions;

var decodeNode_1 = decodeNode;
var decodeString_1 = decodeString;
var decodeType_1 = decodeType;
var toUint16_1 = toUint16;

function toUint16(iter) {
	let high = iter.next().value;
	let low = iter.next().value;
	return (((high & 255) << 8) | (low & 255));
}

function decodeString(bytes) {
	let string = "";
	while(true) {
		let { value } = bytes.next();
		switch(value) {
			case doneMutation_1_1_0_tags.Zero:
				return string;
			default:
				string += String.fromCharCode(value);
				break;
		}
	}
}

function decodeType(bytes) {
	let type = bytes.next().value;
	switch(type) {
		case 1:
			return Boolean(bytes.next().value);
		case 2:
			return Number(bytes.next().value);
		case 3:
			return decodeString(bytes);
		default:
			throw new Error(`The type ${type} is not recognized.`);
	}
}

function decodeNode(bytes, nodeType, document) {
	switch(nodeType) {
		case 3:
			return document.createTextNode(decodeString(bytes));
		case 1:
			return decodeElement(bytes, document);
		default:
			throw new Error(`Unable to decode nodeType ${nodeType}`);
	}
}

function decodeElement(bytes, document) {
	let el = document.createElement(decodeString(bytes));

	let attributeName = decodeString(bytes);
	while(attributeName) {
		let attributeValue = decodeString(bytes);
		el.setAttribute(attributeName, attributeValue);
		attributeName = decodeString(bytes);
	}

	let parent = el;
	let nodeType = bytes.next().value;
	while(nodeType !== doneMutation_1_1_0_tags.Zero) {
		let el = decodeNode(bytes, nodeType, document);
		parent.appendChild(el);
		nodeType = bytes.next().value;
	}

	return el;
}

var doneMutation_1_1_0_decode = {
	decodeNode: decodeNode_1,
	decodeString: decodeString_1,
	decodeType: decodeType_1,
	toUint16: toUint16_1
};

const {
	decodeNode: decodeNode$1, decodeString: decodeString$1, decodeType: decodeType$1, toUint16: toUint16$1
} = doneMutation_1_1_0_decode;


function* walk(root, nextIndex) {
	const document = getDocument(root);
	const walker = document.createTreeWalker(root, -1);
	let index = 0;
	let currentNode = walker.nextNode();

	while(true) {
		if(index === nextIndex) {
			nextIndex = yield currentNode;
		} else if(index < nextIndex) {
			index++;
			currentNode = walker.nextNode();
		} else {
			index--;
			currentNode = walker.previousNode();
		}
	}
}

function getDocument(node) {
		return node.nodeType === 9 ? node : node.ownerDocument;
}

class MutationPatcher {
	constructor(root) {
		this.root = root;
		this._startWalker();
	}

	_startWalker() {
		this.walker = walk(this.root, 0);
		this.walker.next();
	}

	patch(bytes) {
		const iter = bytes[Symbol.iterator]();
		const root = this.root;
		const document = getDocument(root);

		for(let byte of iter) {
			let index, ref, node, child;

			switch(byte) {
				case doneMutation_1_1_0_tags.Zero:
					break;
				case doneMutation_1_1_0_tags.Insert:
					index = toUint16$1(iter);
					ref = toUint16$1(iter);
					let nodeType = iter.next().value;
					child = decodeNode$1(iter, nodeType, document);
					let parent = this.walker.next(index).value;
					let sibling = getChild(parent, ref);
					parent.insertBefore(child, sibling);
					break;
				case doneMutation_1_1_0_tags.Remove:
					index = toUint16$1(iter);
					let childIndex = toUint16$1(iter);
					let el = this.walker.next(index).value;
					child = getChild(el, childIndex);
					el.removeChild(child);
					this._startWalker();
					break;
				case doneMutation_1_1_0_tags.Text:
					index = toUint16$1(iter);
					let value = decodeString$1(iter);
					node = this.walker.next(index).value;
					node.nodeValue = value;
					break;
				case doneMutation_1_1_0_tags.SetAttr:
					index = toUint16$1(iter);
					node = this.walker.next(index).value;
					let attrName = decodeString$1(iter);
					let attrValue = decodeString$1(iter);
					node.setAttribute(attrName, attrValue);
					break;
				case doneMutation_1_1_0_tags.RemoveAttr:
					index = toUint16$1(iter);
					node = this.walker.next(index).value;
					node.removeAttribute(decodeString$1(iter));
					break;
				case doneMutation_1_1_0_tags.Prop:
					index = toUint16$1(iter);
					node = this.walker.next(index).value;
					node[decodeString$1(iter)] = decodeType$1(iter);
					break;
				default:
					throw new Error(`The instruction ${byte} is not supported.`);
			}
		}
	}
}

function getChild(parent, index) {
	let i = 0, child = parent.firstChild;
	while(i < index) {
		i++;
		child = child.nextSibling;
	}
	return child;
}

var doneMutation_1_1_0_patch = MutationPatcher;

var isAttached = function() {
	return document.documentElement.hasAttribute("data-attached");
};

var common = {
	isAttached: isAttached
};

const parentSymbol = Symbol.for("done.parentNode");

class NodeIndex {
	constructor(root) {
		this.root = root;
		this.map = new WeakMap();
		this.parentMap = new WeakMap();
		this.walk(root);
		this._onMutations = this._onMutations.bind(this);
	}

	reIndexFrom() {
		// TODO make this not horrible.
		// This should walk up the parents until it finds a parent without
		// Any nextSiblings.
		let startNode = this.root;
		this.walk(startNode);
	}

	setParentIndex(searchNode) {
		let parent = searchNode.parentNode;
		let node = parent.firstChild;
		let index = 0;

		while(node && node !== searchNode) {
			index++;
			node = node.nextSibling;
		}

		this.parentMap.set(searchNode, index);
	}

	// Based on https://gist.github.com/cowboy/958000
	walk(node, startIndex = 0) {
		let skip, tmp;
		let parentIndex = new Map();
		parentIndex.set(node, 0);

		// This depth value will be incremented as the depth increases and
		// decremented as the depth decreases. The depth of the initial node is 0.
		let depth = 0;
		let index = startIndex;

		// Always start with the initial element.
		do {
			if ( !skip && (tmp = node.firstChild) ) {
				// If not skipping, get the first child. If there is a first child,
				// increment the index since traversing downwards.
				depth++;

				// Set the index of this node
				this.map.set(tmp, index);

				parentIndex.set(node, 0);
				this.parentMap.set(tmp, 0);
				tmp[parentSymbol] = node;

				index++;
			} else if ( tmp = node.nextSibling ) {
				// If skipping or there is no first child, get the next sibling. If
				// there is a next sibling, reset the skip flag.
				skip = false;
				this.map.set(tmp, index);

				let parentI = parentIndex.get(tmp.parentNode) + 1;
				parentIndex.set(tmp.parentNode, parentI);
				this.parentMap.set(tmp, parentI);
				tmp[parentSymbol] = tmp.parentNode;

				index++;
			} else {
				// Skipped or no first child and no next sibling, so traverse upwards,
				tmp = node.parentNode;
				// and decrement the depth.
				depth--;
				// Enable skipping, so that in the next loop iteration, the children of
				// the now-current node (parent node) aren't processed again.
				skip = true;
			}

			// Instead of setting node explicitly in each conditional block, use the
			// tmp var and set it here.
			node = tmp;

			// Stop if depth comes back to 0 (or goes below zero, in conditions where
			// the passed node has neither children nore next siblings).
		} while ( depth > 0 );
	}

	// Get the cached index of a Node. If you can't find that,
	// Walk up to a parent that is indexed. At that point index down its children.
	for(node) {
		if(this.map.has(node)) {
			return this.map.get(node);
		}

		throw new Error("We don't know about this node", node);
	}

	fromParent(node) {
		let parent = node[parentSymbol];
		let parentIndex = this.for(parent);
		let childIndex = this.parentMap.get(node);
		return [parentIndex, childIndex];
	}

	purge(node) {
		// TODO this should do something different...
		let index = this.for(node);
		this.map.delete(node);
		this.parentMap.delete(node);
		return index;
	}

	startObserving() {
		let doc = this.root.nodeType === 9 ? this.root : this.root.ownerDocument;
		let window = doc.defaultView;
		console.assert(window, "Cannot observe without a 'window' object");
		let MutationObserver = window.MutationObserver;
		console.assert(MutationObserver, "Cannot observe without a MutationObserver");
		this._observer = new MutationObserver(this._onMutations);
		this._observer.observe(this.root, {
			subtree: true,
			childList: true
		});
	}

	stopObserving() {
		if(this._observer) {
			this._observer.disconnect();
		}
	}

	_onMutations(records) {
		// Ensure that we have indexed each added Node.
		let index = this;
		records.forEach(function(record){
			record.addedNodes.forEach(function(node){
				index.reIndexFrom(node);
			});
		});
	}
}

var doneMutation_1_1_0_index = NodeIndex;

function* toUint8(n) {
	yield ((n >> 8) & 0xff); // high
	yield n & 0xff; // low
}

function* encodeString(text) {
	for(let i = 0, len = text.length; i < len; i++) {
		yield text.charCodeAt(i);
	}
	yield doneMutation_1_1_0_tags.Zero;
}

function* encodeType(val) {
	switch(typeof val) {
		case "boolean":
			yield 1;
			yield Number(val);
			break;
		case "number":
			yield 2;
			yield val|0;
			break;
		case "string":
			yield 3;
			yield* encodeString(val);
			break;
	}
}

function* encodeElement(element) {
	// Tag Name
	yield* encodeString(element.tagName.toLowerCase());

	// Attributes
	for(let attribute of element.attributes) {
		yield* encodeString(attribute.name);
		yield* encodeString(attribute.value);
	}
	yield doneMutation_1_1_0_tags.Zero;

	// Children
	let child = element.firstChild;
	while(child) {
		yield* encodeNode(child);
		child = child.nextSibling;
	}
	yield doneMutation_1_1_0_tags.Zero; // End of children
}

function* encodeNode(node) {
	yield node.nodeType;

	switch(node.nodeType) {
		case 1:
			yield* encodeElement(node);
			break;
		case 3:
			yield* encodeString(node.nodeValue);
			break;
		default:
			throw new Error(`Cannot yet encode nodeType ${node.nodeType}`);
	}
}

class MutationEncoder {
	constructor(rootOrIndex) {
		if(rootOrIndex instanceof doneMutation_1_1_0_index) {
			this.index = rootOrIndex;
		} else {
			this.index = new doneMutation_1_1_0_index(rootOrIndex);
		}

		this._indexed = false;
	}

	encodeEvent(event) {
		return Uint8Array.from(this.event(event));
	}

	encode(records) {
		return Uint8Array.from(this.mutations(records));
	}

	*mutations(records) {
		const index = this.index;
		const removedNodes = new WeakSet();

		let i = 0, iLen = records.length;
		let rangeStart = null, rangeEnd = null;

		//for(;i < iLen; i++) {
		while(i < iLen) {
			let record = records[i];
			let j, jLen;

			switch(record.type) {
				case "childList":
					// This adjusts the index so that we do removals in reverse order
					// Let's say we had an array of mutations like:
					// [{removedNodes:[1]}, {removedNodes:[2]}, {removedNodes:[3]}
					// {addedNodes:[1]}, {addedNodes:[2]}, {addedNodes:[3]}]
					// We want to do all of the removals first, in reverse order
					// And then proceed to the addedNode records.
					// This is achieved by keeping a start and end index for the
					// removal groupings
					if(isRemovalRecord(record)) {
						if(rangeStart == null) {
							rangeStart = i;
						}
						if(rangeEnd == null) {
							let nextRecord = records[i + 1];
							if(nextRecord && isRemovalRecord(nextRecord)) {
								i++;
								continue;
							} else {
								rangeEnd = i;
							}
						}
					}

					for(j = 0, jLen = record.removedNodes.length; j < jLen; j++) {
						let node = record.removedNodes[j];

						// If part of this set, it means that this node
						// was inserted and removed in the same Mutation event
						// in this case nothing needs to be encoded.
						if(removedNodes.has(node)) {
							continue;
						}

						let [parentIndex, childIndex] = index.fromParent(node);
						index.purge(node);
						yield doneMutation_1_1_0_tags.Remove;
						yield* toUint8(parentIndex);
						yield* toUint8(childIndex);
					}

					for (let node of record.addedNodes) {
						if(node.parentNode) {
							let parentIndex = index.for(node.parentNode);
							//index.reIndexFrom(node);

							yield doneMutation_1_1_0_tags.Insert;
							yield* toUint8(parentIndex);
							yield* toUint8(getChildIndex(node.parentNode, node)); // ref
							yield* encodeNode(node);
						} else {
							// No parent means it was removed in the same mutation.
							// Add it to this set so that the removal can be ignored.
							removedNodes.add(node);
						}
					}

					break;
				case "characterData":
					yield doneMutation_1_1_0_tags.Text;
					yield* toUint8(index.for(record.target));
					yield* encodeString(record.target.nodeValue);
					break;
				case "attributes":
					let attributeValue = record.target.getAttribute(record.attributeName);
					if(attributeValue == null) {
						yield doneMutation_1_1_0_tags.RemoveAttr;
						yield* toUint8(index.for(record.target));
						yield* encodeString(record.attributeName);
					} else {
						yield doneMutation_1_1_0_tags.SetAttr;
						yield* toUint8(index.for(record.target));
						yield* encodeString(record.attributeName);
						yield* encodeString(attributeValue);
					}
					break;
			}

			// If there is no rangeStart/end proceed
			if(rangeStart == null && rangeEnd == null) {
				i++;
			} else {
				// If we have reached the first removal record
				// Then all removals have been processed and we can
				// skip ahead to the next non-removal record.
				if(i === rangeStart) {
					i = rangeEnd + 1;
					rangeStart = null;
					rangeEnd = null;
				}
				// Continue down to the next removal record.
				else {
					i--;
				}
			}
		}

		// Reindex so that the next set up mutations will start from the correct indices
		index.reIndexFrom();
	}

	*event(event) {
		let index = this.index;
		switch(event.type) {
			case "change":
				yield doneMutation_1_1_0_tags.Prop;
				yield* toUint8(index.for(event.target));
				if(event.target.type === "checkbox") {
					yield* encodeString("checked");
					yield* encodeType(event.target.checked);
				} else {
					yield* encodeString("value");
					yield* encodeType(event.target.value);
				}
				break;
			default:
				throw new Error(`Encoding the event '${event.type}' is not supported.`);
		}
	}
}

function getChildIndex(parent, child) {
	let index = 0;
	let node = parent.firstChild;
	while(node) {
		if(node === child) {
			return index;
		}
		index++;
		node = node.nextSibling;
	}
	return -1;
}

function isRemovalRecord(record) {
	return record.removedNodes.length > 0 && record.addedNodes.length === 0;
}


var doneMutation_1_1_0_encoder = MutationEncoder;

const {
	decodeString: decodeString$2,
	decodeNode: decodeNode$2,
	decodeType: decodeType$2,
	toUint16: toUint16$2
} = doneMutation_1_1_0_decode;


class MutationDecoder {
	constructor(document) {
		this.document = document || window.document;
	}

	*decode(bytes) {
		const document = this.document;
		let iter = toIterator(bytes);
		let mutation;

		for(let byte of iter) {
			let index, ref;

			switch(byte) {
				case doneMutation_1_1_0_tags.Zero:
					break;
				case doneMutation_1_1_0_tags.Insert:
					index = toUint16$2(iter);
					ref = toUint16$2(iter);
					let nodeType = iter.next().value;
					mutation = {type: "insert", index, ref, nodeType};
					mutation.node = decodeNode$2(iter, nodeType, document);
					yield mutation;
					break;
			  case doneMutation_1_1_0_tags.Move:
					index = toUint16$2(iter);
					let from = iter.next().value;
					ref = iter.next().value;
					mutation = {type: "move", from, index, ref};
					yield mutation;
					break;
				case doneMutation_1_1_0_tags.Remove:
					index = toUint16$2(iter);
					let child = toUint16$2(iter);
					mutation = {type: "remove", index, child};
					yield mutation;
					break;
				case doneMutation_1_1_0_tags.Text:
					index = toUint16$2(iter);
					let value = decodeString$2(iter);
					mutation = {type: "text", index, value};
					yield mutation;
					break;
				case doneMutation_1_1_0_tags.SetAttr:
					index = toUint16$2(iter);
					let attrName = decodeString$2(iter);
					let newValue = decodeString$2(iter);
					mutation = {type: "set-attribute", index, attrName, newValue};
					yield mutation;
					break;
				case doneMutation_1_1_0_tags.RemoveAttr:
					index = toUint16$2(iter);
					mutation = {type: "remove-attribute", index, attrName: decodeString$2(iter)};
					yield mutation;
					break;
				case doneMutation_1_1_0_tags.Prop:
					index = toUint16$2(iter);
					mutation = {type: "property", index, property: decodeString$2(iter), value: decodeType$2(iter)};
					yield mutation;
					break;
				default:
					throw new Error(`Cannot decode instruction '${byte}'.`);
			}
		}
	}
}

function toIterator(obj) {
	if(obj[Symbol.iterator]) {
		return obj[Symbol.iterator]();
	}
	return obj;
}

var doneMutation_1_1_0_decoder = MutationDecoder;

var instructions = function(bytes) {
	let decoder = new doneMutation_1_1_0_decoder(document);
	console.group("Mutations");
	for(let mutation of decoder.decode(bytes)) {
		console.log(mutation);
	}
	console.groupEnd();
};

var element = function(root) {
	let encoder = new doneMutation_1_1_0_encoder(root);
	let decoder = new doneMutation_1_1_0_decoder(root.ownerDocument);

	function callback(records) {
		console.group("Mutations");
		let bytes = encoder.encode(records);
		for(let mutation of decoder.decode(bytes)) {
			console.log(mutation);
		}
		console.groupEnd();
	}

	let mo = new MutationObserver(callback);
	mo.observe(root, { subtree: true, characterData: true, childList: true, attributes: true });
	return mo;
};

var doneMutation_1_1_0_log = {
	instructions: instructions,
	element: element
};

const isAttached$1 = common.isAttached;

//!steal-remove-start

//!steal-remove-end

// Read a value from the stream and pass it to the patcher
async function read(reader, patcher) {
	let {done, value} = await reader.read();

	if(done || isAttached$1()) {
		return false;
	}

	//!steal-remove-start
	doneMutation_1_1_0_log.instructions(value);
	//!steal-remove-end

	patcher.patch(value);
	return true;
}

async function incrementallyRender({fetch, url, onStart}) {
	let response = await fetch(url, { crendentials: "same-origin" });
	let reader = response.body.getReader();
	let patcher = new doneMutation_1_1_0_patch(document);

	await read(reader, patcher);
	onStart();
	while(await read(reader, patcher)) {}
}

var render = incrementallyRender;

const isAttached$2 = common.isAttached;

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
		let attached = isAttached$2();

		if(!attached) {
			attached = docDepth <= fragDepth;
		}

		if(attached) {
			observer.disconnect();
			// reattach now
			if(!isAttached$2()) {
				document.documentElement.setAttribute("data-attached", "");
				onComplete();
			}
		}
	}

	observer.observe(otherDocument, {childList: true, subtree: true});
}

var reattach_1 = reattach;

const url = document.documentElement.dataset.streamurl;

function removeSelf() {
	let p = window.parent;
	if(p.closeSsrIframe) {
		p.closeSsrIframe();
	}
}

render({
	fetch, url, onStart: () => {
		reattach_1(window.parent.document, removeSelf);
	}
});

var irReattach = {

};

export default irReattach;
