(function(global) {
    global.Fileset = function(siteID, initialFiles) {
        var files = {};
        var idLookup = IDLookup();
        var currentID = 0;
        var latestTimestamp = 0;
        for (var fileIndex in initialFiles) {
            if (initialFiles.hasOwnProperty(fileIndex)) {
                var file = initialFiles[fileIndex];
                integrateCreate(file);
                if (file.timestamp >= latestTimestamp) {
                    latestTimestamp = file.timestamp + 1;
                }
            }
        }
        function nextID() {
            var result = currentID;
            currentID += 1;
            return result;
        }

        function getLocalPath(fileMetdata) {
            var path = [];
            var index;
            for (index = 0; index < fileMetdata.filename.length - 1; index += 1) {
                path.push(fileMetdata.filename[index]);
            }
            path.push(fileMetdata.printedFilename);
            return path;
        }

        function integrateCreate(remote) {
            var actualFilename = idLookup.addFile(remote.filename, {
                    siteID: remote.site_id,
                    id: remote.id
                }, remote.site_id);


            if (!(remote.site_id in files)) {
                files[remote.site_id] = {};
            }
            files[remote.site_id][remote.id] = {
                filename: remote.filename,
                printedFilename: actualFilename,
                timestamp: remote.timestamp
            }
        }

        function integrateRemove(remote) {
            var file = files[remote.site_id][remote.id];
            idLookup.removeFile(getLocalPath(file));
            delete files[remote.site_id][remote.id];
        }

        function integrateUpdateMetadata(remote) {
            var file = files[remote.site_id][remote.id];
            if (remote.key == "filename" && remote.timestamp > file.timestamp) {
                idLookup.removeFile(getLocalPath(file));
                var actualFilename = idLookup.addFile(remote.value, {
                    siteID: remote.site_id,
                    id: remote.id
                }, remote.state_site_id);
                file.filename = remote.filename;
                file.printedFilename = actualFilename;
                file.timestamp = remote.timestamp;
            }
        }

        return {
            addFile: function(filename) {
                var id = nextID();
                var actual = idLookup.addFile(filename, {siteID: siteID, id: id}, siteID);
                var file = {
                    filename: filename,
                    timestamp: latestTimestamp++,
                    printedFilename: actual
                };
                if (!(siteID in files)) {
                    files[siteID] = {};
                }
                files[siteID][id] = file;
                return {
                    type: "create",
                    site_id: siteID,
                    id: id,
                    filename: filename,
                    state_site_id: siteID,
                    timestamp: file.timestamp
                }
            },

            removeFile: function(filename) {
                var lookup = idLookup.removeFile(filename);
                delete files[lookup.siteID][lookup.id];
                return {
                    type: "remove",
                    site_id: lookup.siteID,
                    id: lookup.id
                }
            },
            
            renameFile: function(oldFilename, newFilename) {
                var lookup = idLookup.removeFile(oldFilename);
                var file = files[lookup.siteID][lookup.id];
                var actual = idLookup.addFile(newFilename, lookup, siteID);
                file.filename = newFilename;
                file.printedFilename = actual;
                file.timestamp = latestTimestamp++;
                return {
                    type: "update_metadata",
                    site_id: file.siteID,
                    id: file.id,
                    state_site_id: siteID,
                    timestamp: file.timestamp,
                    key: "filename",
                    value: filename
                }
            },

            integrateRemote: function(remote) {
                switch (remote.type) {
                    case "create":
                        integrateCreate(remote);
                        break;
                    case "remove":
                        integrateRemove(remote);
                        break;
                    case "update_metadata":
                        integrateUpdateMetadata(remote);
                        break;

                }
            },
            
            getFiles: function(path) {
                return idLookup.listEntriesAt(path);
            },
            
            addFolder: function(path) {
                idLookup.addFolder(path);
            },
            
            removeFolder: function(path) {
                var fileIDs = idLookup.removeFolder(path);
                var fileID;
                var operations = [];
                for (var index in fileIDs) {
                    if (fileIDs.hasOwnProperty(index)) {
                        fileID = fileIDs[fileID];
                        operations.push({
                            type: 'remove',
                            site_id: fileID.siteID,
                            id: fileID.id
                        })
                    }
                }
                return operations;
            }
        };
    };
})(this);
