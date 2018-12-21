'use strict'

var gulp = require('gulp');
var browserSync = require('browser-sync').create();
var sass = require('gulp-sass');
var rename = require('gulp-rename');
var del = require('del');
var runSequence = require('run-sequence');
var replace = require('gulp-replace');
var inject = require('gulp-inject');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var merge = require('merge-stream');
var pug = require('gulp-pug');

var mainBowerFiles = require('main-bower-files');
var uglify = require('gulp-uglify');


gulp.paths = {
    dist: 'dist',
};

var paths = gulp.paths;



// Static Server + watching scss/html files
gulp.task('serve', ['sass'],  function () {

    browserSync.init({
        port: 3000,
        server: "./",
        ghostMode: false,
        notify: false
    });

    gulp.watch('scss/**/*.scss', ['sass']);
    gulp.watch('pug/views/*', ['htmlViews']).on('change', browserSync.reload);
    gulp.watch('pug/pages/*', ['htmlPages']).on('change', browserSync.reload);
    gulp.watch('html/**/*').on('change', browserSync.reload);
    gulp.watch('js/**/*.js').on('change', browserSync.reload);

});



// Static Server without watching scss files
gulp.task('serve:dist', function () {

    browserSync.init({
        server: "./dist/",
        ghostMode: false,
        notify: false
    });

});



gulp.task('sass', function () {
    return gulp.src('./scss/style.scss')
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest('./css'))
        .pipe(browserSync.stream());
});



gulp.task('sass:watch', function () {
    gulp.watch('./scss/**/*.scss');
});

gulp.task('htmlViews', function () {
    return gulp.src(['./pug/views/**/*.pug'])
        .pipe(pug({pretty: true, basedir: __dirname + '/pug/layout/'}))
        .pipe(gulp.dest('./'));
});



gulp.task('pug:watch', function () {
    gulp.watch('./pug/**/*.pug', ['html']);
});


/*sequence for injecting partials and replacing paths*/
gulp.task('inject', function () {
    runSequence('injectAssets', 'replacePath');
});




/* inject Js and CCS assets into HTML */
gulp.task('injectAssets', function () {
    return gulp.src('./**/*.html')
        .pipe(inject(gulp.src([
            './vendors/iconfonts/mdi/css/materialdesignicons.min.css',
            './vendors/css/vendor.bundle.base.css',
            './vendors/css/vendor.bundle.addons.css',
            './vendors/js/vendor.bundle.base.js',
            './vendors/js/vendor.bundle.addons.js'
        ], {
            read: false
        }), {
            name: 'plugins',
            relative: true
        }))
        .pipe(inject(gulp.src([
            './css/*.css',
            './js/off-canvas.js',
            './js/misc.js',
        ], {
            read: false
        }), {
            relative: true
        }))
        .pipe(gulp.dest('.'));
});



/*replace image path and linking after injection*/
gulp.task('replacePath', function () {
    gulp.src('pages/*/*.html', {
            base: "./"
        })
        .pipe(replace('src="img/', 'src="../../img/'))
        .pipe(replace('href="pages/', 'href="../../pages/'))
        .pipe(replace('href="index.html"', 'href="../../index.html"'))
        .pipe(gulp.dest('.'));
    gulp.src('pages/*.html', {
            base: "./"
        })
        .pipe(replace('src="img/', 'src="../img/'))
        .pipe(replace('"pages/', '"../pages/'))
        .pipe(replace('href="index.html"', 'href="../index.html"'))
        .pipe(gulp.dest('.'));
});

/*sequence for building vendor scripts and styles*/
gulp.task('bundleVendors', function () {
    runSequence('copyRecursiveVendorFiles', 'buildBaseVendorStyles', 'buildBaseVendorScripts', 'buildOptionalVendorScripts');
});

/* Copy whole folder of some specific node modules that are calling other files internally */
gulp.task('copyRecursiveVendorFiles', function () {
    var mdi = gulp.src(['./node_modules/mdi/**/*'])
        .pipe(gulp.dest('./vendors/iconfonts/mdi'));
    var fontawesome = gulp.src(['./node_modules/font-awesome/**/*'])
        .pipe(gulp.dest('./vendors/iconfonts/font-awesome'));
    return merge(
        mdi,
        fontawesome
    );
});

/*Building vendor scripts needed for basic template rendering*/
gulp.task('buildBaseVendorScripts', function () {
    return gulp.src([
            './node_modules/jquery/dist/jquery.min.js',
            './node_modules/popper.js/dist/umd/popper.min.js',
            './node_modules/bootstrap/dist/js/bootstrap.min.js'
        ])
        .pipe(concat('vendor.bundle.base.js'))
        .pipe(gulp.dest('./vendors/js'));
});

/*Building vendor styles needed for basic template rendering*/
gulp.task('buildBaseVendorStyles', function () {
    return gulp.src(['./node_modules/perfect-scrollbar/css/perfect-scrollbar.css'])
        .pipe(concat('vendor.bundle.base.css'))
        .pipe(gulp.dest('./vendors/css'));
});

/*Building optional vendor scripts for addons*/
gulp.task('buildOptionalVendorScripts', function () {
    return gulp.src([
            'node_modules/chart.js/dist/Chart.min.js'
        ])
        .pipe(concat('vendor.bundle.addons.js'))
        .pipe(gulp.dest('./vendors/js'));
});


gulp.task('clean:dist', function () {
    return del(paths.dist);
});



gulp.task('copy:bower', function () {
    return gulp.src(mainBowerFiles(['**/*.js', '!**/*.min.js']))
        .pipe(gulp.dest(paths.dist+'/js/libs'))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(paths.dist+'/js/libs'));
});



gulp.task('copy:css', function() {
   gulp.src('./css/**/*')
   .pipe(gulp.dest(paths.dist+'/css'));
});



gulp.task('copy:img', function() {
   return gulp.src('./img/**/*')
   .pipe(gulp.dest(paths.dist+'/img'));
});



gulp.task('copy:fonts', function() {
   return gulp.src('./fonts/**/*')
   .pipe(gulp.dest(paths.dist+'/fonts'));
});



gulp.task('copy:js', function() {
   return gulp.src('./js/**/*')
   .pipe(gulp.dest(paths.dist+'/js'));
});



gulp.task('copy:html', function() {
   return gulp.src('./**/*.html')
   .pipe(gulp.dest(paths.dist+'/'));
});

gulp.task('replace:bower', function(){
    return gulp.src([
        './dist/*.html',
        './dist/**/*.js',
    ], {base: './'})
    .pipe(replace(/bower_components+.+(\/[a-z0-9][^/]*\.[a-z0-9]+(\'|\"))/ig, 'js/libs$1'))
    .pipe(gulp.dest('./'));
});


gulp.task('build:dist', function(callback) {
    runSequence('clean:dist',  'copy:css', 'copy:img', 'copy:fonts', 'copy:js', 'copy:html',  callback);
});

gulp.task('default', ['serve']);