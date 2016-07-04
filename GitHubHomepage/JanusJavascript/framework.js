var JanusJS = (function() {

	function createIfThen(element, DataSources) {
		if (element.attributes['if'] && element.attributes['at']) {
			var stringToGoIntoTheRegex = element.attributes['if'];

			var dataElement = DataSources[element.attributes.at];
			var re = {
				regex : new RegExp(stringToGoIntoTheRegex),
				dataElement : dataElement,
				element : element,
				status : "valid",
				valueChanged : function(ev) {
					this.element.valueChanged(ev);
				},
				isOk : function() {
					return this.regex.test(this.dataElement.value);
				}
			};
			element.ifThen = re;
			dataElement.addListener(re);
		}
		if (element.childs) {
			for (var ci = 0; ci < element.childs.length; ci++) {
				var child = element.childs[ci];
				createIfThen(child, DataSources);
			}
		}
	}

	var classFunctions = {};

	function callClassFunction(name, command, values, callOnOk, callOnError) {
		return (classFunctions[name])(command, values, callOnOk, callOnError);
	}

	var dialogValue = {}

	// var DataSources = {}

	function newDataSource(name, sourceType, attributes, DataSources) {
		var source = Object.create(sourceType);
		source.name = name;
		source.prefix = name + ".";
		source.attributes = attributes;
		source.status = 'init';
		source.addChild = addChild;
		source.addListener = addListener;
		source.doUpdate = true;

		source.invalidate = function() {
			if (this.status == 'valid') {
				this.status = 'invalid';
				needUpdate.data[this.name] = this;
			}
		};

		source.update = function() {
			if (this.status == 'invalid') {
				this.status = 'refreshing';
				needUpdate.data[this.name] = undefined;
				this.updateData();
				this.fireChanged('refresh');
				this.validate();
			}
		};

		source.validate = function() {
			if (this.status == 'refreshing') {
				this.status = 'valid';
				dialogValue[this.name] = this.value;
			}
		};

		source.valueChanged = function(ev) {
			if (this.status == 'valid') {
				if (this.hasChanged(ev)) {
					this.value = this.calculateValue(ev);
					this.invalidate();
				}
			}
		};

		source.hasChanged = function(ev) {
			return (this.value != ev.value);
		};

		source.calculateValue = function(ev) {
			return ev.value;
		};

		source.fireChanged = function(hint) {
			if (this.listeners == undefined) {
				return;
			}
			var ev = this.createEvent(hint);
			if (this.listeners) {
				for (var i = 0; i < this.listeners.length; i++) {
					var u = this.listeners[i];
					if (u.status == 'valid') {
						u.valueChanged(ev);
					}
				}
			}
		};

		source.bindToName = function(name, DataSources) {
			var partner = DataSources[name.trim()];
			if (partner != undefined) {
				partner.addListener(this);
			}
		};

		source.bindToMultipleNames = function(names, DataSources) {
			if (names == undefined || names == null) {
				return;
			}
			;
			var namesAsArray = names.split(/,/);
			for (var i = 0; i < namesAsArray.length; i++) {
				var name = namesAsArray[i];
				this.bindToName(name, DataSources);
			}
		};

		source.DataSources = DataSources;
		DataSources[name] = source;

		return source;
	}

	var needUpdate = {
		data : {},
		updateKandidatenBestimmen : function() {
			var kandidat = undefined;
			var keys = Object.getOwnPropertyNames(this.data);
			if (keys != undefined) {
				for (var i = 0; i < keys.length; i++) {
					var k = keys[i];
					var u = this.data[k];
					if (u != undefined
							&& u.status == 'invalid'
							&& (kandidat == undefined || kandidat.priority > u.priority)) {
						kandidat = u;
					}
				}
			}
			return kandidat;
		},

		updateValue : function() {
			do {
				var kandidat = this.updateKandidatenBestimmen();
				if (kandidat != undefined) {
					kandidat.update();
				}
			} while (kandidat != undefined);
		}
	}

	function findValue(column, value) {
		for (var i = 0; i < this.data.length; i++) {
			if ((this.data[i])[column] == value) {
				this.currentRow = i;
				return value;
			}
		}
		return undefined;
	}

	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min)) + min;
	}

	var dataTag = {

		STRING : {
			setValue : function(value) {
				var ev = {
					value : value,
					source : this,
					hint : 'refresh'
				};
				this.valueChanged(ev);
				needUpdate.updateValue();
			},
			createEvent : function(hint) {
				var ev = {
					value : this.value,
					source : this,
					hint : hint
				};
				return ev;
			},

			bind : function(DataSources) {
				this.onInit = addToArray(this.onInit, this);
				this
						.bindToMultipleNames(this.attributes['source'],
								DataSources);
			},
			configure : function() {
				this.defValue = this.attributes['default'];
				if (!this.defValue) {
					this.defValue = "";
				}
				;
				this.status = 'valid';
				this.value = this.defValue;
			},
			refresh : function() {
				this.setValue(this.defValue);
			},
			updateData : function() {
			},
			getName : getName,
			priority : 1
		},

		MAPTABLE : {
			setValue : function(value) {
				var v = this.list.findValue('value', value);
				var ev = {
					value : v,
					source : this,
					hint : 'currentRow',
					currentRow : this.list.currentRow,
					data : this.list.data
				};
				this.valueChanged(ev);
				needUpdate.updateValue();
			},
			setCurrentRow : function(currentRow) {
				if (currentRow < 0) {
					currentRow = 0;
				}
				if (currentRow >= this.list.data.length) {
					currentRow = this.list.data.length - 1;
				}
				this.list.currentRow = currentRow;
				var ev = this.createEvent('currentRow');
				this.valueChanged(ev);
				needUpdate.updateValue();
			},
			createEvent : function(hint) {
				var ev = {
					value : this.list.data[this.list.currentRow].value,
					source : this,
					hint : hint,
					currentRow : this.list.currentRow,
					data : this.list.data
				};
				return ev;
			},
			bind : function(DataSources) {
				this
						.bindToMultipleNames(this.attributes['source'],
								DataSources);
			},
			refresh : function() {
				this.setValue(this.defValue);
			},
			configure : function() {
				this.defValue = this.attributes['default'];
				this.list = {
					currentRow : 0,
					data : [],
					findValue : findValue
				}
				for (var i = 0; i < this.childs.length; i++) {
					this.list.data[i] = {
						value : this.childs[i].value,
						text : this.childs[i].text
					}
				}
				this.status = 'valid';
				this.calculateValue = function(ev) {
					return this.list.findValue('value', ev.value);
				}
			},
			updateData : function() {
			},
			getName : getName,

			priority : 1
		},

		ENTRY : {
			bind : function(DataSources) {
			},
			refresh : function() {
			},
			configure : function() {
				this.value = this.attributes.value,
						this.text = this.attributes.text
			},
			updateData : function() {
			},
			getName : function(attributes) {
				return attributes.value
			},

			priority : 1
		},

		TABLE : {

			setValue : function(value) {
				this.list.findValue(this.firstColName, value);
				this.fireCurrentRow();
			},
			setCurrentRow : function(currentRow) {
				if (currentRow < 0) {
					currentRow = 0;
				}
				if (currentRow >= this.list.data.length) {
					currentRow = this.list.data.length - 1;
				}
				this.list.currentRow = currentRow;
				this.fireCurrentRow();
			},
			createEvent : function(hint) {
				var ev = {
					value : (this.list.data[this.list.currentRow])[this.firstColName],
					source : this,
					hint : hint,
					currentRow : this.list.currentRow,
					data : this.list.data
				};
				return ev;
			},
			fireCurrentRow : function() {
				var ev = this.createEvent('currentRow');
				this.valueChanged(ev);
				needUpdate.updateValue();
			},
			bind : function(DataSources) {
				for (var i = 0; i < this.childs.length; i++) {
					this.addListener(this.childs[i]);
				}
				this.addListener(this.currentRow);
			},
			refresh : function() {
				this.updateData();
				this.fireCurrentRow();
			},
			configure : function(DataSources) {
				this.list = {
					currentRow : 0,
					data : [],
					findValue : findValue
				};
				for (var i = 0; i < this.childs.length; i++) {
					this.childs[i].setList(this);
				}
				this.firstColName = this.childs[0].colName;
				this.calculateValue = function(ev) {
					return this.list.findValue(this.firstColName, ev.value);
				}

				this.currentRow = newDataSource(this.name + ".currentRow",
						dataTag.TABLE, {}, DataSources);
				this.currentRow.table = this;
				this.currentRow.setValue = function(value) {
					this.table.setCurrentRow(value);
				};
				this.currentRow.calculateValue = function(ev) {
					return this.table.list.currentRow;
				}
				this.currentRow.status = 'valid';
				this.currentRow.updateData = doNothing;
				this.currentRow.childs = [];
				this.currentRow.createEvent = function(hint) {
					var ev = {
						value : this.table.list.currentRow,
						source : this,
						hint : hint,
						currentRow : this.table.list.currentRow,
						data : this.table.list.data
					};
					return ev;
				};

				this.status = 'valid';
			},
			updateData : function() {
				if (this.doUpdate) {
					this.doUpdate = false;
					var rowCount = getRandomInt(3, 10);
					this.list.currentRow = 0;
					this.list.data = [];
					for (var r = 0; r < rowCount; r++) {
						var row = {};
						for (var i = 0; i < this.childs.length; i++) {
							row[this.childs[i].colName] = 'D' + r + ':' + i;
						}
						this.list.data[r] = row;
					}
				}
			},
			getName : getName,

			priority : 3
		},

		COLUMN : {
			setValue : function(value) {
				this.list.findValue(this.colName, value);
				this.table.fireCurrentRow();
			},
			setList : function(table) {
				this.table = table;
				this.list = table.list;
			},
			bind : function(DataSources) {
			},
			refresh : function() {
			},
			configure : function() {
				this.colName = this.attributes.name;
				this.calculateValue = function(ev) {
					return (this.list.data[ev.currentRow])[this.colName];
				}
				this.status = 'valid';
			},
			createEvent : function(hint) {
				var ev = {
					value : this.value,
					source : this,
					hint : hint,
					currentRow : this.list.currentRow,
					data : this.list.data
				};
				return ev;
			},
			updateData : function() {
			},
			getName : getName,

			priority : 4
		},
		// guiActionOnGuiElements
		GUIACTION : {
			bind : function(DataSources) {

				var tliste = this.attributes['foreach'];
				var liste = tliste.split(/ *, */);
				for (var i = 0; i <= liste.length; i++) {
					var name = liste[i];
					var dataElement = DataSources[name];
					this.foreach = addToArray(this.foreach, dataElement);
				}
				this.classFunction = classFunctions[this.classname];

			},
			refresh : function(callOnOk, callOnError) {

				for (var i = this.foreach.length - 1; i >= 0; i--) {
					var dataElement = this.foreach[i];
					this.guiActionOnGuiElements(dataElement);
				}

			},

			guiActionOnGuiElements : function(model) {
				var propertyNames = Object.getOwnPropertyNames(allGuiElements);
				for (var i = 0; i < propertyNames.length; i++) {
					var name = propertyNames[i];
					var guiElement = allGuiElements[name];
					var modelElement = guiElement.getModelElement();
					if (model == modelElement) {
						var htmlElement = document.getElementById(name);
						this.classFunction(htmlElement, this.param);
					}
				}
			},
			configure : function() {
				this.classname = this.attributes["class"];
				this.param = this.attributes['param'];

			},
			updateData : function() {
			},
			getName : getName,

			priority : 4
		},
		ACTION : {
			bind : function(DataSources) {

				var tliste = this.attributes['foreach'];
				var liste = tliste.split(/ *, */);
				for (var i = 0; i <= liste.length; i++) {
					var name = liste[i];
					var dataElement = DataSources[name];
					this.foreach = addToArray(this.foreach, dataElement);
				}
				this.classFunction = classFunctions[this.classname];

			},
			refresh : function(callOnOk, callOnError) {
				if (this.DataSources.rules
						&& this.DataSources.rules.maxPriority >= 3) {
					JanusJS
							.addError("Beheben Sie bitte zun&auml;chst die noch vorhandenen Fehler");
					return;
				}

				var callTheAction = true;
				if (callOnOk == undefined) {
					callOnOk = this.callListUpdate;
				}
				if (this.ifThen) {
					callTheAction = this.ifThen.isOk();
				}
				if (callTheAction) {
					this.callListe = this
							.createCallListe(callOnOk, callOnError);
					if (this.callListe) {
						this.callListe();
					}
				}
			},
			callListUpdate : function() {
				if (JanusJS.updateGui) {
					JanusJS.updateGui(true);
				}
				if (this.DataSources.rules) {
					this.DataSources.rules.refresh();
				}

			},
			createDanachFunction : function(dataElement, danach, callOnError) {
				return this.callActionFunction.bind(this, dataElement, danach,
						callOnError);
			},
			createCallListe : function(callOnOk, callOnError) {
				var danach = undefined;
				if (callOnOk) {
					danach = callOnOk.bind(this);
				}
				for (var i = this.foreach.length - 1; i >= 0; i--) {
					var dataElement = this.foreach[i];
					danach = this.createDanachFunction(dataElement, danach,
							callOnError);
				}
				return danach;
			},

			callActionFunction : function(dataElement, callOnOk, callOnError) {
				if (this.classFunction) {
					this.classFunction(dataElement, callOnOk, callOnError);
				} else {
					dataElement.refresh(callOnOk, callOnError);
				}
			},
			configure : function() {
				this.classname = this.attributes["class"];

			},
			updateData : function() {
			},
			getName : getName,

			priority : 4
		},

		TRANSFORMATION : {
			bind : function(DataSources) {
			},
			refresh : function() {
			},
			configure : function() {
			},
			updateData : function() {
			},
			getName : getName,

			priority : 2
		},

		BEAN : {
			bind : function(DataSources) {
			},
			refresh : function() {
			},
			bean : function(command, values, callOnOk, callOnError) {
				callClassFunction(this.className, command, values, callOnOk,
						callOnError);
			},
			configure : function() {
				this.className = this.attributes['class'];

				for (var i = 0; i < this.childs.length; i++) {
					var call = this.childs[i];
					call.setBean(this);

					this[call.getName()] = call;
				}
				;
				this.status = 'valid';

			},
			updateData : function() {
			},
			getName : getName,

			priority : 5
		},
		CALL : {
			setBean : function(bean) {
				this.bean = bean;
			},
			bind : function(DataSources) {

			},
			refresh : function(callOnOk, callOnError) {
				if (this.DataSources.rules
						&& this.DataSources.rules.maxPriority >= 3) {
					JanusJS
							.addError("Beheben Sie bitte zun&auml;chst die noch vorhandenen Fehler");
					return;
				}

				var values = {};
				if (this.childs != undefined) {
					for (var i = 0; i < this.childs.length; i++) {
						var v = this.childs[i];
						var value = v.getValue();
						var name = v.getName();

						values[name] = value;
					}
					;
				}

				var obj = this;
				var setOk = function(value) {
					obj.value = value;
					if (callOnOk) {
						callOnOk();
					}
				};
				var setError = function(errorText) {
					JanusJS.addError(errorText);
					if (callOnError) {
						callOnError();
					}
				};

				this.bean.bean(this.command, values, setOk, setError);
			},
			configure : function(DataSources) {
				this.command = this.attributes['command'];
				this.name = this.attributes['name'];
				this.status = 'valid';
				DataSources[this.name] = this;
				this.value = '';
			},
			updateData : function() {
			},
			getName : getName,

			priority : 5
		},
		SET : {
			getValue : function() {
				var c = this.attributes['constant'];
				this.name = this.attributes['name'];
				if (c == undefined) {
					return this.value;
				}
				return c;
			},
			bind : function(DataSources) {
				this.bindToMultipleNames(this.attributes['var'], DataSources);
				this.status = 'valid';
			},
			refresh : function() {
			},
			configure : function() {
			},
			updateData : function() {
			},
			getName : getName,
			priority : 5
		},
		RSET : {
			getValue : function() {
				var c = this.attributes['constant'];
				this.name = this.attributes['name'];

				if (c == undefined) {
					return this.DataSources[this.attributes['var']].value;
				}
				return c;
			},
			bind : function(DataSources) {
				this.status = 'valid';
			},
			refresh : function() {
			},
			configure : function() {
			},
			updateData : function() {
			},
			getName : getName,
			isStepper : function() {
				return false;
			},
			priority : 5
		},
		RULES : {
			restart : function(DataSources) {
				this.maxPriority = 0;
				this.clear();
				this.rules.restart();
			},
			
			bind : function(DataSources) {

				var onOk = function(DataSources, rules) {
					this.rules = rules;
					DataSources.rules = this;
					rules.addListener(this);
					this.clear();
					this.status = 'valid';
				}

				JanusRules.loadRulePage(this.rulesName, onOk.bind(this,
						DataSources));

			},
			refresh : function() {

				if (this.rules) {
					this.maxPriority = 0;
					var values = {};
					if (this.childs != undefined) {
						for (var i = 0; i < this.childs.length; i++) {
							var v = this.childs[i];
							if (!v.isStepper()) {
								var value = v.getValue();
								var name = v.getName();
								values[name] = value;
							}
						}
					}
					this.rules.check(values);
					return this.showError();
				}
				return true;

			},
			clear : function() {
				this.currentRule = {
					rule : undefined,
					field : undefined,
					index : 0
				};
			},
			hasError : function(rule) {
				if (this.maxPriority < rule.priority) {
					this.maxPriority = rule.priority;
				}
				if (this.currentRule.rule) {
					var currentIndex = this.currentRule.index;
					var ruleIndex = this.stepper
							.getPositionIndex(rule.currentPosition);
					if (ruleIndex < currentIndex
							|| (ruleIndex == currentIndex && this.currentRule.priority >= rule.priority)) {
						this.currentRule.rule = rule;
						this.currentRule.index = this.stepper
								.getPositionIndex(rule.currentPosition);
						this.currentRule.field = this.fields[rule.currentPosition];
					}

				} else {
					this.currentRule.rule = rule;
					this.currentRule.index = this.stepper
							.getPositionIndex(rule.currentPosition);
					this.currentRule.field = this.fields[rule.currentPosition];
				}
			},

			searchInputField : function(modelName) {
				var dataElement = this.DataSources[modelName];
				var propertyNames = Object.getOwnPropertyNames(allGuiElements);
				for (var i = 0; i < propertyNames.length; i++) {
					var name = propertyNames[i];
					var guiElement = allGuiElements[name];
					var modelElement = guiElement.getModelElement();
					if (dataElement === modelElement) {
						var ip = document.getElementById('ip' + guiElement.id);
						if (ip) {
							return ip;
						}
						return document.getElementById(guiElement.id);
					}
				}
				return undefined;
			},
			showError : function() {
				if (this.currentRule.rule) {
					this.currentRule.rule.selected();
					var ipField = this.searchInputField(this.currentRule.field);
					if (ipField) {
						JanusJS.setNextField(ipField);
						if (this.currentRule.rule.showMessage()) {
							document.getElementById('errorText').innerHTML = this.currentRule.rule.message;
							showMetroDialog('#errorDialog');
							document.getElementById('errorButton').focus();
						} else {
							JanusJS.focusNextField();
						}
					}
				}
				this.clear();
				return (this.maxPriority < 3);
			},
			configure : function() {
				this.fields = {};
				if (this.childs != undefined) {
					for (var i = 0; i < this.childs.length; i++) {
						var v = this.childs[i];
						if (v.isStepper()) {
							this.stepper = v;
						} else {
							this.fields[v.attributes.name] = v.attributes['var'];
						}
					}
				}
				this.rulesName = this.attributes['name'];

			},
			updateData : function() {
			},
			getName : getName,

			priority : 10
		},
		STEPPER : {
			isStepper : function() {
				return true;
			},
			getValue : function() {
				return this;
			},
			bind : function(DataSources) {
				this.status = 'valid';
			},
			refresh : function() {
			},

			getPositionIndex : function(fieldName) {
				return this.priority[fieldName] + 1;
			},
			configure : function() {

				this.fieldList = this.attributes['fields'].split(/ *, */);
				this.priority = {};

				for (var i = 0; i < this.fieldList.length; i++) {
					var field = this.fieldList[i];
					this.priority[field] = i;
				}

			},
			updateData : function() {
			},
			getName : getName,

			priority : 10
		}
	}

	function newDataElementFromDOM(element, prefix, DataSources) {
		if (element.nodeType == 1) {
			var proto = dataTag[element.nodeName];
			if (proto != undefined) {
				var attributes = convertToAttributeHash(element.attributes);
				var name = prefix + proto.getName(attributes);
				var dataElement = newDataSource(name, proto, attributes,
						DataSources);
				for (var i = 0; i < element.childNodes.length; i++) {
					var c = element.childNodes.item(i);
					if (c.nodeType == 1) {
						dataElement.addChild(newDataElementFromDOM(c,
								dataElement.prefix, DataSources));
					}
				}
				dataElement.configure(DataSources);
				return dataElement;
			}
			return undefined;
		}
		return undefined;
	}

	function sammleVariablen(text) {
		var liste = [];

		var sammler = function(match, p1, offset, string) {
			addToArray(liste, p1);
			return "";
		}

		text.replace(/\$\{([^\}]*)\}/g, sammler);

		return liste;
	}

	function replaceOneValue(template, key, value) {
		var searchText = '${' + key + '}';
		var erg = template;
		while (erg.toString().indexOf(searchText) >= 0) {
			erg = erg.replace(searchText, value);
		}
		return erg;
	}

	function replaceValues(template, values) {
		if (template == undefined) {
			return "";
		}
		var erg = template;

		// in notwenig, damit auch Properties von prototype genommen werden
		for ( var key in values) {
			erg = replaceOneValue(erg, key, values[key]);
		}
		return erg;
	}

	function addId(values) {
		var newValues = Object.create(values);
		newValues.id = this.id;
		newValues.value = "";
		newValues.model = this.model;
		

		if (this.model) {
			if (this.DataSources[this.model] == undefined) {
				JanusJS.addError("Modelelement " + this.model
						+ " ist nicht definiert")
			} else {
				var m = this.DataSources[this.model];
				if (m) {
					newValues.value = m.value;
				}

			}
		}

		if (this.attributes.title != undefined) {
			newValues.title = this.attributes.title;
		}

		newValues.innerStyle = '';

		if (this.ifThen) {
			if (!this.ifThen.isOk()) {
				newValues.innerStyle = newValues.innerStyle + 'display : none;';
			}
		}

		newValues.styleOut = ' style=\"' + newValues.innerStyle + '\" ';
		
		newValues.startTooltip = "";
		newValues.endTooltip = "";
		
		if (this.attributes.tooltip) {
				newValues.startTooltip = "<div data-role='hint' data-hint='" + this.attributes.tooltip + "'>";
				newValues.endTooltip = "</div>";
		}

		return newValues;
	}

	function simpleFill(values) {
		this.needUpdate = false;
		var newValues = this.addId(values);
		return this.fillTemplate(this.tagName, newValues);
	}

	function startChildEndFill(values) {
		this.needUpdate = false;
		var newValues = this.addId(values);
		var start = this.fillTemplate('start', newValues);
		var end = this.fillTemplate('end', newValues);
		var childsText = "";
		if (this.childs != undefined) {
			for (var ci = 0; ci < this.childs.length; ci++) {
				var child = this.childs[ci];

				newValues.child = child.fill(values);
				childsText += this.fillTemplate('child', newValues);
			}
		}
		return start + childsText + end;
	}

	function noFill(values) {
		this.needUpdate = false;
		return "";
	}

	function fillFromList(values) {
		this.needUpdate = false;
		var newValues = this.addId(values);
		var list = this.getModelElement().list;

		var start = this.fillTemplate('start', newValues);
		var end = this.fillTemplate('end', newValues);
		var childsText = "";

		if (this.childs != undefined) {
			var headerText = this.fillTemplate('headerStart', newValues);
			for (var ci = 0; ci < this.childs.length; ci++) {
				var child = this.childs[ci];
				if (child.attributes.header == undefined) {
					newValues.header = child.colName;
				} else {
					newValues.header = child.attributes.header;
				}
				newValues.column = ci;
				headerText += this.fillTemplate('header', newValues);
			}
			headerText += this.fillTemplate('headerEnd', newValues);

			var childsText = "";
			for (var row = 0; row < list.data.length; row++) {
				newValues.row = row;
				var postfix = "";
				if (row == list.currentRow) {
					postfix = "Selected";
				}
				childsText += this
						.fillTemplate('rowStart' + postfix, newValues);
				var rowData = list.data[row];

				for (var ci = 0; ci < this.childs.length; ci++) {
					var child = this.childs[ci];
					newValues.column = ci;
					newValues.value = rowData[child.colName];
					childsText += this
							.fillTemplate('cell' + postfix, newValues);
				}

				childsText += this.fillTemplate('rowEnd' + postfix, newValues);
			}
		}
		return start + headerText + childsText + end;
	}

	function fillRowsFromList(values) {
		this.needUpdate = false;
		var newValues = this.addId(values);
		var list = this.getModelElement().list;

		var start = this.fillTemplate('start', newValues);
		var end = this.fillTemplate('end', newValues);
		var childsText = "";

		var childsText = "";
		if (this.childs != undefined) {
			for (var row = 0; row < list.data.length; row++) {

				var rowData = list.data[row];

				newValues.row = row;
				newValues.value = rowData.value;
				newValues.text = rowData.text;

				var postfix = "";
				if (row == list.currentRow) {
					postfix = "Selected";
				}
				childsText += this.fillTemplate('row' + postfix, newValues);

			}
		}

		return start + childsText + end;
	}

	function newGuiTag(tagName, templateHash) {
		var obj = new Object();
		obj.templateHash = templateHash;
		obj.tagName = tagName;

		obj.fillTemplate = function(key, values) {
			return replaceValues(this.templateHash[key], values);
		}

		return obj;
	}

	var guiTag = {};
	guiTag.DIALOG = newGuiTag("DIALOG", {
		start : "<div id='${id}' >",
		child : "${child}",
		end : "</div>"
	});
	guiTag.DIALOG.fill = startChildEndFill;
	guiTag.DIALOG.configure = function() {

		if (this.attributes.onInit) {
			this.onInitAction = newDataSource("onInit", dataTag.ACTION, {
				foreach : this.attributes.onInit,
				name : "onInit"
			}, DataSources);
		}
		;
		if (this.attributes.onVisit) {
			this.onVisitAction = newDataSource("onVisit", dataTag.ACTION, {
				foreach : this.attributes.onInit,
				name : "onVisit"
			}, DataSources);
		}
		;
	}
	guiTag.DIALOG.callOnInit = function() {
		if (this.onInit) {
			for (var i = 0; i < this.onInit.length; i++) {
				this.onInit[i].refresh();
			}
		}
		if (this.onInitAction) {
			this.onInitAction.refresh();
		}
	}
	guiTag.DIALOG.callOnVisit = function() {
		if (this.onVisit) {
			for (var i = 0; i < this.onInit.length; i++) {
				this.onVisit[i].refresh();
			}
		}
		if (this.onVisitAction) {
			this.onVisitAction.refresh();
		}
	}

	guiTag.TEXTFIELD = newGuiTag(
			"TEXTFIELD",
			{
				TEXTFIELD : "<div  id='${id}' " +
						"class='input-control text  margin10 no-margin-right '  ${styleOut} >${startTooltip}<input type='text'  id='ip${id}' name='${model}' value='${value}' onkeypress=\"return JanusJS.setElementValueEnter(event,'${id}',this.value);\"  />${endTooltip}</div>"
			});
	guiTag.TEXTFIELD.fill = simpleFill;
	guiTag.TEXTFIELD.configure = doNothing;

	guiTag.LABEL = newGuiTag("LABEL", {
		LABEL : "<div  id='${id}' class='margin10 no-margin-right ' ${styleOut} >${title}</div>"
	});
	guiTag.LABEL.fill = simpleFill;
	guiTag.LABEL.configure = function() {
		this.title = this.attributes.title;
	};

	guiTag.BUTTON = newGuiTag(
			"BUTTON",
			{
				BUTTON : "<div class='margin10 no-margin-right' ><input  id='${id}'  ${styleOut}  type='button' value='${title}' name='${model}' onClick='JanusJS.getModelElementFromDivID(\"${id}\").refresh();return false;' /></div>"
			});
	guiTag.BUTTON.fill = simpleFill;
	guiTag.BUTTON.configure = doNothing;

	guiTag.DATEFIELD = newGuiTag(
			"DATEFIELD",
			{
//				DATEFIELD : "<div  id='${id}' ${styleOut}  >${startTooltip}<input   id='ip${id}' ${styleOut}  class='input-control text margin10 no-margin-right ' type='date' name='${model}' value='${value}' onkeypress=\"return JanusJS.setElementValueEnter(event,'${id}',this.value);\" />${endTooltip}</div>"
				DATEFIELD : "<div  id='${id}' >${startTooltip}<div ${styleOut} data-role='datepicker' data-format='dd.mm.yyyy' ><input   id='ip${id}' ${styleOut}  class='input-control text margin10 no-margin-right ' type='text' name='${model}' value='${value}' onkeypress=\"return JanusJS.setElementValueEnter(event,'${id}',this.value);\" /> <button class='button'><span class='mif-calendar'></span></button>${endTooltip}</div></div>"

			});
	guiTag.DATEFIELD.fill = simpleFill;
	guiTag.DATEFIELD.configure = doNothing;

	guiTag.MONEYFIELD = newGuiTag(
			"MONEYFIELD",
			{
				MONEYFIELD : "<div  id='${id}' ${styleOut} >${startTooltip}<input   id='ip${id}' ${styleOut} class='input-control text margin10 no-margin-right ' type='number' name='${model}' value='${value}' onkeypress=\"return JanusJS.setElementValueEnter(event,'${id}',this.value);\"  />${endTooltip}</div>"
			});
	guiTag.MONEYFIELD.fill = simpleFill;
	guiTag.MONEYFIELD.configure = doNothing;

	guiTag.INTEGERFIELD = newGuiTag(
			"INTEGERFIELD",
			{
				INTEGERFIELD : "<div  id='${id}' ${styleOut} >${startTooltip}<input   id='ip${id}' ${styleOut} class='input-control text margin10 no-margin-right ' type='number' pattern='^[0-9]+$' name='${model}' value='${value}' onkeypress=\"return JanusJS.setElementValueEnter(event,'${id}',this.value);\" />${endTooltip}</div>"
			});
	guiTag.INTEGERFIELD.fill = simpleFill;
	guiTag.INTEGERFIELD.configure = doNothing;

	guiTag.PASSWORD = newGuiTag(
			"PASSWORD",
			{
				PASSWORD : "<div  id='${id}' ${styleOut} >${startTooltip}<input   id='ip${id}'   ${styleOut}  class='input-control password margin10 no-margin-right ' type='password' name='${model}' value='${value}' onkeypress=\"return JanusJS.setElementValueEnter(event,'${id}',this.value);\" />${endTooltip}</div>"
			});
	guiTag.PASSWORD.fill = simpleFill;
	guiTag.PASSWORD.configure = doNothing;

	guiTag.CHECKBOX = newGuiTag(
			"CHECKBOX",
			{
				CHECKBOX : "<label   id='${id}'  ${styleOut}  class='input-control checkbox small-check margin10 no-margin-right '>${startTooltip}<input type='checkbox' name='${model}' value='${value}' /><span class='check'></span><span class='caption'>${title}</span>${endTooltip}</label>"
			});
	guiTag.CHECKBOX.fill = simpleFill;
	guiTag.CHECKBOX.configure = doNothing;
/*
	guiTag.VBOX = newGuiTag("VBOX", {
		start : "<TABLE id='${id}'  ${styleOut}  >",
		child : "<TR><TD>${child}</TD></TR>",
		end : "</TABLE>"
	});
	*/
	guiTag.VBOX = newGuiTag("VBOX", {
		start : "<DIV id='${id}' class='vbox margin10 no-margin-right no-margin-left' ${styleOut}  >",
		child : "<DIV>${child}</DIV>",
		end : "</DIV>"
	});

	guiTag.VBOX.fill = startChildEndFill;
	guiTag.VBOX.configure = doNothing;

/*	guiTag.HBOX = newGuiTag(
			"HBOX",
			{
				start : "<TABLE  id='${id}'  ${styleOut} ><TR>",
				child : "<TD ><div class='margin10 no-margin-right'>${child}</div></TD>",
				end : "</TR></TABLE>"
			});
*/
	guiTag.HBOX = newGuiTag("HBOX", {
		start : "<DIV id='${id}' class='hbox' ${styleOut}  >",
		child : "<DIV>${child}</DIV>",
		end : "</DIV>"
	});

	guiTag.HBOX.fill = startChildEndFill;
	guiTag.HBOX.configure = doNothing;

	guiTag.SHOWTABLE = newGuiTag(
			"SHOWTABLE",
			{
				start : "<TABLE  id='${id}' class='table striped hovered border bordered margin10 no-margin-right' ${styleOut}  ><THEAD>",
				headerStart : "<TR><TD> </TD>",
				header : "<TH>${header}</TH>",
				headerEnd : "</TR></THEAD><TBODY>",

				rowStart : "<TR><TD  onClick=\"return JanusJS.setCurrentRow('${id}',${row});\"  >${row}</TD>",
				cell : "<TD onClick=\"return JanusJS.setCurrentRow('${id}',${row});\" >${value}</TD>",
				rowEnd : "</TR>",

				rowStartSelected : "<TR class='selected' ><TD>${row}</TD>",
				cellSelected : "<TD>${value}</TD>",
				rowEndSelected : "</TR>",

				end : "</TBODY></TABLE>"
			});
	guiTag.SHOWTABLE.fill = fillFromList;
	guiTag.SHOWTABLE.configure = doNothing;

	guiTag.SHOWCOLUMN = newGuiTag("SHOWCOLUMN", {});
	guiTag.SHOWCOLUMN.fill = noFill;
	guiTag.SHOWCOLUMN.configure = function() {
		this.colName = this.attributes.name;
	}

	guiTag.COMBO = newGuiTag(
			"COMBO",
			{
				start : "<div  id='${id}' class='input-control select'  ${styleOut}   >${startTooltip}<select name='${model}' onchange=\"JanusJS.setCurrentRow('${id}',this.selectedIndex);return true;\" >",
				row : "<option value='${row}' >${text}</option>",
				rowSelected : "<option value='${row}' selected >${text}</option>",
				end : "</select>${endTooltip}</div>"
			});
	guiTag.COMBO.fill = fillRowsFromList;
	guiTag.COMBO.configure = doNothing;

	guiTag.RADIO = newGuiTag(
			"RADIO",
			{
				start : "",
				row : " <label  id='${id}' class='input-control radio small-check'  ${styleOut} >${startTooltip} <input type='radio' name='${model}' value='${row}' onchange=\"return JanusJS.setCurrentRow('${id}',this.value);\" > <span class='check'></span><span class='caption'>${text}</span>${endTooltip}</label>",
				// rowSelected: "<input type='radio' name='${model}'
				// value='${row}' checked
				// >${text}<br/>",
				rowSelected : " <label  id='${id}'  class='input-control radio small-check'  ${styleOut} >${startTooltip}<input type='radio' name='${model}' checked value='${row}' onchange=\"return JanusJS.setCurrentRow('${id}',this.value);\" > <span class='check'></span><span class='caption'>${text}</span>${endTooltip}</label>",

				end : ""
			});
	guiTag.RADIO.fill = fillRowsFromList;
	guiTag.RADIO.configure = doNothing;

	guiTag.LIST = newGuiTag(
			"LIST",
			{
				// start: "<input list='listValues${id}' name='${model}'
				// onchange=\"return
				// JanusJS.setCurrentRow('${id}',this.value);\" ><datalist
				// id='listValues${id}'
				// >",
				// row: "<option value='${row}' >${text}</option>",
				// rowSelected: "<option value='${row}' selected
				// >${text}</option>",
				// end: "</datalist>"

				start : " <div  id='${id}' class='listview set-border'  id='listValues${id}'  ${styleOut} >${startTooltip}",
				row : "<div class='list'   onClick=\"return JanusJS.setCurrentRow('${id}','${row}');\" ><span class='list-title'>${text}</span></div>",
				rowSelected : "<div class='list block-shadow-info' onClick=\"return JanusJS.setCurrentRow('${id}','${row}');\" > </span><span class='list-title'>${text}</span></div>",
				end : "${endTooltip}</div>"

			});
	guiTag.LIST.fill = fillRowsFromList;
	guiTag.LIST.configure = doNothing;

	guiTag.MENUBAR = newGuiTag("MENUBAR", {
		start : "<nav class='app-bar' ><ul class='app-bar-menu'>",
		child : "${child}",
		end : "</ul></nav>"
	});
	guiTag.MENUBAR.fill = startChildEndFill;
	guiTag.MENUBAR.configure = doNothing;

	guiTag.MENU = newGuiTag(
			"MENU",
			{
				start : "<li  class='cmenu'  ${styleOut}  ><a href='' class='dropdown-toggle' >${title}</a><ul  class='d-menu' data-role='dropdown'>",
				child : "${child}",
				end : "</ul></li>"
			});
	guiTag.MENU.startChildEndFill = startChildEndFill;
	guiTag.MENU.fill = function(values) {
		values.title = this.attributes.title;
		return this.startChildEndFill(values);
	};
	guiTag.MENU.configure = doNothing;

	guiTag.MENUITEM = newGuiTag(
			"MENUITEM",
			{
				MENUITEM : "<li   ${styleOut} ><a href='#'    onClick='JanusJS.getModelElementFromDivID(\"${id}\").refresh();return false;' >${title}</a></li>"
			});
	guiTag.MENUITEM.simpleFill = simpleFill;
	guiTag.MENUITEM.fill = function(values) {
		values.title = this.attributes.title;
		return this.simpleFill(values);
	};
	guiTag.MENUITEM.configure = doNothing;

	guiTag.TAB = newGuiTag("TAB", {
		// header: "<TH onClick='updateTab(\"${parentId}\",\"${id}\");'
		// >${title}</TH>",
		// header: "<li class='tabHeaderCell' id='tabHeader${id}'
		// onClick='updateTab(\"${parentId}\",\"${id}\");' >${title}</li>",
		header : "<li ><a href='#${id}' >${title}</a></li>",

		start : "<DIV class='frame' id='${id}'  ${styleOut} >",
		child : "${child}",
		end : "</DIV>"
	});
	guiTag.TAB.startChildEndFill = startChildEndFill;
	guiTag.TAB.fill = function(values) {
		values.title = this.attributes.title;
		return this.startChildEndFill(values);
	};
	guiTag.TAB.configure = doNothing;

	guiTag.TABS = newGuiTag(
			"TABS",
			{
				// start: "<TABLE id='${id}' >",
				// end: "</TABLE>",
				// headerStart: "<TR>",
				// headerEnd: "</TR><TR collspan='${tabCount}' ><TD>",

				start : "<DIV class='tabcontrol2' data-role='tabcontrol'  data-save-state='true' id='${id}'  ${styleOut}  >",
				end : "</DIV>",
				headerStart : "<ul class='tabs' >",
				headerEnd : "</ul>",
				tabStart : "<DIV class='frames' >",
				tab : "${child}",
				tabEnd : "</DIV>"
			});

	guiTag.TABS.fill = function(values) {
		this.needUpdate = false;
		var newValues = this.addId(values);

		var start = this.fillTemplate('start', newValues);
		var end = this.fillTemplate('end', newValues);
		var childsText = "";

		if (this.childs != undefined) {
			newValues.tabCount = this.childs.length;
			var headerText = this.fillTemplate('headerStart', newValues);
			for (var ci = 0; ci < this.childs.length; ci++) {
				var child = this.childs[ci];
				newValues.id = child.id;
				newValues.parentId = this.id;
				newValues.title = child.attributes.title;
				newValues.column = ci;
				headerText += child.fillTemplate('header', newValues);
			}
			headerText += this.fillTemplate('headerEnd', newValues);

			var childsText = this.fillTemplate('tabStart', newValues);
			for (var ci = 0; ci < this.childs.length; ci++) {
				var child = this.childs[ci];
				newValues.id = child.id;
				newValues.parentId = this.id;
				newValues.title = child.attributes.title;
				newValues.column = ci;

				newValues.child = child.fill(newValues);
				childsText += this.fillTemplate('tab', newValues);
			}
			childsText += this.fillTemplate('tabEnd', newValues);

			return start + headerText + childsText + end;
		}
		;
		return "";
	};
	guiTag.TABS.configure = doNothing;

	function updateTab(divParent, divTab) {
		var tabs = document.getElementById(divParent);
		if (tabs != null) {
			var tab = document.getElementById(divTab);
			var tabHeader = document.getElementById("tabHeader" + divTab);
			if (tabs.currentTab != tab) {
				if (tabs.currentTab != undefined) {
					var oldtab = tabs.currentTab;
					oldtab.className = oldtab.className + " aus ";
				}
				if (tabs.currentTabHeader != undefined) {
					var oldtab = tabs.currentTabHeader;
					oldtab.className = oldtab.className.replace(
							/\bcurrentTab\b/, '');
				}

				if (tab != null) {
					tab.className = tab.className.replace(/\baus\b/, '');
					tabs.currentTab = tab;
					tabHeader.className = tabHeader.className.trim()
							+ " currentTab ";
					tabs.currentTabHeader = tabHeader;
				}
			}
		}
	}

	var idCounter = 0;
	var allGuiElements = {};

	function newGuiElement(proto, attributes, DataSources) {
		var guiElement = Object.create(proto);
		guiElement.DataSources = DataSources;

		idCounter++;
		guiElement.addId = addId;
		guiElement.id = 'DIV' + idCounter;
		if (attributes != undefined) {
			guiElement.attributes = attributes;
		}

		guiElement.childs = [];
		guiElement.addChild = addChild;
		guiElement.getModelElement = getModelElement;
		if (attributes != undefined) {
			guiElement.model = attributes.model;
		}
		allGuiElements[guiElement.id] = guiElement;

		guiElement.needUpdate = true;

		guiElement.valueChanged = function(ev) {
			this.needUpdate = true;
		}
		guiElement.fillIfNeeded = fillIfNeeded;

		guiElement.status = "valid";
		return guiElement;
	}

	function newGuiElementFromDOM(element, DataSources) {
		if (element.nodeType == 1) {
			var proto = guiTag[element.nodeName];
			if (proto != undefined) {
				var guiElement = newGuiElement(proto,
						convertToAttributeHash(element.attributes), DataSources);
				for (var i = 0; i < element.childNodes.length; i++) {
					var c = element.childNodes.item(i);
					if (c.nodeType == 1) {
						guiElement
								.addChild(newGuiElementFromDOM(c, DataSources));
					}
				}
				guiElement.configure();
				guiElement.needUpdate = true;
				return guiElement;
			}
			// alert("" + element.nodeName +" hat keine Zuordnung");
			return undefined;
		}
		return undefined;
	}

	function getModelElement() {
		var modelName = this.attributes['model'];
		if (modelName == undefined) {
			return undefined;
		}
		return this.DataSources[modelName];
	}

	function bindGuiElement(element, DataSources) {
		var modelElement = element.getModelElement();
		if (modelElement != undefined) {
			modelElement.addListener(element);
		}
	}

	function bindGuiChildElements(element, DataSources) {
		bindGuiElement(element, DataSources);
		if (element.childs != undefined) {
			for (var ci = 0; ci < element.childs.length; ci++) {
				var child = element.childs[ci];
				bindGuiChildElements(child, DataSources);
			}
		}
	}

	function fillIfNeeded(values, element) {
		if (element == undefined) {
			element = this;
		}
		if (element.needUpdate) {
			element.needUpdate = false;
			var text = element.fill(values);
			var oldDomElement = document.getElementById(element.id);
			if (oldDomElement != null && oldDomElement != undefined) {

				try {
					if (oldDomElement.parentNode != undefined) {
						oldDomElement.parentNode.innerHTML = text;
					}
				} catch (e) {
					JanusJS
							.addError('Ein HTML Abschnitt kann nicht eingesetzt werden<br'
									+ e);
				}

			}
		}
		if (element.childs != undefined) {
			for (var ci = 0; ci < element.childs.length; ci++) {
				var child = element.childs[ci];
				fillIfNeeded(values, child);
			}
		}

	}

	return {

		buildPage : function(element) {
			if (element.nodeType == 1) {
				DataSources = {};

				var guiElement = newGuiElementFromDOM(element, DataSources);

				guiElement.data = {};
				guiElement.data.addChild = addChild;
				for (var i = 0; i < element.childNodes.length; i++) {
					var c = element.childNodes.item(i);
					if (c.nodeType == 1) {
						var source = newDataElementFromDOM(c, '', DataSources);
						if (source) {
							guiElement.data.addChild(source);
						}
					}
				}
				var propertyNames = Object.getOwnPropertyNames(DataSources);
				for (var i = 0; i < propertyNames.length; i++) {
					var d = propertyNames[i];
					DataSources[d].bind(DataSources);
					createIfThen(DataSources[d], DataSources);
				}
				bindGuiChildElements(guiElement, DataSources);

				createIfThen(guiElement, DataSources);
				guiElement.callOnInit();
				return guiElement;
			}
			JanusJS.addError("" + element.nodeName + " hat keine Zuordnung");
			return undefined;
		},

		addClassFunction : function(name, f) {
			classFunctions[name] = f;
		},

		getModelElementFromDivID : function(divID) {
			return allGuiElements[divID].getModelElement();
		},

		setCurrentRow : function(divID, row) {
			// alert( model + row );
			this.getModelElementFromDivID(divID).setCurrentRow(row);
			this.updateGui(true);
			return false;
		},

		setModelElementValue : function(divID, value) {
			var modelElement = this.getModelElementFromDivID(divID);
			if (modelElement && modelElement.setValue) {
				modelElement.setValue(value);
				this.updateGui(true);
				if (modelElement.DataSources && modelElement.DataSources.rules) {
					modelElement.DataSources.rules.refresh();
				}
			} else {
				// alert(modelElement.name);
			}
			return false;
		},

		setElementValueEnter : function(event, divID, value) {
			if (event.which == 13 || event.keyCode == 13) {
				this.setModelElementValue(divID, value);
				return true;
			}
			return true;
		},

		focusNextField : function() {
			if (this.nextField) {
				this.nextField.focus();
			}
		},

		setNextField : function(field) {
			this.nextField = field;
		}

	};

})();
