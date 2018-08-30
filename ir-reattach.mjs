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
			case doneMutation_1_0_0_tags.Zero:
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
	while(nodeType !== doneMutation_1_0_0_tags.Zero) {
		let el = decodeNode(bytes, nodeType, document);
		parent.appendChild(el);
		nodeType = bytes.next().value;
	}

	return el;
}

var doneMutation_1_0_0_decode = {
	decodeNode: decodeNode_1,
	decodeString: decodeString_1,
	decodeType: decodeType_1,
	toUint16: toUint16_1
};

const {
	decodeNode: decodeNode$1, decodeString: decodeString$1, decodeType: decodeType$1, toUint16: toUint16$1
} = doneMutation_1_0_0_decode;


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
				case doneMutation_1_0_0_tags.Zero:
					break;
				case doneMutation_1_0_0_tags.Insert:
					index = toUint16$1(iter);
					ref = toUint16$1(iter);
					let nodeType = iter.next().value;
					child = decodeNode$1(iter, nodeType, document);
					let parent = this.walker.next(index).value;
					let sibling = getChild(parent, ref);
					parent.insertBefore(child, sibling);
					break;
				case doneMutation_1_0_0_tags.Remove:
					index = toUint16$1(iter);
					let childIndex = toUint16$1(iter);
					let el = this.walker.next(index).value;
					child = getChild(el, childIndex);
					el.removeChild(child);
					this._startWalker();
					break;
				case doneMutation_1_0_0_tags.Text:
					index = toUint16$1(iter);
					let value = decodeString$1(iter);
					node = this.walker.next(index).value;
					node.nodeValue = value;
					break;
				case doneMutation_1_0_0_tags.SetAttr:
					index = toUint16$1(iter);
					node = this.walker.next(index).value;
					let attrName = decodeString$1(iter);
					let attrValue = decodeString$1(iter);
					node.setAttribute(attrName, attrValue);
					break;
				case doneMutation_1_0_0_tags.RemoveAttr:
					index = toUint16$1(iter);
					node = this.walker.next(index).value;
					node.removeAttribute(decodeString$1(iter));
					break;
				case doneMutation_1_0_0_tags.Prop:
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

var doneMutation_1_0_0_patch = MutationPatcher;

var isAttached = function() {
	return document.documentElement.hasAttribute("data-attached");
};

var common = {
	isAttached: isAttached
};

const isAttached$1 = common.isAttached;

// Read a value from the stream and pass it to the patcher
async function read(reader, patcher) {
	let {done, value} = await reader.read();

	if(done || isAttached$1()) {
		return false;
	}

	patcher.patch(value);
	return true;
}

async function incrementallyRender({fetch, url, onStart}) {
	let response = await fetch(url, { crendentials: "same-origin" });
	let reader = response.body.getReader();
	let patcher = new doneMutation_1_0_0_patch(document);

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
