"use strict";
const Events = require('events');
const Protocol = require('./protocol');

const OP_CODE = new Map([['disconnect', 100], ['connect', 110], ['reconnect', 120], ['connected', 130], ['ack', 140], ['ping', 150], ['pong', 160], ['all', 170]]);
const protocol = new Protocol();

class Net extends Events{
    constructor() {
        super();

        this._length = -1;
        this._code = -1;
        this._size = 0;
        this._buf = new Buffer(0);
    }

    /**
     * get op code
     * @param name
     * @returns {code}
     */
    static getCode(name){
        return OP_CODE.get(name);
    }

    /**
     * package message to buffer
     * @param data
     * @param code
     * @returns {*}
     */
    static pack(data, code) {
        let header = new Buffer(protocol.len);
        header.writeUInt8(protocol.version, 0);
        header.writeUInt8(+code, 5);
        header.writeUInt32BE(0, 6);

        let result = Protocol.compile(data, +code);
        if (result) {
            header.writeUInt32BE(result.length, 1);
            return Buffer.concat([header, new Buffer(result, "binary")]);
        } else {
            header.writeUInt32BE(0, 1);
            return header;
        }
    }

    /**
     * receive socket buffer data
     * @param buff
     * @returns {boolean}
     */
    append(buff) {
        if (!Buffer.isBuffer(buff) || buff.length < 0){
            return false;
        }
        this._buf = Buffer.concat([this._buf, buff], this._size + buff.length);
        this._size += buff.length;
        return true;
    }

    /**
     * get parse buff data
     * @returns {*}
     */
    get() {
        this._refresh();
        if(this._length < 0 || this._size < protocol.len)return false;

        let result;
        if (this._length > 0) {
            let data = new Buffer(this._length);
            if(this._buf.copy(data, 0, protocol.len, this._length + protocol.len)){
                result = protocol.parse(data, this._code);
                this._size -= data.length + protocol.len;
            }
        } else {
            result = protocol.parse(null, this._code);
            this._size -= protocol.len;
        }
        if (!result) {
            this.emit('disconnect');
            return false;
        }

        this._buf = this._buf.slice(this._length + protocol.len);
        this._length = -1;
        this._code = -1;

        switch (result.code) {
            case 'data':
                return result.data;
            case 'all' :
            case 'connect':
            case 'reconnect':
            case 'connected':
            case 'disconnect':
                this.emit(result.code, result.data);
                break;
            case 'ack' :
            case 'ping' :
                this.emit('reply', OP_CODE.get('pong'));
                break;
        }
    }

    /**
     * refresh buffer record
     * @private
     */
    _refresh() {
        if (this._size >= protocol.len && this._length < 0) {
            this._length = this._buf.readUInt32BE(1);
            this._code = this._buf.readUInt8(5);
        }
    }
}
module.exports = Net;
