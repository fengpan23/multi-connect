let Connect = require('../');
let con = new Connect();
con.createServer({port: 3000}, function (port) {
    console.log('server start on port: ', port);
});

let clients = [], id = 1;
con.on('connected', client => {
    console.log('client connected !!!', client);
    client.id = ++id;
    client.on('disconnect', (id, smooth) => {
        console.log('..... disconnect ......', id);
        console.log('..... smooth ......', smooth);
    }).on('data', data => {
        console.log('..... data ......', data);
    });
    clients.push(client);
});