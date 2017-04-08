'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultExtensions = undefined;
exports.mapModule = mapModule;
exports.manipulatePluginOptions = manipulatePluginOptions;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _findBabelConfig = require('find-babel-config');

var _findBabelConfig2 = _interopRequireDefault(_findBabelConfig);

var _getRealPath = require('./getRealPath');

var _getRealPath2 = _interopRequireDefault(_getRealPath);

var _import = require('./transformers/import');

var _import2 = _interopRequireDefault(_import);

var _systemImport = require('./transformers/systemImport');

var _systemImport2 = _interopRequireDefault(_systemImport);

var _jest = require('./transformers/jest');

var _jest2 = _interopRequireDefault(_jest);

var _require = require('./transformers/require');

var _require2 = _interopRequireDefault(_require);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultBabelExtensions = ['.js', '.jsx', '.es', '.es6'];
var defaultExtensions = exports.defaultExtensions = defaultBabelExtensions;

function mapModule(sourcePath, currentFile, pluginOpts, cwd) {
  return (0, _getRealPath2.default)(sourcePath, currentFile, {
    cwd: cwd,
    pluginOpts: pluginOpts,
    extensions: pluginOpts.extensions || defaultExtensions
  });
}

function isRegExp(string) {
  return string.startsWith('^') || string.endsWith('$');
}

// The working directory of Atom is the project,
// while Sublime sets the working project to the directory in which the current opened file is
// So we need to offer a way to customize the cwd for the eslint plugin
function manipulatePluginOptions(pluginOpts) {
  var cwd = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : process.cwd();

  if (pluginOpts.root) {
    if (typeof pluginOpts.root === 'string') {
      pluginOpts.root = [pluginOpts.root]; // eslint-disable-line no-param-reassign
    }
    // eslint-disable-next-line no-param-reassign
    pluginOpts.root = pluginOpts.root.reduce(function (resolvedDirs, dirPath) {
      if (_glob2.default.hasMagic(dirPath)) {
        return resolvedDirs.concat(_glob2.default.sync(dirPath, { cwd: cwd }).filter(function (p) {
          return _fs2.default.lstatSync(p).isDirectory();
        }));
      }
      return resolvedDirs.concat(dirPath);
    }, []);
  }

  // eslint-disable-next-line no-param-reassign
  pluginOpts.regExps = [];

  if (pluginOpts.alias) {
    Object.keys(pluginOpts.alias).filter(isRegExp).forEach(function (key) {
      var parts = pluginOpts.alias[key].split('\\\\');

      function substitute(execResult) {
        return parts.map(function (part) {
          return part.replace(/\\\d+/g, function (number) {
            return execResult[number.slice(1)] || '';
          });
        }).join('\\');
      }

      pluginOpts.regExps.push([new RegExp(key), substitute]);

      // eslint-disable-next-line no-param-reassign
      delete pluginOpts.alias[key];
    });
  }

  return pluginOpts;
}

exports.default = function (_ref) {
  var t = _ref.types;

  var importVisitors = {
    CallExpression: function CallExpression(nodePath, state) {
      (0, _require2.default)(t, nodePath, mapModule, state, this.moduleResolverCWD);
      (0, _jest2.default)(t, nodePath, mapModule, state, this.moduleResolverCWD);
      (0, _systemImport2.default)(t, nodePath, mapModule, state, this.moduleResolverCWD);
    },
    ImportDeclaration: function ImportDeclaration(nodePath, state) {
      (0, _import2.default)(t, nodePath, mapModule, state, this.moduleResolverCWD);
    },
    ExportDeclaration: function ExportDeclaration(nodePath, state) {
      (0, _import2.default)(t, nodePath, mapModule, state, this.moduleResolverCWD);
    }
  };

  return {
    pre: function pre(file) {
      manipulatePluginOptions(this.opts);

      var customCWD = this.opts.cwd;

      if (customCWD === 'babelrc') {
        var startPath = file.opts.filename === 'unknown' ? './' : file.opts.filename;

        var _findBabelConfig$sync = _findBabelConfig2.default.sync(startPath),
            babelFile = _findBabelConfig$sync.file;

        customCWD = babelFile ? _path2.default.dirname(babelFile) : null;
      }

      this.moduleResolverCWD = customCWD || process.cwd();
    },


    visitor: {
      Program: {
        exit: function exit(programPath, state) {
          programPath.traverse(importVisitors, state);
        }
      }
    }
  };
};