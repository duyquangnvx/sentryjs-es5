let LocalStorage = (function () {
	return (function (LocalStorage) {
		var cacheTimes = {};
		function init() {
			cacheTimes = getObject('LocalStorage_cacheTimes', {});
			var now = Date.now();
			var isUpdate = false;
			for (var key in cacheTimes) {
				if (cacheTimes[key] < now) {
					remove(key);
					delete cacheTimes[key];
					isUpdate = true;
				}
			}
			if (isUpdate)
				setObject('LocalStorage_cacheTimes', cacheTimes);
		}
		LocalStorage.init = init;
		function isInvalid(value) {
			return (value == null ||
				value == undefined ||
				value == '' ||
				value == 'undefined' ||
				value == 'null');
		}
		LocalStorage.isInvalid = isInvalid;
		function getNumber(key, defaultValue) {
			var val = window.localStorage.getItem(key);
			if (isInvalid(val))
				return defaultValue || 0;
			else
				return Number(val);
		}
		LocalStorage.getNumber = getNumber;
		function setNumber(key, value, timeSecond) {
			window.localStorage.setItem(key, value);
			if (timeSecond) {
				cacheTimes[key] = Date.now() + timeSecond * 1000;
				setObject('LocalStorage_cacheTimes', cacheTimes);
			}
		}
		LocalStorage.setNumber = setNumber;
		function getString(key, defaultValue) {
			var val = window.localStorage.getItem(key);
			if (isInvalid(val))
				return defaultValue || '';
			else
				return val;
		}
		LocalStorage.getString = getString;
		function setString(key, value, timeSecond) {
			window.localStorage.setItem(key, value);
			if (timeSecond) {
				cacheTimes[key] = Date.now() + timeSecond * 1000;
				setObject('LocalStorage_cacheTimes', cacheTimes);
			}
		}
		LocalStorage.setString = setString;
		function getBoolean(key, defaultValue) {
			var val = window.localStorage.getItem(key);
			if (isInvalid(val))
				return defaultValue || false;
			else
				return val == 1;
		}
		LocalStorage.getBoolean = getBoolean;
		function setBoolean(key, value, timeSecond) {
			var numVal = value ? 1 : 0;
			window.localStorage.setItem(key, numVal);
			if (timeSecond) {
				cacheTimes[key] = Date.now() + timeSecond * 1000;
				setObject('LocalStorage_cacheTimes', cacheTimes);
			}
		}
		LocalStorage.setBoolean = setBoolean;
		function getObject(key, defaultValue) {
			var val = window.localStorage.getItem(key);
			if (isInvalid(val))
				return defaultValue || undefined;
			else {
				try {
					return JSON.parse(val);
				}
				catch (error) {
					return defaultValue || undefined;
				}
			}
		}
		LocalStorage.getObject = getObject;
		function setObject(key, value, timeSecond) {
			window.localStorage.setItem(key, JSON.stringify(value));
			if (timeSecond) {
				cacheTimes[key] = Date.now() + timeSecond * 1000;
				setObject('LocalStorage_cacheTimes', cacheTimes);
			}
		}
		LocalStorage.setObject = setObject;
		function remove(key) {
			window.localStorage.removeItem(key);
		}
		LocalStorage.remove = remove;

		return LocalStorage;
	})({});
})();

(function (g) {
	function normalizeName(name) {
		if (typeof name !== 'string') {
			name = String(name);
		}
		if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === '') {
			throw new Error('Invalid character in header field name: "' + name + '"');
		}
		return name.toLowerCase();
	}

	function normalizeValue(value) {
		if (typeof value !== 'string') {
			value = String(value);
		}
		return value;
	}

	function Headers(headers) {
		this.map = {};

		if (headers instanceof Headers) {
			headers.forEach(function (value, name) {
				this.append(name, value);
			}, this);
		} else if (Array.isArray(headers)) {
			headers.forEach(function (header) {
				if (header.length != 2) {
					throw new Error(
						'Headers constructor: expected name/value pair to be length 2, found' + header.length
					);
				}
				this.append(header[0], header[1]);
			}, this);
		} else if (headers) {
			Object.getOwnPropertyNames(headers).forEach(function (name) {
				this.append(name, headers[name]);
			}, this);
		}
	}

	Headers.prototype.append = function (name, value) {
		name = normalizeName(name);
		value = normalizeValue(value);
		var oldValue = this.map[name];
		this.map[name] = oldValue ? oldValue + ', ' + value : value;
	};

	Headers.prototype['delete'] = function (name) {
		delete this.map[normalizeName(name)];
	};

	Headers.prototype.get = function (name) {
		name = normalizeName(name);
		return this.has(name) ? this.map[name] : null;
	};

	Headers.prototype.has = function (name) {
		return this.map.hasOwnProperty(normalizeName(name));
	};

	Headers.prototype.set = function (name, value) {
		this.map[normalizeName(name)] = normalizeValue(value);
	};

	Headers.prototype.forEach = function (callback, thisArg) {
		for (var name in this.map) {
			if (this.map.hasOwnProperty(name)) {
				callback.call(thisArg, this.map[name], name, this);
			}
		}
	};

	function consumed(body) {
		if (body._noBody) return;
		if (body.bodyUsed) {
			return Promise.reject(new Error('Already read'));
		}
		body.bodyUsed = true;
	}

	function Body() {
		this.bodyUsed = false;

		this._initBody = function (body) {
			/*
        fetch-mock wraps the Response object in an ES6 Proxy to
        provide useful test harness features such as flush. However, on
        ES5 browsers without fetch or Proxy support pollyfills must be used;
        the proxy-pollyfill is unable to proxy an attribute unless it exists
        on the object before the Proxy is created. This change ensures
        Response.bodyUsed exists on the instance, while maintaining the
        semantic of setting Request.bodyUsed in the constructor before
        _initBody is called.
        */
			// eslint-disable-next-line no-self-assign
			this.bodyUsed = this.bodyUsed;
			this._bodyInit = body;
			if (body && body instanceof FormData) {
				const buffer = body.toBuffer();
				this._bodyInit = buffer.data;
				this.headers.set('content-type', 'multipart/form-data; boundary=' + buffer.boundary);
			}

			if (!body) {
				this._noBody = true;
				this._bodyText = '';
			} else if (typeof body === 'string') {
				this._bodyText = body;
			} else {
				this._bodyText = body = Object.prototype.toString.call(body);
			}

			if (!this.headers.get('content-type')) {
				if (typeof body === 'string') {
					this.headers.set('content-type', 'text/plain;charset=UTF-8');
				}
			}
		};

		this.text = function () {
			var rejected = consumed(this);
			if (rejected) {
				return rejected;
			}
			return Promise.resolve(this._bodyText);
		};

		this.json = function () {
			return this.text().then(JSON.parse);
		};

		return this;
	}

	// HTTP methods whose capitalization should be normalized
	var methods = ['CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE'];

	function normalizeMethod(method) {
		var upcased = method.toUpperCase();
		return methods.indexOf(upcased) > -1 ? upcased : method;
	}

	function Request(input, options) {
		if (!(this instanceof Request)) {
			throw new Error(
				'Please use the "new" operator, this DOM object constructor cannot be called as a function.'
			);
		}

		options = options || {};
		var body = options.body;

		if (input instanceof Request) {
			if (input.bodyUsed) {
				throw new Error('Already read');
			}
			this.url = input.url;
			this.credentials = input.credentials;
			if (!options.headers) {
				this.headers = new Headers(input.headers);
			}
			this.method = input.method;
			this.mode = input.mode;
			if (!body && input._bodyInit != null) {
				body = input._bodyInit;
				input.bodyUsed = true;
			}
		} else {
			this.url = String(input);
		}

		this.credentials = options.credentials || this.credentials || 'same-origin';
		if (options.headers || !this.headers) {
			this.headers = new Headers(options.headers);
		}
		this.method = normalizeMethod(options.method || this.method || 'GET');
		this.mode = options.mode || this.mode || null;
		this.referrer = null;

		if ((this.method === 'GET' || this.method === 'HEAD') && body) {
			throw new Error('Body not allowed for GET or HEAD requests');
		}
		this._initBody(body);

		if (this.method === 'GET' || this.method === 'HEAD') {
			if (options.cache === 'no-store' || options.cache === 'no-cache') {
				// Search for a '_' parameter in the query string
				var reParamSearch = /([?&])_=[^&]*/;
				if (reParamSearch.test(this.url)) {
					// If it already exists then set the value with the current time
					this.url = this.url.replace(reParamSearch, '$1_=' + new Date().getTime());
				} else {
					// Otherwise add a new '_' parameter to the end with the current time
					var reQueryString = /\?/;
					this.url += (reQueryString.test(this.url) ? '&' : '?') + '_=' + new Date().getTime();
				}
			}
		}
	}

	Request.prototype.clone = function () {
		return new Request(this, { body: this._bodyInit });
	};

	function parseHeaders(rawHeaders) {
		var headers = new Headers();
		// Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
		// https://tools.ietf.org/html/rfc7230#section-3.2
		var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
		// Avoiding split via regex to work around a common IE11 bug with the core-js 3.6.0 regex polyfill
		// https://github.com/github/fetch/issues/748
		// https://github.com/zloirock/core-js/issues/751
		preProcessedHeaders
			.split('\r')
			.map(function (header) {
				return header.indexOf('\n') === 0 ? header.substr(1, header.length) : header;
			})
			.forEach(function (line) {
				var parts = line.split(':');
				var key = parts.shift().trim();
				if (key) {
					var value = parts.join(':').trim();
					try {
						headers.append(key, value);
					} catch (error) {
						console.warn('Response ' + error.message);
					}
				}
			});
		return headers;
	}

	Body.call(Request.prototype);

	function Response(bodyInit, options) {
		if (!(this instanceof Response)) {
			throw new Error(
				'Please use the "new" operator, this DOM object constructor cannot be called as a function.'
			);
		}
		if (!options) {
			options = {};
		}

		this.type = 'default';
		this.status = options.status === undefined ? 200 : options.status;
		if (this.status < 200 || this.status > 599) {
			throw new Error("Failed to construct 'Response': The status provided (0) is outside the range [200, 599].");
		}
		this.ok = this.status >= 200 && this.status < 300;
		this.statusText = options.statusText === undefined ? '' : '' + options.statusText;
		this.headers = new Headers(options.headers);
		this.url = options.url || '';
		this._initBody(bodyInit);
	}

	Body.call(Response.prototype);

	Response.prototype.clone = function () {
		return new Response(this._bodyInit, {
			status: this.status,
			statusText: this.statusText,
			headers: new Headers(this.headers),
			url: this.url,
		});
	};

	Response.error = function () {
		var response = new Response(null, { status: 200, statusText: '' });
		response.ok = false;
		response.status = 0;
		response.type = 'error';
		return response;
	};

	var redirectStatuses = [301, 302, 303, 307, 308];

	Response.redirect = function (url, status) {
		if (redirectStatuses.indexOf(status) === -1) {
			throw new Error('Invalid status code');
		}

		return new Response(null, {
			status: status,
			headers: { location: url },
		});
	};

	function fetch(input, init) {
		return new Promise(function (resolve, reject) {
			var request = new Request(input, init);

			const etag = LocalStorage.getString('etag:' + request.url);
			if (etag) {
				request.headers.set('If-None-Match', etag);
			}
			let retries = 2;

			function sendFetch() {
				var xhr = new XMLHttpRequest();

				xhr.onreadystatechange = function () {
					var options = {
						statusText: xhr.statusText,
						headers: parseHeaders(xhr.getAllResponseHeaders() || ''),
					};
					// This check if specifically for when a user fetches a file locally from the file system
					// Only if the status is out of a normal range
					if (request.url.indexOf('file://') === 0 && (xhr.status < 200 || xhr.status > 599)) {
						options.status = 200;
					} else {
						options.status = xhr.status;
					}
					options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
					var body = 'response' in xhr ? xhr.response : xhr.responseText;
					if (options.status === 304) {
						options.status = 200;
						body = LocalStorage.getObject('cache304:' + request.url);
					}

					if (options.status === 503 || options.status === 504 || options.status === 502) {
						if (retries > 0) {
							retries -= 1;
							setTimeout(function () {
								sendFetch();
							}, 1000);
							return;
						}
					}
	
					const etag = options.headers.get('etag');
					if (etag) {
						LocalStorage.setString('etag:' + request.url, options.headers.get('etag'));
						LocalStorage.setObject('cache304:' + request.url, body);
					}
					setTimeout(function () {
						resolve(new Response(body, options));
					}, 0);
				};
	
				xhr.onerror = function () {
					if (retries > 0) {
						retries -= 1;
						setTimeout(function () {
							sendFetch();
						}, 1000);
						return;
					}
					setTimeout(function () {
                        setTimeout(function() {
                            reject(new TypeError('Network request failed'))
                        }, 0)
					}, 0);
				};
	
				xhr.ontimeout = function () {
                    setTimeout(function() {
                        reject(new TypeError('Network request timed out'))
                    }, 0)
				};
				xhr.timeout = 15000;
				xhr.open(request.method, request.url);
	
				if (request.credentials === 'include') {
					xhr.withCredentials = true;
				} else if (request.credentials === 'omit') {
					xhr.withCredentials = false;
				}
	
				if (init && typeof init.headers === 'object' && !(init.headers instanceof Headers)) {
					var names = [];
					Object.getOwnPropertyNames(init.headers).forEach(function (name) {
						names.push(normalizeName(name));
						xhr.setRequestHeader(name, normalizeValue(init.headers[name]));
					});
					request.headers.forEach(function (value, name) {
						if (names.indexOf(name) === -1) {
							xhr.setRequestHeader(name, value);
						}
					});
				} else {
					request.headers.forEach(function (value, name) {
						xhr.setRequestHeader(name, value);
					});
				}
	
				if (request.method === 'GET' || request.method === 'HEAD') {
					xhr.send();
				} else {
					xhr.send(request._bodyInit || "" );
				}
			}
			
			sendFetch();
		});
	}

	fetch.polyfill = true;

	if (!g.fetch) {
		g.fetch = fetch;
		g.Headers = Headers;
		g.Request = Request;
		g.Response = Response;
	}
})(window);
