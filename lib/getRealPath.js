'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = getRealPath;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _resolve = require('resolve');

var _resolve2 = _interopRequireDefault(_resolve);

var _utils = require('./utils');

var _mapToRelative = require('./mapToRelative');

var _mapToRelative2 = _interopRequireDefault(_mapToRelative);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function findPathInRoots(sourcePath, rootDirs, cwd, extensions) {
  // Search the source path inside every custom root directory
  var resolvedSourceFile = void 0;
  rootDirs.some(function (dir) {
    try {
      // check if the file exists (will throw if not)
      resolvedSourceFile = _resolve2.default.sync('./' + sourcePath, {
        basedir: _path2.default.resolve(cwd, dir),
        extensions: extensions
      });
      return true;
    } catch (e) {
      return false;
    }
  });

  return resolvedSourceFile;
}

function getRealPathFromRootConfig(sourcePath, absCurrentFile, rootDirs, cwd, extensions) {
  var absFileInRoot = findPathInRoots(sourcePath, rootDirs, cwd, extensions);

  if (absFileInRoot) {
    var realSourceFileExtension = _path2.default.extname(absFileInRoot);
    var sourceFileExtension = _path2.default.extname(sourcePath);

    // map the source and keep its extension if the import/require had one
    var ext = realSourceFileExtension === sourceFileExtension ? realSourceFileExtension : '';
    return (0, _utils.toLocalPath)((0, _utils.toPosixPath)((0, _utils.replaceExtension)((0, _mapToRelative2.default)(cwd, absCurrentFile, absFileInRoot), ext)));
  }

  return null;
}

function getRealPathFromAliasConfig(sourcePath, absCurrentFile, alias, cwd) {
  var moduleSplit = sourcePath.split('/');

  var aliasPath = void 0;
  while (moduleSplit.length) {
    var m = moduleSplit.join('/');
    if ({}.hasOwnProperty.call(alias, m)) {
      aliasPath = alias[m];
      break;
    }
    moduleSplit.pop();
  }

  // no alias mapping found
  if (!aliasPath) {
    return null;
  }

  // remove legacy "npm:" prefix for npm packages
  aliasPath = aliasPath.replace(/^(npm:)/, '');
  var newPath = sourcePath.replace(moduleSplit.join('/'), aliasPath);

  // alias to npm module don't need relative mapping
  if (aliasPath[0] !== '.') {
    return newPath;
  }

  return (0, _utils.toLocalPath)((0, _utils.toPosixPath)((0, _mapToRelative2.default)(cwd, absCurrentFile, newPath)));
}

function getRealPathFromRegExpConfig(sourcePath, regExps) {
  var aliasedSourceFile = void 0;

  regExps.find(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        regExp = _ref2[0],
        substitute = _ref2[1];

    var execResult = regExp.exec(sourcePath);

    if (execResult === null) {
      return false;
    }

    aliasedSourceFile = substitute(execResult);
    return true;
  });

  return aliasedSourceFile;
}

function getRealPath(sourcePath, currentFile, opts) {
  if (sourcePath[0] === '.') {
    return sourcePath;
  }

  // file param is a relative path from the environment current working directory
  // (not from cwd param)
  var absCurrentFile = _path2.default.resolve(currentFile);

  var cwd = opts.cwd,
      extensions = opts.extensions,
      pluginOpts = opts.pluginOpts;

  var rootDirs = pluginOpts.root || [];
  var regExps = pluginOpts.regExps;
  var alias = pluginOpts.alias || {};

  var sourceFileFromAlias = getRealPathFromAliasConfig(sourcePath, absCurrentFile, alias, cwd);
  if (sourceFileFromAlias) {
    return sourceFileFromAlias;
  }

  var sourceFileFromRegExp = getRealPathFromRegExpConfig(sourcePath, regExps);
  if (sourceFileFromRegExp) {
    return sourceFileFromRegExp;
  }

  var sourceFileFromRoot = getRealPathFromRootConfig(sourcePath, absCurrentFile, rootDirs, cwd, extensions);
  if (sourceFileFromRoot) {
    return sourceFileFromRoot;
  }

  return sourcePath;
}