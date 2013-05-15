/*
 * node-ws - pure Javascript WebSockets server
 * Copyright Bradley Wright <brad@intranation.com>
 */
 
// Use strict compilation rules - we're not animals
'use strict';
 
var net = require('net'),
    crypto2 = require('crypto');
 
function bigEndian(value) {
    var result = [
        String.fromCharCode(value >> 24 & 0xFF),
        String.fromCharCode(value >> 16 & 0xFF),
        String.fromCharCode(value >> 8 & 0xFF),
        String.fromCharCode(value & 0xFF)
    ];
    return result.join('');
}
 
function computeKey(key) {
    /*
     * For each of these fields, the server has to
     * take the digits from the value to obtain a
     * number, then divide that number by the number
     * of spaces characters in the value to obtain
     * a 32-bit number.
     */
    var length = parseInt(key.match(/\s/g).length),
        chars = parseInt(key.replace(/[^0-9]/g, ''));
    return (chars / length);
}

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
 
var WebsocketServer = net.createServer(function (socket) {
    // listen for connections
    var wsConnected = false;
 
    socket.addListener('data', function (data) {
        // are we connected?
       
        if (wsConnected) {
            var raw = decodeWebSocket(data);
            var decoded = String.fromCharCode.apply(null, raw);
           // var decoded = decodeWebSocket(raw);
            console.log(decoded);

        }
        else {
            var response = HandshakeHYBI00(data.toString('binary'));
            if (response) {
                // handshake succeeded, open connection
                var handshakeString = response.join('\r\n') + "\r\n";
                socket.write(handshakeString, 'ascii', function(){
                    console.log('wrote data');
                });
               
                wsConnected = true;
            }
            else {
                // close connection, handshake bad
                socket.end();
                return;
            }
        }
    });
 
});

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

WebsocketServer.listen(9000, "127.0.0.1");
 
