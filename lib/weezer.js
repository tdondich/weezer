var readJson = require('read-package-json');
var path = require('path');
var log = require('npmlog');
var crypto = require('crypto');
var fs = require('fs-extra');


var packageJson = null;

function prepDir(topDir, name) {
	var cacheDir = path.resolve(topDir, name);
	if(fs.existsSync(cacheDir)) {
		return cacheDir;
	}
	// Create the dir.
	fs.mkdirSync(cacheDir);
	return cacheDir;
}

function getHash(path, cb) {
	var algo = 'md5';
	var shasum = crypto.createHash(algo);
	var s = fs.ReadStream(path);
	s.on('data', function(d) { shasum.update(d); });
	s.on('end', function() {
		var d = shasum.digest('hex');
		return cb(null, d);
	});
}


function run(where, npm, cb) {
	var targetPath = path.resolve(where, "node_modules");
	if(fs.existsSync(targetPath)) {
		return cb(new Error("Weezer does not execute with existing node_modules directory."));
	}
	var jsonFile = path.resolve(where, "package.json");
	readJson(jsonFile, log.warn, false, function(er, data) {
		if(er) {
			return cb(er);
		}
		packageJson = data;
		// Create .weezer dir if it doesn't exist
		var cacheDir = prepDir(npm.cache, ".weezer");
		// Create package dir if it doesn't exist
		var packageCacheDir = prepDir(cacheDir, data.name);

		// Generate hash of package.json file
		getHash(jsonFile, function(err, hash) {
			// Check to determine if the hash exists.
			var moduleCachePath = path.resolve(packageCacheDir, hash);
			if(fs.existsSync(moduleCachePath)) {
				log.warn("weezer", "Using cached node_modules.");
				// Copy the dir to node_modules
				fs.copySync(moduleCachePath, targetPath);
				return cb(null);
			}
			return cb(new Error("Cached node_modules does not exist."));
		});
	});
}

function post(where, npm, cb) {
	var jsonFile = path.resolve(where, "package.json");
	readJson(jsonFile, log.warn, false, function(er, data) {
		if(er) {
			return cb(er);
		}
		packageJson = data;
		// Create .weezer dir if it doesn't exist
		var cacheDir = prepDir(npm.cache, ".weezer");
		// Create package dir if it doesn't exist
		var packageCacheDir = prepDir(cacheDir, data.name);

		// Generate hash of package.json file
		getHash(jsonFile, function(err, hash) {
			// Check to determine if the hash exists.
			var moduleCachePath = path.resolve(packageCacheDir, hash);
			if(!fs.exists(moduleCachePath)) {
				log.warn("weezer", "Saving node_modules to cache.");
				// Copy the current node_modules dir to the cache
				var sourcePath = path.resolve(where, "node_modules");
				fs.copySync(sourcePath, moduleCachePath);
				return cb(null);
			}
			return cb(new Error("Cached node_modules does not exist."));
		});
	});
}

var weezer = {
	run: run,
	post: post
}

module.exports = weezer;