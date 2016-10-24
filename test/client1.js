const Client = require('../lib/client');

let client = new Client();
client.on('connected', function (data) {
    console.log('conn data, ', data);
    client.send(0, "init", {
        tableid : 211,
        gameid : 12,
        session : 12
    });
}).on('init', function (data) {
    console.log('init data: ', data);
}).on('request', function (data) {
    console.log('on request: ', data);
}).on('error', error => {
    console.log('client error: ', error);
}).on('disconnect', () => {
    // client.connect({port: 3000});
});
client.connect({port: 2323});
