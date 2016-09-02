"use strict";
const net = require('net');
const event = require('events');
const Net = require('../lib/net');
const transportcode = 3;

class client extends event{
    constructor() {
        super();
        this._connected = false;
        this._net = new Net();
        this._net.on('connect', id => {
            this.id = id;
            this.writeraw(this._net.pack(null, this._net.getCode('connect')));
        });
        this._net.on('connected', () => {
            this.ready = true;
            this.interval = setInterval(() => {
                this.writeraw(this._net.pack(null, this._net.getCode('ack')));
            },1000);
            this.emit('connected');
        });
        this._net.on('disconnect', data => {
            this.close();
        });
    }

    error(error, client) {
        this.emit('socketerror', error.code, client);
    }

    connect(options) {
        if (this._connected === true)return false;

        this._socket = new net.createConnection(options.port || 2323, options.ip || '127.0.0.1');
        this.ready = false;
        this._socket.on('connect', () => {
            this._connected = true;
        }).on('error', error => {
            this.error(error, this);
        }).on('data', data => {
            this.receive(data);
        }).on('drain', () => {
            this.retrywriteraw();
        }).on('end', () => {
            this.smooth = true;
        }).on('close', () => {
            this.disconnect(this);
        });
    }

    receive(transmit) {
        if (!this._net.append(transmit))
            this.disconnect();
        while (this.received = this._net.get()) {
            if (!this.received.hasOwnProperty('id'))
                this.received.id = 0;
            if (this.received.hasOwnProperty('event') && this.received.hasOwnProperty('content')) {
                if (this.ready === true)
                    this.emit('request', this.received.id, this.received.event, this.received.content);
            }
        }
    }

    send(id, event, content) {
        this.sent = {id: id, event: event, content: content};
        if (event !== '')
            this.writeraw(this._net.pack(this.sent, transportcode));
    }

    writeraw(transmit) {
        if (!this._socket.write(transmit))
            this.buffer.push(transmit);
    }

    retrywriteraw() {
        let buffers = this.buffer;
        this.buffer = [];
        for (let buffer of buffers) {
            if (!this.socket.write(buffer))
                this.buffer.push(buffer);
        }
    }

    close() {
        clearTimeout(this.interval);
        this.ready = false;
        this.smooth = true;
        this.socket.end();
        this.socket.destroy();
    }

    /***
     * 断开联接
     */
    disconnect() {
        clearTimeout(this.interval);
        this.connected = false;
        this.ready = false;
        this.socket.end();
        this.socket.destroy();
        this.socket = null;
        this.emit('disconnect', this.smooth);
    }
}

module.exports = client;
