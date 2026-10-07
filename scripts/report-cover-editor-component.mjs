// Inserted into the legacy React tree at build time. React owns the controls.
export function NumeriaCoverEditor(props) {
  const React = i, h = React.createElement;
  const scope = props.scope || "numerology";
  const storeKey = "numeria.reportFormat.cover." + scope + ".v1";
  const defaults = { practitioner: true, client: true, logo: true, clientName: "", logoType: "standard" };
  function read() {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(storeKey) || "{}") }; }
    catch { return { ...defaults }; }
  }
  const [options, setOptions] = React.useState(read);
  const canUpload = props.canUpload;
  const customLogo = canUpload && options.logoType === "custom" && props.logo;
  React.useEffect(() => {
    function restore(event) { if (event.detail.scope === scope) setOptions(read()); }
    window.addEventListener("numeria-cover-restored", restore);
    return () => window.removeEventListener("numeria-cover-restored", restore);
  }, [scope]);
  React.useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify(options));
    localStorage.setItem("numeria.reportFormat.displayOptions.v1", JSON.stringify(options));
    for (const key of ["logo", "client", "practitioner"]) document.documentElement.classList.toggle("numeria-hide-report-" + key, !options[key]);
  }, [options]);
  const update = (key, value) => setOptions(previous => ({ ...previous, [key]: value }));
  const labelStyle = { display: "grid", gap: 8, minWidth: 0, fontSize: 15, color: "#332e40" };
  const controlStyle = { display: "block", position: "static", width: "100%", height: 54, minHeight: 54, boxSizing: "border-box", padding: "10px 14px", border: "1px solid #bcb5c6", borderRadius: 8, background: "#fff", color: "#211c36", fontSize: 18, opacity: 1, visibility: "visible", pointerEvents: "auto" };
  const fontFamily = props.font === "modern" ? "Arial, 'Noto Sans JP', sans-serif" : "'Yu Mincho', 'Noto Serif JP', serif";
  function field(label, value, onChange, placeholder) {
    return h("label", { style: labelStyle }, h("span", null, label), h("input", { type: "text", value, placeholder, style: controlStyle, onChange: event => onChange(event.target.value) }));
  }
  function toggle(key, label) {
    return h("label", { style: { display: "flex", alignItems: "center", gap: 12, minHeight: 52, fontSize: 18, cursor: "pointer", touchAction: "manipulation" } }, h("input", { type: "checkbox", checked: options[key], style: { position: "static", width: 30, height: 30, flexShrink: 0, margin: 0, accentColor: "#b49349" }, onChange: event => update(key, event.target.checked) }), h("span", null, label));
  }
  return h("section", { className: "numeria-cover-editor", "aria-label": "表紙項目", style: { display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 20, marginTop: 24, padding: 16, border: "1px solid #ded8e3", borderRadius: 12, background: "#fff", minWidth: 0 } },
    h("h3", { style: { margin: 0, padding: "10px 12px", borderLeft: "4px solid #b49349", background: "#fbf8f0", fontSize: 22 } }, "表紙項目"),
    field("表紙タイトル", props.title, props.onTitle, "鑑定書のタイトル"),
    h("div", { style: { display: "grid", gap: 8 } }, toggle("practitioner", "占い師の名前を表示"), field("占い師名", props.practitioner, props.onPractitioner, "占い師名")),
    h("div", { style: { display: "grid", gap: 8 } }, toggle("client", "お客様の名前を表示"), field("お客様名", options.clientName, value => update("clientName", value), "お客様名")),
    h("div", { style: { display: "grid", gap: 8 } }, toggle("logo", "ロゴを表示"),
      h("label", { style: labelStyle }, h("span", null, "ロゴ"), h("select", { "aria-label": "ロゴ", value: canUpload ? options.logoType : "standard", disabled: !options.logo, style: { ...controlStyle, appearance: "auto", opacity: options.logo ? 1 : 0.45 }, onChange: event => { update("logoType", event.target.value); if(event.target.value === "standard") props.onClearLogo(); } }, h("option", { value: "standard" }, "Numeria Studio ロゴ"), h("option", { value: "custom", disabled: !canUpload }, canUpload ? "専用ロゴ" : "専用ロゴ（Pro）"))),
      canUpload && options.logoType === "custom" && h("label", { style: { ...labelStyle, opacity: options.logo ? 1 : 0.45 } }, h("span", null, "ロゴ画像"), h("input", { type: "file", accept: "image/png,image/jpeg,image/webp", disabled: !options.logo, style: { ...controlStyle, height: "auto", padding: 12 }, onChange: event => props.onLogo(event.target.files?.[0]) }), props.logo && h("img", { src: props.logo, alt: "選択したロゴ", style: { maxWidth: 120, maxHeight: 80, objectFit: "contain" } }))),
    h("label", { style: labelStyle }, h("span", null, "書体"), h("select", { value: props.font, "aria-label": "書体", style: { ...controlStyle, appearance: "auto", WebkitAppearance: "menulist", paddingRight: 28 }, onChange: event => props.onFont(event.target.value) }, h("option", { value: "classic" }, "クラシック（明朝）"), h("option", { value: "modern" }, "モダン（ゴシック）"))),
    h("div", { style: { display: "grid", gap: 12 } }, h("h4", { style: { margin: 0, fontSize: 16 } }, "表紙プレビュー"),
      h("div", { className: "numeria-cover-preview", style: { display: "grid", justifyItems: "center", gap: 18, minHeight: 240, padding: "28px 16px", border: "1px solid " + props.accent, borderRadius: 8, background: props.background, color: props.ink || props.accent, textAlign: "center", fontFamily, overflowWrap: "anywhere" } },
        options.logo && (customLogo ? h("img", { src: customLogo, alt: "表紙ロゴ", style: { maxWidth: 120, maxHeight: 70, objectFit: "contain" } }) : h("span", { style: { fontFamily: "serif", border: "1px solid currentColor", padding: "6px 12px", fontSize: 16 } }, "N")),
        h("strong", { style: { fontFamily: "inherit", fontSize: 24, fontWeight: 500 } }, props.title || "鑑定書"), options.client && h("span", null, options.clientName || "お客様名"), options.practitioner && h("span", null, props.practitioner || "占い師名"))));
}

export const coverEditorRuntime = `${NumeriaCoverEditor.toString()}
window.NumeriaCoverSettings={read(scope){try{return JSON.parse(localStorage.getItem('numeria.reportFormat.cover.'+scope+'.v1')||'{}')}catch{return {}}},restore(scope,options){localStorage.setItem('numeria.reportFormat.cover.'+scope+'.v1',JSON.stringify(options||{}));window.dispatchEvent(new CustomEvent('numeria-cover-restored',{detail:{scope}}))}};`;

export function patchCoverEditor(source) {
  if (source.includes('function NumeriaCoverEditor(')) return source;
  function once(old, next, label) {
    if (source.split(old).length !== 2) throw new Error(`Cover editor patch: ${label} anchor mismatch`);
    source = source.replace(old, next);
  }
  const standardProps = 'scope:l,title:wt,onTitle:Tt,practitioner:Et,onPractitioner:Dt,font:St,onFont:Ct,logo:Vt,onLogo:Ai,onClearLogo:()=>Ht(null),canUpload:ar!==`free`||tr===`admin`,accent:vt,background:bt';
  const tarotProps = 'scope:`tarot`,title:sn,onTitle:cn,practitioner:Et,onPractitioner:Dt,font:St,onFont:Ct,logo:Vt,onLogo:Ai,onClearLogo:()=>Ht(null),canUpload:ar!==`free`||tr===`admin`,accent:ln,background:dn,ink:pn';
  const presetEnd = ']},e.id))]}),(0,Z.jsxs)(`div`,{className:`preset-count`';
  once(presetEnd, ']},e.id))]}),(0,Z.jsx)(NumeriaCoverEditor,{' + standardProps + '},l),(0,Z.jsxs)(`div`,{className:`preset-count`', 'standard editor');
  once('children:[W.name,`で保存したプリセット`]', 'children:[W.name,`で保存したプリセット　`,Ir.length,` / `,tr===`admin`?`制限なし`:ar===`free`?1:20]', 'preset count');
  const tarotControls = 'className:`tarot-settings-controls no-print`,children:[';
  once(tarotControls, tarotControls + '(0,Z.jsxs)(`div`,{className:`setting-card tarot-basic-card format-basic-card`,children:[(0,Z.jsxs)(`div`,{className:`setting-card-title`,children:[(0,Z.jsx)(`span`,{children:`1`}),(0,Z.jsx)(`h2`,{children:`基本情報`})]}),(0,Z.jsx)(NumeriaCoverEditor,{' + tarotProps + '},`tarot`)]}),', 'tarot editor');
  const title = '(0,Z.jsxs)(`label`,{children:[`表紙タイトル`,(0,Z.jsx)(`input`,{value:wt,onChange:e=>Tt(e.target.value)})]})';
  const tarotTitle = '(0,Z.jsxs)(`label`,{children:[`表紙タイトル`,(0,Z.jsx)(`input`,{value:sn,onChange:e=>cn(e.target.value)})]})';
  const practitioner = '(0,Z.jsxs)(`label`,{children:[`占い師名`,(0,Z.jsx)(`input`,{value:Et,onChange:e=>Dt(e.target.value)})]})';
  const font = '(0,Z.jsxs)(`label`,{children:[`書体`,(0,Z.jsxs)(`select`,{value:St,onChange:e=>Ct(e.target.value),children:[(0,Z.jsx)(`option`,{value:`classic`,children:`クラシック（明朝）`}),(0,Z.jsx)(`option`,{value:`modern`,children:`モダン（ゴシック）`})]})]})';
  once(',' + font + ',' + title + ',' + practitioner, '', 'standard source controls');
  once(',' + tarotTitle + ',' + practitioner, '', 'tarot source controls');
  const uploadStart = (source.includes('(ar!==`free`||tr===`admin`)&&(0,Z.jsxs)(`label`,{className:`image-upload`') ? '(ar!==`free`||tr===`admin`)&&' : '') + '(0,Z.jsxs)(`label`,{className:`image-upload`,children:[';
  const uploadEnd = 'Vt&&(0,Z.jsx)(`button`,{onClick:e=>{e.preventDefault(),Ht(null)},children:`削除`})]})';
  const start = source.indexOf(',' + uploadStart), end = source.indexOf(uploadEnd, start);
  if (start < 0 || end < start) throw new Error('Cover editor patch: logo upload anchor mismatch');
  source = source.slice(0, start) + source.slice(end + uploadEnd.length);
  once('Ei=e=>{Yt(e.name)', 'Ei=e=>{window.NumeriaCoverSettings.restore(l,e.coverOptions);Ht(ar!==`free`||tr===`admin`?e.logoImage||null:null);Yt(e.name)', 'preset restore');
  // The plan gate may prepend a guard to Ti, so match the object itself.
  once('name:Jt.trim()||`名称未設定のプリセット`,divination:l,', 'name:Jt.trim()||`名称未設定のプリセット`,coverOptions:window.NumeriaCoverSettings.read(l),logoImage:Vt,divination:l,', 'preset save');
  once('Fi=e=>({id:e,divination:l,', 'Fi=e=>({id:e,coverOptions:window.NumeriaCoverSettings.read(l),logoImage:Vt,divination:l,', 'snapshot save');
  return source;
}
