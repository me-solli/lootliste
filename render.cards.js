// ============================================================
// D2R LOOTLISTE – CARD ENGINE (ADVANCED VISUAL VERSION)
// Drop‑in replacement for renderCards()
// All existing functionality preserved
// Major visual upgrade layer
// ============================================================

const API = "https://lootliste-production.up.railway.app";

// ------------------------------------------------------------
// CLASS ICONS
// ------------------------------------------------------------

const CLASS_ICONS_MINI = {
  amazon: "img/classes/amazon.png",
  assassin: "img/classes/assassin.png",
  barbarian: "img/classes/barbarian.png",
  druid: "img/classes/druid.png",
  necromancer: "img/classes/necromancer.png",
  paladin: "img/classes/paladin.png",
  sorceress: "img/classes/sorceress.png"
};

const VALID_TYPES = [
  "waffe","helm","ruestung","schild","guertel",
  "handschuhe","schuhe","amulett","ring",
  "charm","rune","sonstiges"
];

// ------------------------------------------------------------
// RELATIVE ACTIVITY
// ------------------------------------------------------------

function relativeTime(date){

  if(!date) return null;

  const diff = Date.now() - new Date(date).getTime();

  const minutes = Math.floor(diff/60000);
  const hours = Math.floor(diff/3600000);
  const days = Math.floor(diff/86400000);

  if(minutes < 60) return {text:"aktiv vor wenigen Minuten",level:"green"};
  if(hours < 24) return {text:`aktiv vor ${hours} Std.`,level:"green"};
  if(days < 7) return {text:`aktiv vor ${days} Tagen`,level:"yellow"};

  return {text:`aktiv vor ${days} Tagen`,level:"gray"};

}

// ------------------------------------------------------------
// MODAL
// ------------------------------------------------------------

function showClaimModal(options={}){

  const {
    title="Aktion bestätigen",
    text="Möchtest du fortfahren?",
    confirmText="Bestätigen"
  } = options;

  return new Promise(resolve=>{

    const overlay=document.createElement("div");

    overlay.className="claim-modal-overlay";

    overlay.innerHTML=`

    <div class="claim-modal">

      <h3>${title}</h3>

      <p>${text}</p>

      <div class="claim-modal-actions">

        <button class="modal-cancel">Abbrechen</button>

        <button class="modal-confirm">${confirmText}</button>

      </div>

    </div>

    `;

    document.body.appendChild(overlay);

    const cleanup=result=>{
      overlay.remove();
      resolve(result);
    }

    overlay.querySelector(".modal-cancel").onclick=()=>cleanup(false);
    overlay.querySelector(".modal-confirm").onclick=()=>cleanup(true);

    overlay.addEventListener("click",e=>{
      if(e.target===overlay) cleanup(false);
    });

  });

}

// ------------------------------------------------------------
// STYLE ENGINE
// ------------------------------------------------------------

(function injectCardStyles(){

if(document.getElementById("lootlist-card-style")) return;

const style=document.createElement("style");

style.id="lootlist-card-style";

style.innerHTML=`

/* =====================================================
CARD BASE
===================================================== */

.card{

position:relative;

background:
radial-gradient(1000px 300px at 50% -200px, rgba(255,210,120,.06), transparent),
linear-gradient(180deg,#161616,#0b0b0b);

border-radius:18px;

border:1px solid rgba(245,196,81,.25);

box-shadow:
0 14px 40px rgba(0,0,0,.75),
inset 0 1px 0 rgba(255,255,255,.05);

transition:
transform .18s ease,
box-shadow .18s ease,
border .18s ease;

overflow:hidden;

}

.card::after{

content:"";

position:absolute;

inset:0;

pointer-events:none;

background:linear-gradient(180deg,rgba(255,255,255,.03),transparent);

}

.card:hover{

transform:translateY(-4px);

box-shadow:
0 20px 55px rgba(0,0,0,.9),
0 0 22px rgba(245,196,81,.18);

}


/* =====================================================
HEADER
===================================================== */

.card-header{

display:flex;

gap:14px;

padding:18px;

cursor:pointer;

align-items:flex-start;

}

.card-chevron{

opacity:.55;

margin-top:2px;

transition:transform .2s ease;

}

.card[data-open="true"] .card-chevron{

transform:rotate(90deg);

}

.item-type-icon{

width:40px;

height:40px;

filter:drop-shadow(0 4px 8px rgba(0,0,0,.7));

}

.card-title{

flex:1;

}


/* =====================================================
ITEM NAME
===================================================== */

.item-name{

font-size:17px;

font-weight:600;

color:#f5c451;

letter-spacing:.3px;

}

.item-details-preview{

font-size:13px;

opacity:.9;

margin-top:2px;

}

.item-meta{

font-size:11px;

opacity:.6;

margin-top:4px;

}


/* =====================================================
RUNE BADGE
===================================================== */

.rune-inline-badge{

margin-left:auto;

padding:6px 12px;

border-radius:999px;

font-size:13px;

font-weight:600;

color:#6fa8ff;

background:rgba(120,170,255,.07);

border:1px solid rgba(120,170,255,.4);

box-shadow:0 0 16px rgba(120,170,255,.35);

}


/* =====================================================
DETAIL AREA
===================================================== */

.card-details{

display:none;

flex-direction:column;

padding:0 18px 18px 18px;

gap:12px;

}

.card[data-open="true"] .card-details{

display:flex;

}


/* =====================================================
ITEM IMAGE
===================================================== */

.card-image{

display:flex;

justify-content:center;

margin-top:4px;

}

.card-image img{

max-width:320px;

width:100%;

border-radius:10px;

border:1px solid rgba(255,255,255,.08);

box-shadow:0 14px 36px rgba(0,0,0,.85);

}


/* =====================================================
DONOR BLOCK
===================================================== */

.donor-row{

display:flex;

align-items:center;

gap:8px;

font-size:13px;

}

.donor-row img{

width:22px;

height:22px;

border-radius:50%;

box-shadow:0 0 6px rgba(0,0,0,.8);

}

.donor-name{

color:#f5c451;

font-weight:600;

}

.donor-stars{

color:#f5c451;

letter-spacing:1px;

}

.donor-activity.green{color:#6fdc6f}

.donor-activity.yellow{color:#f0c35a}

.donor-activity.gray{color:#888}


/* =====================================================
ACTION BUTTON
===================================================== */

.claim-row{

display:flex;

justify-content:center;

margin-top:6px;

}

.claim-btn{

padding:11px 22px;

border-radius:12px;

border:1px solid rgba(245,196,81,.45);

background:#111;

font-size:13px;

cursor:pointer;

transition:all .15s ease;

}

.claim-btn:hover{

background:rgba(245,196,81,.12);

box-shadow:0 0 14px rgba(245,196,81,.4);

}

.claim-btn.rune{

border-color:rgba(120,170,255,.5);

color:#6fa8ff;

box-shadow:0 0 16px rgba(120,170,255,.25);

}

.claim-btn:disabled{

opacity:.5;

cursor:not-allowed;

box-shadow:none;

}


/* =====================================================
MODAL
===================================================== */

.claim-modal-overlay{

position:fixed;

inset:0;

background:rgba(0,0,0,.75);

display:flex;

align-items:center;

justify-content:center;

z-index:9999;

}

.claim-modal{

background:#121212;

padding:26px;

border-radius:16px;

border:1px solid rgba(245,196,81,.5);

max-width:420px;

}

.claim-modal h3{

color:#f5c451;

margin-bottom:10px;

}

.claim-modal-actions{

margin-top:18px;

display:flex;

justify-content:flex-end;

gap:10px;

}

.modal-confirm{

color:#f5c451;

}

`;

 document.head.appendChild(style);

})();


// ------------------------------------------------------------
// CARD RENDERER
// ------------------------------------------------------------

export function renderCards(items, container){

container.innerHTML="";

items.forEach(item=>{

const card=document.createElement("article");

card.className="card";

card.dataset.open="false";

const type=VALID_TYPES.includes(item.type)?item.type:"sonstiges";

const seasonLabel=item.season==="ladder"?"Ladder":"Non-Ladder";

const donorClass=item.donorClass||"";

const donorIcon=donorClass && CLASS_ICONS_MINI[donorClass]

? `<img src="${CLASS_ICONS_MINI[donorClass]}">`

:"";

const trust=item.donorStars||1;

const stars="★".repeat(trust)+"☆".repeat(5-trust);

const activity=relativeTime(item.donorLastActive);

card.innerHTML=`

<button class="card-header" type="button">

<span class="card-chevron">▶</span>

<img class="item-type-icon" src="img/icons/${type}.png" loading="lazy">

<div class="card-title">

<div class="item-name">${item.name || "Item"}</div>

${item.details ? `<div class="item-details-preview">${item.details}</div>` : ""}

${item.roll ? `<div class="item-details-preview">${item.roll}</div>` : ""}

<div class="item-meta">${type} • ${seasonLabel}</div>

</div>

${item.tradeType==="rune" && item.wantedRune

? `<span class="rune-inline-badge">${item.wantedRune}</span>`

: ""}

</button>

<div class="card-details">

${item.screenshot ? `

<div class="card-image">

<img src="${item.screenshot}" alt="Item Screenshot">

</div>

` : ""}

<div class="donor-row">

${donorIcon}

<span class="donor-name">${item.donor || "Unbekannt"}</span>

<span>Lvl ${item.donorLevel || 1}</span>

<span class="donor-stars">${stars}</span>

${activity ? `<span class="donor-activity ${activity.level}">${activity.text}</span>` : ""}

</div>

<div class="claim-row">

<button class="claim-btn ${item.tradeType==="rune" ? "rune" : ""}">

${item.tradeType==="rune"

? `💎 ${item.wantedRune} anbieten`

: "🖐️ Nehmen"}

</button>

</div>

</div>

`;


const header=card.querySelector(".card-header");

header.onclick=()=>{

const open=card.dataset.open==="true";

card.dataset.open=open?"false":"true";

};

const btn=card.querySelector(".claim-btn");

if(item.isOwner){

btn.disabled=true;

btn.textContent="🔒 Dein Item";

}

btn.addEventListener("click",async e=>{

 e.stopPropagation();

 if(btn.disabled) return;

 const isRune=item.tradeType==="rune";

 const confirmed=await showClaimModal({

 title:isRune?"Rune Trade anbieten":"Item reservieren",

 text:"Dein BattleTag wird für die Übergabe verwendet.",

 confirmText:isRune?"Trade senden":"Reservieren"

 });

 if(!confirmed) return;

 btn.disabled=true;

 btn.textContent="…";

 const endpoint=isRune?"rune-request":"claim";

 try{

 await fetch(`${API}/items/${item.id}/${endpoint}`,{

 method:"POST",

 credentials:"include"

 });

 btn.textContent="Gesendet";

 }

 catch{

 btn.disabled=false;

 btn.textContent=isRune

 ? `💎 ${item.wantedRune} anbieten`

 : "🖐️ Nehmen";

 }

});

container.appendChild(card);

});

}
