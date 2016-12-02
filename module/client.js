"use strict";
const Net = require('net');
const Events = require('events');

const net = require('../lib/net');
const TRANSPORT_CODE = 3;

class Client extends Events{
    constructor() {
        super();
        this._connected = false;
        this._net = new net();
        this._net.on('connect', id => {
            this._id = id;
            this._write(net.pack(null, net.getCode('connect')));
        }).on('connected', () => {
            this.emit('connected', this._id);
        }).on('disconnect', id => {
            console.log('disconnect data: ', id);
            this.close();
        });
    }
    get id(){
        return this._id;
    }

    connect(options) {
        if (this._connected === true)return false;
        this._socket = new Net.createConnection(options.port || 2323, options.ip || '127.0.0.1');

        this._socket
            .on('connect', () => this._connected = true)
            .on('error',this._error.bind(this))
            .on('data', this._receive.bind(this))
            .on('drain', this._drain.bind(this))
            .on('end', () => this.smooth = true)
            .on('close', this.disconnect.bind(this));
    }

    send(id, event, content) {
        let data = {id: id, event: event, content: content};
        if (event !== '')
            this._write(net.pack(data, TRANSPORT_CODE));
    }

    close() {
        this._socket.end();
        this._socket.destroy();
    }

    disconnect() {
        this._connected = false;
        this._socket.end();
        this._socket.destroy();
        delete this._socket;
        this.emit('disconnect', this.id);
    }

    _receive(transmit) {
        if (!this._net.append(transmit))
            this.disconnect();

        let received;
        while (received = this._net.get()) {
            let event = received.event || 'request';
            let data = received.content || received;
            this.emit(event, data);
        }
    }

    _write(transmit) {
        if (!this._socket.write(transmit))
            this._buffer.push(transmit);
    }

    _drain() {
        let buffers = this._buffer;
        this._buffer = [];
        for (let buffer of buffers) {
            if (!this._socket.write(buffer))
                this._buffer.push(buffer);
        }
    }

    _error(e) {
        this.emit('error', e);
    }
}

module.exports = Client;
