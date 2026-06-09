/* =====================================================================
   Aloud — reader logic
   Externalised from app.html so the Content-Security-Policy can FORBID
   inline scripts (script-src 'self'), which is the single biggest XSS
   mitigation for a page like this.
   ===================================================================== */
"use strict";

/* pdf.js is self-hosted in /vendor — no third-party CDN to trust. */
pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

/* ----------  Anonymous analytics (provider-agnostic, no PII)  ----------
   track() never sends a name, email, or the document itself — only which
   feature was used. It forwards to whatever provider you wire up later
   (Cloudflare, Plausible, etc.) and is a safe no-op until then. */
function track(event, props){
  try{
    if(typeof window.aloudAnalytics === "function") window.aloudAnalytics(event, props||{});
    (window.aloudEvents = window.aloudEvents || []).push({event:event, props:props||{}});
  }catch(_){ /* analytics must never break the app */ }
}

/* ----------  Ads (built but OFF) -------------------------------------
   Flip ADS_ENABLED to true once you have a provider, then drop the
   provider's code into the marked spot. Nothing loads while it's false. */
const ADS_ENABLED = false;
function initAds(){
  if(!ADS_ENABLED) return;
  document.querySelectorAll("[data-ad-slot]").forEach(function(slot){
    slot.hidden = false;
    // === PASTE AD PROVIDER CODE HERE (e.g. AdSense <ins> + push) ===
    track("ad_slot_shown", {slot: slot.getAttribute("data-ad-slot")});
  });
}

/* ----------  Limits / guards  ---------- */
const MAX_BYTES = 60 * 1024 * 1024; // reject absurdly large files (DoS guard)

/* ----------  State  ---------- */
const synth = window.speechSynthesis;
let sentences = [];      // array of strings
let spans = [];          // array of <span> elements
let idx = 0;             // current sentence index
let playing = false;
let voices = [];

/* ----------  Elements  ---------- */
const $ = id => document.getElementById(id);
const drop = $("drop"), fileInput = $("fileInput");
const empty = $("empty"), readerInner = $("readerInner");
const textEl = $("text"), docTitle = $("docTitle"), fileChip = $("fileChip");
const voiceSel = $("voiceSel"), rate = $("rate"), pitch = $("pitch");
const playBtn = $("playBtn"), playIcon = $("playIcon");
const prevBtn = $("prevBtn"), nextBtn = $("nextBtn"), stopBtn = $("stopBtn");
const progFill = $("progFill"), progText = $("progText"), progCount = $("progCount");

/* small helper: replace an element's children with plain text safely */
function setText(el, str){ el.textContent = str; }
function clear(el){ while(el.firstChild) el.removeChild(el.firstChild); }

/* ----------  Voices  ---------- */
function loadVoices(){
  voices = synth.getVoices();
  if(!voices.length) return;
  const en = voices.filter(v=>/^en/i.test(v.lang));
  const rest = voices.filter(v=>!/^en/i.test(v.lang));
  const ordered = [...en, ...rest];
  // Build <option>s via the DOM (textContent) — voice names come from the
  // OS, so treat them as untrusted and never inject as HTML.
  clear(voiceSel);
  ordered.forEach(function(v){
    const o = document.createElement("option");
    o.value = String(voices.indexOf(v));
    o.textContent = v.name + " — " + v.lang;
    voiceSel.appendChild(o);
  });
  const uk = ordered.findIndex(v=>/en-GB/i.test(v.lang));
  if(uk>=0) voiceSel.value = String(voices.indexOf(ordered[uk]));
}
synth.onvoiceschanged = loadVoices;
loadVoices();

/* ----------  File handling  ---------- */
drop.addEventListener("click", ()=>fileInput.click());
fileInput.addEventListener("change", e=>{ if(e.target.files[0]) handleFile(e.target.files[0]); });
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("drag");}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("drag");}));
drop.addEventListener("drop", e=>{
  const f = e.dataTransfer.files[0];
  if(f) handleFile(f);
});

async function handleFile(file){
  // Validate before touching anything: type + extension + size.
  const looksPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if(!looksPdf){ showError("That doesn’t look like a PDF file."); track("rejected_file",{reason:"type"}); return; }
  if(file.size > MAX_BYTES){ showError("That PDF is too large to read in the browser (over 60 MB)."); track("rejected_file",{reason:"size"}); return; }

  stopReading();
  fileChip.classList.add("active");
  setText(fileChip.querySelector("span"), file.name);
  setText(progText, "Reading PDF…");
  setText(docTitle, "Extracting text…");
  empty.style.display="none"; readerInner.style.display="block";
  clear(textEl);

  try{
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data:buf}).promise;
    let full = "";
    for(let p=1; p<=pdf.numPages; p++){
      setText(progText, `Reading page ${p} of ${pdf.numPages}…`);
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      let last = null, line = "";
      for(const it of content.items){
        const s = it.str;
        if(last!==null && Math.abs(it.transform[5]-last) > 4){ full += line.trim()+"\n"; line=""; }
        line += s + (it.hasEOL ? " " : "");
        last = it.transform[5];
      }
      full += line.trim()+"\n\n";
    }
    track("pdf_loaded", {pages: pdf.numPages, bytes: file.size});
    buildSentences(full, file.name, pdf.numPages);
  }catch(err){
    console.error(err);
    track("pdf_error", {message: String(err && err.message || err).slice(0,120)});
    showError("Sorry — that PDF could not be read. It may be password-protected or corrupted.");
  }
}

/* Render an error WITHOUT ever injecting untrusted text as HTML. */
function showError(msg){
  setText(docTitle, "");
  clear(textEl);
  const box = document.createElement("div");
  box.className = "note";
  const b = document.createElement("b"); b.textContent = "Couldn’t read this PDF. ";
  box.appendChild(b);
  box.appendChild(document.createTextNode(msg));
  textEl.appendChild(box);
  setText(progText, "Couldn’t read file");
}

/* ----------  Build sentence spans  ---------- */
function buildSentences(raw, name, pages){
  const clean = raw.replace(/\s+\n/g,"\n").replace(/[ \t]{2,}/g," ").trim();
  if(!clean || clean.replace(/\s/g,"").length < 4){
    setText(docTitle, "");
    clear(textEl);
    const box = document.createElement("div");
    box.className = "note";
    const b = document.createElement("b"); b.textContent = "No readable text found. ";
    box.appendChild(b);
    box.appendChild(document.createTextNode(
      "This looks like a scanned PDF (an image of a page rather than real text). Reading scanned documents needs OCR, which isn’t built in yet."));
    textEl.appendChild(box);
    setText(progText, "No text");
    track("scanned_pdf_detected", {pages: pages});
    return;
  }
  sentences = clean.match(/[^.!?\n]+[.!?]*\s*|\n+/g)
    .map(s=>s.replace(/\n/g," ").trim())
    .filter(s=>s.length);

  clear(textEl);
  spans = sentences.map((s,i)=>{
    const span = document.createElement("span");
    span.className="sentence";
    span.textContent = s+" ";                 // textContent — never innerHTML
    span.addEventListener("click", ()=>{ idx=i; if(playing) speakCurrent(); else { highlight(); } });
    textEl.appendChild(span);
    return span;
  });

  setText(docTitle, `${name}  ·  ${pages} page${pages>1?"s":""}  ·  ${sentences.length} sentences`);
  idx = 0; highlight();
  [playBtn,prevBtn,nextBtn,stopBtn].forEach(b=>b.disabled=false);
  setText(progText, "Ready to read");
  updateProgress();
}

/* ----------  Speaking  ---------- */
function speakCurrent(){
  synth.cancel();
  if(idx>=sentences.length){ stopReading(); setText(progText,"Finished"); track("finished_reading"); return; }
  const u = new SpeechSynthesisUtterance(sentences[idx]);
  const v = voices[parseInt(voiceSel.value,10)];
  if(v) u.voice = v;
  u.rate = parseFloat(rate.value);
  u.pitch = parseFloat(pitch.value);
  u.onend = ()=>{ if(playing){ idx++; speakCurrent(); } };
  u.onerror = ()=>{ if(playing){ idx++; speakCurrent(); } };
  synth.speak(u);
  highlight();
}

function play(){
  if(!sentences.length) return;
  playing = true;
  setPlayIcon(true);
  setText(progText, "Reading aloud…");
  track("play", {rate: rate.value, pitch: pitch.value});
  speakCurrent();
}
function pause(){
  playing=false; synth.cancel(); setPlayIcon(false);
  setText(progText, "Paused"); track("pause");
}
function stopReading(){
  playing=false; synth.cancel(); idx=0; setPlayIcon(false);
  spans.forEach(s=>s.classList.remove("active","spoken"));
  if(spans.length){ highlight(); setText(progText,"Stopped"); }
  updateProgress();
}

function highlight(){
  spans.forEach((s,i)=>{
    s.classList.toggle("active", i===idx);
    s.classList.toggle("spoken", i<idx);
  });
  const cur = spans[idx];
  if(cur) cur.scrollIntoView({behavior:"smooth", block:"center"});
  updateProgress();
}

function updateProgress(){
  const pct = sentences.length ? (idx/sentences.length)*100 : 0;
  progFill.style.width = pct+"%";
  progCount.textContent = sentences.length ? `${Math.min(idx+1,sentences.length)} / ${sentences.length}` : "";
}

function setPlayIcon(isPlaying){
  // SVG path strings are hard-coded constants, not user data.
  clear(playIcon);
  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", isPlaying ? "M6 5h4v14H6zM14 5h4v14h-4z" : "M8 5v14l11-7z");
  playIcon.appendChild(path);
  playBtn.title = isPlaying ? "Pause" : "Play";
}

/* ----------  Transport buttons  ---------- */
playBtn.addEventListener("click", ()=> playing ? pause() : play());
stopBtn.addEventListener("click", stopReading);
prevBtn.addEventListener("click", ()=>{ idx=Math.max(0,idx-1); playing?speakCurrent():highlight(); });
nextBtn.addEventListener("click", ()=>{ idx=Math.min(sentences.length-1,idx+1); playing?speakCurrent():highlight(); });

rate.addEventListener("input", ()=> $("rateVal").textContent = parseFloat(rate.value).toFixed(1)+"×");
pitch.addEventListener("input", ()=> $("pitchVal").textContent = parseFloat(pitch.value).toFixed(1));
voiceSel.addEventListener("change", ()=> track("voice_changed"));

/* keyboard: space = play/pause */
document.addEventListener("keydown", e=>{
  if(e.code==="Space" && sentences.length && e.target.tagName!=="SELECT"){
    e.preventDefault(); playing?pause():play();
  }
});

/* startup */
track("app_open");
initAds();
