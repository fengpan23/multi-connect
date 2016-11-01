const Client = require('../lib/client');

let client = new Client();
client.connect({port: 2323});
client.on('connected', function () {
    client.send(0, "init", {
        tableid : 12,
        gameid : 12,
        session : 13
    });

}).on('request', function (data) {
    console.log('on request: ', data);
}).on('error', error => {
    console.log('client error: ', error);
}).on('disconnect', () => {
    // client.connect({port: 3000});
});