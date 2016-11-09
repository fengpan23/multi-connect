/**
 * Created by fengpan23@qq.com  on 2016/5/24.
 */
"use strict";
const Events = require('events');
const Net = require('../lib/net');

const COMPRESS = 1;
const TRANSPORT_CODE = 3;
const HEART_BEAT = 3000;
const HEART_BEAT_RECEIVE = 10000;

class Client extends Events{
    constructor(socket) {
        super();
        this._id = null;
        this._buf = [];
        this._socket = socket;
        socket
            .on('data', this._receive.bind(this))
            .on('drain', this._rewrite.bind(this))
            .on('end', () => {
                console.log('socket end');
                // this._smooth = true;
            })
            .on('close',this._disconnect.bind(this))
            .on('error', err => {
                this.emit('error', err, 'socket error');
            });

        this._net = new Net();
        this._net.on('connect', () => {
            this.connect();
            this.emit('connected');
        }).on('reconnect', () => {
            console.log('net reconnect');
            this.connect();
            this.emit('reconnected');
        }).on('disconnect', () => {
            console.log('net disconnect');
            this.close();
        }).on('timeout', () => {
            console.log('net timeout');
            this._socket.destroy();
        }).on('reply', code => {
            console.log('net reply code: ', code);
            this._write(Net.pack(null, code));
        }).on('all', data => {
            this._all(data);
        });
    }

    get id(){
        return this._id;
    }
    get remote(){
        return {
            ip: this._socket['remoteAddress'],
            port: this._socket['remotePort']
        };
    }

    /**
     * client method send message to request client
     * @param data
     */
    send(data) {
        this._write(Net.pack(data, TRANSPORT_CODE));
    }

    /**
     * connect to request client
     * @param id  socket id
     */
    connect(id) {
        let code;
        if (!id) {
            code = Net.getCode('connected') + TRANSPORT_CODE;
            this._write(Net.pack({receive: HEART_BEAT_RECEIVE, send: HEART_BEAT}, code));
        } else {
            code = Net.getCode('connect') + COMPRESS;
            this._write(Net.pack(id, code));
            this._id = id;
            this._connected = true;
        }
    }

    /**
     * server close client socket
     * @param err
     */
    close(err) {
        this._write(Net.pack(err, Net.getCode('disconnect') + COMPRESS));
        this._connected = false;
        this._socket.end();
        this._socket.destroy();
    }

    /**
     * socket receive buffer data
     * @param data
     * @private
     */
    _receive(data) {
        if (!this._net.append(data)) {
            this._disconnect();
        }
        let received;
        while (received = this._net.get()) {
            if (this._connected) {
                this.emit('data', received);
            }else{
                this.close();
            }
        }
    }

    /**
     * socket write buffer
     * @param transmit
     * @private
     */
    _write(transmit) {
        if(!this._socket.write(transmit)){
            this._buf.push(transmit);
        }
    }

    /**
     * socket rewrite buffer
     * @private
     */
    _rewrite() {
        let buffers = this._buf;
        this._buf = [];
        for (let b of buffers) {
            this._write(b);
        }
    }

    _disconnect() {
        this._connected = false;
        this._socket.destroy();
        this.emit('disconnect', this._id);
    }
}
module.exports = Client;