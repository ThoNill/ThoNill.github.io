
JanusJS.updateGui = function( ifNeeded) {
	if (ifNeeded == true) {
		activePage.fillIfNeeded({});
	} else {
		this.showResult('place', activePage.fill({}));
	}
	var i = activePage.urtext.indexOf('&lt;VBOX&gt;');
	if (i >= 0) {
		this.showResultCode('dataResult', activePage.urtext.substr(0, i));
		this.showResultCode('guiResult', activePage.urtext.substr(i));
	} else {
		this.showResultCode('dataResult', '');
		this.showResultCode('guiResult', activePage.urtext);
	}
}

JanusJS.showResult = function(place, text) {
	var place = document.getElementById(place);
	if (place != undefined) {
		place.innerHTML = text;
	}
}

JanusJS.showResultCode = function(place, text) {
	var place = document.getElementById(place);
	if (place != undefined) {
		place.innerHTML = text;
	}
}



function loadXMLPage(pages, name,initFunction) {
	$.ajax({
		url : 'pages/' + name + '.xml',
		data : '',
		success : function(data) {
			var page = preparePage(data);
			initFunction(page);
			pages[name] = page;
		},
		dataType : 'text'
	});
}

function preparePage(text) {
	parser = new DOMParser();
	xmlDoc = parser.parseFromString(text, "text/xml");

	text = text.replace(/&/g, '&amp;');
	text = text.replace(/"/g, '&quot;');
	text = text.replace(/</g, '&lt;');
	text = text.replace(/>/g, '&gt;');
	text = text.replace(/\t/g, '   ');
	text = text.replace(/ /g, '&nbsp;');
	text = text.replace(/\n/g, '<br>');

	var page = JanusJS.buildPage(xmlDoc.documentElement);
	page.urtext = text;
	return page;
}


var pages = {};

loadXMLPage(pages,'tabs', function (page) {
	page.DataSources.a.setValue("das ist Tab a");
	page.DataSources.b.setValue("das ist Tab b");
});

loadXMLPage(pages,'textfield', function (page) {
	page.DataSources.text.refresh();
	page.DataSources.datum.refresh();
	page.DataSources.money.refresh();
	page.DataSources.int.refresh();
	page.DataSources.password.refresh();
});

loadXMLPage(pages,'textfieldUpdates', function (page) {
	page.DataSources.a1.refresh();
	page.DataSources.a2.refresh();
	page.DataSources.a3.refresh();
});

loadXMLPage(pages,'maptable', function (page) {});

loadXMLPage(pages,'listen', function (page) {
	page.DataSources.liste.refresh();
	page.DataSources.liste.doUpdate = false;
});

JanusJS.addClassFunction('menuauswahl', function(command, values) {
	var page = pages[command];
	activePage = page;
	JanusJS.updateGui();
})

loadXMLPage(pages,'menu', function (page) {
	JanusJS.showResult('menu', page.fill({}));
});

