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

  track("landing_view");
  initAds();
});
