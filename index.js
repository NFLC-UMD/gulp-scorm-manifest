'use strict';

var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var fs = require('fs');
var path = require('path');
var through = require('through2');
var xml2js = require('xml2js');
var xmlBuilder = new xml2js.Builder();
var _ = require('lodash');
var sample_manifest = require('./sample_manifest.json');

module.exports = function(options) {

  _.extend({
    version: '2004',
    courseId: 'CourseID',
    SCOtitle: 'SCO Title',
    moduleTitle: 'Module Title',
    launchPage: 'index.html',
    path: 'data',
    fileName: 'imsmanifest.xml'
  }, options);

  var firstFile;
  
  var fileName = options.fileName;

  console.log(sample_manifest);

  var xmlTokens = {
    scormType: 'adlcp:scormType',
    fileArr: {
      '$': {
        'identifier':  'resource_1',
        'type': 'webcontent',
        'href': (options.path ? options.path + "/" : "").replace(/\\/g, '/') + options.launchPage,
        'adlcp:scormType': 'sco'
      },
      file: []
    }
  };

  var addFile = function(file, lastmode, cb) {
    var fObj = {
      file: {
        '$': {
          'href':((options.path ? options.path + "/" : "") + file.relative).replace(/\\/g, '/')
        }
      }
    };
    xmlTokens.fileArr.file.push(fObj.file);
    return cb();
  };

  return through.obj(function(file, enc, cb) {

    if (file.isNull()) {
      return cb();
    }

    if (file.isStream()) {
      this.emit('error', new PluginError('gulp-scorm-manifest', 'Streaming not supported'));
    }


    if (!firstFile) {
      firstFile = file;
    }

    fs.stat(file.path, function(err, stats) {
      if (err || !stats || !stats.mtime) {

        if (err.code === 'ENOENT') {
          return cb();
        }
        err = err || 'No stats found for file: '+ file.path;
        this.emit('error', new PluginError('gulp-scorm-manifest', err));
        return cb();
      }

      return addFile(file, stats.mtime, cb);

    }.bind(this));

  },
  function (cb) {
    if (!firstFile) { return cb(); }

    var xmlObj = sample_manifest;
    xmlObj.manifest.resources = {
      'resource': xmlTokens.fileArr
    };
    var xmlDoc = xmlBuilder.buildObject(xmlObj);

    var manifestFile  = new gutil.File({
      cwd:firstFile.cwd,
      base: firstFile.base,
      path: path.join(firstFile.base, fileName),
      contents: new Buffer(xmlDoc)
    });

    this.push(manifestFile);
    gutil.log('Generated', gutil.colors.blue(fileName));

    return cb();
  });
};
