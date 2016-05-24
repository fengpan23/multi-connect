/**
* Created by fengpan on 2016/5/24.
*/
"use strict";

const util = require('util');
const events = require('events');
const net = require('net');
const _ = require('underscore');
const Client = require('./lib/client.js');

function createID(){
    let id = '';
    _.times(4, () => {id += _.random(10, 99)});
    return +id;
}

class Connect extends events{
    constructor() {
        super();
        this.clients = {};
    }

   /**
    * create server
    * @param port
    */
   create(port) {
       let me = this;
       let server = net.createServer((socket) => {
           let client = new Client(socket);
           client.on('connected', () => {
               do{client.id = createID()}while(me.clients[client.id]);
               me.clients[client.id] = client;
               me.emit('connected', client);
           });

           client.on('disconnect', () => {

           });
       }).on('error', (e) => {
           console.error('create server error: ', e);
           me.emit('error', e);
       });

       server.listen(port, () => {
           let address = server.address();
           console.log('opened server on %j', address);
       });
   }

   /**
    * broadcast message
    * @param {string} event 广播事件名称
    * @param {json string} content 消息体json字符串
    * */
   broadcast(event, content) {
       for (let client of this.clients){
           if(client.verify > 0){
               client.send(0, event, content);
           }
       }
   }
}

module.exports = Connect;

//test
let con = new Connect();
con.create(3000);

con.on('connected', (socket) => {
    console.log('connected', socket);
});

let so = new net.createConnection(3000, '127.0.0.1');