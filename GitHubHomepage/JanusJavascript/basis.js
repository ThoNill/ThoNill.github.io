
function doNothing() {
}

function getName(attributes) {
	if (attributes == undefined) {
		return this.getName(this.attributes);
	}
	return attributes['name'];
}

function addToArray(arr, child) {
	if (child != undefined) {
		if (arr == undefined) {
			arr = [];
		}
		arr[arr.length] = child;
	}
	return arr;
}

function addChild(child) {
	this.childs = addToArray(this.childs, child);
	return this;
}

function addListener(child) {
	this.listeners = addToArray(this.listeners, child);
	return this;
}

function convertToAttributeHash(domAttributes) {
	var attributes = {};
	if (domAttributes != undefined) {
		for (var i = 0; i < domAttributes.length; i++) {
			var a = domAttributes.item(i);
			attributes[a.name] = a.value;
		}
	}
	return attributes;
}

function escapeTextToShowIt ( text) {
	
	text = text.replace(/&/g, '&amp;');
	text = text.replace(/"/g, '&quot;');
	text = text.replace(/</g, '&lt;');
	text = text.replace(/>/g, '&gt;');
	text = text.replace(/\t/g, '   ');
	text = text.replace(/ /g, '&nbsp;');
	text = text.replace(/\n/g, '<br>');
	
	return text;
}