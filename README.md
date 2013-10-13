A websocket server that can run inside a Chrome packaged app.

Made by using node-chromify, net-chromify, and actual server implementation based on 
https://gist.github.com/bradleywright/1021082

Please note you will need socket permission in Chrome

"permissions": [
        {
            "socket": ["tcp-connect", "tcp-listen"]
        }
]

Include the file anywhere in your application. It will publish a global 'WebSocketServer'.
There is a short example at the end of the file

        var wss = new WebSocketServer(9000, "127.0.0.1");
        wss.onMessage(function(message) {console.log("Server: message received: " + message)});
        var ws = new WebSocket("ws://127.0.0.1:9000");
        setTimeout(function() { ws.send("Testing") }, 250);


NB: Very large messages get "stuck" due to an unknown flaw somewhere in this implementation.
