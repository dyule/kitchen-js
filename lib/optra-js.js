(function(global) {
    function get_increment(operation) {
        if (operation.value) {
            return operation.value.length;
        } else {
            return -operation.length;
        }
    }

    function transform(incomingSequence, existingSequence) {
        var incomingOffset = 0;
        var existingOffset = 0;
        var totalOverlap = 0;
        incomingSequence.iterate_with(existingSequence, function(incomingOp, existingOp) {
            if (!incomingOp) {
                return false;
            }
            if (!existingOp) {
                incomingOp.position += existingOffset + totalOverlap;
                return true;
            }

            var incomingStart = incomingOp.position - incomingOffset;
            var existingStart = existingOp.position - existingOffset;
            var incomingEnd = incomingStart + (incomingOp.length || 0);
            var existingEnd = existingStart + (existingOp.length || 0);
            var amount;
            var new_op;
            if (incomingStart < existingStart || (incomingOp.value !== undefined && existingOp.value !== undefined && incomingStart == existingStart && incomingOp.siteID < existingOp.siteID)) {
                if (existingStart < incomingEnd) {
                    if (existingEnd < incomingEnd) {
                        //Encloses
                        amount = existingStart - incomingStart;
                        new_op = {
                            position: incomingOp.position,
                            length: incomingOp.length - amount,
                            siteID: incomingOp.siteID,
                            timestamp: incomingOp.timestamp,
                            next: incomingOp.next,
                            back: incomingOp
                        };
                        incomingOp.length = amount;
                        incomingOp.next = new_op;
                        incomingOffset += get_increment(incomingOp);
                        incomingOp.position += existingOffset + totalOverlap;
                        return true;
                    } else {
                        //Overlaps Front
                        incomingOffset += get_increment(incomingOp);
                        amount = incomingEnd - existingStart;
                        incomingOp.length -= amount;
                        incomingOp.position += existingOffset + totalOverlap;
                        totalOverlap += amount;
                        return true;

                    }
                } else {
                    //Precedes
                    incomingOffset += get_increment(incomingOp);
                    incomingOp.position += existingOffset + totalOverlap;
                    return true;
                }
            } else {
                if (incomingStart < existingEnd) {
                    if (incomingEnd < existingEnd) {
                        if (incomingStart == existingStart) {
                            //Overlaps Front
                        } else {
                            //Enclosed By
                            incomingOffset += get_increment(incomingOp);
                            amount = incomingStart - existingStart;
                            incomingOp.position += existingOffset + totalOverlap - amount;
                            totalOverlap += incomingOp.length;
                            incomingOp.length = 0;
                            return true;

                        }
                    } else {
                        //Overlaps back
                        existingOffset += get_increment(existingOp);
                        amount = existingEnd - incomingStart;
                        totalOverlap += amount;
                        incomingOffset -= amount;
                        incomingOp.length -= amount;
                        return false;
                    }
                } else {
                    // Follows
                    existingOffset += get_increment(existingOp);
                    return false;
                }
            }

            
        });
    }

    function merge(incoming_sequence, existing_sequence) {
        var offset = 0;
        incoming_sequence.iterate_with(existing_sequence, function(incomingOp, existingOp) {
            if (!incomingOp) {
                existingOp.position += offset;
                return false;
            }
            if (!existingOp) {
                existing_sequence.push({
                    position: incomingOp.position,
                    value: incomingOp.value,
                    length: incomingOp.length,
                    siteID: incomingOp.siteID,
                    timestamp: incomingOp.timestamp,
                    next: incomingOp.next
                });
                return true;
            }
            var newOp;
            if (incomingOp.position < existingOp.position || (incomingOp.value !== undefined && existingOp.value !== undefined && incomingOp.position == existingOp.position && incomingOp.siteID < existingOp.siteID)) {
                newOp = {
                    position: incomingOp.position,
                    value: incomingOp.value,
                    length: incomingOp.length,
                    siteID: incomingOp.siteID,
                    timestamp: incomingOp.timestamp,
                    next: existingOp,
                    back: existingOp.back
                };
                offset += get_increment(incomingOp);
                if (existingOp.back) {
                    existingOp.back.next = newOp;
                } else {
                    existing_sequence.head = newOp;
                }
                return true;
            } else {
                existingOp.position += offset;
                return false;
            }
        });
    }

    function splitBy(incomingSequence, existingSequence) {
        var incomingOffset = 0;
        var existingOffset = 0;
        incomingSequence.iterate_with(existingSequence, function(incomingOp, existingOp) {
            if (!incomingOp) {
                return false;
            }
            if (!existingOp) {
                return true;
            }
            var incomingStart = incomingOp.position - incomingOffset;
            var existingStart = existingOp.position - existingOffset;
            var incomingEnd = incomingStart + (incomingOp.length || 0);
            if (incomingStart < existingStart) {
                if (incomingEnd <= existingStart) {
                    // Precedes
                    incomingOffset += get_increment(incomingOp);
                    return true;
                } else {
                    // Crosses
                    var amount = existingStart - incomingStart;
                    var new_op = {
                        position: incomingOp.position,
                        length: incomingOp.length - amount,
                        siteID: incomingOp.siteID,
                        timestamp: incomingOp.timestamp,
                        next: incomingOp.next,
                        back: incomingOp
                    };
                    incomingOp.length = amount;
                    incomingOp.next = new_op;
                    incomingOffset += get_increment(incomingOp);
                    return true;
                }
            } else {
                // Follows
                existingOffset += get_increment(existingOp);
            }
        });
    }

    function swap(incomingSequence, existingSequence) {
        var incomingOffset = 0;
        var existingOffset = 0;
        incomingSequence.iterate_with(existingSequence, function(incomingOp, existingOp) {
            if (!incomingOp) {
                existingOp.position += incomingOffset;
                return false;
            }
            if (!existingOp) {
                incomingOp.position -= existingOffset;
                return true;
            }
            if (incomingOp.position - incomingOffset - existingOffset < existingOp.position - existingOffset) {
                incomingOffset += get_increment(incomingOp);
                incomingOp.position -= existingOffset;
                return true;
            } else {
                existingOffset += get_increment(existingOp);
                existingOp.position += incomingOffset;
                return false;
            }
        });
    }

    global.engine = function () {
        return {
            inserts: operation_list(),
            deletes: operation_list(),
            integrateRemote: function(remoteSequence, lookup, stamper) {
                var localConcurrentInserts = this.getConcurrentInserts(remoteSequence, lookup, stamper);
                transform(remoteSequence.inserts, localConcurrentInserts);
                var transformedRemoteInserts = remoteSequence.inserts.clone();
                transform(remoteSequence.inserts, this.deletes);
                this.assignTimestamps(transformedRemoteInserts, lookup, stamper);
                merge(transformedRemoteInserts, this.inserts);

                transform(this.deletes, transformedRemoteInserts);

                var transformedConcurrentInserts = this.getConcurrentInserts(remoteSequence, lookup, stamper);
                transform(remoteSequence.deletes, transformedConcurrentInserts);
                transform(remoteSequence.deletes, this.deletes);
                this.assignTimestamps(remoteSequence.deletes, lookup, stamper);
                merge(remoteSequence.deletes, this.deletes);
            },
            assignTimestamps: function(sequence, lookup, stamper) {
                sequence.iterate(function(o) {
                    var remote = lookup[o.timestamp];
                    o.timestamp = stamper.stampRemote(remote);
                });
            },
            getConcurrentInserts: function(remoteSequence, lookup, stamper) {
                var referenceTime;
                var latestTimestamp = remoteSequence.inserts.getMinTimestamp();
                var deleteTimestamp = remoteSequence.deletes.getMinTimestamp();
                if (latestTimestamp === undefined || (deleteTimestamp !== undefined && latestTimestamp > deleteTimestamp)) {
                    latestTimestamp = deleteTimestamp;
                }
                var tailTimestamp;
                if (latestTimestamp !== undefined) {
                    tailTimestamp = stamper.getLocalTimestampFor(lookup[latestTimestamp]);
                }

                if (remoteSequence.lastTimestamp !== undefined) {
                    referenceTime = stamper.getLocalTimestampFor(remoteSequence.lastTimestamp);
                    if (tailTimestamp !== undefined) {
                        return this.inserts.filter(function (insert) {
                            return insert.timestamp > referenceTime && insert.timestamp < tailTimestamp;
                        });
                    } else {
                        return this.inserts.filter(function (insert) {
                            return insert.timestamp > referenceTime;
                        });
                    }
                } else {
                    if (tailTimestamp !== undefined) {
                        return this.inserts.filter(function (insert) {
                            return insert.timestamp < tailTimestamp;
                        });
                    } else {
                        return this.inserts.clone();
                    }
                }
                //
                // var node = this.inserts.head;
                // while (node) {
                //     if (node.state.siteID == state.siteID && node.state.remoteTimestamp == state.remoteTimestamp) {
                //         referenceTime = node.state.localTimestamp;
                //         break;
                //     }
                //     node = node.next;
                // }
                //
                // if (referenceTime === undefined) {
                //     node = this.deletes.head;
                //     while (node) {
                //         if (node.state.siteID === state.siteID && node.state.remoteTimestamp == state.remoteTimestamp) {
                //             referenceTime = node.state.localTimestamp;
                //             break;
                //         }
                //         node = node.next;
                //     }
                // }
                // if (referenceTime === undefined) {
                //     console.error("Could not find reference state");
                //     return operation_list()
                // }
                // var returnList = operation_list();
                // node = this.inserts.head;
                // while (node) {
                //     if (node.state.siteID !== original_site && node.state.localTimestamp >  referenceTime) {
                //         returnList.push({
                //             position: node.position,
                //             value: node.value,
                //             length: node.length,
                //             next: node.next,
                //             state: copy_state(node.state),
                //         });
                //     }
                //     node = node.next;
                // }
                // return returnList;

            },

            processTransaction: function(outgoingSequence) {
                swap(outgoingSequence.inserts, this.deletes);
                
                splitBy(outgoingSequence.deletes, this.deletes);

                var originalDeletes = outgoingSequence.deletes.clone();

                swap(outgoingSequence.deletes, this.deletes.clone());

                merge(outgoingSequence.inserts, this.inserts);

                merge(originalDeletes, this.deletes);
            },


            internals: {
                transform: transform,
                merge: merge
            }
        };
    };
})(this);;(function (global) {
    global.operation_list = function() {
        return {
            push: function(new_obj) {
                new_obj.back = this.tail;
                if (this.head === undefined) {
                    this.head = new_obj;
                    this.tail = new_obj;
                } else {
                    this.tail.next = new_obj;
                    this.tail = new_obj;
                }
                new_obj.next = undefined;
            },

            iterate: function(iterFunc) {
              var node = this.head;
                while (node) {
                    iterFunc(node);
                    node = node.next;
                }
            },

            iterate_with: function(otherIterator, compareFunc) {
                var my_node = this.head;
                var other_node = otherIterator.head;
                var compare_result;
                while (my_node || other_node) {
                    compare_result = compareFunc(my_node, other_node);
                    if (compare_result) {
                        my_node = my_node.next;
                    } else {
                        other_node = other_node.next;
                    }
                }
            },

            getMinTimestamp: function() {
                var myNode = this.head;
                var minID;
                while (myNode) {
                    if (minID === undefined || myNode.timestamp < minID ) {
                        minID = myNode.timestamp;
                    }
                    myNode = myNode.next;
                }
                return  minID;
            },
            filter: function(filterFunc) {

                var newList = operation_list();
                var node = this.head;
                var newNode;
                while (node) {
                    if (filterFunc(node)) {
                        newNode = {
                            position: node.position,
                            value: node.value,
                            length: node.length,
                            siteID: node.siteID,
                            timestamp: node.timestamp
                        };
                        newList.push(newNode);
                    }
                    node = node.next;
                }
                return newList;


            },
            clone: function(){
                var newList = operation_list();
                var node = this.head;
                var newNode;
                while (node) {
                    newNode = {
                        position: node.position,
                        value: node.value,
                        length: node.length,
                        siteID: node.siteID,
                        timestamp: node.timestamp

                    };
                    newList.push(newNode);
                    node = node.next;
                }
                return newList;
            },
            getLength: function() {
                var len = 0;
                this.iterate(function() {
                    len += 1;
                });
                return len;
            }
        };
    };
})(this);
;(function(global) {
    global.Stamper = function (siteID) {
        var lastLocal;
        var lastRemote;
        var lookup = {};

        function lookupLocal(remoteStamp) {
            if (remoteStamp.siteID in lookup) {
                return lookup[remoteStamp.siteID][remoteStamp.timestamp];
            } else {
                return undefined;
            }
        }

        return {
            stampLocal: function() {
                if (lastLocal === undefined) {
                    lastLocal = 0;
                } else {
                    lastLocal += 1;
                }
                if (!(siteID in lookup)) {
                    lookup[siteID] = {};
                }
                lookup[siteID][lastLocal] = lastLocal;
                lastRemote = {
                    siteID: siteID,
                    timestamp: lastLocal
                };
                return lastLocal;
            },

            stampRemote: function(remoteStamp) {
                if (!(remoteStamp.siteID in lookup)) {
                    lookup[remoteStamp.siteID] = {};
                } else {
                    if (remoteStamp.timestamp in lookup[remoteStamp.siteID]) {
                        return lookup[remoteStamp.siteID][remoteStamp.timestamp];
                    }
                }
                if (lastLocal === undefined) {
                    lastLocal = 0;
                } else {
                    lastLocal += 1;
                }
                lookup[remoteStamp.siteID][remoteStamp.timestamp] = lastLocal;
                lastRemote = remoteStamp;
                return lastLocal;

            },

            getLocalTimestampFor: function(remoteStamp) {
                return lookupLocal(remoteStamp);
            },

            getLookupSince: function(remoteStamp) {
                var lookupsSince = {};
                var localStamp;
                var remoteTime;
                if (remoteStamp !== undefined ) {
                    remoteTime = lookupLocal(remoteStamp);
                }
                for (var siteID in lookup) {
                    if (lookup.hasOwnProperty(siteID)) {
                        for (var remoteTimestamp in lookup[siteID]) {
                            if (lookup[siteID].hasOwnProperty(remoteTimestamp)) {
                                localStamp = lookup[siteID][remoteTimestamp];
                                if (remoteTime === undefined || localStamp > remoteTime) {
                                    lookupsSince[localStamp] = {
                                        siteID: siteID,
                                        timestamp: remoteTimestamp
                                    };
                                }
                            }
                        }
                    }
                }
                return lookupsSince;
            },

            getLastRemote: function() {
                return lastRemote;
            },

            getLastLocal: function() {
                return lastLocal;
            }
        };
    };
})(this);
