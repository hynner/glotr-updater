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
		$(document).ajaxSuccess(GL_updater.proccessAjax);
		GL_updater.proccessPage();


	},
	proccessPage: function (){
		var page = GL_updater.getQueryValueFromUrl(document.location.href, "page");
		if(page){
			switch(page){
				case "resources":
					var buildings = {
						supply22: "metal_storage",
						supply23: "crystal_storage",
						supply24: "deuterium_tank",
					};
					var params = {
						method: "PATCH",
						url: "universe/"+GL_updater.getMetaContent("ogame-planet-id")
					};
					if(GL_updater.getMetaContent("ogame-planet-type") == "moon"){
						params.url += "/moon";
					}
					else{
						// buildings not buildable on moon cannot be submitted and vice-versa
						buildings["supply1"] =  "metal_mine";
						buildings["supply2"] = "crystal_mine";
						buildings["supply3"] = "deuterium_synthesizer";
						buildings["supply4"] = "solar_plant";
						buildings["supply12"] = "fusion_reactor";
						buildings["supply25"] = "shielded_metal_den";
						buildings["supply26"] = "underground_crystal_den";
						buildings["supply27"] = "seabed_deuterium_den";
					}
					var fleet = {supply212: "solar_satellite"};
					var update = {
						resources: GL_updater.getResourcesFromPage(),
						buildings: GL_updater.getItemsFromPage(buildings),
						fleet: GL_updater.getItemsFromPage(fleet),
						defence: [] // it´s gotta be [] otherwise request fails!!
					};
					GL_updater.massSubmitUpdate(params, update);
					break;
				case "station":
					var buildings = {
						station14: "robotics_factory",
						station21: "shipyard",
					};
					var params = {
						method: "PATCH",
						url: "universe/"+GL_updater.getMetaContent("ogame-planet-id")
					};
					if(GL_updater.getMetaContent("ogame-planet-type") == "moon"){
						params.url += "/moon";
						buildings["station41"] = "lunar_base";
						buildings["station42"] = "sensor_phalanx";
						buildings["station43"] = "jump_gate";
					}
					else{
						// buildings not buildable on moon cannot be submitted and vice-versa
						buildings["station31"] =  "research_lab";
						buildings["station34"] = "alliance_depot";
						buildings["station44"] = "missile_silo";
						buildings["station15"] = "nanite_factory";
						buildings["station33"] = "terraformer";
					}
					var update = {
						resources: GL_updater.getResourcesFromPage(),
						buildings: GL_updater.getItemsFromPage(buildings),
						fleet: [],
						defence: [] // it´s gotta be [] otherwise request fails!!
					};
					GL_updater.massSubmitUpdate(params, update);
					break;
				case "shipyard":
					var params = {
						method: "PATCH",
						url: "universe/"+GL_updater.getMetaContent("ogame-planet-id")
					};
					if(GL_updater.getMetaContent("ogame-planet-type") == "moon"){
						params.url += "/moon";
					}
					var fleet = {
						military204: "light_fighter",
						military205: "heavy_fighter",
						military206: "cruiser",
						military207: "battleship",
						military215: "battlecruiser",
						military211: "bomber",
						military213: "destroyer",
						military214: "deathstar",
						civil202: "small_cargo",
						civil203: "large_cargo",
						civil208: "colony_ship",
						civil209: "recycler",
						civil210: "espionage_probe",
						civil212: "solar_satellite"
					};
					var update = {
						resources: GL_updater.getResourcesFromPage(),
						buildings: [],
						fleet:  GL_updater.getItemsFromPage(fleet),
						defence: [] // it´s gotta be [] otherwise request fails!!
					};
					GL_updater.massSubmitUpdate(params, update);
					break;
				case "defense":
					var defense = {
						defense401: "rocket_launcher",
						defense402: "light_laser",
						defense403: "heavy_laser",
						defense404: "gauss_cannon",
						defense405: "ion_cannon",
						defense406: "plasma_turret",
						defense407: "small_shield_dome",
						defense408: "large_shield_dome",

					};
					var params = {
						method: "PATCH",
						url: "universe/"+GL_updater.getMetaContent("ogame-planet-id")
					};
					if(GL_updater.getMetaContent("ogame-planet-type") == "moon"){
						params.url += "/moon";
					}
					else{
						// ABMs and IPMs are neither shown nor buidable on moon
						defense["defense502"] = "antiballistic_missiles";
						defense["defense503"] = "interplanetary_missiles";
					}
					var update = {
						resources: GL_updater.getResourcesFromPage(),
						buildings: [],
						fleet:  [],
						defence: GL_updater.getItemsFromPage(defense)
					};
					GL_updater.massSubmitUpdate(params, update);
					break;
				case "fleet1":
					var params = {
						method: "PATCH",
						url: "universe/"+GL_updater.getMetaContent("ogame-planet-id")
					};
					if(GL_updater.getMetaContent("ogame-planet-type") == "moon"){
						params.url += "/moon";
					}
					var fleet = {
						button204: "light_fighter",
						button205: "heavy_fighter",
						button206: "cruiser",
						button207: "battleship",
						button215: "battlecruiser",
						button211: "bomber",
						button213: "destroyer",
						button214: "deathstar",
						button202: "small_cargo",
						button203: "large_cargo",
						button208: "colony_ship",
						button209: "recycler",
						button210: "espionage_probe",
						button212: "solar_satellite"
					};
					var update = {
						resources: GL_updater.getResourcesFromPage(),
						buildings: [],
						fleet:  GL_updater.getItemsFromPage(fleet, "#"),
						defence: [] // it´s gotta be [] otherwise request fails!!
					};
					GL_updater.massSubmitUpdate(params, update);
					break;
				case "research":
					var params = {
						method: "PATCH",
						url: "players/"+GL_updater.getMetaContent("ogame-player-id")
					};
					var researches = {
						research113: "energy_technology",
						research120: "laser_technology",
						research121: "ion_technology",
						research114: "hyperspace_technology",
						research122: "plasma_technology",
						research115: "combustion_drive",
						research117: "impulse_drive",
						research118: "hyperspace_drive",
						research106: "espionage_technology",
						research108: "computer_technology",
						research124: "astrophysics",
						research123: "intergalactic_research_network",
						research199: "graviton_technology",
						research109: "weapons_technology",
						research110: "shielding_technology",
						research111: "armour_technology",
					};
					var update = {
						playername: GL_updater.getMetaContent("ogame-player-name"),
						id_alliance: (GL_updater.getMetaContent("ogame-alliance-id") || 0),
						researches:  GL_updater.getItemsFromPage(researches),
					};
					GL_updater.massSubmitUpdate(params, update);
					break;
				case "overview":
				default:
					break;
			}
		}
	},
	massSubmitUpdate: function(params, update){
		GL_updater.getAllGlotrs(function(glotrs){
			for(g in glotrs){
				GL_updater.submitUpdate(glotrs[g], params, update);
			}
		});
	},
	submitUpdate: function(glotr, params, update){
		// to avoid forgetting it
		update.timestamp = GL_updater.getCurrentTimestamp();
		update = JSON.stringify(update);
		$.ajax(glotr.url+params.url,{
			type: params.method,
			data: update,
			headers: {
				Accept: "application/json",
				'X-HTTP-AUTH-USER': glotr.username,
				'X-HTTP-AUTH-TOKEN': CryptoJS.HmacSHA256(update, glotr.api_key),
				'Content-Type': "application/json"
			},
			success: function(e){
				console.log(e, "success");
			},
			error: function(e){
				console.log(e);
			},
		});
	},
	getResourcesFromPage: function(){
		return {
			metal: parseInt($("#resources_metal").html().replace(/\./g, ""), 10),
			crystal: parseInt($("#resources_crystal").html().replace(/\./g, ""), 10),
			deuterium: parseInt($("#resources_deuterium").html().replace(/\./g, ""), 10),
			energy: parseInt($("#resources_energy").html().replace(/\./g, ""), 10)
		};

	},
	getItemsFromPage: function(items, prefix) {
		prefix = typeof prefix !== 'undefined' ? prefix : ".";
		var ret = {};
		for(key in items){
			var tmp = $(prefix+key+" .level");
			if(tmp.length !== 0){
				ret[items[key]] = parseInt(tmp.clone().children().remove().end().text().match(/[\d\.]*\s*$/)[0].replace(/\./g, ""),10);
			}
			else{
				ret[items[key]] = 0;
			}
		}
		return ret;
	},
	proccessAjax: function(e, xhr, settings){
		console.log(settings, xhr);
		var page = GL_updater.getQueryValueFromUrl(settings.url, "page");
		switch(page){
			case "allianceOverview":

				var action = GL_updater.getQueryValueFromUrl(settings.url, "action");
				switch(action){
					// I don´t want to process these
					case "20":
					case "21":
						break;
					case "":
					default:
						// it has to be {} otherwise it will automatically create lots of indexes
						var members = {};
						// skip header and footer
						var list = $("#member-list tr");
						if(!list) break; // current player doesn´t see member list at all
						list.slice(1, -1).each(function(){
							var id = GL_updater.getQueryValueFromUrl($(this).find(".member_score a").attr("href"), "searchRelId");
							var on = null;
							var cols = $(this).find("td");
							if(cols.length === 8){
								var span = $(cols[6]).find("span");
								// online
								if(span.hasClass("undermark")){
									on = GL_updater.getCurrentTimestamp();
								}
								// offline
								else if(span.hasClass("overmark")){
									on = false;
								}
								// was online less than an hour ago
								else{
									on = GL_updater.getCurrentTimestamp() - parseInt(span.text(), 10)*60;
								}
							}
							members[id] = on;
						});

						var params = {
							method: "POST",
							url: "alliances/"+GL_updater.getMetaContent("ogame-alliance-id")
						};
						var update = {
							/** @TODO update alliance as well */
							alliance: [],
							members: members
						};
						GL_updater.massSubmitUpdate(params, update);
						break;
				};

				break;
			case "galaxyContent":
				var table = $("#galaxytable");
				var planets = {};
				table.find("tr.row").each(function() {
					var pos = $(this).find("td.position").text();
					 // empty position
					if($(this).find("td.planetEmpty").length !== 0){
						planets[pos] = [];
					}
					// not empty position
					else{
						var alliance = [];
						var alli = $(this).find("td.allytag");
						if(alli.text().trim() !== ""){
							alliance = {
								id: alli.find(".allytagwrapper").attr("rel").replace("alliance", ""),
								tag: alli.find(".allytagwrapper").clone().children().remove().end().text().trim(),
							};
							alliance.name = $("#alliance" + alliance.id + " h1")[0].innerText.trim();
						}
						var p = $(this).find("td.playername");
						var status = "";
						var s = p.find("span.status");
						if(s.text() !== ""){
							if(s.find(".status_abbr_admin").length !== 0){
								status += "a";
							}
							if(s.find(".status_abbr_outlaw").length !== 0){
								status += "o";
							}
							if(s.find(".status_abbr_vacation").length !== 0){
								status += "v";
							}
							if(s.find(".status_abbr_banned").length !== 0){
								status += "b";
							}
							if(s.find(".status_abbr_inactive").length !== 0){
								status += "i";
							}
							if(s.find(".status_abbr_longinactive").length !== 0){
								status += "I";
							}
						}
						console.log(alliance);
						var player = {
							playername: p.find("a.tooltipRel span").text().trim(),
							status: status,
							alliance: alliance
						};
						if(player.playername === ""){
							player.playername = GL_updater.getMetaContent("ogame-player-name");
							player.id = GL_updater.getMetaContent("ogame-player-id");
						}
						else{
							player.id = p.find("a.tooltipRel").attr("rel").replace("player", "");
						}
						var debris = $("#debris" + pos);
						var df = {
								metal: (debris.length !== 0) ? parseInt(debris.find(".debris-content")[0].innerText.match(/[\d\.]*$/)[0].replace(/\./g, ""),10) : 0,
								crystal: (debris.length !== 0) ? parseInt(debris.find(".debris-content")[1].innerText.match(/[\d\.]*$/)[0].replace(/\./g, ""),10) : 0,
						};
						var moon = [];
						var mid = $(".js_moon" + pos).attr("data-moon-id");
						if(mid !== undefined){
							var m = $("#moon" + pos);
							moon = {
								id: mid,
								name: m.find("h1").text().trim(),
								size: parseInt(m.find("#moonsize").text(), 10),
								activity: GL_updater.getActivity($(".js_moon" + pos + " .activity")),
							};
						}

						var planet = {
							name: $(this).find("td.planetname").text().trim(),
							id: $(this).find("td.microplanet").attr("data-planet-id"),
							player: player,
							df: df,
							moon: moon,
							activity: GL_updater.getActivity($(this).find(".microplanet .activity")),
						};

						planets[pos] = planet;
					}
				});
				var update = {
					galaxy: table.attr("data-galaxy"),
					system: table.attr("data-system"),
					planets: planets
				};
				var params = {
					method: "POST",
					url: "universe"
				};
				GL_updater.massSubmitUpdate(params, update);
				break;
		};

	},
	getActivity: function(act){
		if(act.length === 0){
			return false;
		}
		// user has detailed activity disabled => activity isn´t precise so send activity uknown = null
		else if(act.hasClass("minute60")){
			return null;
		}
		else{
			var tmp = GL_updater.getCurrentTimestamp();
			if(!act.hasClass("minute15")){
				tmp -= parseInt(act.text(), 10)*60;
			}
			return tmp;
		}
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
	getMetaContent: function(name){
		return $("meta[name="+name+"]").attr("content");
	},
	getQueryValueFromUrl: function(url, parameter){
		var r = new RegExp(parameter + "=([^&]*)");
		var m = url.match(r);
		return (m) ? m[1] : "";
	},
	getFormValues: function(){
		var glotr = {
			url: $("#glotr-url").val().trim(),
			name: $("#glotr-name").val().trim(),
			username: $("#glotr-username").val().trim(),
			api_key: $("#glotr-api-key").val().trim(),
			uni: GL_updater.getMetaContent("ogame-universe")
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
