

function ausListe(liste) {
	var s = liste.length + 1;
	var index = Math.floor(Math.random() * s);
	return liste[index];
}


var vornamen = ['Anne','Andreas','Jan'];

function neuerVorname() { return ausListe(vornamen);}

// alert(neuerVorname());