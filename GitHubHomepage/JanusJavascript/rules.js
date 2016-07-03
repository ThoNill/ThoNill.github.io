var JanusRules = (function() {

	var ruleFunctions = {};

	function callRuleFunction(name, command, values, callOnOk, callOnError) {
		return (ruleFunctions[name])(command, values, callOnOk, callOnError);
	}

	function addListenerToChilds(parent, listener) {
		parent.addListener(listener);
		if (parent.childs) {
			for (var i = 0; i < parent.childs.length; i++) {
				addListenerToChilds(parent.childs[i], listener);
			}
		}
	}

	var dialogValue = {}

	var ruleTag = {

		RULES : {
			bind : function() {
				if (this.childs) {
					for (var i = 0; i < this.childs.length; i++) {
						addListenerToChilds(this.childs[i], this);
						this.childs[i].bind();
					}
				}
			},
			configure : function() {
			},
			check : function(values) {
				this.forAllChilds("check", values);
			},
			hasError : function(rule) {
				this.fireError(rule);
			},
			restart : function() {
				if (this.childs) {
					for (var i = 0; i < this.childs.length; i++) {
						this.childs[i].restart();
					}
				}
			}

		},
		TrueOrFalse : {
			bind : function() {
				if (this.childs) {
					for (var i = 0; i < this.childs.length; i++) {
						var child = this.childs[i];
						if (child.isTrue) {
							this.trueChilds = child;
						}
						if (child.isFalse) {
							this.falseChilds = child;
						}
						child.bind();
					}
				}
			},
			check : function(values) {
				var ok = this.isOk(values);
				if (this.childs) {
					if (ok) {
						if (this.trueChilds) {
							this.trueChilds.checkChilds(values);
						}
					} else {
						if (this.falseChilds) {
							this.falseChilds.checkChilds(values);
						}
					}
				} else {
					if (!ok) {
						this.fireError(this);
					}
				}
			}
		},
		AND : {
			bind : function() {
				if (this.childs) {
					for (var i = 0; i < this.childs.length; i++) {
						this.childs[i].bind();
					}
				}
			},
			configure : function() {
			},
			isOk : function(values) {
				if (this.childs) {
					for (var i = 0; i < this.childs.length; i++) {
						var ok = this.childs[i].isOk(values);
						if (!ok) {
							return false;
						}
					}
					return true;
				}
				return false;
			},
			check : function(values) {
				this.checkChilds(values);
			}
		},

		OR : {
			bind : function() {
				if (this.childs) {
					for (var i = 0; i < this.childs.length; i++) {
						this.childs[i].bind();
					}
				}
			},
			configure : function() {
			},
			isOk : function(values) {
				if (this.childs) {
					for (var i = 0; i < this.childs.length; i++) {
						var ok = this.childs[i].isOk(values);
						if (ok) {
							return true;
						}
					}
				}
				return false;
			},
			check : function(values) {
				var ok = this.isOk(values);
				if (!ok) {
					this.checkChilds(values);
				}
			}
		},

		MOVE : {
			bind : function() {
			},
			configure : function() {
			},
			isOk : function(values) {
				return true;
			},
			check : function(values) {
				if (!this.alreadyCalled) {
					this.fireError(this);
				}
			}
		}

	}

	ruleTag.TRUE = Object.create(ruleTag.AND);
	ruleTag.TRUE.isTrue = true;

	ruleTag.FALSE = Object.create(ruleTag.AND);
	ruleTag.FALSE.isFalse = true;

	ruleTag.REGEXP = Object.create(ruleTag.TrueOrFalse);

	ruleTag.REGEXP.configure = function() {
		this.varname = this.attributes['at'];
		this.negate = (this.attributes['negate'] == 'true');
		this.regexp = new RegExp(this.attributes['re']);
	};

	ruleTag.REGEXP.isOk = function(values) {
		var ok = this.regexp.test(values[this.varname]);
		if (this.negate) {
			ok = !ok;
		}
		return ok;
	};

	ruleTag.COMP = Object.create(ruleTag.TrueOrFalse);

	ruleTag.COMP.configure = function() {
		this.relation = this.attributes['rel'];
		this.a = this.attributes['a'];
		this.b = this.attributes['b'];
		this.sum = this.attributes['summe'];
		this.zugabe = this.attributes['zugabe'];
		this.negate = (this.attributes['negate'] == 'true');
		this.isNumberType = (this.attributes['type'] == 'number');
	};

	ruleTag.COMP.summe = function(values) {
		if (this.sum) {
			var teile = this.sum.split(/ *, */);
			var summe = 0;
			for (var i = 0; i < teile.length; i++) {
				var p = parseFloat(values[teile[i]]);
				if (p && p != NaN) {
					summe += p;
				}
			}
			if (this.zugabe) {
				summe += parseFloat(this.zugabe);
			}
			return summe;
		}
		return values[this.b];
	};

	ruleTag.COMP.isOk = function(values) {
		var av = values[this.a];
		var bv = this.summe(values);

		if (this.isNumberType) {
			av = parseFloat(av);
			bv = parseFloat(bv);
		}

		if (av && bv) {
			if (this.relation == "lt") {
				return av < bv;
			}
			if (this.relation == "le") {
				return av <= bv;
			}
			if (this.relation == "eq") {
				return av == bv;
			}
			if (this.relation == "gt") {
				return av > bv;
			}
			if (this.relation == "ge") {
				return av >= bv;
			}
		}
		return true;
	};

	function newRule(name, sourceType, attributes) {
		var source = Object.create(sourceType);
		source.name = name;
		source.attributes = attributes;
		source.status = 'init';
		source.addChild = addChild;
		source.addListener = addListener;
		source.doUpdate = true;
		source.alreadyCalled = false;
		source.priority = attributes['priority'];
		if (!source.priority) {
			source.priority = 1;
		}
		source.message = attributes['message'];
		if (!source.message) {
			source.message = source.name;
		}
		source.positions = [];
		var ptext = source.attributes['move'];
		if (ptext) {
			source.positions = ptext.split(/ *, */);
			source.positionIndex = 0;
			source.currentPosition = source.positions[0];
		}

		source.checkChilds = function(values) {
			if (this.childs) {
				for (var i = 0; i < this.childs.length; i++) {
					this.childs[i].check(values);
				}
			}
		}

		source.forAllChilds = function(whatToDo, accumulator) {
			if (this.childs) {
				for (var i = 0; i < this.childs.length; i++) {
					if (typeof whatToDo === "function") {
						whatToDo.apply(this.childs[i], accumulator);
					} else {
						if (typeof this[whatToDo] === "function") {
							((this.childs[i])[whatToDo])(accumulator);
						}
					}
				}
			}
		}

		source.restart = function() {
			this.alreadyCalled  = false;
			this.positionIndex = 0;
			this.currentPosition = this.positions[this.positionIndex];
			this.forAllChilds(this.restart);
		}

		source.nextPosition = function() {
			this.positionIndex++;
			if (this.positionIndex >= this.positions.length) {
				this.positionIndex = 0;
			}
			if (this.positionIndex < this.positions.length) {
				this.currentPosition = this.positions[this.positionIndex];
			}
		}

		source.showMessage = function() {
			return this.priority > 2
					|| (this.priority > 1 && this.allreadyCalled == false);
		}

		source.selected = function() {
			this.alreadyCalled = true;
			this.nextPosition();
		}

		source.fireError = function(rule) {
			if (this.listeners == undefined) {
				return;
			}
			if (this.listeners) {
				for (var i = 0; i < this.listeners.length; i++) {
					var u = this.listeners[i];
					u.hasError(rule);
				}
			}
		}

		return source;
	}

	function newRuleElementFromDOM(element, prefix) {
		if (element.nodeType == 1) {
			var proto = ruleTag[element.nodeName];
			if (proto != undefined) {
				var attributes = convertToAttributeHash(element.attributes);
				var name = attributes['name'];
				var dataElement = newRule(name, proto, attributes);
				for (var i = 0; i < element.childNodes.length; i++) {
					var c = element.childNodes.item(i);
					if (c.nodeType == 1) {
						dataElement.addChild(newRuleElementFromDOM(c,
								dataElement.prefix));
					}
				}
				dataElement.configure();
				return dataElement;
			}
			return undefined;
		}
		return undefined;
	}

	function buildRulePage(element) {
		if (element.nodeType == 1) {

			var ruleElement = newRuleElementFromDOM(element);

			ruleElement.data = {};
			ruleElement.data.addChild = addChild;
			for (var i = 0; i < element.childNodes.length; i++) {
				var c = element.childNodes.item(i);
				if (c.nodeType == 1) {
					var source = newRuleElementFromDOM(c, '');
					if (source) {
						ruleElement.data.addChild(source);
					}
				}
			}
			ruleElement.bind();
			return ruleElement;
		}
		JanusJS.addError("" + element.nodeName + " hat keine Zuordnung");
		return undefined;
	}

	return {
		prepareRulePage : function(text) {
			parser = new DOMParser();
			xmlDoc = parser.parseFromString(text, "text/xml");

			if (xmlDoc.documentElement.innerHTML) {
				if (xmlDoc.documentElement.innerHTML.toString().indexOf(
						'parsererror') > 0) {
					JanusJS.addError(xmlDoc.documentElement.innerHTML);
					return undefined;
				}
			}

			var page = buildRulePage(xmlDoc.documentElement);
			
			

			page.urtext = escapeTextToShowIt(text);
			return page;
		},

		loadRulePage : function(name, onOk) {
			jQuery.ajax({
				url : 'rules/' + name + '.xml',
				data : '',
				success : function(data) {
					try {
						var page = JanusRules.prepareRulePage(data);
						onOk(page);
					} catch (e) {
						JanusJS.addError(' Die Seite ' + this.url
								+ ' kann nicht initialisiert werden<br>' + e);
					}
				},
				error : function(xhr, ajaxOptions, thrownError) {
					JanusJS.addError(' Die Seite ' + this.url
							+ ' konnte nicht geladen werden');
				},
				dataType : 'text'
			});
		},

		addRuleFunction : function(name, f) {
			ruleFunctions[name] = f;
		},

	};

})();
