
var scripts = ["js/lib/crypto-js/hmac-sha256.js", "js/lib/ejs/ejs_production.js", "js/lib/ejs/view.js", "js/main.js"];
for(sc in scripts)
{
	var s = document.createElement('script');
	s.src = chrome.extension.getURL(scripts[sc]);
	s.onload = function() {
		this.parentNode.removeChild(this);
	};
	(document.head||document.documentElement).appendChild(s);
}

var meta = document.createElement("meta");
meta.name = "glotr-updater-root";
meta.content = chrome.extension.getURL('/');

(document.head||document.documentElement).appendChild(meta);
