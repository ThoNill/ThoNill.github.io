JanusJS.updateGui = function(ifNeeded) {
	if (ifNeeded == true) {
		activePage.fillIfNeeded({});
	} else {
		this.showResult('place', activePage.fill({}));
		if (activePage.urtext) {
			var i = activePage.urtext.toString().indexOf('&lt;VBOX&gt;');
			if (i >= 0) {
				this.showResult('dataResult', activePage.urtext.substr(0, i));
				this.showResult('guiResult', activePage.urtext.substr(i));
			} else {
				this.showResult('dataResult', '');
				this.showResult('guiResult', activePage.urtext);
			}
			if (activePage.DataSources.rules) {
				this.showResult('validationRules',
						activePage.DataSources.rules.rules.urtext);
			} else {
				this.showResult('validationRules', '');
			}
			JanusJS.addMessage("Dialog wird angezeigt");
		}
	}
}

JanusJS.addError = function(text) {
	$(function() {
		setTimeout(function() {
			$.Notify({
				keepOpen : true,
				type : 'alert',
				caption : 'Fehler',
				content : text
			});
		}, 100);
	});
}

JanusJS.addMessage = function(text) {
	$(function() {
		setTimeout(function() {
			$.Notify({
				type : 'success',
				caption : 'Ok',
				content : text
			});
		}, 1000);
	});
}

JanusJS.showResult = function(place, text) {
	var place = document.getElementById(place);
	if (place != undefined) {
		place.innerHTML = text;
	}
	return place;
}

function loadXMLPage(pages, name, initFunction) {
	$.ajax({
		url : 'pages/' + name + '.xml',
		name : name,
		data : '',
		success : function(data) {
			try {
				var page = preparePage(data);
				page.url = this.name;
				if (page) {
					pages[name] = page;
					initFunction(page);
				} else {
					JanusJS.addError('Seite kann nicht angezeigt werden');
				}
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
}

function preparePage(text) {
	parser = new DOMParser();
	xmlDoc = parser.parseFromString(text, "text/xml");

	if (xmlDoc.documentElement.innerHTML) {
		if (xmlDoc.documentElement.innerHTML.toString().indexOf('parsererror') > 0) {
			JanusJS.addError(xmlDoc.documentElement.innerHTML);
			return undefined;
		}
	}

	var page = JanusJS.buildPage(xmlDoc.documentElement);
	page.urtext = escapeTextToShowIt(text);
	return page;
}

var pages = {};

loadXMLPage(pages, 'tabs', function(page) {
});

loadXMLPage(pages, 'textfield', function(page) {
});

loadXMLPage(pages, 'actions', function(page) {
});

loadXMLPage(pages, 'textfieldUpdates', function(page) {
});

loadXMLPage(pages, 'maptable', function(page) {
});

loadXMLPage(pages, 'listen', function(page) {
});

loadXMLPage(pages, 'listenAuswahl', function(page) {
});

loadXMLPage(pages, 'rules', function(page) {
});

loadXMLPage(pages, 'rezepte', clearRezeptGui);

function setClassOfDomElement(domElement, className) {
	domElement.className += " " + className;
}

JanusJS.addClassFunction('setClass', setClassOfDomElement);

function removeClassOfDomElement(domElement, className) {
	var regexp = new RegExp("(?:^|\\s)" + className + "(?!\\S)");
	domElement.className = domElement.className.replace(regexp, '');
}

JanusJS.addClassFunction('removeClass', removeClassOfDomElement);


function showActivePage(command, values, callIfOk, callIfError) {
	var page = pages[command];
	if (page) {
		activePage = page;
		page.callOnVisit();
		callIfOk();
		JanusJS.updateGui();
		if (page.DataSources.rules) {
			page.DataSources.rules.restart();
			page.DataSources.rules.refresh();
		}
	} else {
		callIfError('Seite kann nicht angezeigt werden');
	}
}

JanusJS.addClassFunction('menuauswahl', function(command, values, callIfOk,
		callIfError) {
	showActivePage(command, values, callIfOk, callIfError);
	addToHistory(activePage);

});

JanusJS.addClassFunction('spaetLaden', function(command, values, callIfOk,
		callIfError) {

	loadXMLPage(pages, command, function() {
		showActivePage(command, values, callIfOk, callIfError);
	});
});
loadXMLPage(pages, 'menu', function(page) {
	JanusJS.showResult('menu', page.fill({}));
});

JanusJS.addClassFunction('rezeptSpeichern', function(command, values, callIfOk,
		callIfError) {

	JanusJS.addMessage("Rezept gespeichert");

});

JanusJS.addClassFunction('refresh', function(action, callOnOk, callOnError) {
	action.refresh();
	if (callOnOk) {
		callOnOk();
	}
})

function clearRezeptGui(page) {
	page.callOnInit();

}


function historyChanged(data) {
	if (data.state) {
		showActivePage(data.state, {}, doNothing, doNothing);
	}
}


function addToHistory(page) {
	if (page) {
		window.history.pushState(page.url, null, "#" + page.url);
	}
}
window.addEventListener("popstate", historyChanged, false);
