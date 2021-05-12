// TODO: Implement module
const { src, dest, series, parallel, watch } = require('gulp')
const del = require('del')
const browserSync = require('browser-sync')
const bs = browserSync.create()
const cwd = process.cwd()

let config = {
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**',
    }
  }
}

try {
  const loadConfig = require(`${cwd}/pages.conf.js`)
  console.log('===>', loadConfig);
  
  config = Object.assign({}, config, loadConfig)
} catch (e) {

}

// gulp插件管理工具
const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()
// const plugins.sass = require('gulp-sass')
// const plugins.babel = require('gulp-babel')
// const plugins.swig = require('gulp-swig') //html模板
// const plugins.imagemin = require('gulp-imagemin')

const clean = () => {
  return del([config.build.dist, config.build.temp]) // 返回一个promise
}

const style = () => {
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src})
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

// 注意: @babel/core   @babel/preset-env
const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const page = () => {
  return src(config.build.paths.pages, { base: config.build.src , cwd: config.build.src })
    .pipe(plugins.swig({ data: config.build.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能更新
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src})
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public })
    .pipe(dest(config.build.dist))
}

const serve = () => {
  watch(config.build.paths.styles, { cwd: config.build.src}, style)
  watch(config.build.paths.scripts, { cwd: config.build.src}, script)
  watch(config.build.paths.pages, { cwd: config.build.src}, page)
  watch([
    config.build.paths.images,
    config.build.paths.fonts,
  ], { cwd: config.build.src}, bs.reload)
  watch(['**'], { cwd: config.build.public }, bs.reload)

  bs.init({
    notify: false,
    port: 8090,
    // open: true,
    // files: 'dist/**',
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

// <!-- build:css assets/styles/vendor.css -->
// <link rel="stylesheet" href="/node_modules/bootstrap/dist/css/bootstrap.css">
// <!-- endbuild -->
// <!-- build:css assets/styles/main.css -->
// <link rel="stylesheet" href="assets/styles/main.css">
// <!-- endbuild -->

const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp})
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest(config.build.dist))
}

const compile = parallel(style, script, page)

// 上线之前的任务
const build = series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )
)

// 开发任务
const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop
}
