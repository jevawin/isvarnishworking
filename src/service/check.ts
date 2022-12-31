// Helper function to neaten headers so we can return them
const formatHeaders = (sts: number, msg: string, hds: object) => {
  return Object.assign({ [sts]: msg }, hds);
}

const varnishCheck = async (checkurl: string, checkua: string) => {
  if (!checkurl || !checkua) {
    return "$.handleResponse('[-1]');";
  } else {
    // -1 = error connecting, 0 = connected no Varnish, 1 = connected with Varnish, 2 = connected with Varnish + caching
    let vsh: number = -1;
    let out: Array<string | number | object> = [];
    let url: string = decodeURI(checkurl);
    let loc: string = /^https?/i.test(url) ? url : "https://" + url;
    let ua: string = decodeURI(checkua);
    let options = {
      headers: {
        "User-Agent": ua,
      },
    };

    // Run once to allow Varnish to cache URL
    const presponse = await fetch(loc, options);

    // TODO use final url
    const response = await fetch(presponse.url, options);
    const headers = Object.fromEntries(response.headers.entries());

    if (response.ok && response.status === 200) {
      // We connected so set vsh to 0
      vsh = 0;

      // Look for 'x-varnish' or 'via: XXX varnish' in the headers
      if (headers.hasOwnProperty("x-varnish")) vsh = 1;
      if (headers.hasOwnProperty("via")) {
        const via: string = headers.via || "";
        if (via.indexOf("varnish") > -1) vsh = 1;
      }

      // Varnish is running, now check it's caching
      const age: number = Number(headers.age) || 0;
      if (vsh === 1 && age > 0) vsh = 2;

      // Push final headers
      out.push(formatHeaders(response.status, response.statusText, headers));
      // out.push({ [response.status]: response.headers.toString() });
    }

    // Add final location to output
    out.unshift(loc);

    // Add vsh/error state to output
    out.unshift(vsh);

    // Convert to JSON
    let outJSON: string = encodeURIComponent(JSON.stringify(out));

    // Return response inside handleResponse function so it's invoked on load
    return `$.handleResponse('${outJSON}');`;
  }
}

export default varnishCheck;
