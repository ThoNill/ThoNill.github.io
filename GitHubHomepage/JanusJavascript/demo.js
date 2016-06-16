
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

	var page = buildPage(xmlDoc.documentElement);
	page.urtext = text;
	return page;
}

function updateGui() {
	showResult('place', activePage.fill({}));
	var i = activePage.urtext.indexOf('&lt;VBOX&gt;');
	if (i >= 0) {
		showResultCode('dataResult', activePage.urtext.substr(0, i));
		showResultCode('guiResult', activePage.urtext.substr(i));
	} else {
		showResultCode('dataResult', '');
		showResultCode('guiResult', activePage.urtext);
	}
}

function showResult(place, text) {
	var place = document.getElementById(place);
	if (place != undefined) {
		place.innerHTML = text;
	}
}

function showResultCode(place, text) {
	var place = document.getElementById(place);
	if (place != undefined) {
		place.innerHTML = text;
	}
}

var pages = {};

loadXMLPage(pages,'tabs', function (page) {
	page.DataSources.a.setValue("das ist a");
	page.DataSources.b.setValue("das ist b");
});

loadXMLPage(pages,'textfield', function (page) {
	page.DataSources.a.refresh();
});

loadXMLPage(pages,'maptable', function (page) {});

loadXMLPage(pages,'listen', function (page) {
	page.DataSources.liste.refresh();
	page.DataSources.liste.doUpdate = false;
});

addClassFunction('menuauswahl', function(command, values) {
	var page = pages[command];
	activePage = page;
	updateGui();
})

loadXMLPage(pages,'menu', function (page) {
	showResult('menu', page.fill({}));
});

