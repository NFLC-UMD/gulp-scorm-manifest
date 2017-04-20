var gulp = require('gulp');
var xml2js = require('gulp-xml2js');
var manifest = require('./index');

gulp.task('manifest', function () {
    var contentJson = require('./sample_data/data/1/content.json');
    gulp.src('sample_data/**')
        .pipe(manifest({
            version: '1.2',
            courseId: 'Test101',
            SCOtitle: 'AngularJS test',
            moduleTitle: 'AngularJS Test module',
            launchPage: 'index.html',
            path: '',
            content: contentJson,
            fileName: 'imsmanifest.xml'
        }))
        .pipe(gulp.dest('output/'));
});

gulp.task('xml2js', function () {
  gulp.src('./sample_manifest.xml')
    .pipe(xml2js())
    .pipe(gulp.dest('./'));
});
