var
  request = require('request'),
  express = require('express'),
  app = express();

// Helper function to neaten headers so we can return them
function formatHeaders(sts, msg, hds) {
  var obj = Object.assign({
    [sts]: msg
  }, hds);

  return obj;
}

function fillCache(loc, ua) {
  request({
    url: loc,
    headers: {
      'User-Agent': ua
    },
    followRedirect: true
  });
}

app.get('/', function(req, res) {
  if (req.query['url'] === undefined || req.query['ua'] === undefined) {
    res.send('$.handleResponse(\'[-1]\');');
  } else {
    var
      // -1 = error connecting, 0 = connected no Varnish, 1 = connected with Varnish, 2 = connected with Varnish + caching
      vsh = -1,
      out = [],
      url = decodeURI(req.query['url']),
      loc = (/^https?/i.test(url)) ? url : 'http://' + url,
      ua = decodeURI(req.query['ua']),
      options = {
        // Add http if it wasn't included
        url: loc,
        headers: {
          'User-Agent': ua
        },
        followRedirect: function(response) {
          // Pushes each connection's headers so the user can inspect
          out.push(formatHeaders(response.statusCode, response.statusMessage, response.headers));

          // Update loc with new location to return
          loc = response.headers.location;

          return true;
        }
      };

    // Run once to allow Varnish to cache URL
    fillCache(loc, ua);

    // Wait 5 seconds then check again
    setTimeout(function() {
      request(options, function(error, response, html) {
        if (!error && response.statusCode == 200) {
          // We connected so set vsh to 0
          vsh = 0;

          // Look for 'x-varnish' or 'via: XXX varnish' in the headers
          if (response.headers.hasOwnProperty('x-varnish') || (response.headers.hasOwnProperty('via') && response.headers['via'].indexOf('varnish') > -1)) {
            vsh = 1;

            // Check that Varnish has set a cache hit
            if (response.headers['x-cache'] === 'HIT' || response.headers['age'] > 0) {
              vsh = 2;
            }
          }

          // Push final headers
          out.push(formatHeaders(response.statusCode, response.statusMessage, response.headers));
        }

        // Add final location to output
        out.unshift(loc);

        // Add vsh/error state to output
        out.unshift(vsh);

        // Convert to JSON
        out = encodeURIComponent(JSON.stringify(out));

        // Return response inside handleResponse function so it's invoked on load
        res.send('$.handleResponse(\'' + out + '\');');
      });
    }, 1000)
  }
});

// Start the server
app.listen('8080');
