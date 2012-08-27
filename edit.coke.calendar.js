var oneHour = 60 * 60 * 1000;
var sevenhour = 7 * oneHour;
var oneDay = 24 * oneHour;

var Quickbase = {
    client: null,
    dbid: null,     
    initialize: function(dbid) {
        this.dbid = dbid;
        return this;
    },
    
    client: function() {
        client = new QuickBaseClient("https://cokecbs.quickbase.com");
        client.apptoken = "";
        return client;
    }
};

var CokeDatabase = {
    quickbase: null,
    holdingBinRecordIdSize: [],
    numdays: 'none',
    
    fieldIds: {
        locked: '135',
        reserved: '136',
        slot: '84',
        locationId: '102'
    },
    
    initialize: function(quickbase) {
        this.quickbase = quickbase;
        return this;
    },
    
    // get main data from QB into main grid
    loadData: function() {
        var hour = 60 * 60 * 1000;
        var qid = "53";						// report to pull from Qb for main grid data read  **
        var client = quickbase.client();
        var records = client.DoQuery(quickbase.dbid, qid, '', '', '');  // direct call no sorting etc. - depend on report for that
        qid = '';
        var groups = new Object();
        var row_tracker = 0;
        var once = 0;
        var prev_loc = '';
        var prev_slot = '';

        // setup groups keyed array from db recs (each item is an Asset object - drill down via asset.js)
        $("records > record", records).each(function(i, item) {
            var a = new Asset(item);
            if (!groups[a.location]) {
                groups[a.location] = new Object();
            }
            if (!groups[a.location][a.getKey()]) {
                groups[a.location][a.getKey()] = [];
            }
            groups[a.location][a.getKey()].push(a);
            var milliseconds=parseInt(a.startDate);
            var millisecondse=parseInt(a.endDate);

            //console.dir(a)

            var d = new Date(milliseconds);
            offset = d.getTimezoneOffset() * 60000;
            UTCstart = milliseconds + parseInt(offset);
            checks = new Date(UTCstart)
            a.startDate = UTCstart;

            var e = new Date(millisecondse);
            offsetE = e.getTimezoneOffset() * 60000;
            UTCend = millisecondse + parseInt(offsetE);
            checke = new Date(UTCend)
            a.endDate = UTCend;
        });

        var headerArr = [];

        // work out headers for sections etc.
        for (var l in groups) {
            var headers = []
            for (var k in groups[l]) {
                headers.push(new AssetGrouping(groups[l][k]))
            }
            var header = new AssetHeader(headers, l);
            headerArr.push(header);
        }
        // return with main Grid data setup wrapping HeaderArr to drive each line
        cal =  "<Grid><Body><B>" + $.map(headerArr,
                function(item, i) {
                    return item.toXMLString();
                }).join("") + "</B></Body></Grid>"
        return cal;
    },

    // load in assets that are 'bad' (i.e. no slot info =>empty)
    loadDataHoldingBin: function() {
        holdingBinRecordIdSize = this.holdingBinRecordIdSize;

        var qid = "54";  // hardcoded to pickup assets with no slot otherwise same as main grid report
        var client = quickbase.client();
        var records = client.DoQuery(quickbase.dbid, qid, '', '', '')
        qid = '';
        var groups = new Object();
        var x = 0; // start incr
        var blank_line = "<I T='' R='' />;"
        var lines = "";
        // setup with 5 starting empty slots
        lines = "<I T='' R='' />; <I T='' R='' />;  <I T='' R='' />;   <I T='' R='' />;  <I T='' R='' />;";
        var line = "";
        var fieldSeparator = "&#xF000;";
        var AssetSeparator = "&#xF001;";


        $("records > record", records).each(function(i, item) {
            var a = new Asset(item);

            if ((a.startDate != '') && (a.endDate != '')) {
                intsdate = a.startDate;
                sdate = parseInt(intsdate);
                intedate = a.endDate;
                edate = parseInt(intedate);
                daterange = edate - sdate;
                numdays = Math.ceil(daterange / 1000 / 60 / 60 / 24);
                holdingBinRecordIdSize.push(a.recordId, numdays);

                a.startDate = '1293920001000' // Human time: 1/1/2011 15:13:21
                a.endDate = '1295920000000'; // Thu, 13 Jan 2011 12:00:00 GMT

                if (!groups[x]) {
                    groups[x] = new Object();
                }
                if (!groups[x]) {
                    groups[x] = [];
                }
                groups[x] = a;
                x = x + 1;

                // TODO fix toBox -- so the end-date for the run box is the correct #days (as we screw around with start date so all aligned)
                lines += '<I T="" R="' + AssetSeparator + fieldSeparator + a.toBox2(fieldSeparator) + AssetSeparator + '" />';;
                if (i % 5 == 0) 
                    lines += blank_line;
            }
        });

        // add on 10 empty slots at end
        lines += "<I T='' R='' />; <I T='' R='' />;  <I T='' R='' />;   <I T='' R='' />;  <I T='' R='' />;";
        lines += "<I T='' R='' />; <I T='' R='' />;  <I T='' R='' />;   <I T='' R='' />;  <I T='' R='' />;";

        return  "<Grid><Body><B>" + lines + "</B></Body></Grid>"
    },
    
    saveData: function(data, sharedData) {
        // ?Holding Bin has data in it //
        // Grids[1] is the holding bin

        var client = quickbase.client();
        var commitChanges = true; // setting this to false will turn off commits for debugging 
        var fieldIds = CokeDatabase.fieldIds;

        curXml = loadXmlString(data);
        $("I", curXml).each(function(i, item) {
            var str = item.getAttribute("R");
            var addRow = item.getAttribute("id")
            var assets = AssetGrouping.parseRun(str);

            for (var j = 0; j < assets.length; j++) {
                var curAsset = assets[j];
                var updateFields = [];

                // this is the old asset when moving between rows; ignore since it doesn't get removed from the DB
                if (curAsset["spdate"] == "deleted")
                    continue;
                
                for (var field in curAsset) {
                    if (field == fieldIds.slot) {
                        for (var r = 0; r <= map.length; r++) { // needed or equal to identify last row
                            if (r == sharedData.changedRow && curAsset[3] == sharedData.movedAssetId) {
                                sharedData.changedRow = r;
                                s = r;
                                s--;
                                curAsset[fieldIds.slot] = map[s];
                            }
                        }
                    }

                    if (field != Asset.prototype.RECORD_ID &&
                            field != 'slot' &&
                            field != 'aname' &&
                            field != 'spdate' &&
                            field != 'sdate' &&
                            field != 'edate' &&
                            field != 'epdate' &&
                            field != Asset.prototype.PROJECT_START &&
                            field != Asset.prototype.PROJECT_END) {

                        // CHECK IF ASSET DROPPING FROM HOLDING BIN - NEEDS CUSTOM HANDLING
                        if (field == '12' && curAsset[Asset.prototype.RECORD_ID] == PromotionChartCallbacks.holdingBinId)
                            curAsset[field] = sharedData.holdingBinEnd + sevenhour;

                        if (field=='11') {
                            var d = new Date(curAsset[field]);
                            offset = d.getTimezoneOffset() * 60000;
                            curAsset[field] = curAsset[field] - parseInt(offset);
                            console.log(curAsset[3]+': '+d+' set date')
                        }
                        
                        if (field=='12') {
                            var d = new Date(curAsset[field]);
                            offset = d.getTimezoneOffset() * 60000;

                            // TODO - dates seem to be misaligned by a day vs. the UI?
                            curAsset[field] = (curAsset[field] - oneDay) - parseInt(offset);
                        }

                        updateFields.push(field);
                        updateFields.push(curAsset[field]);
                    }
                } // end of loop on field in curAsset
                
                // What does this do? - CJ
                // TODO - this is for moving data to the holding bin
                if (sharedData.runboxAssetId != null) {
                    hbUpdate = [fieldIds.slot,''];
                    if (commitChanges)
                        client.EditRecord(quickbase.dbid, sharedData.runboxAssetId, hbUpdate);
                }

                if (commitChanges)
                    client.EditRecord(quickbase.dbid, curAsset[Asset.prototype.RECORD_ID], updateFields);
            } 

            var updateSlot = [];

            //WARNING: THESE FIELDS ARE HARDCODED PER DB
            if (sharedData.box2) {
                if (sharedData.change == 'revertGeo') {
                    updateSlot.push('18', 0);
                    sharedData.box2.Class = '';
                } else if (sharedData.box2.Class == 'Gold') 
                    updateSlot.push('18', 1);

                if (sharedData.change == 'revertMicro') {
                    updateSlot.push('119', 0);
                    sharedData.box2.Class = '';
                }
                else if (sharedData.box2.Class == 'Purple') updateSlot.push('119', 1)

                if (sharedData.box2.Class == 'Gold' || sharedData.box2.Class == 'Purple') {
                    qb_criteria = "{'"+fieldIds.locationId+"'.CT.'" + subname + "'}";
                    asset_new = client.DoQuery(quickbase.dbid, qb_criteria, fieldIds.slot+"."+fieldIds.locationId, fieldIds.slot, 'sortorder-D.num-1'); // projectsDBID = campaign code table
                    asset_info = client.selectNodes(asset_new, "/* /table/records/record");
                    if (client.displayErrorAlert("Could not retrieve records from because: ")) {
                        return;
                    }
                    add_asset = asset_info[0];
                    nextrow = parseInt(client.text(client.selectSingleNode(add_asset, "f[@id="+fieldIds.slot+"]")));
                    nextrow++;
                    sharedData.refresh = true;
                    updateSlot.push(fieldIds.slot, nextrow)
                }
            }
            if (sharedData.box) {
                console.log("colors...");
                console.log(sharedData.box);
                if (sharedData.change == 'unlock') {
                    updateSlot.push(fieldIds.locked, 0);
                    sharedData.box.Class = '';
                }
                else if (sharedData.box.Class == 'Red') {
                    updateSlot.push(fieldIds.locked, 1);
                }
                if (sharedData.change == 'unreserve') {
                    updateSlot.push(fieldIds.reserved, 0);
                    sharedData.box.Class = '';
                }
                else if (sharedData.box.Class == 'Orange') {
                    updateSlot.push(fieldIds.reserved, 1);
                }
                console.log(updateSlot);
            }

            if (updateSlot && (updateSlot.length > 0)) {
                console.log(quickbase.dbid);
                console.log(newrowid);
                console.log(updateSlot);
                console.log(commitChanges);
                if (commitChanges)
                    client.EditRecord(quickbase.dbid, newrowid, updateSlot);
            }
        });
    }
};

var PromotionChartCallbacks = {
    database: null,
    sharedData: null,
    box: null,

    initialize: function(database) {
        this.database = database;
        this.resetSharedData();
        return this;
    },

    resetSharedData: function() {
        this.sharedData = {
            runboxAssetId: null,
            movedAssetId: null,
            resizedAssetId: null,
            changedRow: null,
            holdingBinFlag: false,
            holdingBinId: null,
            holdingBinEnd: null,
            box: null, 
            box2: null, 
            refresh: false,
            dataError: null,
            change: null
        }
    },

    rightClick: function(grid, row, col, x, y, event) {
        label = ["Lock/Unlock","Set Geo-target","Set Micro-target","Reserve/Un-reserve"];
        items = [
            {Name: "Lock/Unlock", Value: 'onclick=\'lock_tog()\''},
            {Name: "Set Geo-target", Value: 'onclick=\'lock_tog()\''},
            {Name:"Set Micro-target", Value:'onclick=\'lock_tog()\''},
            {Name: "Reserve/Unreserve", Value: 'onclick=\'lock_tog()\''}
        ];
        Grids[0].ShowMenu(row, col, label, null,
                function func(index, G, row, col, UserData) {
                    getidx = Grids[0].GetGanttXY(row, col, x, y);
                    idx = getidx.RunIndex;
                    sharedData = PromotionChartCallbacks.sharedData;
                    box = Grids[0].GetGanttRunBox(row, col, idx);
                    sharedData.box = box;
                    subcatarr = box.Row.T.split(/(?=\D\d)./);
                    subname = subcatarr[0];
                    if (box.Id) newrowid = box.Id;
                    adjust = 'error';
                    sharedData.box = box;
                    sharedData.box2 = box;
                    if ((index == 1) || (index == 2)) {
                        if (index == 1) {
                            if (box.Class == '' || box.Class == 'revertGeo') {
                                box.Class = 'Gold';
                            } else {
                                sharedData.change = 'revertGeo';
                                box.Class = '';
                            }
                        }
                        if (index == 2) {
                            if (box.Class == '' || box.Class == 'revertMicro') {
                                box.Class = 'Purple';
                            } else {
                                sharedData.change = 'revertMicro';
                                box.Class = '';
                            }
                        }

                        r = grid.AddRow(row.parentNode, null, 1);
                        dif = box.End - box.Start;
                        daydif = dif / 1000 / 60 / 60 / 24;
                        grid.SetValue(r, "R", sharedData.box2.Start + ',' + daydif + ',' + sharedData.box2.Type + ',' + sharedData.box2.Text + ',' + sharedData.box2.Class + ',' + sharedData.box2.Tip + ';', 1);
                        grid.DelGanttRunBox(box);

                        return true;
                    } else if ((index == 0) || (index == 3)) {
                        if (box.Class == '') {
                            box.Type = 'fixed';
                            if (index == 0)
                                box.Class = 'Red';
                            else
                                box.Class = 'Orange';
                        } else {
                            box.Type = '';
                            box.Class = '';
                            if (index == 0)
                                sharedData.change = 'unlock';
                            else
                                sharedData.change = 'unreserve';
                        }
                    }
                    fire = Grids[0].SetGanttRunBox(box, adjust);
                } 
                , 0, "", x, y, "my data");
        return true;
    },

    loadRecords: function(g, source, data, io) {
        if (source.Name == "Data" && (source.Url.endsWith('54') || source.id == "HoldingBinData")) { // for holding bin ** was 82
            return database.loadDataHoldingBin();
        }
        if (source.Name == "Data") {  // for main grid
            return database.loadData();
        }

        return data;
    },

    saveRecords: function(g, source, data, callback) {
        if (source.Name == "Upload") {
            sharedData = PromotionChartCallbacks.sharedData;
            try {
                if (sharedData.dataError != null) {
                    callback(0);
                    PromotionChartCallbacks.handleDataErrors();
                } else {
                    database.saveData(data, PromotionChartCallbacks.sharedData);
                    if (sharedData.refresh) 
                        location.reload(true);
                    callback(0);
                }
            } catch(e) {
                alert("An unexpected error has occurred.");
                callback(-1);
            }
            PromotionChartCallbacks.resetSharedData();
            return true;
        }
    },
    
    handleDataErrors: function() {
        sharedData = PromotionChartCallbacks.sharedData;
        if (sharedData.dataError != null) {
            alert(sharedData.dataError);
            PromotionChartCallbacks.resetSharedData();
            if (sharedData.refresh) 
                location.reload(true);
        }
    },
    
    promotionMoved: function (grid, row, col, drop, data, index, keyprefix, x, y, togrid, torow, tocol, cellx) {
        if (drop == 0)
            return;

        var sharedData = PromotionChartCallbacks.sharedData;
        var v = 0;
        var fromrowsub = '';
        var assetId = null;
        
        getidx = grid.GetGanttXY(row, col); // needed to use row,col instead of x,y to get source and not destination

        if (data == null)
            data = []; // fixes IE7 bug on Array.new();

        for (key in data) {
            if (key == 0) {
                for (next in data[key]) {
                    if (next == 1) boxtype = data[key][next];
                    if (next == 2) boxtext = data[key][next];
                    if (next == 3) boxclass = data[key][next];
                    if (next == 5) sharedData.movedAssetId = data[key][next];
                    if (next == 6) pestart = data[key][next];
                    if (next == 7) peend = data[key][next];
                    if (next == 12) orig_sdate = data[key][next];
                    if (next == 13) orig_edate = data[key][next];
                }
            }
        }
        
        if (grid && getidx) {
            fromrow = getidx.Row.T;
            fromrowsub = fromrow.substring(0, 12);
            if (fromrowsub == '') 
                fromrowsub = getidx.Row.R; // asset must be in holding bin so need check full asset info
                console.log('dropped asset in hb')
        }

        if (togrid) {
            var droptorow = torow.id;
            console.log('found torow.id: '+torow.id)
            strip = droptorow.indexOf('AR') // this may not be working as planned?
            
            sharedData.changedRow = (strip >= 0)  ? string_replace(droptorow, 'AR', '') : row;
            
            getidx2 = togrid.GetGanttXY(x, y);
            torow = getidx2.Row.T;

            if (torow == '') {
                record = data[0];
                sharedData.runboxAssetId = record[5];
                //console.log('torow empty - must be dropping asset into holding bin - returning prematurely')
                return true;
            }

            torowsub = torow.substring(0, 12);
            console.log(torowsub)
            if (fromrowsub.length > 12) {
                if (fromrowsub.indexOf(torowsub) == -1) {
                    sharedData.dataError = 'Asset does not belong in this section. Hover the asset first to see its correct category.';
                    sharedData.refresh = true;
                } else {
                    sharedData.holdingBinFlag = true;
                    //sharedData.refresh = true;
                    getidx4 = grid.GetGanttXY(row, col);
                }
            }
            else if (fromrowsub != torowsub) 
                sharedData.dataError = 'This asset cannot be moved to this location.';


            // boundary check if asset not dropped in project duration boundary - return false
            datedropped = togrid.GetGanttDate(cellx);
            datedrop = new Date(parseInt(datedropped));
            enddate = grid.RoundGanttDate(datedropped, 2);

            if (datedropped < pestart) {
                sharedData.dataError = 'Cannot move this asset #'+sharedData.movedAssetId+' because the date you chose to drop on falls before the start of this project (' + new Date(parseInt(pestart)) + "). Will now refresh page to clear this error.";
                sharedData.refresh = true;
            }
            if (datedropped > peend) {
                sharedData.dataError = 'Cannot move this asset #'+sharedData.movedAssetId+' because the date you chose to drop on falls after the end of this project. (' + new Date(parseInt(peend)) + "). Will now refresh page to clear this error.";
                sharedData.refresh = true;
            }
        }
        
        // NOTE: if method returns false then the saveData function is not called. In this event we must manually force the error handling
        PromotionChartCallbacks.handleDataErrors();
        
        return sharedData.dataError == null;
    },

    promotionResized: function(grid, box, old) {
        if (box == null)
            return true;

        sharedData = PromotionChartCallbacks.sharedData;

        holdingBinRecordIdSize = database.holdingBinRecordIdSize;
        
        if (sharedData.holdingBinFlag) {
            // deals with keeping correct # of days per asset sitting in holding bin
            j = 1;
            dayamount = (holdingBinRecordIdSize.length != null ? holdingBinRecordIdSize.length : 0);
            for (var i = 0; i < dayamount; i++) {
                // check for match of (treegrid identified) asset being dragged from hb to each asset record in the hb array -- made in loadDataHoldingBin() -- holdingBinRecordIdSize.push(a.recordId, numdays);
                if (holdingBinRecordIdSize[i] == box.Id) {
                    epochdays = holdingBinRecordIdSize[j] * 60 * 60 * 24 * 1000;
                    sharedData.holdingBinEnd = epochdays + box.Start;
                    PromotionChartCallbacks.holdingBinId = box.Id;
                    console.log(PromotionChartCallbacks.holdingBinId)
                    i++;
                }
                j++;
            }
            
            sharedData.refresh = true;
        }

        sharedData.resizedAssetId = parseInt(box.Data[5]);
        
        if (old) {
            proj_sdate = parseInt(box.Data[6]);
            proj_edate = parseInt(box.Data[7]);

            if (sharedData.resizedAssetId > 0) {
                if (box.Start < proj_sdate) {
                    s_prj_label = dateFormat(new Date(proj_sdate));
                    box.Start = old.Start;
                    sharedData.dataError = 'Asset #'+sharedData.resizedAssetId+' cannot be extended to the start date: ' + dateFormat(new Date(box.Start)) + '. It must start on or after the project start date of ' + s_prj_label;
                }

                if (box.End > (proj_edate+oneDay)) {
                    e_prj_label = dateFormat(new Date(proj_edate));
                    box.End = old.End;
                    sharedData.dataError = 'Asset #'+sharedData.resizedAssetId+' cannot be extended to the end date: ' + dateFormat(new Date(box.End)) + '. It must end on or before the project end date of ' + e_prj_label;
                }
            }
        }
       
        var row = box.Row.id;
        sharedData.changedRow = (row.indexOf('AR') >= 0)  ? string_replace(row, 'AR', '') : row;

        // NOTE: if this value is ommitted there will be weird behavior in the graph
        return sharedData.dataError != null;
    }

};


var PromotionChart = {
    initialize: function(chart_callbacks) {
        Grids.OnDataGet = chart_callbacks.loadRecords;
        Grids.OnDataSend = chart_callbacks.saveRecords;
        Grids.OnRightClick = chart_callbacks.rightClick;
        Grids.OnGanttRunDrop = chart_callbacks.promotionMoved;
        Grids.OnGanttRunBoxChanged = chart_callbacks.promotionResized;

        a = new TreeGrid({
            Sync: 0,
            Text:       {Url: "https://cokecbs.quickbase.com/db/berwdqfj2?a=dbpage&pageID=46" },     // ** pre-v4 was 60
            Defaults:   {Url: "https://cokecbs.quickbase.com/db/berwdqfj2?a=dbpage&pageID=47"},     // ** pre-v4 was 61
            Data:       {Url: "https://cokecbs.quickbase.com/db/berwdqfj2?a=dbpage&pageID=48"},     // ** pre-v4 was 66
            Upload:     {Url: "https://cokecbs.quickbase.com/db/berwdqfj2?a=dbpage&pageID=48"},     // ** pre-v4 was 66
            Layout:     {Url: "https://cokecbs.quickbase.com/db/berwdqfj2?a=dbpage&pageID=49"}         // ** pre-v4 was 63
        }, "main");

        b = new TreeGrid({
            Sync: 0,
            Text:         {Url: "https://cokecbs.quickbase.com/db/berwdqfj2?a=dbpage&pageID=52"},      // ** pre-v4 was 60
            Defaults:     {Url: "https://cokecbs.quickbase.com/db/berwdqfj2?a=dbpage&pageID=53"},        // ** pre-v4 was 61
            Data:         {Url: "https://cokecbs.quickbase.com/db/berwdqfj2?a=dbpage&pageID=54"},     // ** pre-v4 was 82. figure out what 'bad' (slotted) assets need to be pre-loaded to bin
            Upload:   {Url: "https://cokecbs.quickbase.com/db/berwdqfj2?a=dbpage&pageID=54"},     // ** catch => reject if any data in holding bin
            Layout:     {Url: "https://cokecbs.quickbase.com/db/berwdqfj2?a=dbpage&pageID=55"}        // ** pre-v4 was 78 -- 55
        }, "holding");
    }
};

jQuery(document).ready(function($) {
    $.fn.field = function(id) {
        return this.find("f[id='" + id + "']").first().text();
    };

    //from http://stackoverflow.com/questions/280634/endswith-in-javascript
    String.prototype.endsWith = function(str) {
        var lastIndex = this.lastIndexOf(str);
        return (lastIndex != -1) && (lastIndex + str.length == this.length);
    }

    $("#start_date_picker").datepicker();
    test_app = '';
    live_app = '';
    quickbase = Quickbase.initialize(live_app); 
    database = CokeDatabase.initialize(quickbase);
    chart_callbacks = PromotionChartCallbacks.initialize(database);
    chart = PromotionChart.initialize(chart_callbacks);
});