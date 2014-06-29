/**
 * An organization chart plugin for d3js.
 *
 * author: Yang Bo (bob.yang.dev@gmail.com)
 * birthday: 2014-06-29
 */
(function(){

	// factory method
	d3.ochart = function(){
		var orient = 'vertical'			// vertical, horizontal
			, rootLength = 1			// The line length of root node
			, nodeMargin = [12, 20]		// [top-down, right-left]
			, blockBuilder = defaultBlockBuilder
			, layout = defaultLayout
			, draw = defaultDraw
		;

		// main function
		function ochart(data){
			// compute layout
			layout(data);
			// draw nodes and links
			draw();
		}

		// config methods
		ochart.orient = function(x) {
			if (!arguments.length) return orient;
			orient = x;
			return ochart;
		};
		ochart.rootLength = function(x) {
			if (!arguments.length) return rootLength;
			rootLength = x;
			return ochart;
		};
		ochart.nodeMargin = function(x) {
			if (!arguments.length) return nodeMargin;
			nodeMargin = x;
			return ochart;
		};
		ochart.draw = function(x){
			draw = x;
			return ochart;
		}
		ochart.layout = function(x){
			layout = x;
			return ochart;
		}

		// default implementations
		function defaultLayout(data){
			log('defaultLayout called.');
			
		}

		function defaultDraw(){
			log('defaultDraw called.');
		}
		// return main function object
		return ochart;
	};

	// help functions
	// 'this' point to ochart function object
	function defaultBlockBuilder(node){

	}

	function log(msg){
		console.log(msg);
	}

})();