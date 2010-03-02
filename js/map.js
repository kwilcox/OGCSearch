var map;
var mapPanel;
var storeGetCapsPre,storeGetCaps;
var winGetCaps;
var layerPanel;
var tabPanel;
var layerTree;
var viewport;
var maxBBOX = new Array();
var prevProjection;
var prevZoom = new Array();
var timeSlider,timePanel;
var t0 = new Date();
t0 = t0.clearTime();

// Earth
var GoogleEarthPanel;
google.load("earth", "1");

function setTimePanelPos() {
  mapPanelPos = mapPanel.getPosition();
  tabPanelX   = tabPanel.getPosition()[0];
  timePanel.setPagePosition(tabPanelX - timePanel.getSize().width - 6,mapPanelPos[1] + 1);
}

function createPopup(feature,selectCtrl,layerKML,t) {
  popup = new GeoExt.Popup({
     feature     : feature
    ,width       : 300
    ,html        : feature.attributes['description']
    ,title       : t
    ,collapsible : true
  });
  // unselect feature when the popup is closed
  popup.on({
    close : function() {
      if(OpenLayers.Util.indexOf(layerKML.selectedFeatures,this.feature) > -1) {
        selectCtrl.unselect(this.feature);
      }
    }
  });
  popup.show();
}

function addKMLToMap(u,category,visibility) {
  if (layerPanel.collapsed) {
    layerPanel.expand();
  }
  
  var purl = proxyLoc ? proxyLoc + escape(u) : u;
  
  var proxyKML = new GeoExt.data.ProtocolProxy({
    protocol : new OpenLayers.Protocol.HTTP({
       url    : purl
      ,format : new OpenLayers.Format.KML()
    })
  });
  // get KML filename to use as layer name
  var p = u.split('/');
  var layerKML = new OpenLayers.Layer.Vector(p[p.length-1]);
  var storeKML = new GeoExt.data.FeatureStore({
     layer : layerKML
    ,proxy : proxyKML
    ,fields: [
        {name : 'title'      , type : 'string'},
        {name : 'description', type : 'string'}
    ]
    ,autoLoad : true
  });
  storeKML.on('loadexception',function() {
    if (storeKML.getCount() == 0) {
      Ext.Msg.alert('KML alert','There was a problem processing the KML.');
    }
  });
  storeKML.on('load',function() {
    if (storeKML.getCount() == 0) {
      Ext.Msg.alert('KML alert','There was a problem processing the KML.');
    }
  });

  // create select feature control
  var selectCtrl = new OpenLayers.Control.SelectFeature(layerKML);
  // create popup on "featureselected"
  layerKML.events.on({
    featureselected : function(e) {
      createPopup(e.feature,selectCtrl,layerKML,p[p.length-1]);
    }
  });
  if (visibility) {
    var myMask = new Ext.LoadMask(Ext.getBody(), {msg:"Loading KML...",store:storeKML});
    myMask.show();
  }

  // add it to the map
  layerKML.visibility = visibility;
  map.addLayer(layerKML);
  map.addControl(selectCtrl);
  selectCtrl.activate();

  // add the layer to the list
  var layerNode = new Ext.data.Node({
    id : p[p.length-1]
  });
  layerNode.layer = layerKML;
  kmlNode = layerPanel.getRootNode().findChild('text',category);
  kmlNode.appendChild(layerNode);
}

Ext.onReady(function() {
  Ext.QuickTips.init();

  var layerBlueMarble900913 = new OpenLayers.Layer.WMS(
     "900913 Blue Marble"
    ,'http://asascience.mine.nu:8080/geoserver/gwc/service/wms?&TILED=YES'
    ,{
      layers : 'base:BlueMarble'
    }
    ,{
       isBaseLayer   : true
      ,projection    : new OpenLayers.Projection("EPSG:900913")
      ,maxResolution : 156543.0339
      ,maxExtent     : new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34)
      ,visibility    : false
    }
  );

  var layerBlueMarble4326 = new OpenLayers.Layer.WMS(
     "4326 Blue Marble"
    ,'http://asascience.mine.nu:8080/geoserver/gwc/service/wms?&TILED=YES'
    ,{
      layers : 'base:BlueMarble'
    }
    ,{
       isBaseLayer   : true
      ,projection    : new OpenLayers.Projection("EPSG:4326")
      ,maxResolution : 1.40625
      ,maxExtent     : new OpenLayers.Bounds(-180,-90,180,90)
      ,visibility    : false
    }
  );

  var layerOpenStreetMap900913 = new OpenLayers.Layer.WMS(
     "900913 OpenStreetMap"
    ,"http://maps.opengeo.org/geowebcache/service/wms"
    ,{
       layers  : 'openstreetmap'
      ,bgcolor : '#A1BDC4'
    }
    ,{
       isBaseLayer   : true
      ,projection    : new OpenLayers.Projection("EPSG:900913")
      ,maxResolution : 156543.0339
      ,maxExtent     : new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34)
      ,visibility    : false
    }
  );

  var layerOpenStreetMap4326 = new OpenLayers.Layer.WMS(
     "4326 OpenStreetMap"
    ,"http://maps.opengeo.org/geowebcache/service/wms"
    ,{
       layers  : 'openstreetmap'
      ,bgcolor : '#A1BDC4'
    }
    ,{
       isBaseLayer   : true
      ,projection    : new OpenLayers.Projection("EPSG:4326")
      ,maxResolution : 1.40625
      ,maxExtent     : new OpenLayers.Bounds(-180,-90,180,90)
      ,visibility    : false
    }
  );

  var layerGooglePhysical = new OpenLayers.Layer.Google(
     '900913 Google Physical'
    ,{'sphericalMercator': true,type: G_PHYSICAL_MAP}
  );
  var layerGoogleSatellite = new OpenLayers.Layer.Google(
     '900913 Google Satellite'
    ,{'sphericalMercator': true,type: G_SATELLITE_MAP}
  );
  var layerGoogleHybrid = new OpenLayers.Layer.Google(
     '900913 Google Hybrid'
    ,{'sphericalMercator': true,type: G_HYBRID_MAP}
  );

  map = new OpenLayers.Map('',{
    controls : [
       new OpenLayers.Control.Navigation()
      ,new OpenLayers.Control.PanZoomBar()
      ,new OpenLayers.Control.MousePosition()
      // ,new OpenLayers.Control.KeyboardDefaults()
    ]
    ,projection        : new OpenLayers.Projection("EPSG:900913")
    ,units             : 'm'
    ,displayProjection : new OpenLayers.Projection("EPSG:4326")
    ,maxResolution     : 156543.0339
    ,maxExtent         : new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34)
  });
  map.addControl(new OpenLayers.Control.LoadingPanel());

  var actions = {};

  var ctrl = new OpenLayers.Control.NavigationHistory();
  map.addControl(ctrl);
  action = new GeoExt.Action({
     control  : ctrl.previous
    ,disabled : true
    ,iconCls  : 'buttonIcon'
    ,tooltip  : 'Return to previous map state'
    ,text     : 'Map previous'
    ,icon     : 'img/undo.png'
  });
  actions["previous"] = action;

  action = new GeoExt.Action({
     control  : ctrl.next
    ,disabled : true
    ,iconCls  : 'buttonIcon'
    ,tooltip  : 'Advance to next map state'
    ,text     : 'Map next'
    ,icon     : 'img/redo.png'
  });
  actions["next"] = action;

  map.events.register('zoomend',this,function() {
    prevZoom.push(map.getZoom());
  });

  map.events.register('changebaselayer',this,function() {
    if (prevProjection) {
      if (prevProjection != map.getProjection()) {
        var prevState = ctrl.previousStack[1];
        map.setCenter(prevState.center.transform(prevProjection,map.getProjectionObject()),prevZoom[prevZoom.length-2]);
      }
    }
    prevProjection = map.getProjectionObject();
  });

  action = new GeoExt.Action({
     control     : new OpenLayers.Control.DragPan()
    ,map         : map
    ,toggleGroup : 'navigation'
    ,iconCls     : 'buttonIcon'
    ,tooltip     : 'Pan'
    ,text        : 'Pan'
    ,icon        : 'img/drag.gif'
    ,pressed     : true
    ,handler     : function() {
      Ext.getCmp('mappanel').body.setStyle('cursor','move');
    }
  });
  actions["pan"] = action;

  action = new GeoExt.Action({
     control     : new OpenLayers.Control.ZoomToMaxExtent()
    ,map         : map
    ,iconCls     : 'buttonIcon'
    ,tooltip     : 'Zoom out to full extents'
    ,text        : 'Zoom-out full'
    ,icon        : 'img/globe.png'
  });
  actions["zoom_extents"] = action;

  action = new GeoExt.Action({
     control     : new OpenLayers.Control.ZoomBox()
    ,map         : map
    ,toggleGroup : 'navigation'
    ,iconCls     : 'buttonIcon'
    ,tooltip     : 'Zoom-in by creating a rubberband box'
    ,text        : 'Zoom-in box'
    ,icon        : 'img/zoom_in.png'
    ,handler     : function() {
      if (navigator.appName == "Microsoft Internet Explorer") {
        Ext.getCmp('mappanel').body.applyStyles('cursor:url("img/zoom_in.cur")');
      }
      else {
        Ext.getCmp('mappanel').body.applyStyles('cursor:crosshair');
      }
    }
  });
  actions["zoom_in"] = action;

  action = new GeoExt.Action({
     control     : new OpenLayers.Control.ZoomBox(Ext.apply({out: true}))
    ,map         : map
    ,toggleGroup : 'navigation'
    ,iconCls     : 'buttonIcon'
    ,tooltip     : 'Zoom-out by creating a rubberband box'
    ,text        : 'Zoom-out box'
    ,icon        : 'img/zoom_out.png'
    ,handler     : function() {
      if (navigator.appName == "Microsoft Internet Explorer") {
        Ext.getCmp('mappanel').body.applyStyles('cursor:url("img/zoom_out.cur")');
      }
      else {
        Ext.getCmp('mappanel').body.applyStyles('cursor:crosshair');
      }
    }
  });
  actions["zoom_out"] = action;

  var winHelp = new Ext.Window({
     id          : 'extHelp'
    ,title       : 'Help & guide'
    ,width       : 350
    ,plain       : true
    ,closeAction : 'hide'
    ,html        : '<table width=100% cellpadding=0 cellspacing=0> <tr><td class="dirText"><ul class="dirUL"> <li> <table width=100%><tr> <td width=54 class="dirTD"><img src="img/search.png"></td> <td class="dirTD">&nbsp;</td> <td class="dirTD">Begin by entering in a query string into the Google search panel and pressing the Search button. Or follow an example:<br><ol><li><a href="javascript:searchForm.execute(\'water temperature\')">water temperature</a> search (then follow the rest of the help directions below)</li><li><a href="javascript:getLayers(\'http://staging.asascience.com/ecop/wms.aspx?REQUEST=GetCapabilities&VERSION=1.1.1&SERVICE=WMS\')">ASA GetCaps</a> link</li></ol></td> </tr></table> </li> <li> <table width=100%><tr> <td align=center width=54 class="dirTD"><img src="img/down1.png">&nbsp;&nbsp;&nbsp;<img src="img/down0.png"></td> <td class="dirTD">&nbsp;</td> <td class="dirTD">Once the search is complete, each Google hit will be followed by either a gray or a green down arrow. A green down arrow indicates at least one GetCapabilities was found on the page. Click the arrow to see the GetCapabilities URL list.</td> </tr></table> </li> <li> <table width=100%><tr> <td align=center width=54 class="dirTD"><img src="img/info1.png"></td> <td class="dirTD">&nbsp;</td> <td class="dirTD">Remember, these links don\'t guarantee a true GetCapabilities result, and they are not restricted to WMS.</td> </tr></table> </li> <li> <table width=100%><tr> <td align=center width=54 class="dirTD"><img src="img/map1.png"></td> <td class="dirTD">&nbsp;</td> <td class="dirTD">Each numbered GetCapabilities link with a Green Arrow will be followed by a Map button. Clicking on this icon will pass the URL to the map which will then list the available layers.</td> </tr></table> </li> <li> <table width=100%><tr> <td align=center width=54 class="dirTD"><img style="margin-top:2px" src="img/hand1.gif"></td> <td class="dirTD">&nbsp;</td> <td class="dirTD">After the map has parsed the GetCapabilities, double-click on a layer name to add it to the map.</td> </tr></table> </li> </ul></td></tr> </table>'
    ,x           : 50
    ,y           : 300
  });
  action = new Ext.Action({
     text    : "Help & guide"
    ,handler : function(){
      if (!winHelp.rendered || winHelp.hidden) {
        winHelp.show();
      }
    }
  });
  actions["help"] = action;

  var winAbout = new Ext.Window({
     id          : 'extAbout'
    ,title       : 'About'
    ,width       : 350
    ,plain       : true
    ,modal       : true
    ,closeAction : 'hide'
    ,html        : '<table width=100% cellpadding=0 cellspacing=10> <tr><td class="dirText"><p style="text-align:justify"><img border=none src="img/mop.png" alt="MOP" width="190" height="75" style="padding:0;margin:2px 10px 0px 0px;float:left;"/> This application was built by ASA <a href="http://www.asascience.com/" target=_blank><img border=none src="img/external.png"></a> with MOP <a href="http://www.massoceanpartnership.org/" target=_blank><img border=none src="img/external.png"></a> sponsorship, and is a prototype to explore the use of Google Search technology to discover and access ocean data. For this prototype, the system searches for data that is available as OGC-compliant WMS services. The application demonstrates that such data can be found and accessed in a single web client. It also demonstrates that there is a huge range in how standards are implemented and that not all services work as expected. This application will be extended to search for other services and data such as SOS, WFS, and KML.<br><br> The Massachusetts Ocean <img border=none src="img/asa.png" alt="MOP" width="82" height="75" style="padding:0;margin:10px 0px 0px 10px;float:right;"/>Partnership is committed to helping Massachusetts create and implement the best ocean management plan possible -- one that fairly represents all interests, is based on the best available scientific information and, ultimately, supports resilient ocean ecosystems, productive economies and vibrant communities.</p></td></tr></table>'
  });
  action = new Ext.Action({
     text    : "About this site"
    ,handler : function(){
      if (!winAbout.rendered || winAbout.hidden) {
        winAbout.show();
      }
    }
  });
  actions["credits"] = action;

  function populateSampleLayers() {
    
    var purl, u;
    
    var store = new GeoExt.data.WMSCapabilitiesStore({
      listeners : {
        load : function() {
          addToMap(this.getAt(this.find('name','NCOM_CURRENTS')),'Sample WMS',false,false);
          addToMap(this.getAt(this.find('name','GFS_WINDS')),'Sample WMS',false,false);
        }
      }
    });
    store.removeAll();
    
    u = 'http://staging.asascience.com/ecop/wms.aspx?REQUEST=GetCapabilities&VERSION=1.1.1&SERVICE=WMS';
    purl = proxyLoc ? proxyLoc + escape(u) : u;
    store.proxy.conn.url = purl
    store.load();

    store = new GeoExt.data.WMSCapabilitiesStore({
      listeners : {
        load : function() {
          addToMap(this.getAt(this.find('name','OWLS')),'Sample WMS',false,false);
        }
      }
    });
    store.removeAll();
    
    u = 'http://www.bsc-eoc.org/cgi-bin/bsc_ows.asp?service=WMS&version=1.1.1&request=GetCapabilities';
    purl = proxyLoc ? proxyLoc + escape(u) : u;
    store.proxy.conn.url = purl
    store.load();

    store = new GeoExt.data.WMSCapabilitiesStore({
      listeners : {
        load : function() {
          addToMap(this.getAt(this.find('name','DNI_NREL_Mod')),'Sample WMS',false,false);
        }
      }
    });
    store.removeAll();
    
    u = 'http://na.unep.net/cgi-bin/DNI?request=getcapabilities&Service=wms&version=1.1.1';
    purl = proxyLoc ? proxyLoc + escape(u) : u;
    store.proxy.conn.url = purl;
    store.load();
    
    
    u = 'http://www.gearthblog.com/kmfiles/emilyir.kml';
    purl = proxyLoc ? proxyLoc + escape(u) : u;
    addKMLToMap(u,'Sample KML',false);
  }

  function findAndZoom(warn) {
    targetBBOX = new OpenLayers.Bounds();
    for (var i = 0; i < map.layers.length; i++) {
      if (map.layers[i].visibility && maxBBOX[map.layers[i].name]) {
        targetBBOX.extend(maxBBOX[map.layers[i].name].bbox.transform(maxBBOX[map.layers[i].name].epsg,map.getProjectionObject()));
        // save off epsg since we transformed it
        maxBBOX[map.layers[i].name].epsg = map.getProjectionObject();
      }
    }
    if (targetBBOX.getWidth() > 0 && targetBBOX.getHeight() > 0) {
      map.zoomToExtent(targetBBOX);
    }
    else if (warn) {
      Ext.Msg.alert('Zoom to visible layers','There was a problem collecting known bounding boxes for the visible layers.  Perhaps you have not added any layers that have known bounding boxes.  Otherwise, try double-clicking on each layer to zoom to its bounding box or unclick a problem layer and try again.');
    }
  }

  action = new Ext.Action({
     text    : 'Zoom to visible layers'
    ,tooltip : "Zoom to the bounds containing all visible layers. To zoom to individual layers, double click the layer name the the Active layer list."
    ,iconCls : 'buttonIcon'
    ,icon    : 'img/search_zoom.png'
    ,handler : function() {findAndZoom(true)}
  });
  actions["findOnMap"] = action;

  // create a new WMS capabilities store
  var noData = {
    title : 'No layers found or error processing.'
  };
  storeGetCapsPre = new GeoExt.data.WMSCapabilitiesStore({
    sortInfo : {
       field     : 'title'
      ,direction : 'ASC'
    }
  });
  storeGetCaps    = new GeoExt.data.WMSCapabilitiesStore({
    sortInfo : {
       field     : 'title'
      ,direction : 'ASC'
    }
  });
  storeGetCapsPre.on('beforeload',function() {
    storeGetCaps.fireEvent('beforeload');
  });
  storeGetCapsPre.on('loadexception',function(loader,node,response) {
    if (storeGetCapsPre.getCount() == 0) {
      storeGetCaps.insert(0,new storeGetCaps.recordType(noData,1));
    }
  });
  storeGetCapsPre.on('load',function(loader,node,response) {
    if (storeGetCapsPre.getCount() == 0) {
      storeGetCaps.insert(0,new storeGetCaps.recordType(noData,1));
    }
    else {
      var i = 0;
      storeGetCapsPre.each(function(f) {
        // cheat for a few ASA layers
        if (String(storeGetCapsPre.proxy.conn.url).indexOf('staging.asascience.com') > 0 && String(f['data']['title']).search(/Static/) < 0) {
          var vals = Array();
          var dt   = new Date();
          for (var j = 0; j > -10; j--) {
            vals.push(dt.add(Date.DAY,j).format('Y-m-d')+'T'+dt.add(Date.DAY,j).format('H')+':00Z');
          }
          f['data']['dimensions']['time'] = {
            values : vals.join(',')
          };
        }
        storeGetCaps.insert(i,f);
        i++;
      })
    }
    storeGetCaps.fireEvent('load');
  });

  // create a grid to display records from the store
  var gridGetCaps = new Ext.grid.GridPanel({
     store   : storeGetCaps
    ,columns : [
       {header : "Title"          ,dataIndex : "title"     ,sortable : true         ,id       : 'title', width : 150}
      ,{header : "Name"           ,dataIndex : "name"      ,sortable : true                                         }
      ,{header : "Projection(s)"  ,dataIndex : "srs"       ,sortable : true         ,renderer : function(value,metaData,record,rowIndex,colIndex,store) {
        var a = Array();
        for (var i in value) {
          if (value[i]) {
            a.push(i);
          }
        }
        return a.join(',');
      }}
//      ,{header : "Time first"     ,dataIndex : "dimensions",sortable : true         ,renderer : function(value,metaData,record,rowIndex,colIndex,store) {
//        if (value['time'] && value['time']['values']) {
//          return String((value['time']['values'])).split('/')[0];
//        }
//      }}
//      ,{header : "Time last"      ,dataIndex : "dimensions",sortable : true         ,renderer : function(value,metaData,record,rowIndex,colIndex,store) {
//        if (value['time'] && value['time']['values']) {
//          return String((value['time']['values'])).split('/')[1];
//        }
//      }}
//      ,{header : "Time resolution",dataIndex : "dimensions",sortable : true         ,renderer : function(value,metaData,record,rowIndex,colIndex,store) {
//        if (value['time'] && value['time']['values']) {
//          return String((value['time']['values'])).split('/')[2];
//        }
//      }}
//      ,{header : "Time default"   ,dataIndex : "dimensions",sortable : true         ,renderer : function(value,metaData,record,rowIndex,colIndex,store) {
//        if (value['time'] && value['time']['default']) {
//            return value['time']['default'];
//        }
//      }}
    ]
    ,autoExpandColumn : 'title'
    ,listeners        : {
      rowdblclick : function(grid,index) {
        // decided not to snapto zoom
        addToMap(grid.getStore().getAt(index),'User-added WMS',true,false);
      }
    }
    ,loadMask         : true
  });

  function mkTreeNodeGroup(id) {
    return({
       text     : id
      ,nodeType : "gx_layercontainer"
      ,expanded : true
      ,loader   : {
         baseAttrs : {group : id}
        ,filter    : function(rec) {
          if (rec.get("layer").options.group == id) {
            return true;
          }
          return false;
        }
      }
    });
  }

  function buildTreeNodes() {
    return ([
      {
         nodeType : "gx_baselayercontainer"
        ,expanded : true
      }
      ,mkTreeNodeGroup('Sample WMS')
      ,mkTreeNodeGroup('Sample KML')
      ,mkTreeNodeGroup('User-added WMS')
      ,mkTreeNodeGroup('User-added KML')
    ]);
  }

  function addToMap(record,category,visibility,zoom) {
    if (!record || record.get("title").indexOf('No layers found.') == 0) {
      return;
    }
    if (layerPanel.collapsed) {
      layerPanel.expand();
    }
    var layer         = record.get("layer").clone();
    layer.singleTile  = true;
    layer.visibility  = visibility;
    layer.isBaseLayer = false;
    map.addLayer(layer);

    // add the layer to the list
    var layerNode = new Ext.data.Node({
      id : record.get("title")
    });
    layerNode.layer = layer;
    var wmsNode = layerPanel.getRootNode().findChild('text',category);
    wmsNode.appendChild(layerNode);

    // record supported srs-es
    var srs = Array();
    a = record.get("srs");
    for (var k in a) {
      if (a[k]) {
        srs.push(new OpenLayers.Projection(k));
      }
    }

    // save extent & srs info
    maxBBOX[record.get("title")] = {
       bbox : new OpenLayers.Bounds.fromString(String(record.get("llbbox")))
      ,epsg : new OpenLayers.Projection("EPSG:4326")
      ,srs  : srs
    };

    // zoom to it
    if (zoom) {
      map.zoomToExtent(maxBBOX[record.get("title")].bbox.transform(maxBBOX[record.get("title")].epsg,map.getProjectionObject()));
      // save off the epsg since we transformed it
      maxBBOX[record.get("title")].epsg = map.getProjectionObject();
    }
  }

  winGetCaps = new Ext.Window({
     id          : 'extGetCaps'
    ,title       : 'GetCapabilities layer listing'
    ,plain       : true
    ,layout      : 'accordion'
    ,items       : [gridGetCaps]
    ,closeAction : 'hide'
    ,width       : 500
    ,height      : 300
    ,layout      : 'fit'
    ,maximizable : true
    ,tbar: [
      'Double click a row to add the layer to the map.'
    ]
  });

  var layerStore = new GeoExt.data.LayerStore({
     map    : map
    ,layers : [
       layerBlueMarble4326
      ,layerOpenStreetMap4326
      ,layerBlueMarble900913
      ,layerOpenStreetMap900913
      ,layerGooglePhysical
      ,layerGoogleHybrid
      ,layerGoogleSatellite
    ]
  });

  var treeConfig = new OpenLayers.Format.JSON().write([{
    nodeType: "gx_baselayercontainer"
  }],true);

  layerPanel = new Ext.tree.TreePanel({
    root: {
      nodeType : "async"
     ,children : buildTreeNodes()
    }
    ,title        : 'Layers'
    ,rootVisible  : false
    ,lines        : false
    ,autoScroll   : true
    ,loader       : new Ext.tree.TreeLoader({
      applyLoader : false
    })
    ,tbar         : ['->',actions["findOnMap"]]
    ,border       : false
  });

  // override the dblclick behavior so that it zooms to a max extents per layer if defined
  Ext.override(Ext.tree.TreeNodeUI,{
    onDblClick : function(e) {
      e.preventDefault();
      if (maxBBOX[this.node.text]) {
        map.zoomToExtent(maxBBOX[this.node.text].bbox.transform(maxBBOX[this.node.text].epsg,map.getProjectionObject()));
        // save off the epsg since we transformed it
        maxBBOX[this.node.text].epsg = map.getProjectionObject();
      }
    }
  });

  var legendPanel = new GeoExt.LegendPanel({
     title       : 'Legend'
    ,autoScroll  : true
    ,filter      : function(record) {
      return !(record.get("layer").isBaseLayer);
    }
    ,labelCls    : 'legendText'
  });

  var toolbar = new Ext.Toolbar({
    items: [
       actions["zoom_in"]
      ,actions["zoom_out"]
      ,actions["pan"]
      ,actions["zoom_extents"]
      ,'-'
      ,actions["previous"]
      ,actions["next"]
      ,'->'
      ,{
         text          : 'Google Earth'
        ,id            : "googleToggle"
        ,enableToggle  : true
        ,pressed       : false
        ,handler       : function() {
          if (this.pressed) {
            GoogleEarthPanel.add(googleEarthPanelItem);
            GoogleEarthPanel.setHeight(300);
            GoogleEarthPanel.setVisible(true);
            GoogleEarthPanel.doLayout();
            viewport.doLayout();
          } else {
            GoogleEarthPanel.remove('googleEarthPanelItem');
            GoogleEarthPanel.setHeight(0);
            GoogleEarthPanel.setVisible(false);
            GoogleEarthPanel.doLayout();
            viewport.doLayout();
          }
        }
        ,iconCls  : 'buttonIcon'
        ,tooltip  : 'Toggle Google Earth window'
        ,icon     : 'img/google_earth.gif'
      },
      {
         text : "Help"
        ,menu : new Ext.menu.Menu({
          items : [actions['help'],actions['credits']]
        })
      }
    ]
  });

  var googleEarthPanelItem = {
     xtype     : 'gxux_googleearthpanel'
    ,id        : 'googleEarthPanelItem'
    ,map       : map
    ,altitude  : 50
    ,heading   : -60
    ,tilt      : 70
    ,range     : 700
  };

  timeSlider = new Ext.Slider({
     value     : 0
    ,increment : 3
    ,minValue  : -24 * 2
    ,maxValue  : 24 * 2
    ,id        : 'timeSlider'
    ,listeners : {
      change : function(slider,newValue) {
        applyTime(t0.add(Date.HOUR,newValue).format('Y-m-d')+'T'+t0.add(Date.HOUR,newValue).format('H')+':00Z');
      }
    }
    ,colspan   : 3
  });

  firstTime = new Ext.form.Label({
     id   : 'firstTime'
    ,text : t0.add(Date.HOUR,-24 * 2).format('m-d')+' '+t0.add(Date.HOUR,-24 * 2).format('H')+'Z'
    ,cellCls : 'firstTime'
  });
  currentTime = new Ext.form.Label({
     id   : 'currentTime'
    ,text : t0.add(Date.HOUR,0).format('m-d')+' '+t0.add(Date.HOUR,0).format('H')+'Z'
    ,cellCls : 'currentTime'
  });
  lastTime = new Ext.form.Label({
     id   : 'lastTime'
    ,text : t0.add(Date.HOUR,24 * 2).format('m-d')+' '+t0.add(Date.HOUR,24 * 2).format('H')+'Z'
    ,cellCls : 'lastTime'
  });

  timePanel = new Ext.Panel({
     renderTo     : Ext.getBody()
    ,id           : 'timePanel'
    ,layout       : 'table'
    ,items        : [firstTime,currentTime,lastTime,timeSlider]
    ,layoutConfig : {
      columns : 3
    }
    ,border       : false
    ,width        : 200
  });

  mapPanel = new GeoExt.MapPanel({
     region : "center"
    ,id     : "mappanel"
    ,xtype  : "gx_mappanel"
    ,map    : map
    ,layers : layerStore
    ,zoom   : 1
    ,split  : true
    ,listeners : {
      resize : function() {
        setTimePanelPos();
      }
    }
  });

  tabPanel = new Ext.TabPanel({
     region      : "east"
    ,activeTab   : 0
    ,width       : 250
    ,split       : true
    ,items       : [layerPanel,legendPanel]
  });

  viewport = new Ext.Viewport({
     layout: "border"
    ,items: [
      {
         region  : 'center'
        ,layout  : 'border'
        ,tbar    : toolbar
        ,items   : [
           mapPanel
          ,{
             region      : "south"
            ,height      : 0
            ,layout      : 'fit'
            ,id          : "googleearthpanel"
            ,closeAction : 'hide'
            ,split       : true
            ,hidden      : true
          }
        ]
      }  
      ,{ 
         region      : "west"
        ,contentEl   : "contents"
        ,title       : "Search"
        ,width       : 300
        ,split       : true
        ,collapsible : true
        ,autoScroll  : true
        ,html        : '<table><tr><td>Enter Google search terms or a complete GetCapabilties web address or a KML file web address. See the Help button above the map panel for examples.</td></tr></table>'
        ,cls         : 'directions'
      }
      ,tabPanel
    ]
  });

  // show help at startup
  winHelp.show();

  // populate sample layers
  populateSampleLayers();

  // apply t0
  applyTime(t0);

  // set the base layer & initial zoom
  map.setBaseLayer(layerBlueMarble4326);
  map.setCenter(new OpenLayers.LonLat(-100,40),4);
  Ext.getCmp('mappanel').body.setStyle('cursor','move');
  
  // Earth
  GoogleEarthPanel = Ext.getCmp("googleearthpanel");
  GoogleEarthPanel.add(googleEarthPanelItem);
});

function applyTime(t) {
  for (var i in map.layers) {
    if (map.layers[i].name.indexOf('.kml') < 0 && !map.layers[i].isBaseLayer && !map.layers[i].name == '') {
      map.layers[i].mergeNewParams({'time':t});
    }
  }
}
