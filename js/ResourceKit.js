/*
	Header: ResourceKit
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
				this.factory = function() { return endpoint; };
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
			this.transport.create(item, args);
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
		this.url = url;
		this.args = args;
		
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

		/* Group: XHR Helpers */
		/*
			Function: doResource
			Initiates a resource operation

			Parameters:
				resource - the <Resource> for which the request is to be made
				method - the HTTP method to use
				url - URL to which to make the request
				data - data to send in XHR request
				args - additional arguments
		*/
		function doResource(method, url, data, args, setup) {
			xhr(method, url, prepareData(data), setup
				,function(xhr) { xhrSuccess(xhr, (args) ? args.load : null); }
				,function(xhr) { xhrError(xhr, (args) ? args.error : null); }
			);
		}

		function prepareData(data) {
			return data == null || data == undefined ? null : handlers.json.serialize(data);
		}

		/*
			Function: xhr
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
		function xhr(method, url, data, configurexhr, success, error) {
			var xhr = null;
			try{ xhr = new XMLHttpRequest(); }catch(e0){
			try{ xhr = new ActiveXObject('Msxml2.XMLHTTP'); }catch(e1){
			try{ xhr = new ActiveXObject('Microsoft.XMLHTTP'); }catch(e2){
			try{ xhr = new ActiveXObject('Msxml2.XMLHTTP.4.0'); }catch(e3){}}}}

			xhr.open(method, url, true);
			xhr.setRequestHeader("Accept", "application/json");
			if(data) xhr.setRequestHeader("Content-Type", "application/json");

			if(configurexhr) configurexhr(xhr);

			xhr.onreadystatechange = function() {
				handlexhr(xhr, success, error);
			};

			xhr.send(data);
		}

		/*
			Function: handlexhr

			Parameters:
				xhr - XMLHttpRequest object that was used to make the request
				success - callback to invoke on success
				error - callback to invoke on any error
		*/
		function handlexhr(xhr, success, error) {
			if(xhr.readyState != 4) return;
			(xhr.error ? error : success)(xhr);
		}

		/*
			Function: xhrSuccess
			Handles a successful XHR request, parses results, and feeds them to the supplied callback

			Parameters:
				xhr - XMLHttpRequest object that was used to make the request
				callback - callback to invoke for each parsed resource
		*/
		function xhrSuccess(xhr, callback) {
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
			Function: xhrError
			Handles XHR errors.  Currently, this is a passthrough to callback.

			Parameters:
				xhr - XMLHttpRequest object that was used to make the request
				callback - callback to invoke
		*/
		function xhrError(xhr, callback) {
			if(callback) callback(xhr);
		}
		
		function list(args) {
			query(null, args);
		}
		
		function get(id, args) {
			doResource("GET", buildFullUrl(url, id), null, args);
		}

		function query(query, args) {
			doResource("GET", buildFullUrl(url, null, query), null, args,
				function(xhr) {
					if(args.count) {
						var start = args.start || 0;
						xhr.setRequestHeader("Range", "" + start + "-" + (start + args.count - 1));
					}
				});
		}
		
		function create(item, args) {
			doResource("POST", url, item, args);
		}
		
		function update(item, args) {
			doResource("PUT", buildFullUrl(url, item.id), item, args);
		}
		
		function remove(item, args) {
			doResource("DELETE", buildFullUrl(url, item.id), null, args);
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
