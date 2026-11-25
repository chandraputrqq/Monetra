/* Gaya untuk Extras.tsx (Asisten Pintar, Catat Suara, Wrapped). Taruh di src/extras.css */

.xt-page{max-width:880px}
.xt-page .panel h2{display:flex;align-items:center;gap:8px;margin:0 0 12px}
.xt-page .panel h2 svg{color:var(--green);flex:none}

.xt-mute{font-size:13px;line-height:1.65;color:var(--muted);margin:0 0 10px}
.xt-note{font-size:12px;margin:12px 0 0;opacity:.85}
.xt-hl{font-size:13px;line-height:1.6;color:var(--green);background:#34d3991a;border:1px solid #34d39933;border-radius:8px;padding:10px 12px;margin:12px 0}
.xt-sub{font-size:12px;letter-spacing:.4px;color:var(--soft);font-weight:600;margin:18px 0 8px}
.xt-over{color:var(--red,#d18b7e)!important}

.xt-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.xt-list li{display:grid;gap:4px;padding:11px 12px;background:#ffffff05;border:1px solid var(--line);border-radius:8px}
.xt-list li b{font-size:13px;font-weight:500;color:var(--text)}
.xt-list li span{font-size:12px;color:var(--muted);line-height:1.5}

.xt-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center}
.xt-actions select{background:#08100c;border:1px solid var(--line-strong,#ffffff22);color:var(--text);border-radius:6px;padding:9px 10px;font-size:12px;min-width:160px}
.xt-actions .primary-button:disabled{opacity:.45;cursor:not-allowed;transform:none}

/* Amplop gaji: dua slider sejajar, rapi */
.xt-split{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:14px 0 18px}
.xt-split label{display:grid;gap:10px;font-size:13px;font-weight:500;color:var(--soft)}
.xt-split input[type=range]{--v:0%;-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:99px;outline:0;cursor:pointer;
  background:linear-gradient(90deg,var(--green) var(--v),#ffffff14 var(--v))}
.xt-split input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--green);border:3px solid var(--bg);box-shadow:0 0 0 1px var(--green);transition:transform .15s}
.xt-split input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.15)}
.xt-split input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--green);border:3px solid var(--bg)}

.xt-env{display:grid;gap:7px;margin-top:14px}
.xt-env>div:first-child{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
.xt-env b{font-size:13px;font-weight:600;color:var(--text)}
.xt-env span{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}

/* Pilih tahun (Wrapped) */
.xt-years{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px}

/* Tombol suara + popover */
.xt-voice{position:relative;display:inline-flex}
.xt-pop{position:absolute;right:0;top:calc(100% + 8px);z-index:80;width:min(320px,86vw);display:grid;gap:10px;padding:14px;
  background:#0d1511;border:1px solid var(--line-strong,#ffffff22);border-radius:12px;box-shadow:0 18px 40px #0008;animation:xt-pop .18s ease both}
.xt-pop input{background:#08100c;border:1px solid var(--line-strong,#ffffff22);color:var(--text);border-radius:6px;padding:9px 10px;font-size:13px;width:100%;min-width:0}
.xt-pop p{margin:0;font-size:12px;line-height:1.55;color:var(--muted)}
.xt-live{color:var(--green)!important;background:#34d3991f!important;animation:xt-pulse 1.1s ease-in-out infinite}

@keyframes xt-pop{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@keyframes xt-pulse{0%,100%{box-shadow:0 0 0 0 #34d39955}50%{box-shadow:0 0 0 7px #34d39900}}

@media (max-width:640px){
  .xt-split{grid-template-columns:1fr}
  .xt-pop{right:-40px}
}
