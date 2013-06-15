var Connection = (function() {
	var Connection = function Connection(addr) {
		this.socket = new WebSocket(addr);
		console.log( this.socket);
		this.messageid = 0;
		this.responseCallbacks = {}
		this.toSend = []
		var t = this
		this.authenticated = false
		this.socket.onopen = function(evt){
			while(t.toSend.length > 0) {
				t.send(t.toSend.shift())
			}
			t.toSend = []
		}

		this.socket.onmessage = function (evt) {
			var obj = JSON.parse(evt.data)
			if (obj.type == "response" ){
				if (obj.responseid in t.responseCallbacks ){
					ca = t.responseCallbacks[obj.responseid];
					if( obj.responsesuccess == true) {
						ca.success(obj, ca.req)
					} else {
						var text = "Request " + ca.req.request + " failed: " +( obj.responseinfo || obj.responsedetail || "Unknown failure");
						addNotification( {type:"error", msg:text});
						ca.failure(obj, ca.req)
					}
				} else {
					addNotification( {type:"error", msg:"Got response for unsent request!"});
				}
			}
console.log("Got data: " + JSON.stringify(obj));
		};
	}

	Connection.prototype.sendReq = function(req, msg, successCallback, failureCallback) {
		msg["messageid"] = this.messageid;
		msg["request"] =req;
		msg["type"] = "request";
		this.responseCallbacks[this.messageid] = {req:msg};
		if(arguments.length == 3) {
			this.responseCallbacks[this.messageid].success = successCallback;
			this.responseCallbacks[this.messageid].failure = function(r){throw {"response" : r}};
		}
		else if(arguments.length == 4) {
			this.responseCallbacks[this.messageid].success = successCallback;
			this.responseCallbacks[this.messageid].failure = failureCallback;
		}
		this.messageid++;
		this.send(msg);
	}

	Connection.prototype.send = function(msg) {
		console.log( this.socket.readyState)
		console.log( "Sending: " + JSON.stringify(msg))
		if( this.socket.readyState == 0) {
			console.log("Send before connect." + msg)
			this.toSend.push(msg)
			return
		}
		console.log("send: " + msg)
		this.socket.send(
			JSON.stringify(msg) + 
			"\r\n\r\n")
	}

	return Connection;
})()

var Session = (function() {
	var Session = function Session() {
		this.connections = {};
		this.logininfo = {};
		this.onConnect = [];
	}

	Session.prototype.getAServer = function() {
		for (var v in this.connections) {
			return this.connections[v];
		}
		return null;
	}

	Session.prototype.registerOnConnect = function(f) {
		this.onConnect.push(f);
	}

	Session.prototype.login = function(user, pw, result) {
		this.logininfo["username"] = user;
		this.logininfo["password"] = pw;

		for(key in this.connections) {
			var c = this.connections[key]
			var s = this

			c.sendReq("pw_auth", {username:user, password:pw}, 
				function() {
					c.authenticated = true
					addNotification({type:"success", msg:"Successfully authenticated with " + key});
					result(true);
				},
				function() {
					c.authenticated = false
					addNotification({type:"error", msg:"Wrong username/password"})
					result(false);
			});
		}
	}





	Session.prototype.addServer = function(addr) {
		if (! (addr in this.connections)){
			var c = new Connection(addr);
			var s = this
				c.sendReq("handshake", {"protocol" : "wars2"}, function(){
					s.connections[addr] = c
					while(s.onConnect.length > 0) {
						s.onConnect.pop()();
					}
					addNotification(
						{type:"success",
							msg:("Successfully established connection to " + addr)
						})
				});
		} else {
			console.log("Tried to add connection already in connections")

		}
	}
	return Session;
})();


var session = new Session()
maplist = [];
session.registerOnConnect( function() {
	session.getAServer().sendReq("get_maplist", {}, function(r) {
		while(r.maps.length > 0) {
			var m = r.maps.pop().toString();
			console.log(m);
			session.getAServer().sendReq("get_map", {mapid:m}, function(r2, req) {
				var x = req.mapid;
				r2.map.mapid = x;
				maplist.push(r2.map);
			});
		}
	});
});

session.addServer("ws://tetriz.dyndns.org:2336")
