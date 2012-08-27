Asset.prototype.CALENDAR_ORDER = 77;

function Asset(record) {
    record = $(record)
    this.recordId = record.field(this.RECORD_ID);
    this.calendarOrder = record.field(this.CALENDAR_ORDER);
    this.location = record.field(this.LOCATION);
    this.slot = record.field(this.SLOT);
    this.templateMatch = record.field(this.TEMPLATE_MATCH);
    this.size = record.field(this.SIZE);
    this.projectId = record.field(this.PROJECT_ID);
    this.projectName = record.field(this.PROJECT_NAME);
    this.startDate = record.field(this.START_DATE);
    this.endDate = record.field(this.END_DATE);
    this.type = record.field(this.TYPE);
    this.numberOfDays = record.field(this.NUMBER_OF_DAYS);
    this.projectStart = record.field(this.PROJECT_START);
    this.projectEnd = record.field(this.PROJECT_END);
    this.geo = record.field(this.GEO);
    this.micro = record.field(this.MICRO);
    this.lock = record.field(this.LOCK);
    this.reserved = record.field(this.RESERVED);
    this.shortName = record.field(this.SHORT_NAME);
}

Asset.prototype.LOCATION = 102; // LAL was 15 - switched to Placement
Asset.prototype.SLOT = 84;
Asset.prototype.SLOTNAME = 84;
Asset.prototype.TEMPLATE_MATCH = 46;
Asset.prototype.SIZE = 17;
Asset.prototype.PROJECT_ID = 76;
Asset.prototype.PROJECT_NAME = 8;
Asset.prototype.START_DATE = 11;
Asset.prototype.END_DATE = 12;
Asset.prototype.TYPE = 14;
Asset.prototype.NUMBER_OF_DAYS = 47;
Asset.prototype.RECORD_ID = 3;
Asset.prototype.PROJECT_START = 29;
Asset.prototype.PROJECT_END = 30;
Asset.prototype.GEO = 18;  // was 130
Asset.prototype.MICRO = 119;  // was 131
Asset.prototype.LOCK = 135;
Asset.prototype.RESERVED = 136;
Asset.prototype.SHORT_NAME = 134;
ONEDAY = 24 * 60 * 60 * 1000;

/*
Geo Targeted Ð 18
Micro Segmented Ð 119
Reserved Ð 133
Calendar Label Formula Ð 135
Locked - 136
*/

var rownum = '0';
var locslot = 'none';
var locslot_arr = [];
var map = [];
var added = [];
it = 1;
var total_assets = [];

Asset.prototype.getKey = function () {
	var group_label = this.location + " " + this.slot;
    return group_label;
}


function slot_row(slot, record, projectId, location) {
    if (record in oc(added)) { 
    }
    else {
	if(slot=='' || slot == undefined) slot = '1';
        locslot = location+slot;
	if(location in oc(locslot_arr)) {}
	else {
	    locslot_arr.push(location);
	    map.push(location);
	}
        if (locslot in oc(locslot_arr)) {}
	else {
		rownum++;
		locslot_arr.push(locslot) // track category header placements
		map.push(slot)
	}
        it++;	

    }

    added.push(record);
    return;
}

Asset.prototype.getDateStr = function(date) {
    var addDayDate = date;
    addDayDate.setDate(date.getDate());

    var part = (date.getMonth() + 1) + "/" + addDayDate.getDate() + "/" + date.getFullYear() + " " + date.getHours() + ":";
    if (date.getMinutes() < 10) {
        part = part + "0";
    }
    part = part + date.getMinutes() + ":";
    if (date.getSeconds() < 10) {
        part = part + "0";
    }
    part = part + date.getSeconds();
    return part;
}

Asset.prototype.getDateStrEndCal = function(date) {
    var addDayDate = date;
    addDayDate.setDate(date.getDate() + 1);
    var part = (date.getMonth() + 1) + "/" + addDayDate.getDate() + "/" + date.getFullYear() + " " + date.getHours() + ":";
    if (date.getMinutes() < 10) {
        part = part + "0";
    }
    part = part + date.getMinutes() + ":";
    if (date.getSeconds() < 10) {
        part = part + "0";
    }
    part = part + date.getSeconds();
    return part;
}

Asset.prototype.getDateStrBegin = function(date) {
    var addDayDate = date;
    addDayDate.setDate(date.getDate());
    var part = (addDayDate.getMonth()) + "/" + addDayDate.getDate() + "/" + addDayDate.getFullYear() + " 00:00:00";
    return part;
}


Asset.prototype.getDateStrEnd = function(date) {
    var addDayDate = date;
    addDayDate.setDate(date.getDate() + 1);
    var part = (addDayDate.getMonth() + 1) + "/" + addDayDate.getDate() + "/" + addDayDate.getFullYear() + " 23:59:59";
    return part;
}


AssetGrouping = function(assets) {
    this.assets = assets;
    if (assets.length > 0) {
        this.groupingName = assets[0].getKey();
    }
    this.fieldSeparator = this.FIELD_SEPARATOR;
    this.assetSeparator = this.ASSET_SEPARATOR;
}


AssetGrouping.parseRun = function(string) {
    var assetSeparator = string.charAt(0);
    var fieldSeparator = string.charAt(1);
    var assets = string.substr(2).split(assetSeparator);
    var records = [];
    for (var i = 0; i < assets.length; i++) {
        var assetFields = assets[i].split(fieldSeparator);
        var asset = new Object();
        asset['aname'] = assetFields[12];
        asset[Asset.prototype.RECORD_ID] = assetFields[6];
        asset[Asset.prototype.START_DATE] = Date.parse(assetFields[0]);
        asset[Asset.prototype.END_DATE] = Date.parse(assetFields[1]);
        asset['spdate'] = assetFields[7];
        asset['epdate'] = assetFields[8];
        asset['sdate'] = this.startDate;
        asset['edate'] = this.endDate;
        asset[Asset.prototype.SLOT] = assetFields[11];
        records.push(asset);
    }
    return records;
}

Asset.prototype.toBox = function(separator) {
    var sdate = new Date(parseInt(this.startDate));
    var startString = this.getDateStr(sdate);
    var edate = new Date(parseInt(this.endDate));
    var endString = this.getDateStrEndCal(edate);

    var spdate, epdate; 
    if (this.projectStart == '') spdate = '955864800000';
    else spdate = this.projectStart;
    if (this.projectEnd == '') epdate = '1587016800000';
    else epdate = this.projectEnd;

    cleanup = this.projectName.indexOf('"')
    if(cleanup >= 0) {
	this.projectName = string_replace(this.projectName,'"','');
    }
    
    total_assets.push(this.recordId)
    
    if(this.shortName != '') { labelName = this.shortName; }
    else labelName = this.projectId + ': ' + this.projectName;
    hoverName = labelName+' -- Asset ID: '+this.recordId;
    
    boxtype = "Box";
    if (this.geo == 1) { classcase = 'Olive'; }
    else if (this.micro == 1) { classcase = 'Purple'; }
    else if(this.reserved == 1) { classcase = 'Orange'; boxtype = 'fixed'; }
    else if (this.lock == 1) { classcase = 'Red'; boxtype = 'fixed'; }
    else classcase = '';

   row = [    startString,
        endString,
        boxtype,
        labelName,
        classcase,
        hoverName, 
        this.recordId,
        spdate,
        epdate,
        startString,
        endString,
        this.slot,
        this.projectName,
        this.startDate,
        this.endDate,
	    this.location].join(separator);
    return row;
}

Asset.prototype.toBox2 = function(separator, hover_id) { // see http://www.treegrid.com/treegrid/Doc/GanttRun.htm#CGanttRun
    var sdate = new Date(parseInt(this.startDate));
    var startString = this.getDateStrBegin(sdate); 
    var edate = new Date(parseInt(this.endDate));
    var endString = this.getDateStrEnd(edate);  	

    var spdate, epdate; 
    if (this.projectStart == '')     spdate = '955864800000'; 
    else                     spdate = this.projectStart;
    if (this.projectEnd == '')     epdate = '1587016800000';
    else                     epdate = this.projectEnd;
    
    cleanup = this.projectName.indexOf('"')
    if(cleanup >= 0) {
		this.projectName = string_replace(this.projectName,'"','');
    }
    
    if(this.shortName != '') { labelName = this.shortName; }
    else labelName = this.projectId + ': ' + this.projectName;
    hoverName = "(" + this.location + ") " + labelName +' -- Asset ID: '+this.recordId;  
    
    total_assets.push(this.recordId)
    
    boxtype = "Box";
    if (this.geo == 1) { classcase = 'Olive'; }
    else if (this.micro == 1) { classcase = 'Purple'; }
    else if(this.reserved == 1) { classcase = 'Orange'; boxtype = 'fixed'; }
    else if (this.lock == 1) { classcase = 'Red'; boxtype = 'fixed'; }
    else classcase = '';

    row = [    startString,
        endString,
        boxtype,
		labelName,
        classcase,
        hoverName,
        this.recordId,
        spdate,
        epdate,
        startString,
        endString,
        this.slot,
        this.projectName,
        this.startDate,
        this.endDate,
	    this.location].join(separator);
    return row;
}


AssetGrouping.prototype.toXMLString = function() {
    var fieldSeparator = this.fieldSeparator; // binding for anonymous function below
    therow = '<I T="' + this.groupingName + '" R="' + this.assetSeparator + this.fieldSeparator + $.map(this.assets,
        function(val, i) {
            return val.toBox(fieldSeparator);
        }).join(this.assetSeparator) + '" />'
    return therow;
}


AssetHeader = function(assetGroupings, header) {
    this.groupings = assetGroupings;
    this.header = header;
}


AssetHeader.prototype.toXMLString = function() {
    return '<I T="' + this.header + '">' + $.map(this.groupings,
        function(val, i) {
            return val.toXMLString()
        }).join(" ") + '</I>'
}

AssetGrouping.prototype.FIELD_SEPARATOR = "&#xF000;";
AssetGrouping.prototype.ASSET_SEPARATOR = "&#xF001;";