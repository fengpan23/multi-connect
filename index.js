/**
* Created by fengpan23@qq.com  on 2016/5/24.
*/
"use strict";

const Net = require('net');
const Events = require('events');
const ServerClient = require('./lib/server_client');

class Connect extends Events{
    constructor() {
        super();
    }

    /**
     * create server when client connect emit 'connected' event and had client param
     * that client had follow event ('data', 'reconnected', 'disconnect', 'error')
     * @param opt {object} {port: Number}
     */
    createServer(opt) {
        let port = opt && opt.port || 2323;
        let idRange = 10000000;
        Net.createServer(socket => {
           let client = new ServerClient(socket);
           client.on('connected', () => {
               this.emit('connected', client);
           }).on('disconnect', id => {
               this.emit('disconnect', id);
           }).on('error', err => {
               console.error('client error: ', err);
               this.emit('error', err);
           });
           client.connect(idRange++);
       }).on('error', e => {
           this.emit('error', e);
       }).listen(port, () => {
           console.log('server start on port: ' + port);
       });
        return this;
   }

    createClient(){

    }
}
module.exports = new Connect();