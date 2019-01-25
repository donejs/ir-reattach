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

var doneMutation_3_1_0_tags = Instructions;

var doneMutation_3_1_0_walk = function(node, callback, startIndex = 0) {
	let skip, tmp;
	let depth = 0;
	let index = startIndex;

	// Always start with the initial element.
	do {
		if ( !skip && (tmp = node.firstChild) ) {
			depth++;
			callback('child', node, tmp, index);
			index++;
		} else if ( tmp = node.nextSibling ) {
			skip = false;
			callback('sibling', node, tmp, index);
			index++;
		} else {
			tmp = node.parentNode;
			depth--;
			skip = true;
		}
		node = tmp;
	} while ( depth > 0 );
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

	reindex() {
		this.walk(this.root);
	}

	reIndexFrom(startNode) {
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
		let parentIndex = new Map();
		parentIndex.set(node, 0);

		doneMutation_3_1_0_walk(node, (type, node, child, index) => {
			switch(type) {
				case 'child': {
					// Set the index of this node
					this.map.set(child, index);

					parentIndex.set(node, 0);
					this.parentMap.set(child, 0);
					child[parentSymbol] = node;
					break;
				}
				case 'sibling': {
					this.map.set(child, index);

					let parentI = parentIndex.get(child.parentNode) + 1;
					parentIndex.set(child.parentNode, parentI);
					this.parentMap.set(child, parentI);

					child[parentSymbol] = child.parentNode;
					break;
				}
			}
		}, startIndex);
	}

	contains(node) {
		return this.map.has(node);
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

		// If there is no parent it usually means the element was removed
		// before the parent's insertion mutation occurred.
		if(!parent) {
			return null;
		}

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
				index.reIndexFrom(node.parentNode);
			});
		});
	}
}



var doneMutation_3_1_0_index = NodeIndex;

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var utf8_3_0_0_utf8 = createCommonjsModule(function (module, exports) {
(function(root) {

	var stringFromCharCode = String.fromCharCode;

	// Taken from https://mths.be/punycode
	function ucs2decode(string) {
		var output = [];
		var counter = 0;
		var length = string.length;
		var value;
		var extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	// Taken from https://mths.be/punycode
	function ucs2encode(array) {
		var length = array.length;
		var index = -1;
		var value;
		var output = '';
		while (++index < length) {
			value = array[index];
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
		}
		return output;
	}

	function checkScalarValue(codePoint) {
		if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
			throw Error(
				'Lone surrogate U+' + codePoint.toString(16).toUpperCase() +
				' is not a scalar value'
			);
		}
	}
	/*--------------------------------------------------------------------------*/

	function createByte(codePoint, shift) {
		return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
	}

	function encodeCodePoint(codePoint) {
		if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
			return stringFromCharCode(codePoint);
		}
		var symbol = '';
		if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
			symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
		}
		else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
			checkScalarValue(codePoint);
			symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
			symbol += createByte(codePoint, 6);
		}
		else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
			symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
			symbol += createByte(codePoint, 12);
			symbol += createByte(codePoint, 6);
		}
		symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
		return symbol;
	}

	function utf8encode(string) {
		var codePoints = ucs2decode(string);
		var length = codePoints.length;
		var index = -1;
		var codePoint;
		var byteString = '';
		while (++index < length) {
			codePoint = codePoints[index];
			byteString += encodeCodePoint(codePoint);
		}
		return byteString;
	}

	/*--------------------------------------------------------------------------*/

	function readContinuationByte() {
		if (byteIndex >= byteCount) {
			throw Error('Invalid byte index');
		}

		var continuationByte = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		if ((continuationByte & 0xC0) == 0x80) {
			return continuationByte & 0x3F;
		}

		// If we end up here, it’s not a continuation byte
		throw Error('Invalid continuation byte');
	}

	function decodeSymbol() {
		var byte1;
		var byte2;
		var byte3;
		var byte4;
		var codePoint;

		if (byteIndex > byteCount) {
			throw Error('Invalid byte index');
		}

		if (byteIndex == byteCount) {
			return false;
		}

		// Read first byte
		byte1 = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		// 1-byte sequence (no continuation bytes)
		if ((byte1 & 0x80) == 0) {
			return byte1;
		}

		// 2-byte sequence
		if ((byte1 & 0xE0) == 0xC0) {
			byte2 = readContinuationByte();
			codePoint = ((byte1 & 0x1F) << 6) | byte2;
			if (codePoint >= 0x80) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 3-byte sequence (may include unpaired surrogates)
		if ((byte1 & 0xF0) == 0xE0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
			if (codePoint >= 0x0800) {
				checkScalarValue(codePoint);
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 4-byte sequence
		if ((byte1 & 0xF8) == 0xF0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			byte4 = readContinuationByte();
			codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0C) |
				(byte3 << 0x06) | byte4;
			if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
				return codePoint;
			}
		}

		throw Error('Invalid UTF-8 detected');
	}

	var byteArray;
	var byteCount;
	var byteIndex;
	function utf8decode(byteString) {
		byteArray = ucs2decode(byteString);
		byteCount = byteArray.length;
		byteIndex = 0;
		var codePoints = [];
		var tmp;
		while ((tmp = decodeSymbol()) !== false) {
			codePoints.push(tmp);
		}
		return ucs2encode(codePoints);
	}

	/*--------------------------------------------------------------------------*/

	root.version = '3.0.0';
	root.encode = utf8encode;
	root.decode = utf8decode;

}(exports));
});

function* toUint8(n) {
	yield ((n >> 8) & 0xff); // high
	yield n & 0xff; // low
}

function* stringToBytes(text) {
	let enc = utf8_3_0_0_utf8.encode(text);
	let i = 0, point;
	while((point = enc.codePointAt(i)) !== undefined) {
		yield point;
		i++;
	}
}

function* encodeString(text) {
	let arr = Uint8Array.from(stringToBytes(text));
	yield* toUint8(arr.length);
	yield* arr;
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
	yield* toUint8(element.attributes.length);
	for(let attribute of element.attributes) {
		yield* encodeString(attribute.name);
		yield* encodeString(attribute.value);
	}

	// Children
	let child = element.firstChild;
	let hasChildren = !!child;
	yield Number(hasChildren);

	if(hasChildren) {
		while(child) {
			yield* encodeNode(child);
			child = child.nextSibling;
		}
		yield doneMutation_3_1_0_tags.Zero; // End of children
	}
}

function* encodeNode(node) {
	yield node.nodeType;

	switch(node.nodeType) {
		case 1:
			yield* encodeElement(node);
			break;
		case 3:
		case 8:
			yield* encodeString(textValue(node));
			break;
		default:
			throw new Error(`Cannot yet encode nodeType ${node.nodeType}`);
	}
}

function* encodeRemovalMutation(node, parentIndex, childIndex) {
	yield doneMutation_3_1_0_tags.Remove;
	yield* toUint8(parentIndex);
	yield* toUint8(childIndex);
}

function* encodeAddedMutation(node, parentIndex, childIndex) {
	yield doneMutation_3_1_0_tags.Insert;
	yield* toUint8(parentIndex);
	yield* toUint8(childIndex); // ref
	yield* encodeNode(node);
}

function* encodeCharacterMutation(node, parentIndex) {
	yield doneMutation_3_1_0_tags.Text;
	yield* toUint8(parentIndex);
	yield* encodeString(textValue(node));
}

function* encodeAttributeMutation(record, parentIndex) {
	let attributeValue = record.target.getAttribute(record.attributeName);
	if(attributeValue == null) {
		yield doneMutation_3_1_0_tags.RemoveAttr;
		yield* toUint8(parentIndex);
		yield* encodeString(record.attributeName);
	} else {
		yield doneMutation_3_1_0_tags.SetAttr;
		yield* toUint8(parentIndex);
		yield* encodeString(record.attributeName);
		yield* encodeString(attributeValue);
	}
}

function textValue(node) {
	return node.data != null ? node.data : node.nodeValue;
}

function sortMutations(a, b) {
	let aType = a[0];
	let bType = b[0];
	let aIndex = a[1];
	let bIndex = b[1];

	if(aIndex > bIndex) {
		return -1;
	} else if(aIndex < bIndex) {
		return 1;
	}

	if(aType === 0) {
		if(bType === 0) {
			let aChild = a[3];
			let bChild = b[3];

			if(aIndex >= bIndex) {
				if(aChild > bChild) {
					return -1;
				} else {
					return 1;
				}
			} else {
				return 1;
			}
		} else {
			return -1;
		}
	}
	else if(aType === 1) {
		if(bType === 1) {
			let aChild = a[3];
			let bChild = b[3];

			if(aIndex >= bIndex) {
				if(aChild > bChild) {
					return 1;
				} else {
					return -1;
				}
			} else {
				return -1;
			}
		} else if(bType === 0) {
			return 1;
		} else {
			return -1;
		}
	}
	else {
		if(aType > bType) {
			return 1;
		} else {
			return -1;
		}
	}
}

class MutationEncoder {
	constructor(rootOrIndex) {
		if(rootOrIndex instanceof doneMutation_3_1_0_index) {
			this.index = rootOrIndex;
		} else {
			this.index = new doneMutation_3_1_0_index(rootOrIndex);
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
		const addedNodes = new Set();
		const instructions = [];

		for(let record of records) {
			switch(record.type) {
				case "childList":
					for(let node of record.removedNodes) {
						// If part of this set, it means that this node
						// was inserted and removed in the same Mutation event
						// in this case nothing needs to be encoded.
						if(removedNodes.has(node)) {
							continue;
						}

						let indices = index.fromParent(node);
						if(indices !== null) {
							let [parentIndex, childIndex] = indices;
							index.purge(node);
							instructions.push([0, parentIndex,
								encodeRemovalMutation(node, parentIndex, childIndex),
									childIndex]);
						}

					}

					for (let node of record.addedNodes) {
						// If the parent was added in this same mutation set
						// we don't need to (and can't) encode this mutation.
						if(addedNodes.has(node.parentNode)) {
							continue;
						} else if(node.parentNode) {
							let parentIndex = index.for(node.parentNode);
							let childIndex = getChildIndex(node.parentNode, node);

							instructions.push([1, parentIndex, encodeAddedMutation(node, parentIndex, childIndex), childIndex]);

							doneMutation_3_1_0_walk(node, (type, node) => {
								addedNodes.add(node);
							});
						} else {
							// No parent means it was removed in the same mutation.
							// Add it to this set so that the removal can be ignored.
							removedNodes.add(node);
						}
					}

					break;
				case "characterData":
					let node = record.target;
					if(index.contains(node)) {
						let parentIndex = index.for(node);
						instructions.push([2, parentIndex,
							encodeCharacterMutation(node, parentIndex)]);
					}

					break;
				case "attributes": {
					let node = record.target;
					if(index.contains(node)) {
						let parentIndex = index.for(record.target);
						instructions.push([3, parentIndex,
							encodeAttributeMutation(record, parentIndex)]);
					}
					break;
				}
			}
		}

		instructions.sort(sortMutations);
		for(let [,,gen] of instructions) {
			yield* gen;
		}

		// Reindex so that the next set up mutations will start from the correct indices
		index.reindex();
	}

	*event(event) {
		let index = this.index;
		switch(event.type) {
			case "change":
				yield doneMutation_3_1_0_tags.Prop;
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
	let index = -1;
	let node = parent.firstChild;
	while(node) {
		index++;

		if(node === child) {
			return index;
		}
		node = node.nextSibling;
	}
	return -1;
}

var doneMutation_3_1_0_encoder = MutationEncoder;

export default doneMutation_3_1_0_encoder;
