const Client = require('./client');

let client = new Client();
client.connect(3000);
client.on('connected', function () {
    client.on('request', function (id, event, data) {
        console.log(`${event}   ${JSON.stringify(data)}\n`);
    });

    client.send(0, "init", {
        tableid : tableID,
        gameid : gameID,
        session : session
    });
});