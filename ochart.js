/**
 * An organization chart plugin for d3js.
 *
 * author: Yang Bo (bob.yang.dev@gmail.com)
 * birthday: 2014-06-29
 */
(function(){

	// factory method
	d3.ochart = function(data){
		var orient = 'vertical'			// vertical, horizontal
			, rootLength = 1			// The line length of root node
			, nodeMargin = [12, 20]		// [top-down, right-left]
			, blockBuilder = defaultBlockBuilder
			, layout = defaultLayout
			, draw = defaultDraw
			, root = data
			, nodeLabelReader = defaultNodeLabelReader
		;

		// main function
		function ochart(selection, index){
			// compute layout
			layout(data);
			// draw nodes and links
			draw(selection);
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
			// wrap tree
			var tree = traverseTreeBFS(data, traverseCallback);
			log(tree);
		}

		function traverseCallback(node){
			//log('visit: ' + node.name);
			var parent = this;
			//log(parent);
			if (parent.parentOfRoot){
				return {
					node: node,
					nodeCoord: computeNodeCoord(node, false),
					depth: 0,
					children: [],
				};
			}else{
				var wrapNode = {
					node: node,
					nodeCoord: computeNodeCoord(node, parent),
					depth: parent.depth+1,
					children: []
				};
				parent.children.push(wrapNode);
				return wrapNode;
			}
		}
		
		// node: raw data node
		// parent: wrap node parent
		function computeNodeCoord(node, parent){
			var x, y, width, height, fontWidth=16, fontHeight=18;
			var label = nodeLabelReader(node);
			width = label.length*fontWidth;
			height = label.length*fontHeight;
			return [x,y,width,height];
		}

		function defaultDraw(){
			log('defaultDraw called.');
			
		}

		function defaultNodeLabelReader(node){
			return node.name;
		}
		// return main function object
		return ochart;

	};	// end of d3.ochart

	// callback: return wrapped node, this is wrapped parent.
	function traverseTreeBFS(root, callback){
		var queue = [root], node, children, parent, rootOfCallbackResult
		parentQueue = [{
			parentOfRoot:true
		}];

		while(queue.length>0){
			node = queue.shift();
			parent = parentQueue.shift();
			children = node.children;

			var wrapNode = callback.call(parent, node);
			if (parent.parentOfRoot){
				rootOfCallbackResult = wrapNode;
			}
			
			if (isEmpty(children)){
				continue;
			}
			for(var i=0; i<children.length; i++){
				queue.push(children[i]);
				parentQueue.push(wrapNode);
			}
		}
		return rootOfCallbackResult;
	}

	function isEmpty(array){
		return !(array && array.length>0);
	}

	// help functions
	// 'this' point to ochart function object
	function defaultBlockBuilder(node){

	}

	function log(msg){
		console.log(msg);
	}

})();