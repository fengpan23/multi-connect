"use strict";
import 'zlib';
import 'util';

class Protocol {
    constructor() {
        this.version = 1;
        this.read = 'readUInt8';
        this.write = 'writeUInt8';
        this.readsize = 'readUInt32BE';
        this.writesize = 'writeUInt32BE';
        this.len = 10;
        this.opcode = new Map([[100, 'disconnect'], [110, 'connect'], [120, 'reconnect'], [130, 'connected'], [140, 'ack'], [150, 'ping'], [160, 'pong'], [170, 'pushtoall']]);
    }

    deflate(data){
        let result = null;
        try {
            result = zlib.deflateRawSync(data);
        } catch (e) {
            console.error('deflate data error: ', e);
        }
        return result;
    }

    inflate(data){
        let result;
        try {
            result = zlib.inflateRawSync(data)
        } catch (e) {
            console.error('inflate data error: ', e);
        }
        return result;
    }

    parse(data, pcode) {
        let tCode = +pcode % 10;
        let cCode = +pcode - tCode;

        let safeParse = function (data) {
            let r;
            try{
                r = JSON.parse(data);
            }catch(e){
                console.error('parse to json error: ', e)
            }
            return r;
        };

        let result;
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

        if (this.opcode.has(cCode)) {
            return {code: this.opcode.get(cCode), data: result};
        } else if (result) {
            return {code: 'data', data: result};
        }
    }

    compile(data, pcode) {
        let result;
        if (data){
            switch (+pcode % 10) {
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

export {Protocol};