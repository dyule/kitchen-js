(function(global){
    global.binary = {
        // TODO This could also be handled by an ArrayBuffer, but only if we know in advance how big we need it to be.
        Writer: function() {
            var buffer = "";
            return {
                writeu32: function (n) {
                    buffer += String.fromCharCode((n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF);
                }, writeu64: function (n) {
                    this.writeu32( Math.floor(n / 0x100000000));
                    this.writeu32(n);

                }, writeBytes: function (b) {
                    this.writeu32(b.length);
                    buffer += b;
                }, getBase64: function () {
                    return btoa(buffer);
                }, writeTransaction: function(transaction) {
                    var self = this;
                    if (transaction.lastTimestamp === undefined) {
                        buffer += String.fromCharCode(0);
                    } else {
                        buffer += String.fromCharCode(1);
                        this.writeu32(transaction.lastTimestamp.siteID);
                        this.writeu32(transaction.lastTimestamp.timestamp);
                    }
                    this.writeu32(transaction.inserts.getLength());
                    transaction.inserts.iterate(function(insert) {
                        self.writeInsert(insert);
                    });

                    this.writeu32(transaction.deletes.getLength());
                    transaction.deletes.iterate(function(del) {
                        self.writeDelete(del);
                    });
                },writeInsert: function(insert) {
                    this.writeu32(insert.timestamp);
                    this.writeu64(insert.position);
                    this.writeBytes(insert.value);

                }, writeDelete: function(del) {
                    this.writeu32(del.timestamp);
                    this.writeu64(del.position);
                    this.writeu64(del.length);
                }
            }
        }, Reader: function(buffer) {
            var offset = 0;
            buffer = atob(buffer);
            return {
                readu32: function() {
                    if (buffer.length < offset + 4) {
                        return undefined;
                    }
                    offset += 4;
                    return buffer.charCodeAt(offset - 4) << 24 |
                        buffer.charCodeAt(offset - 3) << 16 |
                        buffer.charCodeAt(offset - 2) << 8 |
                        buffer.charCodeAt(offset - 1);
                },

                readu64: function() {
                    if (buffer.length < offset + 8) {
                        return undefined;
                    }
                    var top = this.readu32();
                    var bottom = this.readu32();
                    return top * 0x100000000 + bottom;
                },

                readBytes: function() {
                    var len = this.readu32();
                    if (buffer.length < offset + len) {
                        return undefined;
                    }
                    offset += len;
                    return buffer.slice(offset - len, offset);
                },

                readLookups: function() {
                    var lookupLen = this.readu32();
                    var lookups = {};
                    for (var i = 0; i < lookupLen; i+= 1) {
                        var local = this.readu32();
                        var siteID = this.readu32();
                        var remote = this.readu32();
                        lookups[local] = {
                            siteID: siteID,
                            timestamp: remote
                        };
                    }
                    return lookups;
                },

                readTransaction: function(lookup) {
                    var siteID, timestamp;
                    var lastTimestamp;
                    if (buffer.length < offset + 1) {
                        return undefined;
                    }
                    offset += 1;
                    if (buffer.charCodeAt(offset - 1) === 1) {
                        siteID = this.readu32();
                        timestamp = this.readu32();
                        lastTimestamp = {
                            siteID: siteID,
                            timestamp:timestamp
                        };
                    }
                    var insertLen = this.readu32();
                    var inserts = operation_list();
                    for (var index = 0; index < insertLen; index += 1) {
                        inserts.push(this.readInsert(lookup));
                    }

                    var deleteLen = this.readu32();
                    var deletes = operation_list();
                    for ( index = 0; index < deleteLen; index += 1) {
                        deletes.push(this.readDelete());
                    }
                    return {
                        lastTimestamp: lastTimestamp,
                        inserts: inserts,
                        deletes: deletes
                    }
                },

                readInsert: function(lookup) {
                    var timestamp = this.readu32();
                    var position = this.readu64();
                    var value = this.readBytes();
                    var siteID = lookup[timestamp].siteID;
                    return {
                        position: position,
                        value: value,
                        timestamp: timestamp,
                        siteID: siteID
                    };
                },

                readDelete: function(lookup) {
                    var timestamp = this.readu32();
                    var position = this.readu64();
                    var length = this.readu64();
                    return {
                        timestamp: timestamp,
                        position: position,
                        length: length
                    };
                }

            }
        }
    }
})(this);
