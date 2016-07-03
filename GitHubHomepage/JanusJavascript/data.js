

var JanusType = {
	
	money : {
		enumerable: true,
		configurable: false,
		writable: true,
		
		summe : function ( arr , start)  {
			  return arr.reduce(
			           function ( sum, child, index, obj) {
			        	   		if (child)  {
			        	   			sum += child;
			        	   		}
			        	   		return sum;
			           },start);
		},

	    summeAttribut : function ( arr , attribute,start)  {
	    	return arr.reduce(
	           function ( sum, child, index, obj) {
	        	   		if (child) {
	        	   			var c = child[attribute];
	        	   			if (c) {
	        	   				sum += c;
	        	   			}
	        	   		}
	        	   		return sum;
	           },start);
	    }

	}
	
};


QUnit.test( "Summe", function( assert ) {

  var a = {
		  anteile : [1,2,3,4,5,6,7],
		  
		  get sumAnteile () {
			  return JanusType.money.summe(this.anteile,0);
		  },
  
  		  childs : [ { a : 1} , { a : 2},{ c : 3}],
  		  
  		  get sumChilds () {
			  return JanusType.money.summeAttribut(this.childs,"a",0);
		  }
  };
  Object.defineProperty(a, 'wert',JanusType.money);
  

  assert.equal( a.sumAnteile ,7 * 4);
  assert.equal( a["sumAnteile"],7 * 4 );
  
  assert.equal( a.sumChilds ,3);
  
  a.wert = 23;
  assert.equal( a.wert,23 );


});


