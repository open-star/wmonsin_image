/**
 file_controller.ts
 Copyright (c) 2015 7ThCode.
 This software is released under the MIT License.
 http://opensource.org/licenses/mit-license.php
 */
'use strict';
var mongoose = require('mongoose');
var _ = require('lodash');
var fs = require('fs');
var text = fs.readFileSync('config/config.json', 'utf-8');
var config = JSON.parse(text);
config.dbaddress = process.env.DB_PORT_27017_TCP_ADDR || 'localhost';
var FileModel = require('../../model/patient');
var Grid = require('gridfs-stream');
var result = require('./../lib/result');
var Wrapper = require('./../lib/wrapper');
var wrapper = new Wrapper;
var log4js = require('log4js');
log4js.configure("config/logs.json");
var logger = log4js.getLogger('request');
logger.setLevel(config.loglevel);
var FileController = (function () {
    function FileController() {
    }
    FileController.prototype.get_file_name = function (request, response, next) {
        try {
            logger.trace("begin /file/:name");
            //  var conn = mongoose.createConnection("mongodb://" + config.dbaddress + "/" + config.db);
            var connection = "mongodb://" + config.dbuser + ":" + config.dbpassword + "@" + config.dbaddress + "/" + config.dbname;
            var conn = mongoose.createConnection(connection);
            conn.once('open', function (error) {
                if (!error) {
                    var gfs = Grid(conn.db, mongoose.mongo); //missing parameter
                    if (gfs) {
                        conn.db.collection('fs.files', function (error, collection) {
                            if (!error) {
                                if (collection) {
                                    collection.findOne({ filename: request.params.name }, function (error, item) {
                                        if (!error) {
                                            if (item) {
                                                var gfs = Grid(conn.db, mongoose.mongo); //missing parameter
                                                if (gfs) {
                                                    var readstream = gfs.createReadStream({ filename: request.params.name });
                                                    if (readstream) {
                                                        readstream.pipe(response);
                                                        readstream.on('close', function (file) {
                                                            conn.db.close();
                                                            logger.trace("end /file/:name");
                                                        });
                                                    }
                                                    else {
                                                        conn.db.close();
                                                        logger.error("/file/:name 1");
                                                        next();
                                                    }
                                                }
                                                else {
                                                    conn.db.close();
                                                    logger.error("/file/:name 2");
                                                    next();
                                                }
                                            }
                                            else {
                                                conn.db.close();
                                                logger.error("/file/:name 3");
                                                next();
                                            }
                                        }
                                        else {
                                            conn.db.close();
                                            logger.error("/file/:name 4");
                                            next();
                                        }
                                    });
                                }
                                else {
                                    conn.db.close();
                                    logger.error("/file/:name 5");
                                    next();
                                }
                            }
                            else {
                                conn.db.close();
                                logger.error("/file/:name 6");
                                next();
                            }
                        });
                    }
                    else {
                        conn.db.close();
                        logger.error("/file/:name 7");
                        next();
                    }
                }
                else {
                    conn.db.close();
                    logger.error("/file/:name 8");
                    next();
                }
            });
        }
        catch (e) {
            logger.error("/file/:name 9");
            next();
        }
    };
    FileController.prototype.post_file_name = function (request, response) {
        logger.trace("begin /file/:name");
        wrapper.Guard(request, response, function (request, response) {
            var number = 24000;
            wrapper.Authenticate(request, response, number, function (user, response) {
                //        var conn = mongoose.createConnection("mongodb://" + config.dbaddress + "/" + config.db);
                var connection = "mongodb://" + config.dbuser + ":" + config.dbpassword + "@" + config.dbaddress + "/" + config.dbname;
                var conn = mongoose.createConnection(connection);
                if (conn) {
                    conn.once('open', function (error) {
                        if (!error) {
                            var gfs = Grid(conn.db, mongoose.mongo); //missing parameter
                            if (gfs) {
                                conn.db.collection('fs.files', function (error, collection) {
                                    if (!error) {
                                        if (collection) {
                                            collection.findOne({ filename: request.params.name }, function (error, item) {
                                                if (!error) {
                                                    if (!item) {
                                                        var parseDataURL = function (dataURL) {
                                                            var rslt = {
                                                                mediaType: null,
                                                                encoding: null,
                                                                isBase64: null,
                                                                data: null
                                                            };
                                                            if (/^data:([^;]+)(;charset=([^,;]+))?(;base64)?,(.*)/.test(dataURL)) {
                                                                rslt.mediaType = RegExp.$1 || 'text/plain';
                                                                rslt.encoding = RegExp.$3 || 'US-ASCII';
                                                                rslt.isBase64 = String(RegExp.$4) === ';base64';
                                                                rslt.data = RegExp.$5;
                                                            }
                                                            return rslt;
                                                        };
                                                        var info = parseDataURL(request.body.url);
                                                        var chunk = info.isBase64 ? new Buffer(info.data, 'base64') : new Buffer(unescape(info.data), 'binary');
                                                        var writestream = gfs.createWriteStream({ filename: request.params.name });
                                                        if (writestream) {
                                                            writestream.write(chunk);
                                                            writestream.end();
                                                            writestream.on('close', function (file) {
                                                                conn.db.close();
                                                                wrapper.SendResult(response, 0, "OK", {});
                                                                logger.trace("end /file/:name");
                                                            });
                                                        }
                                                        else {
                                                            conn.db.close();
                                                            wrapper.SendFatal(response, number + 40, "stream not open", {});
                                                        }
                                                    }
                                                    else {
                                                        conn.db.close();
                                                        wrapper.SendWarn(response, number + 1, "already found", {});
                                                    }
                                                }
                                                else {
                                                    conn.db.close();
                                                    wrapper.SendError(response, number + 100, error.message, error);
                                                }
                                            });
                                        }
                                        else {
                                            conn.db.close();
                                            wrapper.SendFatal(response, number + 30, "no collection", {});
                                        }
                                    }
                                    else {
                                        conn.db.close();
                                        wrapper.SendError(response, number + 100, error.message, error);
                                    }
                                });
                            }
                            else {
                                conn.db.close();
                                wrapper.SendFatal(response, number + 20, "no gfs", {});
                            }
                        }
                        else {
                            conn.db.close();
                            wrapper.SendError(response, number + 100, error.message, error);
                        }
                    });
                }
                else {
                    wrapper.SendError(response, number + 10, "connection error", {});
                }
            });
        });
    };
    FileController.prototype.put_file_name = function (request, response) {
        logger.trace("begin /file/:name");
        wrapper.Guard(request, response, function (request, response) {
            var number = 25000;
            wrapper.Authenticate(request, response, number, function (user, response) {
                //      var conn = mongoose.createConnection("mongodb://" + config.dbaddress + "/" + config.db);
                var connection = "mongodb://" + config.dbuser + ":" + config.dbpassword + "@" + config.dbaddress + "/" + config.dbname;
                var conn = mongoose.createConnection(connection);
                if (conn) {
                    conn.once('open', function (error) {
                        if (!error) {
                            var gfs = Grid(conn.db, mongoose.mongo); //missing parameter
                            if (gfs) {
                                conn.db.collection('fs.files', function (error, collection) {
                                    if (!error) {
                                        if (collection) {
                                            collection.findOne({ filename: request.params.name }, function (error, item) {
                                                if (!error) {
                                                    if (item) {
                                                        collection.remove({ filename: request.params.name }, function () {
                                                            var parseDataURL = function (dataURL) {
                                                                var rslt = {
                                                                    mediaType: null,
                                                                    encoding: null,
                                                                    isBase64: null,
                                                                    data: null
                                                                };
                                                                if (/^data:([^;]+)(;charset=([^,;]+))?(;base64)?,(.*)/.test(dataURL)) {
                                                                    rslt.mediaType = RegExp.$1 || 'text/plain';
                                                                    rslt.encoding = RegExp.$3 || 'US-ASCII';
                                                                    rslt.isBase64 = String(RegExp.$4) === ';base64';
                                                                    rslt.data = RegExp.$5;
                                                                }
                                                                return rslt;
                                                            };
                                                            var info = parseDataURL(request.body.url);
                                                            var chunk = info.isBase64 ? new Buffer(info.data, 'base64') : new Buffer(unescape(info.data), 'binary');
                                                            var writestream = gfs.createWriteStream({ filename: request.params.name });
                                                            if (writestream) {
                                                                writestream.write(chunk);
                                                                writestream.end();
                                                                writestream.on('close', function (file) {
                                                                    conn.db.close();
                                                                    wrapper.SendResult(response, 0, "OK", {});
                                                                    logger.trace("end /file/:name");
                                                                });
                                                            }
                                                            else {
                                                                conn.db.close();
                                                                wrapper.SendFatal(response, number + 40, "stream not open", {});
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        conn.db.close();
                                                        wrapper.SendWarn(response, number + 1, "not found", {});
                                                    }
                                                }
                                                else {
                                                    conn.db.close();
                                                    wrapper.SendError(response, number + 100, error.message, error);
                                                }
                                            });
                                        }
                                        else {
                                            wrapper.SendFatal(response, number + 30, "no collection", {});
                                        }
                                    }
                                    else {
                                        conn.db.close();
                                        wrapper.SendError(response, number + 100, error.message, error);
                                    }
                                });
                            }
                            else {
                                conn.db.close();
                                wrapper.SendFatal(response, number + 20, "no gfs", {});
                            }
                        }
                        else {
                            conn.db.close();
                            wrapper.SendError(response, number + 100, error.message, error);
                        }
                    });
                }
                else {
                    wrapper.SendError(response, number + 10, "connection error", {});
                }
            });
        });
    };
    FileController.prototype.delete_file_name = function (request, response) {
        logger.trace("begin /file/:name");
        wrapper.Guard(request, response, function (request, response) {
            var number = 26000;
            wrapper.Authenticate(request, response, number, function (user, response) {
                //    var conn = mongoose.createConnection("mongodb://" + config.dbaddress + "/" + config.db);
                var connection = "mongodb://" + config.dbuser + ":" + config.dbpassword + "@" + config.dbaddress + "/" + config.dbname;
                var conn = mongoose.createConnection(connection);
                if (conn) {
                    conn.once('open', function (error) {
                        if (!error) {
                            var gfs = Grid(conn.db, mongoose.mongo); //missing parameter
                            if (gfs) {
                                conn.db.collection('fs.files', function (error, collection) {
                                    if (!error) {
                                        if (collection) {
                                            collection.findOne({ filename: request.params.name }, function (error, item) {
                                                if (!error) {
                                                    if (item) {
                                                        collection.remove({ filename: request.params.name }, function () {
                                                            wrapper.SendResult(response, 0, "OK", {});
                                                            conn.db.close();
                                                            logger.trace("end /file/:name");
                                                        });
                                                    }
                                                    else {
                                                        conn.db.close();
                                                        wrapper.SendWarn(response, number + 1, "not found", {});
                                                    }
                                                }
                                                else {
                                                    conn.db.close();
                                                    wrapper.SendError(response, number + 100, error.message, error);
                                                }
                                            });
                                        }
                                        else {
                                            conn.db.close();
                                            wrapper.SendFatal(response, number + 30, "no collection", {});
                                        }
                                    }
                                    else {
                                        conn.db.close();
                                        wrapper.SendError(response, number + 100, error.message, error);
                                    }
                                });
                            }
                            else {
                                conn.db.close();
                                wrapper.SendFatal(response, number + 20, "gfs error", {});
                            }
                        }
                        else {
                            conn.db.close();
                            wrapper.SendError(response, number + 100, error.message, error);
                        }
                    });
                }
                else {
                    wrapper.SendError(response, number + 10, "connection error", {});
                }
            });
        });
    };
    FileController.prototype.get_file_query_query = function (request, response, next) {
        logger.trace("/file/query/:query");
        wrapper.Guard(request, response, function (request, response) {
            var number = 27000;
            wrapper.Authenticate(request, response, number, function (user, response) {
                var conn = mongoose.createConnection("mongodb://" + config.dbaddress + "/" + config.db);
                if (conn) {
                    conn.once('open', function (error) {
                        if (!error) {
                            var gfs = Grid(conn.db, mongoose.mongo); //missing parameter
                            if (gfs) {
                                conn.db.collection('fs.files', function (error, collection) {
                                    if (!error) {
                                        if (collection) {
                                            var query = JSON.parse(decodeURIComponent(request.params.query));
                                            collection.find(query).toArray(function (error, docs) {
                                                if (!error) {
                                                    conn.db.close();
                                                    logger.trace("end /file/query/:query");
                                                    wrapper.SendResult(response, 0, "OK", docs);
                                                }
                                                else {
                                                    conn.db.close();
                                                    wrapper.SendError(response, number + 100, error.message, error);
                                                }
                                            });
                                        }
                                        else {
                                            conn.db.close();
                                            wrapper.SendFatal(response, number + 30, "no collection", {});
                                        }
                                    }
                                    else {
                                        conn.db.close();
                                        wrapper.SendError(response, number + 100, error.message, error);
                                    }
                                });
                            }
                            else {
                                conn.db.close();
                                wrapper.SendFatal(response, number + 20, "gfs error", {});
                            }
                        }
                        else {
                            conn.db.close();
                            wrapper.SendError(response, number + 100, error.message, error);
                        }
                    });
                }
                else {
                    wrapper.SendError(response, number + 10, "connection error", {});
                }
            });
        });
    };
    return FileController;
})();
module.exports = FileController;
//# sourceMappingURL=file_controller.js.map