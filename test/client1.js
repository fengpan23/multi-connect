const Client = require('./client');

let client = new Client();
client.connect({port: 3000});
client.on('connected', function () {
    client.on('request', function (id, event, data) {
        console.log(`${event}   ${JSON.stringify(data)}\n`);
    });

    client.send(0, "init", {
        tableid : 12,
        gameid : 12,
        session : 12
    });
});