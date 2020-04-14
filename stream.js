'use strict';


var ProbeError  = require('./lib/common').ProbeError;
var parsers     = require('./lib/parsers_stream');
var PassThrough = require('stream').PassThrough;


module.exports = function probeStream(stream) {
  var proxy = new PassThrough();
  var cnt = 0; // count of working parsers

  var result = new Promise(function (resolve, reject) {
    stream.on('error', reject);
    proxy.on('error', reject);
    console.log("Parsing from Stream");

    function nope(err) { console.log(err) }

    function parserEnd() {
      proxy.unpipe(this);
      this.removeAllListeners();
      cnt--;
      // if all parsers finished without success -> fail.
      if (!cnt) reject(new ProbeError('unrecognized file format', 'ECONTENT'));
    }

    Object.keys(parsers).forEach(function (type) {
      var pStream = parsers[type]();

      cnt++;

      pStream.once('data', resolve);
      pStream.once('end', parserEnd);
      // silently ignore errors because user does not need to know
      // that something wrong is happening here
      pStream.on('error', nope);

      proxy.pipe(pStream);
    });
  });

  function cleanup() {
    // request stream doesn't have unpipe, https://github.com/request/request/issues/874
    if (typeof stream.unpipe === 'function') stream.unpipe(proxy);
    proxy.end();
  }

  result.then(cleanup).catch(cleanup);

  stream.pipe(proxy);

  return result;
};


module.exports.parsers = parsers;
