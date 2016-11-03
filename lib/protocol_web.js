/**
 * Created by fp on 2016/11/3.
 */
const Events = require("events");
const Buffer = require("Buffer");

function _unmask(data, mask) {
    let maskNum = mask.readUInt32LE(0, true);
    let length = data.length;
    let i = 0;
    for (; i < length - 3; i += 4) {
        var num = maskNum ^ data.readUInt32LE(i, true);
        if (num < 0) {
            num = 4294967296 + num;
        }
        data.writeUInt32LE(num, i, true);
    }
    switch (length % 4) {
        case 3:
            data[i + 2] = data[i + 2] ^ mask[2];
        case 2:
            data[i + 1] = data[i + 1] ^ mask[1];
        case 1:
            data[i] = data[i] ^ mask[0];
        case 0:
    }
}


class Protocol extends Events {
    constructor() {
        super();
        this._buffer = new Buffer(0);
        me.state = 0;
        me.size = 0;
        me.header = {};

    }

    append(buff) {
        let me = this;
        if (me.state === 0 && buff.length >= 2) {
            let dataindex = 2;
            me.header.fin = Boolean(buff[0] & 0x80);
            me.header.rsv1 = Boolean(buff[0] & 0x40);
            me.header.rsv2 = Boolean(buff[0] & 0x20);
            me.header.rsv3 = Boolean(buff[0] & 0x10);
            me.header.mask = Boolean(buff[1] & 0x80);
            me.header.opcode = buff[0] & 0x0F;
            me.header.length = buff[1] & 0x7F;

            if (me.header.opcode >= 8) {
                if (me.header.length > 125) {
                    //error
                }
                if (!me.header.fin) {
                    //error
                }
            }
            if (me.header.length === 126) {
                dataindex += 2;
                me.header.length = buff.readUInt16BE(2);
            }
            else if (me.header.length === 127) {
                dataindex += 8;
                me.header.length = buff.readUInt32BE(2) + buff.readUInt32BE(6);
            }
            if (me.header.mask) {
                me.header.maskkey = buff.slice(dataindex, dataindex + 4);
                dataindex += 4;
            }

            me.buffer = buff.slice(dataindex, dataindex + me.header.length);
            me.size += me.buffer.length;
            me.state = 1;
        } else if (me.state === 1 && me.size < me.header.length) {
            me.buffer = Buffer.concat([me.buffer, buff], me.size + buff.length);
            me.size += buff.length;
        }
        if (me.state === 1 && typeof me.header.length != 'undefined' && me.size >= me.header.length) {
            if (me.header.mask) {
                _unmask(me.buffer, me.header.maskkey);
            }
            switch (me.header.opcode) {
                case 0://CONTINUATION
                case 1: //TEXT
                    me.emit('data', me.buffer.toString('utf8'));
                    break;
                case 2: //BINARY
                    me.emit('data', me.buffer);
                    break;
                case 8: //close
                    me.emit('close', me.buffer);
                    break;
                case 9: //ping
                    me.emit('ping');
                    break;
                case 10: //pong
                    me.emit('pong');
                    break;
            }
            me.state = 0;
            me.size = 0;
            me.buffer = new Buffer(0);
            me.header = {};
        }
    }

    pack(data) {
        let opcode = 1;
        if (Buffer.isBuffer(data)) {
            opcode = 2;
        } else if (typeof(data['toString']) === 'function') {
            data = new Buffer(data.toString(), 'utf8');
            opcode = 1;
        } else {
            return false;
        }
        let length = data.length;
        if (!length) return false;

        let index = 2 + (length > 65535 ? 8 : (length > 125 ? 2 : 0));
        let header = new Buffer(index);

        header[0] = 128 + opcode;
        if (length > 65535) {
            header[1] = 127;
            header.writeUInt32BE(0, 2);
            header.writeUInt32BE(length, 6);
        } else if (length > 125) {
            header[1] = 126;
            header.writeUInt16BE(length, 2);
        } else {
            header[1] = length;
        }

        return Buffer.concat([header, data]);
    }

    sendping(){
        return new Buffer(['0x89', '0x0']);
    }

    sendpong(){
        return new Buffer(['0x8A', '0x0']);
    }

}

module.exports = function () {
    return new webprotocol();
};