/**
* Created by fengpan23@qq.com  on 2016/5/24.
*/
"use strict";

const Net = require('net');
const Http = require('http');
const Events = require('events');
const Client = require('./module/client');
const ServerClient = require('./module/server_client');
const ServerClientWeb = require('./module/server_client_web');

class Connect extends Events{
    constructor() {
        super();
    }

    /**
     * create http web socket server
     * @param port
     * @param host
     * @private
     */
    _createHttpServer(port, host){
        let idRange = 500000000;

        Http.createServer((req, res) => {
        }).on("upgrade", (req, socket) => {
            let client = new ServerClientWeb(socket, idRange);
            client.on('connected', () => {
                this.emit('connected', client);
            }).on('disconnect', id => {
                this.emit('disconnect', id);
            }).on('error', err => {
                console.error('client error: ', err);
                this.emit('error', err);
            });

            client.connect(req);
        }).listen(port, host, ()=> {
            console.log('http server start on port: ' + port);
        });
    }

    /**
     * create net server
     * @param port
     * @param host
     * @private
     */
    _createNetServer(port, host){
        let idRange = 10000000;
        Net.createServer(socket => {
            let client = new ServerClient(socket);
            client.on('connected', () => {
                this.emit('connected', client);
            }).on('disconnect', id => {
                this.emit('disconnect', id);
            }).on('error', (e, hook) => {
                this.emit('error', e, hook);
            });
            client.connect(idRange++);
        }).on('error', e => {
            this.emit('error', e, 'net server error');
        }).listen(port, host, () => {
            console.log('net server start on port: ' + port);
        });
    }

    /**
     * create server when client connect emit 'connected' event and had client param
     * that client had follow event ('data', 'reconnected', 'disconnect', 'error')
     * @param opt {object} {netPort: Number, httpPort: Number, type: ['net'|'http']}
     */
    createServer(opt) {
        let host = opt && opt.host || '0.0.0.0';

        if(opt.type === 'net' || opt.type === 'http'){
            let port = opt.port || 8888;
            let t = opt.type.toLowerCase().replace(/(\w)/,v => v.toUpperCase());
            this['_create' + t +'Server'](port, host);
        }else{
            this._createNetServer(opt.netPort || 2323, host);
            this._createHttpServer(opt.httpPort || 3000, host);
        }

        return this;
   }

    createClient(){
        return new Client();
    }
}
module.exports = new Connect();