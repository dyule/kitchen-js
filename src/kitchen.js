(function(global) {
    document.addEventListener("DOMContentLoaded", function() {
        var connection = new autobahn.Connection({
            url: "ws://kitchen.cs.dal.ca:8090",
            realm: "kitchen_realm"
        });
        connection.onopen = function(session){
            var fileset;
            var stamper;
            var fileUpdater;
            var currentFile;
            var currentPath = [];
            var diff = new Diff();
            var oldContent = "";
            var diffTimer;
            var siteID = 2;
            var fileSelected;
            var fileEditor = document.getElementById("file_editor");
            fileEditor.addEventListener("keyup", function() {
                if (diffTimer) {
                    clearTimeout(diffTimer);
                }
                diffTimer = setTimeout(function() {
                    diffTimer = undefined;
                    checkDiff();
                }, 1000);
            });

            function checkDiff() {
                var changes = diff.diff(oldContent, fileEditor.textContent);
                var inserts = operation_list();
                var deletes = operation_list();
                var previousTimestamp = stamper.getLastRemote();
                var timestamp = stamper.stampLocal();
                var deleteIndex = 0;
                var insertIndex = 0;
                var shouldSend = false;
                changes.forEach(function(change){
                    if (change.added) {
                        shouldSend = true;
                        inserts.push({
                            position: insertIndex,
                            value: change.value,
                            timestamp: timestamp,
                            siteID: siteID
                        });
                        deleteIndex += change.count;
                        insertIndex += change.count;
                    } else if (change.removed) {
                        shouldSend = true;
                        deletes.push({
                            position: deleteIndex,
                            length: change.count,
                            timestamp: timestamp
                        });
                        insertIndex += change.count;
                    } else {
                        deleteIndex += change.count;
                        insertIndex += change.count;
                    }
                });
                if (shouldSend) {
                    fileUpdater.sendChanges(inserts, deletes, previousTimestamp, [
                        [timestamp, siteID, timestamp]
                    ]);
                    oldContent = fileEditor.textContent;
                    console.log("Old content", oldContent);
                }
            }

            function getPathWith(filename) {
                var result = [];
                for (var index = 0; index < currentPath.length; index+= 1) {
                    result.push(currentPath[index]);
                }
                result.push(filename);
                return result;
            }
            function renderCurrentFiles() {
                var fileContainer = document.createElement("ul");
                var files = fileset.getFiles(currentPath);
                var editorArea = document.getElementById("editor_area");
                fileSelected = false;

                files.sort(function(a, b){
                    if (a.type !== b.type) {
                        if (a.type === "folder") {
                            return -1;
                        } else {
                            return 1;
                        }
                    }

                   if (a.filename < b.filename ) {
                       return -1;
                   } else {
                       return 1;
                   }
                });
                var index;
                for (index = 0; index < files.length; index += 1) {
                    if (index !==  0) {
                        fileContainer.appendChild(createInbetweener());
                    }
                    fileContainer.appendChild(renderFile(files[index]));
                }
                var listContainer = document.getElementById("file_list");
                listContainer.innerHTML = "";
                listContainer.appendChild(fileContainer);
                document.getElementById("path").textContent = "/" + currentPath.join("/");
                if (currentPath.length === 0) {
                    document.getElementById("up_level").style.visibility="hidden";
                } else {
                    document.getElementById("up_level").style.visibility="visible";
                }

                if (!fileSelected) {
                    currentFile = undefined;
                    editorArea.className = "";
                } else {
                    editorArea.className = "active";
                }

            }

            function renderFile(file) {
                var fileElement = document.createElement("li");
                var filenameElement = document.createElement("span");
                filenameElement.textContent = file.filename;
                filenameElement.className = "filename";
                var removeElement = document.createElement("div");
                fileElement.appendChild(filenameElement);
                removeElement.className = "remove";
                removeElement.textContent = "X";

                if (file.type === "folder") {
                    fileElement.className = "folder_entry";
                    fileElement.addEventListener("click", function() {
                       currentPath = getPathWith(file.filename);
                        currentFile = undefined;
                        fileUpdater = undefined;
                        renderCurrentFiles();
                    });
                    removeElement.addEventListener("click", function (event) {
                        removeFolder(file.filename);
                        event.stopPropagation();
                    });

                } else {
                    if (currentFile !== undefined && currentFile.id.siteID === file.id.siteID && currentFile.id.id === file.id.id) {
                        fileElement.className = "file_entry selected";
                        document.getElementById("filename_title").textContent = file.filename;
                        fileSelected = true;
                    } else {
                        fileElement.className = "file_entry";
                    }
                    fileElement.addEventListener("click", function() {
                        selectFile(file);

                    });
                    removeElement.addEventListener("click", function (event) {
                        removeFile(file.filename);
                        event.stopPropagation();
                    });
                }
                fileElement.appendChild(removeElement);
                return fileElement;
            }

            function createInbetweener() {
                var inbetween = document.createElement("li");
                inbetween.className = "inbetween";
                return inbetween;
            }

            function selectFile(file) {
                currentFile = file;
                fileUpdater = FileUpdater(siteID, file.id, session, stamper, fileEditor, function() {
                    oldContent = fileEditor.textContent;
                    console.log("Old content", oldContent);
                    renderCurrentFiles();
                });
            }

            function updateClasses() {
                var fileList = document.getElementById("file_list").firstChild;

                for (var childIndex in fileList.childNodes) {
                    var child = fileList.childNodes[childIndex];
                    if (child.className === "file_entry" || child.className === "file_entry selected") {
                        if (currentFile !== undefined && child.firstChild.textContent === currentFile.filename) {
                            child.className = "file_entry selected";

                        } else {
                            child.className = "file_entry";
                        }
                    }
                }
            }

            function addFile() {
                var filename = prompt("Enter filename");
                var filepath = getPathWith(filename);
                var operation = fileset.addFile(filepath);
                sendOperation(operation);
                selectFile({
                   id: {
                       siteID: operation.site_id,
                       id: operation.id
                   }
                });
                renderCurrentFiles();
            }

            function addFolder() {
                var foldername = prompt("Enter folder name");
                var folderpath = getPathWith(foldername);
                fileset.addFolder(folderpath);
                currentPath = folderpath;
                renderCurrentFiles();
            }

            function removeFile(filename) {
                var operation = fileset.removeFile(getPathWith(filename));
                sendOperation(operation);
                renderCurrentFiles();
            }

            function removeFolder(foldername) {
                var operations = fileset.removeFolder(getPathWith(foldername));
                for (var operationIndex = 0; operationIndex < operations.length; operationIndex += 1) {
                    sendOperation(operations[operationIndex]);
                }
                renderCurrentFiles();
            }

            function sendOperation(operation) {
                session.publish("ca.kitchen.file_updates", [], operation);
            }


            function upOneLevel() {
                currentPath.pop();
                currentFile = undefined;
                renderCurrentFiles();
            }

            function initializeApplication(siteID, files, currentTimestamp) {
                fileset = Fileset(siteID, files, currentTimestamp);
                document.getElementById("add_file").addEventListener("click", addFile);
                document.getElementById("add_folder").addEventListener("click", addFolder);
                document.getElementById("up_level").addEventListener("click", upOneLevel);
                renderCurrentFiles();
            }

            stamper = Stamper(siteID);
            session.call("ca.kitchen.get_all_files").then(
                function(result) {
                    var files = result.kwargs.files;
                    session.call("ca.kitchen.get_id").then(
                        function(result) {
                            initializeApplication(result, files);
                        }
                    );
                }
            );
            session.subscribe("ca.kitchen.file_updates", function(args, kwargs) {
                if (kwargs.type === "update") {
                    if (fileUpdater && currentFile.id.siteID == kwargs.site_id && currentFile.id.id == kwargs.id) {
                        checkDiff();
                        fileUpdater.integrateUpdate(kwargs);
                        oldContent = fileEditor.textContent;
                        console.log("Old content", oldContent);
                    }
                } else {
                    fileset.integrateRemote(kwargs);
                    renderCurrentFiles();
                }
            });
        };
        connection.open();

    });


})(this);
