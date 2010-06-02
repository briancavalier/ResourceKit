/*
	Header: ResourceKit
	ResourceKit provides an Active Record pattern in Javascript for
	accessing resources from various
*/
(function(window, undefined) {
	/*
		Class: ResourceKit
	*/
	/*
		Constructor: ResourceKit
		Creates a new ResourceKit for the supplied endpoint
		
		Parameters:
			endpoint -
			args -
			
		Returns:
			a new <ResourceKit>
	*/
	var ResourceKit = function(endpoint, args) {
		return new ResourceKit.prototype._init(endpoint, args);
	};
	
	ResourceKit.prototype = {
		/*
			Function: _init
			Private constructor that creates a new ResourceKit.  You should call
			<ResouceKit> instead.
		*/
		_init: function(endpoint, args) {
			if(isString(endpoint)) {
				this.factory = function(name, args) {
					return new XhrTransport(buildFullUrl(endpoint, name), args);
				};
			} else if (isFunction(endpoint)) {
				this.factory = endpoint;
			} else {
				this.factory = function(name, args) {
					return new jsonTransport(endpoint[name], args);
				};
			}
			
			return this;
		},
		
		/*
			Function: resource
			Creates a new <Resource> of the specified name from this <ResourceKit>
			
			Parameters:
				name - the name of the <Resource>
				args -
		*/
		resource: function(name, args) {
			return new Resource(this.factory(name, args));
		}
	};
	
	ResourceKit.prototype._init.prototype = ResourceKit.prototype;
	
	/*
		Class: Resource
		Represents a group of resources at the specified URL
	*/
	var Resource = function(transport) {
		this.transport = transport;
	};
	
	Resource.prototype = {
		/*
			Function: list
			Lists all resources

			Parameters:
				args - arguments			
		*/
		list: function(args) {
			this.transport.list(args);
		},
		
		/*
			Function: get
			Gets a resource by id

			Parameters:
				id - the id of the resource to get
				args - arguments			
		*/
		get: function(id, args) {
			this.transport.get(id, args);
		},

		/*
			Function: query
			Queries for matching resources

			Parameters:
				query - Object containing key value pairs to be used as the query
				args - arguments			
		*/
		query: function(query, args) {
			this.transport.query(query, args);
		},

		create: function(item, args) {
			this.transport.create(item, args);
		},

		update: function(item, args) {
			this.transport.update(item, args);
		},

		remove: function(item, args) {
			this.transport.remove(item, args);
		}
	};
		
	/*
		Class: XhrTransport
		A transport that uses XHR to move data over HTTP
	*/
	var XhrTransport = function(url, args) {
		var handlers = {
			json: {
				serialize: function(data) {
					return JSON.stringify(data);
				},

				deserialize: function(xhr) {
					return JSON.parse(xhr.responseText);
				}
			}
		};
		
		handlers._default = handlers.json;

		function list(args) {
			query(null, args);
		}
		
		function get(id, args) {
			execute("GET", buildFullUrl(url, id), null, args);
		}

		function query(query, args) {
			var f = function(xhr) {
				var start = args.start || 0;
				xhr.setRequestHeader("Range", "" + start + "-" + (start + args.count - 1));
			};
			execute("GET", buildFullUrl(url, null, query), null, args, args.count ? f : null);
		}
		
		function create(item, args) {
			execute("POST", url, item, args);
		}
		
		function update(item, args) {
			execute("PUT", buildFullUrl(url, item.id), item, args);
		}
		
		function remove(item, args) {
			execute("DELETE", buildFullUrl(url, item.id), null, args);
		}
		
		/* Group: XHR Helpers */
		/*
			Function: execute
			Executes a resource operation over XHR

			Parameters:
				method - the HTTP method to use
				url - URL to which to make the request
				data - data to send in XHR request
				configurexhr - callback to which the XMLHttpRequest object will be passed for additional configuration
				args - additional arguments
		*/
		function execute(method, url, data, args, configurexhr) {
			send(method, url, provide(data), configurexhr, args || {}
				,function(xhr, args) { success(xhr, (args) ? args.load : null); }
				,function(xhr, args) { error(xhr, (args) ? args.error : null); }
			);
		}

		function provide(data) {
			return function() { handlers._default.serialize(data); };
		}

		/*
			Function: send
			Creates, opens, and sends an XHR request to the supplied url, using the supplied method and data
			and sets success to be invoked in the XHR succeeds, and error in any other case.

			Parameters:
				method - HTTP method to use
				url - URL to which to make the request
				data - data to send in XHR request
				configurexhr - callback to which the XMLHttpRequest object will be passed for additional configuration
				success - callback to be invoked if XHR succeeds
				error - callback to be invoked if XHR encounters an error
		*/
		function send(method, url, data, configurexhr, args, success, error) {
			try{ var xhr = new XMLHttpRequest(); }catch(e0){
			try{ xhr = new ActiveXObject('Msxml2.XMLHTTP'); }catch(e1){
			try{ xhr = new ActiveXObject('Microsoft.XMLHTTP'); }catch(e2){
			try{ xhr = new ActiveXObject('Msxml2.XMLHTTP.4.0'); }catch(e3){}}}}

			xhr.open(method, url, true);
			xhr.setRequestHeader("Accept", "application/json");
			if(data) xhr.setRequestHeader("Content-Type", "application/json");

			if(configurexhr) configurexhr(xhr, args);

			var timeout = setTimeout(function() {
				xhr.abort();
			}, args.timeout || 60000);
			
			xhr.onreadystatechange = function() {
				handle(xhr, timeout, success, error);
			};

			xhr.send(data());
		}

		/*
			Function: handle

			Parameters:
				xhr - XMLHttpRequest object that was used to make the request
				success - callback to invoke on success
				error - callback to invoke on any error
		*/
		function handle(xhr, timeout, success, error) {
			if(xhr.readyState != 4) return;
			clearTimeout(timeout);
			(xhr.error ? error : success)(xhr);
		}

		/*
			Function: success
			Handles a successful XHR request, parses results, and feeds them to the supplied callback

			Parameters:
				xhr - XMLHttpRequest object that was used to make the request
				callback - callback to invoke for each parsed resource
		*/
		function success(xhr, callback) {
			var js = handlers.json.deserialize(xhr);
			if(callback) {
				if(isArray(js)) {
					for(var i=0; i<js.length; i++) {
						callback(js[i]);
					}
				} else {
					callback(js);
				}			
			}
		}

		/*
			Function: error
			Handles XHR errors.  Currently, this is a passthrough to callback.

			Parameters:
				xhr - XMLHttpRequest object that was used to make the request
				callback - callback to invoke
		*/
		function error(xhr, callback) {
			if(callback) callback(xhr);
		}
		
		return {
			list: list
			,get: get
			,query: query
			,create: create
			,update: update
			,remove: remove
		};
	};
	
	/*
		Class: jsonTransport
		A transport that uses the supplied json as an in-memory data model, which is queried
		and modified directly.
	*/
	var jsonTransport = function(json, args) {
		var data = {};
		var nextid = 1;
		for(var i=0; i<json.length; i++) {
			var item = json[i]
				,max = 1
				;
			if(item.id) {
				if(item.id > max) max = item.id;
				data[item.id] = i;
			}
			
			nextid = max+1;
		}

		function list(args) {
			if(!args.load) throw "args must have a load handler function";
			
			var start = (args.start || 0);
			var end = json.length;
			if(args.hasOwnProperty("count")) {
				var e = start + args.count;
				if(e < json.length) end = e;
			}
			for(var i=start; i<end; i++) {
				args.load(json[i]);
			}
		}

		function get(id, args) {
			if(!args.load) throw "args must have a load handler function";
			
			var item = json[data[id]];
			(item ? args.load(item) : args.error());
		}

		function query(query, args) {
			// TODO: Implement simple querying
		}

		function create(item, args) {
			if(item.id) throw "item already has an id";
			
			item.id = nextid++;
			data[item.id] = json.push(item) - 1;
			if(args && args.load) args.load(item);
		}

		function update(item, args) {
			if(item.id) {
				// TODO: Should merge item properties into existing
				var i = data[item.id];
				if(i) {
					json[i] = item;
					if(args && args.load) args.load(item);
				} else {
					if(args && args.error) args.error(item);
				}
			}
		}

		function remove(item, args) {
		}

		return {
			list: list
			,get: get
			,query: query
			,create: create
			,update: update
			,remove: remove
		};
	};
	
	/* Group: URL Helpers */
	/*
		Function: buildFullUrl
		Constructs a complete URL using the supplied baseUrl, suffix, and query by appending suffix to baseUrl,
		and then append a valid query string, built from query using <ResourceKit.buildQueryString>.
		
		Parameters:
			baseUrl - base URL, may be relative or absolute, and may end in a slash or not. _Must not_ be null
			suffix - path portion to append to baseUrl. May be null
			query - query object to transform into a query string and append. May be null
			
		Returns:
			A valid URL constructed from baseUrl, suffix, and query
	*/
	function buildFullUrl(baseUrl, suffix, query) {
		var url = baseUrl;
		if(suffix) {
			if(baseUrl[baseUrl.length-1] != '/') url += '/';
			url += suffix;
		}
		
		if(query) {
			var queryString = buildQueryString(query);
			if(queryString && queryString.length > 0)
				url += (url.indexOf('?') >= 0 ? '&' : '?') + queryString;
		}
		
		return url;
	}
	
	/*
		Function: buildQueryString
		Constructs a valid URL query string from the supplied objects key/value pairs.
		
		Parameters:
			queryObj - Object containing key/value pairs
			
		Returns:
			A valid query string, including _internal_ separators, but without an initial '?' or '&'.
			It is the callers responsibility to prepend the appropriate separator.
	*/
	function buildQueryString(queryObj) {	
		var components = [];
		for(var k in queryObj) {
			if(k) {
				var v = queryObj[k];
				if(v) {
					// Handle arrays by appending [] to each occurrence
					if(isArray(v)) {
						for(var i=0; i<v.length; i++) {
							components.push(encodeURIComponent(k) + "[]=" + encodeURIComponent(v[i]));
						}
					} else {
						components.push(encodeURIComponent(k) + '=' + encodeURIComponent(v.toString()));
					}
				} 
			}
		}
		
		return components.join('&');
	}
	
	/* Group: Utility Helpers */
	/*
		Function: isArray
		Determines if obj is an Array

		Parameters:
			obj - determine whether this obj is an Array or not
			
		Returns:
			true iff obj is strictly a Javascript Array
	*/
	function isArray(obj) {
		return obj && (obj instanceof Array || typeof obj == "array"); // Boolean
	}
	
	function isString(obj) {
		return (typeof obj == "string" || obj instanceof String); // Boolean
	}
	
	function isFunction(obj) {
		return Object.prototype.toString(obj) === "[object Function]";
	}
	
	window.ResourceKit = ResourceKit;
	
})(window);
