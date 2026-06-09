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

/* Hero background that follows the visitor's local time of day.
   Each slot maps to an image in assets/. "dark" tells us to flip the
   headline to light text (for the darker evening/night skies). */
function pickHero(h){
  if(h < 5)    return {img:"night",         dark:true};
  if(h < 6.5)  return {img:"dawn",          dark:false};
  if(h < 8)    return {img:"misty-morning", dark:false};
  if(h < 11)   return {img:"morning",       dark:false};
  if(h < 16)   return {img:"afternoon",     dark:false};
  if(h < 18)   return {img:"golden-hour",   dark:false};
  if(h < 19.5) return {img:"dusk",          dark:true};
  if(h < 21)   return {img:"twilight",      dark:true};
  return {img:"night", dark:true};
}
function initHeroScene(){
  var stage = document.querySelector(".hero-stage");
  if(!stage) return;
  var now = new Date();
  var pick = pickHero(now.getHours() + now.getMinutes()/60);
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
