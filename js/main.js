if(window.indexedDB)
{

	var GL_updater = {
	db: null,
	config : {
		db_version: 1,
		api_version: "0.0.1", // supported GLOTR API version
		ogame_version: "5.5.0-rc10", // tested ogame version
		homepage: "http://github.com/hynner/glotr-updater" // tool homepage

	},
	defaults : {
		name: "New GLOTR",
		url: "http://your.domain/path/to/glotr/www/Api/",
		username: "",
		api_key: ""
	},
	root : null,
	addGlotr: function (glotr){
		var trans = GL_updater.db.transaction(["glotrs"], "readonly");
		var store = trans.objectStore("glotrs");
		var maxKey = 0;
		 var request = store.openCursor();
		request.onsuccess = function(e){
			var cursor = request.result || e.result;
			if(cursor && cursor.value){
				maxKey = cursor.primaryKey;
				cursor.continue();
			}
		};
		trans.oncomplete = function (e){
			var trans = GL_updater.db.transaction(["glotrs"], "readwrite");
			var store = trans.objectStore("glotrs");
			try{
				var req = store.add({url: glotr.url, username: glotr.username, api_key: glotr.api_key, name: glotr.name,uni: glotr.uni, active: true, id_glotr: maxKey+1});
				req.onsuccess = GL_updater.refreshMenu;
			}
			catch(e)
			{
				console.log(e);
			}
		};

	},
	updateGlotr: function (glotr){
		var trans = GL_updater.db.transaction(["glotrs"], "readwrite");
		var store = trans.objectStore("glotrs");
		glotr.active = true;
		var req = store.put(glotr);
		req.onsuccess = GL_updater.refreshMenu;

	},
	deleteGlotr: function(id_glotr)
	{
		id_glotr = parseInt(id_glotr, 10);
		if(id_glotr === 0) return;
		var trans = GL_updater.db.transaction(["glotrs"], "readwrite");
		var store = trans.objectStore("glotrs");
		var request = store.delete(id_glotr);
		request.onsuccess = function (e){
			GL_updater.refreshMenu();
			alert("GLOTR deleted!");
		};
		request.onerror = function (e){
			alert("Unable to delete GLOTR!");
			console.log(e);
		};

	},
	getAllGlotrs: function (callback)
	{
		var trans = GL_updater.db.transaction(["glotrs"], "readonly");
		var store = trans.objectStore("glotrs");
		var request = store.openCursor();
		var glotrs = [];
		request.onsuccess = function(e){
			var cursor = request.result || e.result;
			if(cursor && cursor.value){
				glotrs.push(cursor.value);
				cursor.continue();
			}
		};
		trans.oncomplete = function (e){
			callback(glotrs);
		};

	},
	getGlotr: function(id_glotr, callback){
		id_glotr = parseInt(id_glotr, 10);
		if(id_glotr === 0)  callback(GL_updater.defaults);
		var trans = GL_updater.db.transaction(["glotrs"], "readonly");
		var store = trans.objectStore("glotrs");
		var request = store.get(id_glotr);
		request.onsuccess = function(e){
			var cursor = request.result || e.result;
			callback(cursor);
		};
		request.onerror = function(e){
			console.log(e);
		};
	},
	initJquery: function ()
	{
		var timer = null;
		if(document.readyState == "interactive" || document.readyState == "complete")
		{
			clearTimeout(timer);
			// ogame version check
			$.getScript( '/cdn/js/greasemonkey/version-check.js', function() {
				window.oGameVersionCheck('GLOTR-updater', GL_updater.config.ogame_version, GL_updater.config.homepage);
			} );
			GL_updater.root = $("meta[name=glotr-updater-root]").attr("content");
			GL_updater.initHtml();
		}
		else
		{
			timer = setTimeout( GL_updater.initJquery,0);
		}
	},
	initHtml: function ()
	{
		$("#toolLinksWrapper #menuTableTools").append("<li><a class='menubutton' href='javascript:void(0)' id='glotr-updater'>GLOTR updater</a></li>");
		// setup event handlers
		$("#glotr-updater").click(GL_updater.refreshMenu);
		$(document).on("click", "#glotr-delete", function() {GL_updater.deleteGlotr($("#glotr-current").val());});
		$(document).on("submit", "#glotr-form", GL_updater.saveForm);
		$(document).on("change", "#glotr-current", function(){GL_updater.getGlotr($("#glotr-current").val(), GL_updater.displayGlotrSettings);});
	},
	displayGlotrSettings: function(glotr){
		var html = new EJS({url: GL_updater.root + 'templates/settings.ejs'}).render({data: glotr, title: glotr.name});
		$("#glotr-settings").html(html);
	},
	refreshMenu: function(){
		GL_updater.getAllGlotrs(GL_updater.displayMenu);
	},
	displayMenu: function (glotrs)
	{
		var html = new EJS({url: GL_updater.root + 'templates/menu.ejs'}).render({title: "GLOTR Updater settings", glotrs: glotrs, root: GL_updater.root, defaults: GL_updater.defaults});
		$("#inhalt").html(html);
	},
	getFormValues: function(){
		var glotr = {
			url: $("#glotr-url").val().trim(),
			name: $("#glotr-name").val().trim(),
			username: $("#glotr-username").val().trim(),
			api_key: $("#glotr-api-key").val().trim(),
			uni: $("meta[name=ogame-universe]").attr("content")
		};

		if($("#glotr-id").val() !== "0"){
			glotr.id_glotr = parseInt($("#glotr-id").val(), 10);
		}
		return glotr;
	},
	saveForm: function (e){
		e.preventDefault();
		var glotr = GL_updater.getFormValues();
		//if(glotr.url.substr(-1,1) !== "/") glotr.url += "/";
		GL_updater.verify(glotr);
	},
	getCurrentTimestamp: function(){
		var d = new Date();
		return parseInt(d.getTime()/1000);
	},
	verify: function(glotr){
		var query = "uni="+glotr.uni+"&timestamp="+GL_updater.getCurrentTimestamp();
		$.ajax(glotr.url+"verify?"+query, {
			type: "GET",
			headers: {
				Accept: "application/json",
				'X-HTTP-AUTH-USER': glotr.username,
				'X-HTTP-AUTH-TOKEN': CryptoJS.HmacSHA256(query, glotr.api_key),
				'Content-Type': "application/x-www-form-urlencoded"
			},
			error: function(data){
				switch(data.status){
					case 403: // forbidden
						alert("Wrong username or API key. Check your settings!");
						break;
					default: // other errors are likely to be cause either by bug in glotr or by bad url
						alert("Server error! Are you sure you have the right URL?");
						break;
				}

			},
			success: function(data) {
				if(data.status == "OK"){
					// add glotr to database
					if(!glotr.id_glotr){
						GL_updater.addGlotr(glotr);
						alert("GLOTR added!");
					}
					// update glotr
					else{
						GL_updater.updateGlotr(glotr);
						alert("GLOTR updated!");
					}

				}
				else{
					alert("Error - " + data.message);
				}
			}
		});
	},
	constructSettings: function (glotrs)
	{
		//var template = $.template("<form><table><tr><td>${selectGlotr}</td><td><button id='glotr-add'>$")
		console.log(GL_updater.root);
	},
	init: function () {
		var request = indexedDB.open("GLOTR_updater_db", GL_updater.config.db_version);
		request.onerror = function(event) {
		  alert("Why didn't you allow my web app to use IndexedDB?!");
		};

		request.onsuccess = function(event) {
		  GL_updater.db = request.result;
		  GL_updater.initJquery();
		};
		request.onupgradeneeded = function(event){
			var db = event.target.result;
			// Create an objectStore for this database
			var glotrStore = db.createObjectStore("glotrs", { keyPath: "id_glotr" });
		};
	}

	};
	GL_updater.init();
}
else
{
}
