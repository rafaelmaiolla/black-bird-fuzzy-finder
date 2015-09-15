"use babel";

import async from 'async';
// fs = require 'fs'
// path = require 'path'
import _ from 'underscore-plus';
import {GitRepository} from 'atom';
import {Minimatch} from 'minimatch';

var PATH_CHUNK_SIZE = 100;

var emittedPaths = new Set();

var directoryProviderList = [];

class PathLoader {
  constructor(rootPath, ignoreVcsIgnores, traverseSymlinkDirectories, ignoredNames) {
    this.rootPath = rootPath;
    this.traverseSymlinkDirectories = traverseSymlinkDirectories;
    this.ignoredNames = ignoredNames;

    this.paths = [];
    this.realPathCache = {};

    atom.packages.serviceHub.consume('atom.directory-provider', '^0.1.0', (() => {
      return function(provider) {
        return _this.directoryProviders.unshift(provider);
      };
    })(this));

  }

  load(done) {
    this.loadPath(this.rootPath, () => {
      this.flushPaths();
      this.done();
    }
  }

  isIgnored(loadedPath) {
    var relativePath = path.relative(this.rootPath, loadedPath);

    var match = false;

    for (index in this.ignoredNames) {
      if (this.ignoredNames[index].match(relativePath)) {
        return true;
      }
    }
  }

  pathLoaded(loadedPath, done) {
    if (!this.isIgnored(loadedPath) && !emittedPaths.has(loadedPath)) {
      this.paths.push(loadedPath);
      this.emittedPaths.add(loadedPath);
    }

    if (this.paths.length === PATH_CHUNK_SIZE) {
      this.flushPaths();
    }

    done();
  }

  flushPaths() {
    emit('load-paths:paths-found', this.paths);
    this.paths = [];
  }

  loadPath(pathToLoad, done) {
    if (this.isIgnored(pathToLoad)) {
      return done();
    }

    var directory = _.find(directoryProviderList, (provider) => {
      return typeof provider.directoryForURISync === "function" ? provider.directoryForURISync(projectPath) : null;
    });

    if (directory) {
      directory.getEntriesSync().forEach((entry) => {
        if (entry.isFile()) {
          this.pathLoaded(pathToLoad, done);

        } else if (entry.isDirectory()) {
          this.loadPath(entry.getPath())
        }
      });

    } else {
      done();
    }
  }

  static addProvider(provider) {
    directoryProviderList.push(provider)
  }

  static pathLoader(rootPaths, followSymlinks, ignoreVcsIgnores, ignores=[]) {
    var ignoredNames = [];

    ignores.forEach((entry) => {
      if (entry) {
        try {
          ignoredNames.push(new Minimatch(ignore, matchBase: true, dot: true));
        } catch (e) {
          console.warn(`Error parsing ignore pattern (${ignore}): ${error.message}`);
        }
      }
    });

    async.each(
      rootPaths,
      (rootPath, next) => {
        new PathLoader(
          rootPath,
          ignoreVcsIgnores,
          followSymlinks,
          ignoredNames
        ).load(next);
      },
      this.async()
    )
  }
}

export default PathLoader.pathLoader;
export {PathLoader};
