/**
* Created by fengpan23@qq.com  on 2016/5/24.
*/
"use strict";

const Events = require('events');
const Net = require('net');
const ServerClient = require('./lib/server_client');

class Connect extends Events{
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
        Net.createServer(socket => {
           let client = new ServerClient(socket);
           client.on('connected', () => {
               this.emit('connected', client);
           }).on('error', err => {
               // console.error('client error: ', err);
           }).on('data', content => {
                this.emit('request', client, content);
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
module.exports = new Connect();