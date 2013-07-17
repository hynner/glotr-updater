if(window.indexedDB)
{

	var GL_updater = {
	db: null,
	config : {
		db_version: 3,
		api_version: "0.0.1", // supported GLOTR API version
		ogame_version: "5.5.2", // tested ogame version
		homepage: "http://github.com/hynner/glotr-updater" // tool homepage

	},
	defaults : {
		name: "New GLOTR",
		url: "http://your.domain/path/to/glotr/www/Api/",
		username: "",
		api_key: ""
	},
	mapping: {
		techs: {
			moon_building: {
				14:"robotics_factory",
				21:"shipyard",
				22:"metal_storage",
				23:"crystal_storage",
				24:"deuterium_tank",
				41:"lunar_base",
				42:"sensor_phalanx",
				43:"jump_gate",
			},
			planet_building: {
				1:"metal_mine",
				2:"crystal_mine",
				3:"deuterium_synthesizer",
				4:"solar_plant",
				12:"fusion_reactor",
				14:"robotics_factory",
				15:"nanite_factory",
				21:"shipyard",
				22:"metal_storage",
				23:"crystal_storage",
				24:"deuterium_tank",
				25:"shielded_metal_den",
				26:"underground_crystal_den",
				27:"seabed_deuterium_den",
				31:"research_lab",
				33:"terraformer",
				34:"alliance_depot",
				44:"missile_silo"
			},
			research: {
				106:"espionage_technology",
				108:"computer_technology",
				109:"weapons_technology",
				110:"shielding_technology",
				111:"armour_technology",
				113:"energy_technology",
				114:"hyperspace_technology",
				115:"combustion_drive",
				117:"impulse_drive",
				118:"hyperspace_drive",
				120:"laser_technology",
				121:"ion_technology",
				122:"plasma_technology",
				123:"intergalactic_research_network",
				124:"astrophysics",
				199:"graviton_technology"
			},
			fleet: {
				202:"small_cargo",
				203:"large_cargo",
				204:"light_fighter",
				205:"heavy_fighter",
				206:"cruiser",
				207:"battleship",
				208:"colony_ship",
				209:"recycler",
				210:"espionage_probe",
				211:"bomber",
				212:"solar_satellite",
				213:"destroyer",
				214:"deathstar",
				215:"battlecruiser"
			},
			planet_defence: {
				401:"rocket_launcher",
				402:"light_laser",
				403:"heavy_laser",
				404:"gauss_cannon",
				405:"ion_cannon",
				406:"plasma_turret",
				407:"small_shield_dome",
				408:"large_shield_dome",
				502:"antiballistic_missiles",
				503:"interplanetary_missiles"
			},
			moon_defence: {
				401:"rocket_launcher",
				402:"light_laser",
				403:"heavy_laser",
				404:"gauss_cannon",
				405:"ion_cannon",
				406:"plasma_turret",
				407:"small_shield_dome",
				408:"large_shield_dome"
			}
		}
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
	downloadLocalization: function(callback){
		$.ajax("../api/localization.xml", {
			type: "GET",
			dataType: "xml",
			success: function(data){
				var res = {
					techs: {},
					missions: {}
				};
				$(data).find("techs name").each(function() {
					res.techs[$(this).attr("id")] = $(this).text();
				});
				callback(res);
			}
		});
	},
	getTechs: function (callback)
	{
		var trans = GL_updater.db.transaction(["glotr_techs"], "readonly");
		var store = trans.objectStore("glotr_techs");
		var request = store.count();
		var techs = {};
		request.onsuccess = function(e){
			var count = this.result;
			if(count === 0){
				techs = GL_updater.downloadLocalization(function(data){
					techs = data.techs;
					var store = GL_updater.db.transaction(["glotr_techs"], "readwrite").objectStore("glotr_techs");
					for(var id in techs){
						var tmp = {
							id_tech: id,
							name: techs[id]
						};
						store.put(tmp);
					}
					callback(techs);
				});
			}
			else{
				var request = store.openCursor();
				request.onsuccess = function(e){
					var cursor = this.result;
					if(cursor && cursor.value){
						techs[cursor.value.id_tech] = cursor.value.name;
						cursor.continue();
					}
				};
			}
		};
		trans.oncomplete = function (e){
			callback(techs);
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
	string2Number: function(str){
		// as seen on uni680, int may not be long enough
		return str.replace(/\./g, "");
	},
	getItemsFromPage: function(items, prefix) {
		prefix = typeof prefix !== 'undefined' ? prefix : ".";
		var ret = {};
		for(key in items){
			var tmp = $(prefix+key+" .level");
			if(tmp.length !== 0){
				ret[items[key]] = GL_updater.string2Number(tmp.clone().children().remove().end().text().match(/[\d\.]*\s*$/)[0]);
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
			case "messages":
				// exclude header and footer
				//var messages = $("#mailz > tbody > tr").slice(1, -1);
				// if show full espionage reports is enabled
				var messages = $(xhr.responseText);
				var espionages = messages.find("#mailz > tbody > tr[id^='spioDetails']");
				if(espionages.length > 0){
					GL_updater.getTechs(function(techs) {
						var reports = {};
						espionages.each(function() {
							var id = parseInt($(this).attr("id").replace("spioDetails_", ""));

							var time = GL_updater.dateToTimestamp(messages.find("#TR"+id+" .date").text());

							// if there is any activity there is a red number in activity text
							var activity = $($(this).find(".aktiv	tr")[1]).find("font");
							if(activity.length === 0){
								activity = false;
							}
							else{
								activity = parseInt(activity.text());
								if(activity === 15){
									activity = 0;
								}
								activity = time - activity*60;
							}
							var coords = $(this).find(".material a").text().replace(/\[|\]/g, "").split(":");
							var moon = $(this).find(".material figure.moon").length > 0;
							var items = $(this).find(".fleetdefbuildings");
							var depth = items.length;
							var fleet = [];
							var defence = [];
							var building = [];
							var research = [];
							var prefix = ((moon) ? "moon_" : "planet_");
							switch(depth){
								case 4:
									research = GL_updater.extractEspionageValues(items[3], techs, GL_updater.mapping.techs.research);
								case 3:
									building = GL_updater.extractEspionageValues(items[2], techs, GL_updater.mapping.techs[prefix + "building"]);
								case 2:
									defence = GL_updater.extractEspionageValues(items[1], techs, GL_updater.mapping.techs[prefix + "defence"]);
								case 1:
									fleet = GL_updater.extractEspionageValues(items[0], techs, GL_updater.mapping.techs.fleet);
								case 0:
							}
							depth = ["resources", "fleet","defence", "buidling", "research"][depth];
							var resources = $(this).find(".material .areadetail .fragment td");

							var report = {
								timestamp: time,
								activity: activity,
								coordinates: {
									galaxy: coords[0],
									system: coords[1],
									position: coords[2],
									moon: moon
								},
								scan_depth: depth,
								playername: $(this).find(".material .area span:last-of-type").text(),
								resources: {
									metal: GL_updater.string2Number(resources[1].innerText.trim()),
									crystal: GL_updater.string2Number(resources[3].innerText.trim()),
									deuterium: GL_updater.string2Number(resources[5].innerText.trim()),
									energy: GL_updater.string2Number(resources[7].innerText.trim())
								},
								fleet: fleet,
								defence: defence,
								building: building,
								research: research
							};
							reports[id] = report;
						});
						var update = {
							espionage_reports: reports,
						};
						var params = {
							method: "POST",
							url: "messages"
						};
						GL_updater.massSubmitUpdate(params, update);
					});

				}
				break;
		};

	},
	getGlotrKey: function(str, techs, mappings){
		for(var k in techs){
			if(str === techs[k]){
				return mappings[k];
			}
		}
	},
	extractEspionageValues: function(part, techs, mappings){
		var ret = {};
		cells = $(part).find("td");
		for(var i = 0; i < cells.length; i += 2){
			if(cells[i].innerText.trim() !== ""){
				ret[GL_updater.getGlotrKey(cells[i].innerText, techs, mappings)] = GL_updater.string2Number(cells[i+1].innerText);
			}
		}
		for(var k in mappings){
			if(!(mappings[k] in ret)){
				ret[mappings[k]] = 0;
			}
		}
		return ret;
	},
	dateToTimestamp: function(date){
		var time = date.split(" ");
		date = time[0].split(".");
		time = time[1].split(":");
		time = new Date(date[2], date[1]-1, date[0], time[0], time[1], time[2]);
		// javascript has timestamps in miliseconds
		return time.getTime()/1000;
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
			var a = db.createObjectStore("glotr_techs", { keyPath: "id_tech" });
			var b = db.createObjectStore("glotr_missions", { keyPath: "id_mission" });
		};
	}

	};
	GL_updater.init();
}
else
{
}
