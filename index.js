'use strict';

const glob = require('glob');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var fs = require('fs');
var path = require('path');
var through = require('through2');
var xml2js = require('xml2js');
var xmlBuilder = new xml2js.Builder();
var _ = require('lodash');

module.exports = function(options) {
  if(options.version === '2004'){
    var sample_manifest = require('./scorm_files/sample_manifest2004.json');

  } else {
    var sample_manifest = require('./scorm_files/sample_manifest.json');
  }

  _.extend({
    version: '2004 or 1.2', // default assumes 1.2
    courseId: 'CourseID',
    SCOtitle: 'SCO Title',
    moduleTitle: 'Module Title',
    launchPage: 'index.html',
    path: 'data',
    loMetadata: new Object(),
    fileName: 'imsmanifest.xml'
  }, options);

  var firstFile;
  
  var fileName = options.fileName;

  //console.log(sample_manifest);

  var xmlTokens = {
    scormType: options.version === '2004' ? 'adlcp:scormType': 'adlcp:scormtype',
    fileArr: {
      '$': {
        'identifier':  'resource_1',
        'type': 'webcontent',
        'href': (options.path ? options.path + "/" : "").replace(/\\/g, '/') + options.launchPage
      },
      file: []
    }
  };
  xmlTokens.fileArr.$[xmlTokens.scormType] = 'sco';

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

    // TODO this is where you would add the manifest information
    // Example: xmlObj.manifest.<path to property> = <approprate_data>
    var xmlObj = sample_manifest;
    xmlObj.manifest.resources = {
      'resource': xmlTokens.fileArr
    };
    try {
      xmlObj.manifest.$.identifier = options.courseId;
      xmlObj.manifest.metadata[0].lom[0].general[0].title[0].langstring[0]._ = options.loMetadata.title;      
      xmlObj.manifest.metadata[0].lom[0].general[0].catalogentry[0].entry[0].langstring[0]._ = options.courseId;
      xmlObj.manifest.metadata[0].lom[0].general[0].description[0].langstring[0]._ = options.loMetadata.product.description;
      xmlObj.manifest.metadata[0].lom[0].general[0].keyword[0].langstring[0]._ = options.loMetadata.title;
      xmlObj.manifest.metadata[0].lom[0].general[0].keyword[1].langstring[0]._ = options.loMetadata.language;
      xmlObj.manifest.metadata[0].lom[0].general[0].keyword[2].langstring[0]._ = options.loMetadata.product.name;
      xmlObj.manifest.metadata[0].lom[0].classification[0].keyword[1].langstring[0]._ = options.loMetadata.language;
      xmlObj.manifest.metadata[0].lom[0].classification[0].keyword[2].langstring[0]._ = options.loMetadata.product.name;
      xmlObj.manifest.metadata[0].lom[0].general[0]["c2lmd:c2lextensionmd"][0]["c2lmd:lotype"] = options.loMetadata.product.name;
      xmlObj.manifest.metadata[0].lom[0].general[0]["c2lmd:c2lextensionmd"][0]["c2lmd:modality"] = options.loMetadata.modality;
      xmlObj.manifest.metadata[0].lom[0].general[0]["c2lmd:c2lextensionmd"][0]["c2lmd:proflevel"] = options.loMetadata.level;
      xmlObj.manifest.metadata[0].lom[0].general[0]["c2lmd:c2lextensionmd"][0]["c2lmd:language"] = options.loMetadata.language;
      xmlObj.manifest.metadata[0].lom[0].general[0]["c2lmd:c2lextensionmd"][0]["c2lmd:topic"] = options.loMetadata.topic;
      xmlObj.manifest.metadata[0].lom[0].lifecycle[0].contribute[0].date[0].datetime[0] = options.loMetadata.dateInspected;
      xmlObj.manifest.metadata[0].lom[0].educational[0].learningresourcetype[0].value[0].langstring[0]._ = options.loMetadata.product.learningresourcetype;
      xmlObj.manifest.metadata[0].lom[0].rights[0].description[0].langstring[0]._ = options.loMetadata.contract;
      xmlObj.manifest.organizations[0].organization[0].title = [options.loMetadata.title];
      xmlObj.manifest.organizations[0].organization[0].item[0].title = [options.loMetadata.title];
    }
    catch(e){
      this.emit('error', new PluginError('gulp-scorm-manifest', "Error stack: "+e.stack));
    }
    var xmlDoc = xmlBuilder.buildObject(xmlObj);
   
    // manifest file   
    this.push(createFile(new Buffer(xmlDoc), fileName, firstFile.cwd, firstFile.base));
    gutil.log('Generated', gutil.colors.blue(fileName));
    
    return cb();
  });
};

function createFile(buffer, fileName, cwd, base) {
    return new gutil.File({
      cwd:  cwd,
      base: base,
      path: path.join(base, fileName),
      contents: buffer
    });
}
