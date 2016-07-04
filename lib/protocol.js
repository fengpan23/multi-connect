"use strict";
const zlib = require('zlib');
const util = require('util');
const OP_CORD = new Map([[100, 'disconnect'], [110, 'connect'], [120, 'reconnect'], [130, 'connected'], [140, 'ack'], [150, 'ping'], [160, 'pong'], [170, 'all']]);

class Protocol {
    constructor() {
        this.len = 10;
        this.version = 1;
        this.read = 'readUInt8';
        this.write = 'writeUInt8';
        this.readSize = 'readUInt32BE';
        this.writeSize = 'writeUInt32BE';
    }

    /**
     * deflate string (压缩字符串)
     * @param data
     * @returns {*}
     */
    deflate(data){
        let result = null;
        try {
            result = zlib.deflateRawSync(data);
        } catch (e) {
            console.error('deflate data error: ', e);
        }
        return result;
    }

    /**
     * inflate buffer (解压缩一个原始的 Buffer)
     * @param data  buffer
     * @returns {*}
     */
    inflate(data){
        let result;
        try {
            result = zlib.inflateRawSync(data);
        } catch (e) {
            console.error('inflate data error: ', e);
        }
        return result;
    }

    parse(data, code) {
        let tCode = +code % 10, cCode = +code - tCode;
        let result, safeParse = (data) => {let r; try{r = JSON.parse(data);}catch(e){console.error('parse to json: ', e);}return r;};
        if (data){
            switch (tCode) {
                case 0:
                    result = String(data);
                    break;
                case 1:
                    result = String(this.inflate(data));
                    break;
                case 2:
                    result = safeParse(data);
                    break;
                case 3:
                    result = safeParse(this.inflate(data));
                    break;
            }
        }
        if (OP_CORD.has(cCode)) {
            return {code: OP_CORD.get(cCode), data: result};
        } else if (result) {
            return {code: 'data', data: result};
        }
    }

    compile(data, code) {
        let result;
        if (data){
            switch (+code % 10) {
                case 0:
                    result = String(data);
                    break;
                case 1:
                    result = this.deflate(String(data));
                    break;
                case 2:
                    result = JSON.stringify(data);
                    break;
                case 3:
                    result = this.deflate(JSON.stringify(data));
                    break;
            }
        }
        return result;
    }
}

module.exports = Protocol;