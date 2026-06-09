/* =====================================================================
   Aloud — landing page script
   Kept external so the CSP can forbid inline scripts (script-src 'self').
   ===================================================================== */
"use strict";

/* Anonymous analytics — same provider-agnostic shim as the app.
   No names, no emails, no document data. Safe no-op until you wire up
   a provider (e.g. Cloudflare Web Analytics). */
function track(event, props){
  try{
    if(typeof window.aloudAnalytics === "function") window.aloudAnalytics(event, props||{});
    (window.aloudEvents = window.aloudEvents || []).push({event:event, props:props||{}});
  }catch(_){}
}

/* Ads — built but OFF. Flip to true and drop in provider code later. */
const ADS_ENABLED = false;
function initAds(){
  if(!ADS_ENABLED) return;
  document.querySelectorAll("[data-ad-slot]").forEach(function(slot){
    slot.hidden = false;
    // === PASTE AD PROVIDER CODE HERE ===
  });
}

/* Hero background that follows the REAL sky for the visitor's date, time and
   approximate location — not a fixed clock. In British summer, 6pm is still
   bright afternoon (sunset ~9:20pm); in winter it's already dark. This uses a
   compact solar calculation (after Mourner/SunCalc) so the scene matches the
   actual sun. No prompts, no network — location is approximated from the
   browser's time zone. "dark" flips the headline to light text. */
var SUN = (function(){
  var rad = Math.PI/180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad*23.4397;
  function toDays(d){ return d.valueOf()/dayMs - 0.5 + J1970 - J2000; }
  function meanAnomaly(d){ return rad*(357.5291 + 0.98560028*d); }
  function eclipticLong(M){
    var C = rad*(1.9148*Math.sin(M) + 0.02*Math.sin(2*M) + 0.0003*Math.sin(3*M));
    return M + C + rad*102.9372 + Math.PI;
  }
  function dec(L){ return Math.asin(Math.sin(L)*Math.sin(e)); }
  var J0 = 0.0009;
  function cycle(d, lw){ return Math.round(d - J0 - lw/(2*Math.PI)); }
  function transit(Ht, lw, n){ return J0 + (Ht+lw)/(2*Math.PI) + n; }
  function solarTransitJ(ds, M, L){ return J2000 + ds + 0.0053*Math.sin(M) - 0.0069*Math.sin(2*L); }
  function hourAngle(h, phi, d){ return Math.acos((Math.sin(h) - Math.sin(phi)*Math.sin(d))/(Math.cos(phi)*Math.cos(d))); }
  function fromJ(j){ return new Date((j + 0.5 - J1970)*dayMs); }
  return function(date, lat, lng){
    var lw = rad*-lng, phi = rad*lat, d = toDays(date),
        n = cycle(d, lw), ds = transit(0, lw, n),
        M = meanAnomaly(ds), L = eclipticLong(M), dc = dec(L),
        Jnoon = solarTransitJ(ds, M, L);
    function ev(angle){
      var w = hourAngle(rad*angle, phi, dc), Jset = solarTransitJ(transit(w, lw, n), M, L);
      return { set: fromJ(Jset), rise: fromJ(Jnoon - (Jset - Jnoon)) };
    }
    var sr = ev(-0.833), civ = ev(-6), gh = ev(6), astro = ev(-18);
    return {
      nightEnd: astro.rise, dawn: civ.rise, sunrise: sr.rise, goldenEnd: gh.rise,
      solarNoon: fromJ(Jnoon), goldenStart: gh.set, sunset: sr.set, dusk: civ.set, night: astro.set
    };
  };
})();

/* Approximate the visitor's coordinates from their time zone (no permission,
   no network). Falls back to longitude-from-offset + a temperate latitude. */
function visitorCoords(){
  var tz = "";
  try{ tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; }catch(_){}
  var M = {
    "Europe/London":[51.5,-0.1],"Europe/Dublin":[53.3,-6.3],"Europe/Paris":[48.9,2.3],
    "Europe/Madrid":[40.4,-3.7],"Europe/Berlin":[52.5,13.4],"Europe/Rome":[41.9,12.5],
    "Europe/Amsterdam":[52.4,4.9],"Europe/Lisbon":[38.7,-9.1],"Europe/Athens":[38.0,23.7],
    "Europe/Stockholm":[59.3,18.1],"Europe/Warsaw":[52.2,21.0],"Europe/Moscow":[55.8,37.6],
    "America/New_York":[40.7,-74.0],"America/Chicago":[41.9,-87.6],"America/Denver":[39.7,-105.0],
    "America/Los_Angeles":[34.1,-118.2],"America/Toronto":[43.7,-79.4],"America/Mexico_City":[19.4,-99.1],
    "America/Sao_Paulo":[-23.5,-46.6],"America/Buenos_Aires":[-34.6,-58.4],"America/Bogota":[4.7,-74.1],
    "Asia/Tokyo":[35.7,139.7],"Asia/Shanghai":[31.2,121.5],"Asia/Singapore":[1.35,103.8],
    "Asia/Kolkata":[19.1,72.9],"Asia/Dubai":[25.2,55.3],"Asia/Hong_Kong":[22.3,114.2],
    "Asia/Seoul":[37.6,127.0],"Asia/Bangkok":[13.8,100.5],"Asia/Jakarta":[-6.2,106.8],
    "Australia/Sydney":[-33.9,151.2],"Australia/Perth":[-31.9,115.9],"Australia/Melbourne":[-37.8,145.0],
    "Pacific/Auckland":[-36.8,174.8],"Africa/Johannesburg":[-26.2,28.0],"Africa/Cairo":[30.0,31.2],
    "Africa/Lagos":[6.5,3.4],"Africa/Nairobi":[-1.3,36.8]
  };
  if(M[tz]) return M[tz];
  var lng = -new Date().getTimezoneOffset()/60*15;
  return [40, Math.max(-180, Math.min(180, lng))];
}

function pickScene(now, t){
  function before(b){ return (b instanceof Date) && !isNaN(b.valueOf()) && now < b; }
  if(before(t.nightEnd)) return {img:"night",         dark:true};
  if(before(t.dawn))     return {img:"night",         dark:true};
  if(before(t.sunrise))  return {img:"dawn",          dark:false};
  if(before(t.goldenEnd))return {img:"misty-morning", dark:false};
  if(before(t.solarNoon))return {img:"morning",       dark:false};
  if(before(t.goldenStart))return {img:"afternoon",   dark:false};
  if(before(t.sunset))   return {img:"golden-hour",   dark:false};
  if(before(t.dusk))     return {img:"dusk",          dark:true};
  if(before(t.night))    return {img:"twilight",      dark:true};
  return {img:"night", dark:true};
}

function initHeroScene(){
  var stage = document.querySelector(".hero-stage");
  if(!stage) return;
  var pick;
  try{
    var now = new Date(), c = visitorCoords();
    pick = pickScene(now, SUN(now, c[0], c[1]));
  }catch(_){
    var hr = new Date().getHours();
    pick = (hr >= 8 && hr < 19) ? {img:"afternoon", dark:false} : {img:"night", dark:true};
  }
  stage.style.setProperty("--hero-img", "url('assets/" + pick.img + ".jpg')");
  stage.classList.toggle("is-dark", pick.dark);
  track("hero_scene", {scene: pick.img});
}

document.addEventListener("DOMContentLoaded", function(){
  // current year in footer
  var y = document.getElementById("year");
  if(y) y.textContent = String(new Date().getFullYear());

  // measure which call-to-action people click (anonymous)
  document.querySelectorAll("[data-cta]").forEach(function(el){
    el.addEventListener("click", function(){
      track("cta_click", {where: el.getAttribute("data-cta")});
    });
  });

  initHeroScene();
  track("landing_view");
  initAds();
});
