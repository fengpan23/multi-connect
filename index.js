/**
* Created by fengpan on 2016/5/24.
*/
"use strict";

const util = require('util');
const events = require('events');
const net = require('net');
const Client = require('./lib/client.js');

class Connect extends events{
    constructor() {
        super();
    }

    /**
     * create server when client connect emit 'connected' event and had client param
     *
     * that client had follow event ('data', 'reconnected', 'disconnect', 'error')
     * @param opt {port: Number, id: String}
     */
    createServer(opt) {
       let port = opt.port;
       let server = net.createServer(socket => {
           let client = new Client(socket);
           client.on('connected', () => {
               this.emit('connected', client);
           }).on('error', err => {
               // console.error('client error: ', err);
           });
           client.connect(new Date());
       }).on('error', e => {
           this.emit('error', e);
       });
       server.listen(port);
   }
}
module.exports = Connect;