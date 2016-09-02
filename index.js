/**
* Created by fengpan23@qq.com  on 2016/5/24.
*/
"use strict";

const util = require('util');
const events = require('events');
const net = require('net');
const Client = require('./lib/client');

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
    createServer(opt, cb) {
       let port = opt.port || 2323;
       net.createServer(socket => {
           let client = new Client(socket);
           client.on('connected', () => {
               this.emit('connected', client);
           }).on('error', err => {
               // console.error('client error: ', err);
           });
           client.connect(1232456798);
       }).on('error', e => {
           this.emit('error', e);
       }).listen(port, () => {
           cb && cb(port);
       });
   }

    createClient(){

    }
}
module.exports = Connect;