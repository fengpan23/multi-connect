"use strict";
import 'events';
import {Protocol} from './protocol.js'

const HEARTBEAT = 5000;
const protocol = new Protocol();

class Net{
    constructor() {
        EventEmitter.call(this);
        this.length = -1;
        this.size = 0;
        this.buffer = new Buffer(0);

        this.opcode = -1;
        this.error = false;
        this.opcodemap = new Map(protocol.opcode);
        this.lastget = Date.now();

        this.heartbeat = setInterval(function () {
            if (Date.now() - this.lastget > HEARTBEAT){
                clearInterval(this.heartbeat);
                this.emit('timeout');
            }
        }.bind(this), HEARTBEAT);
    }

    pack(data, opcode) {
        let header = new Buffer(protocol.len);
        header[protocol.write](protocol.version, 0);
        header[protocol.write](+opcode, 5);
        header[protocol.writesize](0, 6);

        let result = protocol.compile(data, +opcode);
        if (result) {
            header[protocol.writesize](result.length, 1);
            return Buffer.concat([header, new Buffer(result, "binary")]);
        } else {
            header[protocol.writesize](0, 1);
            return header;
        }
    }

    append(buff) {
        if (!Buffer.isBuffer(buff) || buff.length < 0){
            return false;
        }
        this.buffer = Buffer.concat([this.buffer, buff], this.size + buff.length);
        this.size += buff.length;
        this.refresh();
        return true;
    }

    get() {
        this.refresh();
        if (this.length < 0 || this.size < protocol.len){
            return false;
        }

        let result;
        if (this.length > 0) {
            let data = new Buffer(this.length);
            this.buffer.copy(data, 0, protocol.len, this.length + protocol.len);
            result = protocol.parse(data, this.opcode);
            this.size -= data.length + protocol.len;
        } else {
            result = protocol.parse(null, this.opcode);
            this.size -= protocol.len;
        }
        if (!result) {
            this.emit('disconnect');
            return false;
        }

        this.buffer = this.buffer.slice(this.length + protocol.len);
        this.length = -1;
        this.opcode = -1;
        this.lastget = Date.now();

        switch (result.code) {
            case 'data':
                return result.data;
            case 'connect':
                this.emit('connect', result.data);
                return false;
            case 'reconnect':
                this.emit('reconnect', result.data);
                return false;
            case 'connected':
                this.emit('connected', result.data);
                return false;
            case 'disconnect':
                this.emit('disconnect', result.data);
                return false;
            case 'ack' :
                return false;
            case 'ping' :
                this.emit('reply', me.opcodemap.get('pong'));
                return false;
            case 'pushtoall' :
                this.emit('pushtoall', result.data);
                return false;
            default :
                return false;
        }
    }

    refresh() {
        if (this.size >= protocol.len && this.length < 0) {
            this.length = this.buffer[protocol.readsize](1);
            this.opcode = this.buffer[protocol.read](5);
        }
    }
}
util.inherits(Net, EventEmitter);

export {Net};
