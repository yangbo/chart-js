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
			, nodePadding = [20, 30]	// [top-donw, right-left]
			, nodeRectBuilder = defaultNodeRectBuilder
			, layout = defaultLayout
			, draw = defaultDraw
			, root = data
			, nodeLabelReader = defaultNodeLabelReader
			, interval = 15				// space between sibling nodes.
			, layerHeight = 100;		// height of layer, from top to top.
		;

		// main function
		function ochart(container){
			// compute layout
			var tree = layout(data);
			// create nodes data
			tree.nodes = createNodes(tree);
			// create links data
			tree.links = createLinks(tree);
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

		function createNodes(tree){
			var nodes = [];
			traverseTreeLastOrder(tree, nodes, function(node){
				var nodes = this;
				nodes.push(node);
			});
			return nodes;
		}

		function createLinks(tree){
			var links = [];
			traverseTreeLastOrder(tree, links, function(node){
				var links = this;
				// 到父节点的线
				if (node.parentNode){
					var p1 = topCenter(node.nodeRect);
					var parentNodeRect = node.parentNode.nodeRect
					var parentBottom = parentNodeRect[Y]+parentNodeRect[HEIGHT];
					var p2 = {x:p1.x, y:p1.y-(p1.y - parentBottom)*1/3};
					links.push({'p1':p1, 'p2':p2});
				}
				// 到孩子节点的线
				if (!isEmpty(node.children)){
					var p1 = bottomCenter(node.nodeRect);
					var childTop = node.children[0].nodeRect[Y];
					var p2 = {x:p1.x, y:p1.y+(childTop-p1.y)*2/3};
					links.push({'p1':p1, 'p2':p2});
					// 孩子节点的水平线
					var children = node.children;
					if (children.length>1){
						var firstChild = children[0];
						var lastChild = children[children.length-1];
						var p1 = middleTopCenter(firstChild);
						var p2 = middleTopCenter(lastChild);
						links.push({'p1':p1, 'p2':p2});
					}
				}
			});
			return links;
		}

		function middleTopCenter(node){
			var p1 = topCenter(node.nodeRect);
			var parentNodeRect = node.parentNode.nodeRect
			var parentBottom = parentNodeRect[Y]+parentNodeRect[HEIGHT];
			p1.y = p1.y-(p1.y - parentBottom)/3;
			return p1;
		}

		function bottomCenter(nodeRect){
			var p = {};
			p.y = nodeRect[Y]+nodeRect[HEIGHT];
			p.x = nodeRect[X]+nodeRect[WIDTH]/2;
			return p;
		}

		function topCenter(nodeRect){
			var p = {};
			p.y = nodeRect[Y];
			p.x = nodeRect[X]+nodeRect[WIDTH]/2;
			return p;
		}

		// default implementations
		function defaultLayout(data){
			log('defaultLayout called.');
			// wrap tree
			var tree = traverseTreeFirstOrder(data, firstOrderCallback);
			computeNodeRect(tree);
			return tree;
		}

		function computeNodeRect(wrappedNode){
			firstOrderComputeNodeRect(wrappedNode);
			lastOrderAdjustNodePos(wrappedNode);
		}

		function firstOrderComputeNodeRect(wrappedNode){
			// 先计算 root 位置
			computeRoot(wrappedNode);

			var children = wrappedNode.children;
			// 计算孩子们的位置
			// for(var i=0; i<children.length; i++){
			// 	computeRoot(children[i]);
			// }
			// 然后递归计算孩子们的位置
			for(var i=0; i<children.length; i++){
				firstOrderComputeNodeRect(children[i]);
			}
		}

		function computeRoot(wrappedNode){
			//	x:看是否有左兄弟？有则顺序排列，无则取父节点的位置，无父节点则取0.
			//	y:按照 depth 计算
			
			// 计算节点尺寸
			nodeRectBuilder.call(ochart, wrappedNode);

			var nodeRect = wrappedNode.nodeRect;
			nodeRect[Y] = wrappedNode.depth * layerHeight;
			var preSibling = findPreSibling(wrappedNode);
			if (preSibling){
				nodeRect[X] = preSibling.nodeRect[X] + preSibling.nodeRect[WIDTH] + interval;
			}else{
				nodeRect[X] = wrappedNode.parentNode ? 
					wrappedNode.parentNode.nodeRect[X] : 0;
			}
		}

		function lastOrderAdjustNodePos(wrappedNode){
			var children = wrappedNode.children;
			if (isEmpty(children)){
				return;
			}
			for(var i=0; i<children.length; i++){
				lastOrderAdjustNodePos(children[i]);
			}
			// 调整root, 居中
			var center, lastNode = children[children.length-1];
			var childLength = lastNode.nodeRect[X]+lastNode.nodeRect[WIDTH] - children[0].nodeRect[X];
			center = children[0].nodeRect[X] + childLength/2;
			wrappedNode.nodeRect[X] = center - wrappedNode.nodeRect[WIDTH]/2;
			// log('调整root "'+wrappedNode.node.name+'" to center: ' + wrappedNode.nodeRect[X]);
			log('调整：'+wrappedNode.node.name);
			// 根据右兄弟调整位置
			var nextSibling = findNextSibling(wrappedNode);
			if (nextSibling){
				log('nextSibling: ' + nextSibling.node.name);
				var rightMostOfTree = findRightMost(wrappedNode);
				var offset = nextSibling.nodeRect[X] - rightMostOfTree - interval;
				if (offset < 0){
					var siblings = findAllPreSiblings(wrappedNode);
					for(var i=0; i<siblings.length; i++){
						moveTree(siblings[i], offset);	
					}
				}
			}
		}

		function findAllPreSiblings(wrappedNode){
			var parentNode = wrappedNode.parentNode,
			children = parentNode.children,
			siblings = [];
			if (!parentNode){
				return [];
			}
			var index = children.indexOf(wrappedNode);
			for(var i=0; i<=index; i++){
				siblings.push(children[i]);
			}
			return siblings;
		}

		function moveTree(tree, offset){
			traverseTreeLastOrder(tree, {}, function(node){
				node.nodeRect[X] += offset;
			});
		}

		function findRightMost(wrappedNode){
			var rightMost = {x:0};
			traverseTreeLastOrder(wrappedNode, rightMost, function(node){
				var right = node.nodeRect[X]+node.nodeRect[WIDTH];
				if (right > this.x){
					this.x = right;
				}
			});
			return rightMost.x;
		}

		function adjustRootByChild(wrappedNode){
			if (isEmpty(wrappedNode.children)){
				return;
			}
			// 计算offset：next sibling 的左 - last child 的右边线位置
			var nextSibling = findNextSibling(wrappedNode),
			offset = 0, children = wrappedNode.children,
			lastNodeRect = children[children.length-1].nodeRect;

			if (!nextSibling){
				return;
			}
			offset = nextSibling.nodeRect[X] - (lastNodeRect[X] + lastNodeRect[WIDTH]);
			if (offset > 0){
				// update children
				for(var i=0; i<children.length; i++){
					children[i].nodeRect[X] -= offset;
				}
				// update root
				wrappedNode.nodeRect[X] -= offset;
			}
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
		function findNextSibling(wrappedNode){
			var parentNode = wrappedNode.parentNode,
			children = parentNode.children;
			if (!parentNode){
				return false;
			}
			var index = children.indexOf(wrappedNode);
			if (index > 0 && index <= children.length-2){
				return children[index+1];
			}else{
				return false;
			}
		}

		// return false if not find or return object.
		function findPreSibling(wrappedNode){
			var parentNode = wrappedNode.parentNode,
			children = parentNode.children;
			if (!parentNode){
				return false;
			}
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
			drawNodes(svg, tree);
			drawLinks(svg, tree);
		}

		function drawLinks(svg, tree){
			log(tree.links);
			var data = svg.selectAll('g.links').data(tree.links);
			data.enter()
			.append('g').attr('class', 'links')
			.append('line')
			.attr('x1', function(link){
				return link.p1.x;
			})
			.attr('y1', function(link){
				return link.p1.y;
			})
			.attr('x2', function(link){
				return link.p2.x;
			})
			.attr('y2', function(link){
				return link.p2.y;
			})
		}

		function drawNodes(svg, tree){

			var data = svg.selectAll('g').data(tree.nodes);

			// enter
			var g = data.enter()
			.append('g')
			.attr('class', 'node')
			.attr('transform', function(node){
				return 'translate('+ node.nodeRect[X] + ', ' + node.nodeRect[Y] +')';
			});

			g.append('rect')
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
			})
			.attr('rx', 5)
			.attr('ry', 5);

			g.append('text').text(function(node){
				return nodeLabelReader(node.node);
			})
			.attr('dx', 15)
			.attr('dy', 23)
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