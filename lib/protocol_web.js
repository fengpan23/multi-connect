/**
 * Created by fp on 2016/11/3.
 */
const Events = require("events");
// const OP_CODE = new Map([[Text, 1], [Binary, 2], [Close, 8], [Ping, 9], [Pong, 10]]);

function unmask(data, mask) {
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

        this._size = 0;
        this._state = 0;
        this._header = {};
        this._buffer = new Buffer(0);
    }

    append(buff) {
        if (this._state === 0 && buff.length >= 2) {
            this._header.fin = Boolean(buff[0] & 0x80);
            this._header.rsv1 = Boolean(buff[0] & 0x40);
            this._header.rsv2 = Boolean(buff[0] & 0x20);
            this._header.rsv3 = Boolean(buff[0] & 0x10);
            this._header.mask = Boolean(buff[1] & 0x80);
            this._header.opcode = buff[0] & 0x0F;
            this._header.length = buff[1] & 0x7F;

            if (this._header.opcode >= 8) {
                if (this._header.length > 125) {
                    console.error('web protocol error !!!');
                }
                if (!this._header.fin) {
                    console.error('web protocol error !!!');
                }
            }

            let dataIndex = 2;
            if (this._header.length === 126) {
                dataIndex += 2;
                this._header.length = buff.readUInt16BE(2);
            }else if (this._header.length === 127) {
                dataIndex += 8;
                this._header.length = buff.readUInt32BE(2) + buff.readUInt32BE(6);
            }
            if (this._header.mask) {
                this._header.maskkey = buff.slice(dataIndex, dataIndex + 4);
                dataIndex += 4;
            }
            this._buffer = buff.slice(dataIndex, dataIndex + this._header.length);
            this._size += this._buffer.length;
            this._state = 1;

        } else if (this._state === 1 && this._size < this._header.length) {

            this._buffer = Buffer.concat([this._buffer, buff], this._size + buff.length);
            this._size += buff.length;
        }

        if (this._state === 1 && typeof this._header.length != 'undefined' && this._size >= this._header.length) {

            if (this._header.mask)unmask(this._buffer, this._header.maskkey);

            switch (this._header.opcode) {
                case 0:     //CONTINUATION
                case 1:     //TEXT
                    this.emit('data', this._buffer.toString('utf8'));
                    break;
                case 2:     //BINARY
                    this.emit('data', this._buffer);
                    break;
                case 8:     //close
                    this.emit('close', this._buffer);
                    break;
                case 9:     //ping
                    this.emit('ping');
                    break;
                case 10:    //pong
                    this.emit('pong');
                    break;
            }
            this._state = 0;
            this._size = 0;
            this._buffer = new Buffer(0);
            this._header = {};
        }
    }

    static pack(data) {
        let opCode = 1;
        if (Buffer.isBuffer(data)) {
            opCode = 2;
        } else if (typeof(data['toString']) === 'function') {
            data = new Buffer(data.toString(), 'utf8');
            opCode = 1;
        } else {
            return false;
        }
        let length = data.length;
        if (!length) return false;

        let index = 2 + (length > 65535 ? 8 : (length > 125 ? 2 : 0));
        let header = new Buffer(index);

        header[0] = 128 + opCode;
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

    get ping(){
        return new Buffer(['0x89', '0x0']);
    }

    get pong(){
        return new Buffer(['0x8A', '0x0']);
    }
}

module.exports = Protocol;