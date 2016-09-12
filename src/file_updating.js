(function(global) {
    global.FileUpdater = function(siteID, fileID, session, stamper, textBox, onInit) {
        var engine = global.engine();

        function getSelection(textBox) {
            var textNode = textBox.firstChild;
            var selection = document.getSelection();
            var anchor;
            var focus;
            if (selection.anchorNode === textNode) {
                anchor = selection.anchorOffset;
            }
            if (selection.focusNode === textNode) {
                focus = selection.focusOffset;
            }
            return {
                start: anchor,
                end: focus
            };

        }

        function setSelection(textBox, start, end) {
            var textNode = textBox.firstChild;
            if (start === undefined && end === undefined) {
                return;
            }
            var range = document.createRange();
            if (start === undefined) {
                range.setStart(textNode, end);
            } else {
                range.setStart(textNode, start);
            }

            if (end === undefined) {
                range.setEnd(textNode, start);
            } else {
                range.setEnd(textNode, end);
            }
            var selection = document.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }

        function applySequence(sequence, textBox) {
            // TODO Implement UTF-8 aware strings
            var fileInsert = {
                buffer: textBox.textContent,
                index: 0
            };
            var insertStack = [fileInsert];
            var selection = getSelection(textBox);
            var buffer = "";
            var currentDelete = 0;
            var insertNode = sequence.inserts.head;
            var deleteNode = sequence.deletes.head;
            var insertIndex = 0;
            var deleteIndex = 0;
            var currentInsert = fileInsert;
            var newSelectionStart;
            var newSelectionEnd;
            while (insertStack.length > 0) {
                if (insertNode !== undefined) {
                    if (insertNode.position === insertIndex) {
                        var node = {
                            buffer: insertNode.value,
                            index: 0
                        };
                        insertStack.push(node);
                        currentInsert = node;
                        insertNode = insertNode.next;
                        continue;
                    }
                }
                if (deleteNode !== undefined) {
                    if (deleteNode.position === deleteIndex) {
                        currentDelete += deleteNode.length;
                        deleteNode = deleteNode.next;
                        continue;
                    }
                }
                if (currentInsert.index >= currentInsert.buffer.length) {
                    insertStack.pop();
                    currentInsert = insertStack[insertStack.length - 1];
                } else {
                    if (insertStack.length == 1) {
                        if (insertStack[0].index === selection.start) {
                            newSelectionStart = deleteIndex;
                        }
                        if (insertStack[0].index === selection.end) {
                            newSelectionEnd = deleteIndex;
                        }
                    }
                    if (currentDelete === 0) {
                        buffer += currentInsert.buffer[currentInsert.index];
                        currentInsert.index += 1;
                        insertIndex += 1;
                        deleteIndex += 1;

                    } else {
                        currentInsert.index += 1;
                        currentDelete -= 1;
                        insertIndex += 1
                    }
                }

            }
            textBox.textContent = buffer;
            setSelection(textBox, newSelectionStart, newSelectionEnd);

        }

        textBox.textContent = "Loading";
        session.call("ca.kitchen.get_file_history", [], {
            site_id: fileID.siteID,
            id: fileID.id
        }).then(function (result) {

            var reader = binary.Reader(result.kwargs.history);
            var lookup = reader.readLookups();
            var sequence = reader.readTransaction(lookup);
            for(var local in lookup) {
                if (lookup.hasOwnProperty(local)) {
                    stamper.stampRemote(lookup[local]);
                }
            }
            engine.integrateRemote(sequence, lookup, stamper);
            textBox.textContent = "";
            applySequence(sequence, textBox);
            if (textBox.textContent === "") {
                var range = document.createRange();
                var selection = document.getSelection();
                range.selectNodeContents(textBox);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                setSelection(textBox, 0, 0);
            }
            onInit();

        });

        return {
            integrateUpdate: function(updateOp) {
                var lookups = {};
                for (var index = 0; index < updateOp.lookup.length; index += 1) {
                    var lookup = updateOp.lookup[index];
                    lookups[lookup[0]] = {
                        siteID: lookup[1],
                        timestamp: lookup[2]
                    }
                }
                var reader = binary.Reader(updateOp.transaction);
                var transaction = reader.readTransaction(lookups);
                engine.integrateRemote(transaction, lookups, stamper);
                applySequence(transaction, textBox);

            },
            sendChanges: function(inserts, deletes, previousTimestamp, lookup) {
                var transaction = {
                    lastTimestamp: previousTimestamp,
                    inserts: inserts,
                    deletes: deletes
                };
                engine.processTransaction(transaction);
                var writer = binary.Writer();
                writer.writeTransaction(transaction);
                session.publish("ca.kitchen.file_updates", [], {
                    transaction: writer.getBase64(),
                    site_id: fileID.siteID,
                    id: fileID.id,
                    lookup: lookup,
                    type: "update"
                });
                // TODO This is a hack to get around the fact that sometimes the web client sends updates based on operations no other client has.
                session.call("ca.kitchen.check_timestamp", [], {site_id: lookup[0][1], timestamp: lookup[0][2]}).then(function(found) {
                    if (!found) {
                        document.getElementById("sync_error").style.display = "block";
                        window.location.reload();
                    }
                });
            }
        }
    }
})(this);
