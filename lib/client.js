/**
 * Created by fengpan on 2016/5/24.
 */

"use strict";
const util = require('util');
const events = require('events');
const net = require('./net');

const HEARTBEAT = 3000;

class Client extends events{
    constructor(socket) {
        super();
        this.socket = socket;

        let me = this;
        socket.on('data', (data) => {
            me.receive(data);
        }).on('drain', () => {
            me.rewrite();
        }).on('end', () => {
            me.smooth = true;
        }).on('close',() => {
            me.disconnect();
        }).on('error', (error) => {
            me.emit('error', error);
        });

        let net = new net();
        net.on('connect', () => {
            me.connect();
            me.emit('connected');
        }).on('reconnect', () => {
            me.connect();
            me.emit('reconnected');
        }).on('disconnect', () => {
            me.close();
        }).on('timeout', () => {
            me.socket.destroy();
        }).on('reply', (opcode) => {
            me.writeraw(me.netprotocol.pack(null, opcode));
        }).on('pushtoall', (data) => {
            me.pushtoall(data);
        });

        me.verifytimeout = null;
        me.verify_timeout(1, config.commonconf().settimeout.verify[1]);

        this.heartbeat = setInterval(() => {
            if (Date.now() - me.lastsent > HEARTBEAT){
                // let opcode = me.netprotocol.opcodemap.get('ack');
                // opcode = opcode + compress;
                // me.writeraw(me.netprotocol.pack(null, opcode));
            }
        }, HEARTBEAT);
    }

    verify_timeout(verify_level, timeout) {
        let me = this;
        if (me.verifytimeout != null)
            clearTimeout(me.verifytimeout);
        me.verifytimeout = setTimeout(function () {
            me.timeout(verify_level);
        }, timeout);
    }

    timeout(verify_level) {
        this.verifytimeout = null;
        if (!common.empty(this.socket) && this.verify < verify_level) {
            this.close('verify_timeout');
        }
    }

    receive(transmit) {
        if (!this.netprotocol.append(transmit)) {
            syslog.log('Client sent bad meta header');
            this.disconnect();
        }

        while (this.received = this.netprotocol.get()) {
            if (!this.received.hasOwnProperty('id'))
                this.received.id = 0;
            if (common.validate({event: 'must', content: 'must'}, this.received) && this.netprotocol.error === false) {
                if (this.connected === true) {
                    this.emit('request', this.received.id, this.received.event, this.received.content);
                } else {
                    this.close();
                }
            }
        }
        if (this.netprotocol.error === true)
            this.socket.destroy();
    }

    send(id, event, content) {
        this.sent = {id: id, event: event, content: content};
        if (event !== '')
            this.writeraw(this.netprotocol.pack(this.sent, transportcode));
    }

    broadcast(id, event, content) {
        this.broadcasted = '';
        this.broadcastid++;
        this.broadcasted = {id: id, event: event, content: content};
        if (event !== '' && this.verify > 0) {
            for (let key in this.server.clients)
                if (key !== this.id && this.server.clients.hasOwnProperty(key) && this.server.clients[key].verify > 0)
                    this.server.clients[key].writeraw(this.netprotocol.pack(this.broadcasted, transportcode));
        }
    }

    pushtoall(content) {
        if (this.verify > 0) {
            for (let key in this.server.clients)
                if (key !== this.id && this.server.clients.hasOwnProperty(key) && this.server.clients[key].verify > 0)
                    this.server.clients[key].writeraw(this.netprotocol.pack(content, this.netprotocol.opcodemap.get('pushtoall') + transportcode));
        }
    }

    write(transmit) {
        console.log('writewritewritewritewrite', this.socket.write(transmit));
            // this.buffer.push(transmit);
    }

    rewrite() {
        let buffers = this.buffer;
        this.buffer = [];
        for (let buffer of buffers) {
            if (!this.socket.write(buffer))
                this.buffer.push(buffer);
        }
    }

    close(err) {
        let opcode = this.netprotocol.opcodemap.get('disconnect');
        this.writeraw(this.netprotocol.pack(err, opcode + compress));
        this.connected = false;
        this.smooth = true;
        this.socket.end();
        this.socket.destroy();
    }

    connect(socketid) {
        let me = this;
        if (common.empty(socketid)) {
            let opcode = me.netprotocol.opcodemap.get('connected');
            opcode = opcode + transportcode;
            me.sent = {
                receive: config.commonconf().settimeout.heartbeatreceive,
                send: config.commonconf().settimeout.heartbeatsend
            };
            me.writeraw(me.netprotocol.pack(me.sent, opcode));
        } else {
            let opcode = me.netprotocol.opcodemap.get('connect');
            me.sent = socketid;
            opcode = opcode + compress;
            me.connected = true;
            me.writeraw(me.netprotocol.pack(me.sent, opcode));
        }
    }

    disconnect() {
        if (this.verifytimeout != null)
            clearTimeout(this.verifytimeout);
        clearInterval(this.heartbeat);
        this.connected = false;
        this.socket.destroy();
        this.server.clientscount--;
        delete this.server.clients[this.id];
        this.emit('disconnect', this.verify <= 0 ? true : this.smooth);
    }
}

module.exports = Client;



