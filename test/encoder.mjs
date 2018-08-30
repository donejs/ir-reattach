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

var doneMutation_1_0_0_tags = Instructions;

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
		this.reIndexFrom(node);
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

var doneMutation_1_0_0_index = NodeIndex;

function* toUint8(n) {
	yield ((n >> 8) & 0xff); // high
	yield n & 0xff; // low
}

function* encodeString(text) {
	for(let i = 0, len = text.length; i < len; i++) {
		yield text.charCodeAt(i);
	}
	yield doneMutation_1_0_0_tags.Zero;
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
	yield doneMutation_1_0_0_tags.Zero;

	// Children
	let child = element.firstChild;
	while(child) {
		yield* encodeNode(child);
		child = child.nextSibling;
	}
	yield doneMutation_1_0_0_tags.Zero; // End of children
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
		if(rootOrIndex instanceof doneMutation_1_0_0_index) {
			this.index = rootOrIndex;
		} else {
			this.index = new doneMutation_1_0_0_index(rootOrIndex);
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
		const movedNodes = new WeakSet();

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

						{
							let [parentIndex, childIndex] = index.fromParent(node);
							index.purge(node);
							yield doneMutation_1_0_0_tags.Remove;
							yield* toUint8(parentIndex);
							yield* toUint8(childIndex);
						}
					}

					for (let node of record.addedNodes) {
						// If this node was moved we have already done a move instruction
						if(movedNodes.has(node)) {
							throw new Error("Moving nodes is not yet supported");
							//movedNodes.delete(node);
							//continue;
						}

						let parentIndex = index.for(node.parentNode);
						index.reIndexFrom(node);

						yield doneMutation_1_0_0_tags.Insert;
						yield* toUint8(parentIndex);
						yield* toUint8(getChildIndex(node.parentNode, node)); // ref
						yield* encodeNode(node);
					}

					break;
				case "characterData":
					yield doneMutation_1_0_0_tags.Text;
					yield* toUint8(index.for(record.target));
					yield* encodeString(record.target.nodeValue);
					break;
				case "attributes":
					let attributeValue = record.target.getAttribute(record.attributeName);
					if(attributeValue == null) {
						yield doneMutation_1_0_0_tags.RemoveAttr;
						yield* toUint8(index.for(record.target));
						yield* encodeString(record.attributeName);
					} else {
						yield doneMutation_1_0_0_tags.SetAttr;
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
	}

	*event(event) {
		let index = this.index;
		switch(event.type) {
			case "change":
				yield doneMutation_1_0_0_tags.Prop;
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


var doneMutation_1_0_0_encoder = MutationEncoder;

export default doneMutation_1_0_0_encoder;
