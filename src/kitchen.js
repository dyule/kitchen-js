(function(global) {
    document.addEventListener("DOMContentLoaded", function() {
        var connection = new autobahn.Connection({
            url: "ws://127.0.0.1:8090",
            realm: "kitchen_realm"
        });
        connection.onopen = function(session){
            var fileset;

            var currentPath = [];

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
                    fileContainer.appendChild(renderFile(files[index]));
                }
                var listContainer = document.getElementById("file_list");
                listContainer.innerHTML = "";
                listContainer.appendChild(fileContainer);
                document.getElementById("path").textContent = currentPath.join("/");
                if (currentPath.length === 0) {
                    document.getElementById("up_level").style.display="none";
                } else {
                    document.getElementById("up_level").style.display="block";
                }
            }

            function renderFile(file) {
                var fileElement = document.createElement("li");
                fileElement.textContent = file.filename;
                var removeElement = document.createElement("div");
                removeElement.className = "remove";
                removeElement.textContent = "X";
                if (file.type === "folder") {
                    fileElement.className = "folder_entry";
                    fileElement.addEventListener("click", function() {
                       currentPath = getPathWith(file.filename);
                        renderCurrentFiles();
                    });
                    removeElement.addEventListener("click", function (event) {
                        removeFolder(file.filename);
                        event.stopPropagation();
                    });

                } else {
                    fileElement.className = "file_entry";
                    removeElement.addEventListener("click", function (event) {
                        removeFile(file.filename);
                        event.stopPropagation();
                    });
                }
                fileElement.appendChild(removeElement);
                return fileElement;
            }

            function addFile() {
                var filename = prompt("Enter filename");
                var filepath = getPathWith(filename);
                var operation = fileset.addFile(filepath);
                sendOperation(operation);
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
                renderCurrentFiles();
            }

            function initializeApplication(siteID, files, currentTimestamp) {
                fileset = Fileset(siteID, files, currentTimestamp);
                document.getElementById("add_file").addEventListener("click", addFile);
                document.getElementById("add_folder").addEventListener("click", addFolder);
                document.getElementById("up_level").addEventListener("click", upOneLevel);
                renderCurrentFiles();
            }


            session.call("ca.kitchen.get_all_files").then(
                function(result) {
                    initializeApplication(2, result.kwargs.files);
                }
            );
            session.subscribe("ca.kitchen.file_updates", function(args, kwargs) {
                fileset.integrateRemote(kwargs);
                renderCurrentFiles();
            });
        };
        connection.open();

    });


})(this);
