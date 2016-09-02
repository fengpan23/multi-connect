### example create server
```
let con = new Connect();
con.createServer({port: 3000});

let clients = [], id = 1;
con.on('connected', (client) => {
    client.id = ++id;
    client.on('disconnect', (id, smooth) => {
        console.log('..... disconnect ......', id);
        console.log('..... smooth ......', smooth);
    }).on('data', data => {
        console.log('..... data ......', data);
    });
    clients.push(client);
});
```