(function(global) {
    global.IDLookup = function () {
        function addFileComponent(path, pathIndex, id, siteid, node) {
            var result;
            var component;
            if (pathIndex < path.length) {
                component = path[pathIndex];
                if (!(component in node.children)) {
                    node.children[component] = {
                        children: {}
                    };
                }
                result = addFileComponent(path, pathIndex + 1, id, siteid, node.children[component]);
                while (result.tryAgain) {
                    component += "(site " + siteid + ")";
                    if (!(component in node.children)) {
                        node.children[component] = {
                            children: {}
                        };
                    }
                    result = addFileComponent(path, pathIndex + 1, id, siteid, node.children[component]);
                }
                if (result.useMine) {
                    return {
                        tryAgain: false,
                        useMine: false,
                        filename: component
                    };
                } else {
                    return result;
                }
            } else {
                if (node.id === undefined) {
                    node.id = id;
                    return {
                        tryAgain: false,
                        useMine: true
                    };
                } else {
                    return {
                        tryAgain: true
                    };
                }

            }
        }

        function addFolderComponent(path, pathIndex,  node) {
            if (pathIndex < path.length) {
                component = path[pathIndex];
                if (!(component in node.children)) {
                    node.children[component] = {
                        children: {}
                    };
                }
                addFolderComponent(path, pathIndex + 1,  node.children[component]);
            }
        }

        function removeFolderComponent(path, pathIndex, node) {
            var component;
            var result;
            if (pathIndex < path.length) {
                component = path[pathIndex];
                if (component in node.children) {
                    result = removeFolderComponent(path, pathIndex + 1, node.children[component]);
                    if (result.shouldRemove) {
                        delete node.children[component];
                    }
                    return {
                        files: result.files,
                        shouldRemove: false
                    }
                } else {
                    return {
                        files: [],
                        shouldRemove: false
                    }
                }
            } else {
                var files = [];
                getAllFilesUnder(node, files);

                return {
                    files: files,
                    shouldRemove: true
                };
            }
        }

        function getAllFilesUnder(node, files) {
            if (node.id !== undefined) {
                files.push(node.id);
            }
            for (var child in node.children) {
                if (node.children.hasOwnProperty(child)) {
                    getAllFilesUnder(node.children[child], files);
                }
            }
        }

        function idLookup(path, pathIndex, node) {
            var component;
            if (pathIndex < path.length) {
                component = path[pathIndex];
                if (component in node.children) {
                    return idLookup(path, pathIndex + 1, node.children[component])
                } else {
                    return undefined;
                }
            } else {
                return node.id
            }
        }

        function removeFileComponent(path, pathIndex, node) {
            var component;
            var result;
            if (pathIndex < path.length) {
                component = path[pathIndex];
                if (component in node.children) {
                    result = removeFileComponent(path, pathIndex + 1, node.children[component]);
                    if (result.shouldRemove) {
                        delete node.children[component];
                    }
                    return {
                        shouldRemove: node.children.length === 0 && node.id === undefined,
                        result: result.result
                    };
                } else {
                    return {
                        shouldRemove: false,
                        result: undefined
                    };
                }
            } else {
                if (node.id) {
                    result = node.id;{}
                    delete node.id;
                    return {
                        shouldRemove: true,
                        result: result
                    }
                } else {
                    return {
                        shouldRemove: false,
                        result: undefined
                    }
                }

            }
        }

        function getFileListComponent(path, pathIndex, node) {
            var component;
            var child;
            if (pathIndex < path.length) {
                component = path[pathIndex];
                if (component in node.children) {
                    return getFileListComponent(path, pathIndex + 1, node.children[component]);
                } else {
                    return [];
                }
            } else {
                var files = [];
                for (child in node.children) {
                    if (node.children.hasOwnProperty(child)) {
                        if (node.children[child].id !== undefined) {
                            files.push({
                                type: 'file',
                                filename: child,
                                id: node.children[child].id
                            });
                        } else {
                            files.push({
                                type: 'folder',
                                filename: child
                            });
                        }
                    }
                }
                return files;
            }
        }

        var head = {
            children: {}
        };
        return {
            addFile: function(path, id, siteID) {
                return addFileComponent(path, 0, id, siteID, head).filename;
            },

            getIdFor: function(path) {
                return idLookup(path, 0, head);
            },

            removeFile: function(path) {
                return removeFileComponent(path, 0, head).result;
            },

            addFolder: function(path) {
                addFolderComponent(path, 0, head);
            },

            removeFolder: function(path) {
                return removeFolderComponent(path, 0, head).files;
            },

            listEntriesAt: function(path) {
                return getFileListComponent(path, 0, head);
            }

        }
    }
})(this);
