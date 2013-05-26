/*
 * node-ws - pure Javascript WebSockets server
 * Copyright Bradley Wright <brad@intranation.com>
 */
 
// Use strict compilation rules - we're not animals
'use strict';
 
var net = require('net'),
 crypto2 = require('crypto');

function HandshakeHYBI00(request) {
    // split up lines and parse
    var lines = request.split('\r\n'),
        headers = parseHeaders(lines);


    var protocol = headers['sec-websocket-protocol'];

    // calc key
    var key = headers['sec-websocket-key'];
    //var key = "x3JJHMbDL1EzLkh9GBhXDw=="; //test key
    var shasum = crypto2.createHash('sha1');
    shasum.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
    key = btoa(shasum.digest('ascii'));

    var headers = [
        'HTTP/1.1 101 Switching Protocols'
      , 'Upgrade: websocket'
      , 'Connection: Upgrade'
      , 'Sec-WebSocket-Accept: ' + key
      , 'Access-Control-Allow-Origin: *'
      , ''
    ];


    if (typeof protocol != 'undefined') {
      headers.push('Sec-WebSocket-Protocol: ' + protocol);
    }

    return headers;

}

function parseHeaders(headers) {
    // splits a list of headers into key/value pairs
    var parsedHeaders = {};
 
    headers.forEach(function(header) {
        // might contain a colon, so limit split
        var toParse = header.split(':');
        if (toParse.length >= 2) {
            // it has to be Key: Value
            var key = toParse[0].toLowerCase(),
                // might be more than 1 colon
                value = toParse.slice(1).join(':')
                    .replace(/^\s\s*/, '')
                    .replace(/\s\s*$/, '');
            parsedHeaders[key] = value;
        }
        else {
            // it might be a method request,
            // which we want to store and check
            if (header.indexOf('GET') === 0) {
                parsedHeaders['X-Request-Method'] = 'GET';
            }
        }
    });
 
    return parsedHeaders;
}
 
function WebSocketServer(port, bindAddress) {
    this.port = port;
    this.bindAddress = bindAddress;
    var self = this;
    net.createServer(function (socket) {

        var wsConnected = false;
        self.socket = socket;

        socket.addListener('data', function (data) {
           
            if (wsConnected) {
                if(data.length) {
                    var raw = decodeWebSocket(data);
                    var decoded = String.fromCharCode.apply(null, raw);
                    console.log(decoded);
                    if(self.callback)
                        self.callback(decoded);
                }

            } else {

                var response = HandshakeHYBI00(data.toString('binary'));
                if (response) {
                    // handshake succeeded, open connection
                    var handshakeString = response.join('\r\n') + "\r\n";
                    socket.write(handshakeString, 'ascii', function(){
                        console.log('Completing handshake');
                    });
                   
                    wsConnected = true;
                }
                else {
                    // close connection, handshake bad
                    socket.end();
                    console.error('Bad handshake');
                    return;
                }

            }
        });
     
    }).listen(port, bindAddress);
}

WebSocketServer.prototype.send = function(message) {
    if(typeof this.socket !== 'undefined') {
        var data = encodeWebSocket(message);
        this.socket.write(data);
    } else console.warn("There is nobody to send to");
}

WebSocketServer.prototype.onMessage = function(callback) {
    this.callback = callback;
}

function encodeWebSocket(bytesRaw){
    var bytesFormatted;
    var indexStartRawData;
    if (bytesRaw.length <= 125) {
        indexStartRawData = 2;
        bytesFormatted = new Buffer(bytesRaw.length + 2);
        bytesFormatted.writeUInt8(bytesRaw.length, 1);
    } else if (bytesRaw.length >= 126 && bytesRaw.length <= 65535) {
        indexStartRawData = 4;
        bytesFormatted = new Buffer(bytesRaw.length + 4);
        bytesFormatted.writeUInt8(126, 1);
        bytesFormatted.writeUInt8(( bytesRaw.length >> 8 ) & 255, 2);
        bytesFormatted.writeUInt8(( bytesRaw.length      ) & 255, 3);
    } else {
        indexStartRawData = 10;
        bytesFormatted = new Buffer(bytesRaw.length + 10);
        bytesFormatted.writeUInt8(127, 1);
        bytesFormatted.writeUInt8(( bytesRaw.length >> 56 ) & 255, 2);
        bytesFormatted.writeUInt8(( bytesRaw.length >> 48 ) & 255, 3);
        bytesFormatted.writeUInt8(( bytesRaw.length >> 40 ) & 255, 4);
        bytesFormatted.writeUInt8(( bytesRaw.length >> 32 ) & 255 ,5);
        bytesFormatted.writeUInt8(( bytesRaw.length >> 24 ) & 255, 6);
        bytesFormatted.writeUInt8(( bytesRaw.length >> 16 ) & 255, 7);
        bytesFormatted.writeUInt8(( bytesRaw.length >>  8 ) & 255, 8);
        bytesFormatted.writeUInt8(( bytesRaw.length       ) & 255, 9);
    }
    
    bytesFormatted.writeUInt8(129, 0);

    for (var i = 0; i < bytesRaw.length; i++){
        bytesFormatted.writeUInt8(bytesRaw.charCodeAt(i), indexStartRawData + i);
    }
    return bytesFormatted;
}

function decodeWebSocket (bytes){
    var datalength = bytes.readUInt8(1) & 127;
    var indexFirstMask = 2;
    if (datalength == 126) {
        indexFirstMask = 4;
    } else if (datalength == 127) {
        indexFirstMask = 10;
    }
    var masks = bytes.slice(indexFirstMask, indexFirstMask + 4);
    var indexFirstDataByte = indexFirstMask + 4;
    var j = 0;
    var i = indexFirstDataByte;
    var output = []
    while (i < bytes.length) {
        var dataByte = bytes.readUInt8(i++);
        var maskByte = masks.readUInt8(j++ % 4);
        output[j] = dataByte ^ maskByte;
    }
    return output;
}

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

function arrayBufferToString(buffer) {
    var str = '';
    var uArrayVal = new Uint8Array(buffer);
    for(var s = 0; s < uArrayVal.length; s++) {
      str += String.fromCharCode(uArrayVal[s]);
    }
    return str;
};


 
