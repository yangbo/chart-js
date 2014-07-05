/**
 * An organization chart plugin for d3js.
 *
 * author: Yang Bo (bob.yang.dev@gmail.com)
 * birthday: 2014-06-29
 */
(function(){
	// constants
	var X=0,Y=1,WIDTH=2,HEIGHT=3;
	var TOP=0,RIGHT=1,DOWN=2,LEFT=3;

	// factory method
	d3.ochart = function(data){
		// config
		var orient = 'vertical'			// vertical, horizontal
			, rootLength = 1			// The line length of root node
			, nodeMargin = [30, 20]		// [top-down, right-left]
			, nodePadding = [15, 20]	// [top-donw, right-left]
			, nodeRectBuilder = defaultNodeRectBuilder
			, layout = defaultLayout
			, draw = defaultDraw
			, root = data
			, nodeLabelReader = defaultNodeLabelReader
		;

		// main function
		function ochart(container){
			// compute layout
			var tree = layout(data);
			// draw nodes and links
			draw(container, tree);
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
		ochart.nodePadding = function(x) {
			if (!arguments.length) return nodePadding;
			nodePadding = x;
			return ochart;
		};
		ochart.draw = function(x){
			if (!arguments.length) return draw;
			draw = x;
			return ochart;
		}
		ochart.layout = function(x){
			if (!arguments.length) return layout;
			layout = x;
			return ochart;
		}
		ochart.nodeLabelReader = function(x){
			if (!arguments.length) return nodeLabelReader;
			nodeLabelReader = x;
			return ochart;
		}

		// default implementations
		function defaultLayout(data){
			log('defaultLayout called.');
			// wrap tree
			var tree = traverseTreeFirstOrder(data, firstOrderCallback);
			var context = {};
			traverseTreeLastOrder(tree, context, lastOrderCallback);
			return tree;
		}

		function lastOrderCallback(wrappedNode){
			var context = this;

			// computing current node rect width and height
			var nodeRect = nodeRectBuilder.call(ochart, wrappedNode);

			// position node rect
			var x = 0, y = 0, childBlock = wrappedNode.childBlock;

			if(isEmpty(wrappedNode.children)){	// no children
				// position relative to subtree node block of pre-sibling
				var preSiblingNode = findPreSibling(wrappedNode);
				if (preSiblingNode){
					var subTreeBlock = preSiblingNode.subTreeBlock;
					x = subTreeBlock[X] + subTreeBlock[WIDTH] + nodeMargin[RIGHT] + nodePadding[RIGHT];
					y = subTreeBlock[Y] + nodeMargin[TOP] + nodePadding[TOP];
				}
			}else{	// has children
				// position to the child block center
				x = childBlock[X] + childBlock[WIDTH]/2 - nodeRect[WIDTH]/2;
				y = childBlock[Y] - nodeRect[HEIGHT];
			}
			nodeRect[X] = x;
			nodeRect[Y] = y;
			log(wrappedNode.node.name + '] nodeRect x: ' + x + ', y: ' + y);

			// computing node block
			var nodeBlock = [];
			nodeBlock[X] = nodeRect[X]+nodeMargin[RIGHT]+nodePadding[RIGHT];
			nodeBlock[Y] = nodeRect[Y]-nodeMargin[TOP]-nodePadding[TOP];
			nodeBlock[WIDTH] = nodeRect[WIDTH] + 2*nodeMargin[RIGHT] + 2*nodePadding[RIGHT];
			nodeBlock[HEIGHT] = nodeRect[HEIGHT] + 2*nodeMargin[TOP] + 2*nodePadding[TOP];

			wrappedNode.nodeBlock = nodeBlock;

			// computing child-block of parent node
			if(isLastChild(wrappedNode)){
				var parentChildBlock = [], parentNode = wrappedNode.parentNode,
				children = parentNode.children;
				
				// TODO: vertical or horizontal
				parentChildBlock[X] = children[0].nodeBlock[X];
				parentChildBlock[Y] = children[0].nodeBlock[Y];
				parentChildBlock[WIDTH] = sum(children.map(function(node){
					return node.nodeBlock[WIDTH];
				}));
				parentChildBlock[HEIGHT] = sum(children.map(function(node){
					return node.nodeBlock[HEIGHT];
				}));

				parentNode.childBlock = parentChildBlock;
			}

			// computing subtree block
			if (isEmpty(wrappedNode.children)){
				// subtree block is equals to node block
				arrayCopy(wrappedNode.nodeBlock, wrappedNode.subTreeBlock);
			}else{
				var subTreeBlock = wrappedNode.subTreeBlock;
				var children = wrappedNode.children;
				subTreeBlock[X] = children[0].subTreeBlock[X];
				subTreeBlock[Y] = children[0].subTreeBlock[Y];
				subTreeBlock[WIDTH] = sum(children.map(function(node){
					return node.subTreeBlock[WIDTH];
				}));
				subTreeBlock[HEIGHT] = sum(children.map(function(node){
					return node.subTreeBlock[HEIGHT];
				}));
			}
		}

		function arrayCopy(srcArray, destArray){
			for(var i=0; i<srcArray.length; i++){
				destArray[i] = srcArray[i];
			}
		}

		// return false if not find or return object.
		function findPreSibling(wrappedNode){
			var parentNode = wrappedNode.parentNode,
			children = parentNode.children;
			var index = children.indexOf(wrappedNode);
			if (index > 0){
				return children[index-1];
			}else{
				return false;
			}
		}

		function sum(array){
			var total = 0;
			for(var i=0; i<array.length; i++){
				total += array[i];
			}
			return total;
		}

		function isLastChild(wrappedNode){
			if (wrappedNode.parentNode){
				var children = wrappedNode.parentNode.children;
				return children.length > 0 && 
					(children.indexOf(wrappedNode) == children.length-1);
			}
			return false;
		}

		function wrappingNode(node, depth, parentNode){
			return {
					parentNode: parentNode,
					node: node,
					nodeRect: [0,0,0,0],	// [x, y, width, height]
					nodeBlock: [0,0,0,0],	// [x, y, width, height]
					depth: depth,
					children: [],
					childBlock: [0,0,0,0],	// [x, y, width, height]
					subTreeBlock: [0,0,0,0]
			};
		}

		function firstOrderCallback(node){
			var parent = this;
			if (parent.parentOfRoot){
				return wrappingNode(node, 0, false);
			}else{
				var wrapNode = wrappingNode(node, parent.depth+1, parent);
				parent.children.push(wrapNode);
				return wrapNode;
			}
		}

		// node: raw data node
		// parent: wrap node parent
		function computeNodeBlock(node, parent){
			var x, y, width, height, fontWidth=16, fontHeight=18;
			var label = nodeLabelReader(node);
			width = label.length*fontWidth;
			height = label.length*fontHeight;
			return [x,y,width,height];
		}

		function defaultDraw(container, tree){
			log('defaultDraw called.');
			// resize to container size.
			var width = container.style('width');
			var height = container.style('height');

			// pan
	        var zoom = d3.behavior.zoom()
	            .scaleExtent([1,1])
	            .on('zoom', zoomed);

	        var svg = d3.select('svg')
	        .attr('width', width)
	        .attr('height', height)
	        .call(zoom);

	        // updating
	        svg.append("rect")
	            .attr("width", width)
	            .attr("height", height);

	        svg = svg.append("g").attr('class', 'canvas')
	            .attr("transform", "translate(0,0)");

	        function zoomed(){
	            var x = d3.event.translate[0];
	            var y = d3.event.translate[1];
	            d3.select('.canvas').attr('transform', 'translate('+x+','+y+')');
	        }

			var nodes = [];

			traverseTreeLastOrder(tree, nodes, function(node){
				var nodes = this;
				nodes.push(node);
			});

			var data = svg.selectAll('g').data(nodes);

			// enter
			var g = data.enter()
			.append('g')
			.attr('transform', function(node){
				return 'translate('+ node.nodeRect[X] + ', ' + node.nodeRect[Y] +')';
			});

			g.append('rect')
			.attr('class', 'node')
			.attr('x', function(node){
				return 0;//node.nodeRect[X];
			})
			.attr('y', function(node){
				return 0;//node.nodeRect[Y];
			})
			.attr('width', function(node){
				return node.nodeRect[WIDTH];
			})
			.attr('height', function(node){
				return node.nodeRect[HEIGHT];
			});

			g.append('text').text(function(node){
				return nodeLabelReader(node.node);
			})
			.attr('dx', 10)
			.attr('dy', 20)
			.style('text-anchor', 'start')
			;
		}

		function defaultNodeLabelReader(node){
			return node.name;
		}
		// return main function object
		return ochart;

	};	// end of d3.ochart function

	// callback: function(node){ return wrapped node }, 'this' is the wrapped parent.
	function traverseTreeFirstOrder(root, callback){
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

	// callback: function(node){}; 'this' is context.
	function traverseTreeLastOrder(root, context, callback){
		if(root == null){
			return;
		}
		for(var i=0; i<root.children.length; i++){
			traverseTreeLastOrder(root.children[i], context, callback);
		}
		callback.call(context, root);
	}

	function isEmpty(array){
		return !(array && array.length>0);
	}

	// help functions
	// 'this' point to ochart function object
	function defaultNodeRectBuilder(wrappedNode){
		var node = wrappedNode.node;
		var fontSize = [16, 16];	// width, height
		var reader = this.nodeLabelReader();
		var label = reader(wrappedNode.node);
		var nodePadding = this.nodePadding();

		var nodeRect = [0, 0, 
			fontSize[0]*label.length + nodePadding[RIGHT], 
			fontSize[1] + nodePadding[TOP]
		];
		wrappedNode.nodeRect = nodeRect;
		return nodeRect;
	}

	function log(msg){
		console.log(msg);
	}

})();