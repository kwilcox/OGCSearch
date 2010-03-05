var spinner = new Image();
spinner.src = 'img/spinner.gif';
var right0  = new Image();
right0.src  = 'img/right0.png';
var right1  = new Image();
right1.src  = 'img/right1.png';
var down0   = new Image();
down0.src   = 'img/down0.png';
var down1   = new Image();
down1.src   = 'img/down1.png';
var up1     = new Image();
up1.src     = 'img/up1.png';
var warn    = new Image();
warn.src    = 'img/warning.png';
var imgicon = new Image();
imgicon.src = 'img/imgicon.png';
var imgclr  = new Image();
imgclr.src  = 'img/clear.gif'
var map0    = new Image();
map0.src    = 'img/map0.png';
var map1    = new Image();
map1.src    = 'img/map1.png';

function decode(str) {
  return unescape(str.replace(/\+/g, " "));
}

function listHits(id) {
  document.getElementById('gcLink'+id).href = 'javascript:function foo() {return false;}';
  document.getElementById('gcImg'+id).src = down0.src;
  var div = document.getElementById("gcLink"+id).parentNode;
  ol = document.createElement('ol');
  for (var i = 0; i < hitsArr[id].length; i++) {
    li = document.createElement('li');
    a = document.createElement('a');
    a.href   = hitsArr[id][i];
    a.target = '_blank';
    txt = hitsArr[id][i];
    if (hitsArr[id][i].length > 20) {
      txt = hitsArr[id][i].substr(0,20)+'...';
    }
    a.innerHTML = txt;
    li.appendChild(a);
    a = document.createElement('a');
    a.href = "javascript:getLayers('" + hitsArr[id][i] + "');";
    a.id = 'layerListA' + i;
    img = document.createElement('img');
    img.id = 'layerListImg' + i;
    img.src = map1.src;
    img.title = 'Click to add this to the map.';
    img.alt   = 'Click to add this to the map.';
    img.style.border = 'none';
    a.appendChild(img);
    li.appendChild(a);
    ol.appendChild(li);
  }
  div.appendChild(ol);
}

var hitsArr = [];
function scanUrl(searcherID,uri) {
  // Create a YUI instance using io-base module.
  YUI().use("io-base", function(Y) {
    // Define a function to handle the response data.
    function complete(id, o, args) {
      var id         = id;             // Transaction ID.
      var data       = o.responseText; // Response data.
      var searcherID = args[0];
      var hits       = [];
      var m          = data.match(/href\s*=\s*"([^"]+(REQUEST=GetCapabilities|\.kml)[^"]*)"/ig);
      // see if the actual uri was a getcaps
      if (uri.search(/GetCapabilities|\.kml/ig) > 0) {
        if (m) {
          m.push('href="' + uri + '"');
        }
        else {
          m = Array('href="' + uri + '"');
        }
      }
      if (m) {
        for (var i = 0; i < m.length; i++) {
          // only pull out the meat of the href -- not sure why JS makes the href=" and final " tag along
          s = m[i].split('"')[1];
          // if this was a relative URL, put the address from the uri in front of it (not perfect)
          if (s.indexOf('http') < 0) {
            // get rid of any leading ..'s
            s = s.replace(/^\.\./,'');
            s = 'http://' + uri.split('/')[2] + s;
          }
          // get rid of junk
          s = s.replace(/&amp;/g,'&');
          hits.push(decode(s));
        }
        hitsArr[searcherID] = hits;
        document.getElementById('gcImg'+searcherID).src = down1.src;
        document.getElementById('gcImg'+searcherID).title = 'Click to show GetCapabilities links.';
        document.getElementById('gcImg'+searcherID).alt   = 'Click to show GetCapabilities links.';
        document.getElementById('gcLink'+searcherID).href = "javascript:listHits(" + searcherID + ");";
      }
      else {
        document.getElementById('gcImg'+searcherID).src = down0.src;
        document.getElementById('gcImg'+searcherID).title = 'No GetCapabilties links found.';
        document.getElementById('gcImg'+searcherID).alt   = 'No GetCapabilties links found.';
        document.getElementById('gcLink'+searcherID).href = 'javascript:function foo() {return false;}';
      }
    };

    // Subscribe to event "io:complete".
    Y.on('io:complete', complete, this, [searcherID]);

    // Make an HTTP request via a local cgi.
    var request = Y.io(proxyLoc+uri);
  });
}

function getLayers(uri) {
  if (uri.indexOf('.kml') >= 0) {
    addKMLToMap(uri,'User-added KML',true);
  }
  else {
    if (!winGetCaps.rendered || winGetCaps.hidden) {
      winGetCaps.show();
    }
    storeGetCaps.removeAll();
    storeGetCaps.proxy.conn.url = proxyLoc+escape(uri);
    storeGetCaps.load();
  }
}

google.load('search', '1.0');
function OnLoad() {
  new RawSearchControl();
}

/**
 * The RawSearchControl demonstrates how to use Searcher Objects
 * outside of the standard GSearchControl. This includes calling
 * searcher .execute() methods, reacting to search completions,
 * and if you had previously disabled html generation, how to generate
 * an html representation of the result.
 */
// make the form global, so we can launch it remotely
var searchForm;
function RawSearchControl() {
  // latch on to key portions of the document
  this.searcherform = document.getElementById("searcher");
  this.results = document.getElementById("results");
  this.cursor = document.getElementById("cursor");
  this.searchform = document.getElementById("searchform");

  // create map of searchers as well as note the active searcher
  this.activeSearcher = "web";
  this.searchers = new Array();

  // create and wire up an instance of GwebSearch and one of
  // GlocalSearch. Note, we disable html generation. We are doing
  // this so that we can demonstrate how to manually create it if
  // needed. Note that we register to handle search completion notifications
  // when searches complete, they are called in the context of this instance
  // of RawSearchControl and they are passed the searcher that just completed

  // wire up a raw GwebSearch searcher
  var searcher = new google.search.WebSearch();
  searcher.setNoHtmlGeneration();
  // searcher.setResultSetSize(google.search.Search.LARGE_RESULTSET);
  searcher.setSearchCompleteCallback(this,
                                     RawSearchControl.prototype.searchComplete,
                                     [searcher]
                                     );
  this.searchers["web"] = searcher;

  // now, create a search form and wire up a submit and clear handler
  this.searchForm = new google.search.SearchForm(true, this.searchform);
  searchForm = this.searchForm;
  this.searchForm.setOnSubmitCallback(this,
                                      RawSearchControl.prototype.onSubmit);
  this.searchForm.setOnClearCallback(this,
                                      RawSearchControl.prototype.onClear);
}

/**
 * onSubmit - called when the search form is "submitted" meaning that
 * someone pressed the search button or hit enter. The form is passed
 * as an argument
 */
RawSearchControl.prototype.onSubmit = function(form) {
  if (form.input.value) {
    // if the input starts w/ http then it's either a getcaps or a .kml
    if (form.input.value.indexOf('http') == 0) {
      getLayers(form.input.value);
    }
    else {
      // if there is an expression in the form, call the active searcher's
      // .execute method
      this.searchers[this.activeSearcher].execute(form.input.value + ' wms getcapabilities -filetype:pdf -filetype:doc -filetype:xls');
    }
  }

  // always indicate that we handled the submit event
  return false;
}

/**
 * onClear - called when someone clicks on the clear button (the little x)
 */
RawSearchControl.prototype.onClear = function(form) {
  this.clearResults();
}

/**
 * searchComplete - called when a search completed. Note the searcher
 * that is completing is passes as an arg because thats what we arranged
 * when we called setSearchCompleteCallback
 */
RawSearchControl.prototype.searchComplete = function(searcher) {

  // always clear old from the page
  this.clearResults();

  // if the searcher has results then process them
  if (searcher.results && searcher.results.length > 0) {
    // now manually generate the html that we disabled
    // initially and display it
    var div = createDiv("", "header");
    this.results.appendChild(div);
    for (var i=0; i<searcher.results.length; i++) {
      var result = searcher.results[i];
      searcher.createResultHtml(result);
      if (result.html) {
        // create new results div
        div    = result.html.cloneNode(true);
        div.id = 'googHit'+i;
        // create spinner for getCaps
        gcLink               = document.createElement('a');
        gcLink.id            = 'gcLink'+i;
        gcImage              = document.createElement('img');
        gcImage.src          = spinner.src;
        gcImage.id           = 'gcImg'+i;
        gcImage.style.border = 'none';
        gcLink.appendChild(gcImage);
        // add the link to the 1st child node of the google result
        div.firstChild.appendChild(gcLink);
        scanUrl(i,searcher.results[i].url);
      } else {
        div = createDiv("** failure to create html **");
      }
      this.results.appendChild(div);
    }

    // now, see if we have a cursor, and if so, create the
    // cursor control
    if (searcher.cursor) {
      var cursorNode = createDiv(null, "gsc-cursor");
      for (var i=0; i<searcher.cursor.pages.length; i++) {
        var className = "gsc-cursor-page";
        if (i == searcher.cursor.currentPageIndex) {
          className = className + " gsc-cursor-current-page";
        }
        var pageNode = createDiv(searcher.cursor.pages[i].label, className);
        pageNode.onclick = methodClosure(this, this.gotoPage,
                                         [searcher, i]);
        cursorNode.appendChild(pageNode);
      }
      this.cursor.appendChild(cursorNode);
    }
  }
  else {
    div = createDiv("The search produced no results.");
    this.results.appendChild(div);
  }
}

RawSearchControl.prototype.gotoPage = function(searcher, page) {
  searcher.gotoPage(page);
}

/**
 * clearResults - clear out any old search results
 */
RawSearchControl.prototype.clearResults = function() {
  removeChildren(this.results);
  removeChildren(this.cursor);
}

/**
 * Static DOM Helper Functions
 */
function removeChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}
function createDiv(opt_text, opt_className) {
  var el = document.createElement("div");
  if (opt_text) {
    el.innerHTML = opt_text;
  }
  if (opt_className) { el.className = opt_className; }
  return el;
}

function methodClosure(object, method, opt_argArray) {
  return function() {
    return method.apply(object, opt_argArray);
  }
}

function createLink(href, opt_text, opt_target, opt_className, opt_divwrap) {
  var el = document.createElement("a");
  el.href = href;
  if (opt_text) {
    el.innerHTML = opt_text;
  }
  if (opt_className) {
    el.className = opt_className;
  }
  if (opt_target) {
    el.target = opt_target;
  }
  if (opt_divwrap) {
    var div = this.createDiv(null, opt_className);
    div.appendChild(el);
    el = div;
  }
  return el;
}

// register to be called at OnLoad when the page loads
google.setOnLoadCallback(OnLoad, true);
