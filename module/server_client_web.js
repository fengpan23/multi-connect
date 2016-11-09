const Events = require('events');
const Crypto = require('crypto');
const Protocol = require('../lib/protocol_web');

class Client extends Events {
    constructor(socket, id) {
        super();
        this._id = id;
        this._protocol = new Protocol();
        this._protocol.on('data',  data => {
            try {
                let received = JSON.parse(data);
                if (this._connected === true) {
                    this.emit('data', received);
                } else {
                    this.close();
                }
            } catch (err) {
                console.error('received data error', err);
            }
        }).on('close', () => {
            this._disconnect();
        }).on('ping', () => {
            this._write(this._protocol.pong);
        }).on('pong', () => {
            this._pingTimes = 0;
        });

        socket
            .on('data', data => {this._protocol.append(data);})
            .on('error', this._error.bind(this))
            .on('end', ()=> this._smooth = true)
            .on('close', this.close.bind(this))
            .on('drain', this._rewrite.bind(this))
            .on('timeout', this._rewrite.bind(this));

        this._socket = socket;
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

    connect(request) {
        let reject = reason => {
            let res = 'HTTP/1.1 403 Forbidden\r\nConnection: close\r\n';
            if (reason)
                res += 'X-WebSocket-Reject-Reason: ' + reason + '\r\n';
            res += '\r\n';
            this._socket.end(res, 'ascii');
        };

        let key = request.headers['sec-websocket-key'];
        if (!key)
            return reject('no key');

        let version = parseInt(request.headers['sec-websocket-version'], 10);
        if (!(version === 8 || version === 13))
            return reject('wrong version');

        let sha1 = Crypto.createHash('sha1');
        sha1.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
        let acceptKey = sha1.digest('base64');

        let response = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: WebSocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acceptKey + '\r\n';
        switch (version) {
            case 8:
                response += 'Sec-WebSocket-Origin: ' + request.headers['sec-WebSocket-origin'] + '\r\n';
                break;
            case 13:
                response += 'Origin: ' + request.headers['origin'] + '\r\n';
                break;
        }
        response += '\r\n';


        this._socket.write(response, 'ascii',  error => {
            if (error)
                return reject(error);
            this._connected = true;
            this.emit('connected');

            this._startHeartBeat();
        });
    }

    send(data) {
        try {
            this._write(Protocol.pack(JSON.stringify(data)));
        } catch (err) {
            console.error('send data error', err);
        }
    }

    close(err) {
        if(this._connected){
            this._write(Protocol.pack(err));
        }
        this._connected = false;
        this._socket.destroy();
    }

    _write(transmit) {
        if (!this._socket.write(transmit))
            this._buffer.push(transmit);
    }

    _rewrite() {
        let buffers = this._buffer;
        this._buffer = [];
        for (let buf of buffers) {
            if (!this._socket.write(buf))
                this._buffer.push(buf);
        }
    }

    _error(e) {
        this.emit('error', e);
    }

    _disconnect() {
        this._stopHeartBeat();
        this._connected = false;
        this._socket.destroy();
        this.emit('disconnect', this._id);
    }

    _startHeartBeat(){
        this._heartBeat = setInterval(() => {
            if (this._pingTimes >= 3) {
                this.close('timeout');
            }else{
                this._write(this._protocol.ping);
                this._pingTimes++;
            }
        }, 1000);
    }

    _stopHeartBeat(){
        clearInterval(this._heartBeat);
    }
}

module.exports = Client;