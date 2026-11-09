/** Administration du site : configuration (clé API Claude, e-mails, mot de passe) et contenus publiés par l'IA. */
import fs from 'node:fs';
import type { Metadata } from 'next';
import { isAdmin, setupCode } from '@/lib/server/auth';
import { getConfig, maskKey } from '@/lib/server/config';
import { DATA_DIR, dataPath, fileAgeSec, readJSON, tailLog } from '@/lib/server/data';
import { getParams, paramsText } from '@/lib/server/params';
import type { Echeances, Veille } from '@/lib/server/tasks';
import QRCode from 'qrcode';
import { tailSecurite } from '@/lib/server/securite';
import { otpauthUrl } from '@/lib/server/totp';
import { gscReady, gscSite, parseServiceAccount } from '@/lib/server/gsc';
import { DEFAULT_KEYWORDS, keywords, overrides, type Proposal, type Snapshot } from '@/lib/server/seo';
import { META, type Lang, type PageId } from '@/lib/pages';
import * as A from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Administration — GEM Consult', robots: { index: false, follow: false } };

const css = `.adm{font:15px/1.5 Arial,sans-serif;background:#f4f3f8;color:#1b1a33;min-height:100vh}.adm header{background:#0f0a38;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center}
.adm main{max-width:1000px;margin:0 auto;padding:20px 16px}.adm h2{margin:28px 0 10px;font-size:18px;border-bottom:2px solid #CBA866;padding-bottom:4px;font-family:Arial,sans-serif;color:#1b1a33}
.adm .card{background:#fff;border:1px solid #ddd;border-radius:10px;padding:12px 14px;margin:8px 0;display:flex;gap:12px;justify-content:space-between;align-items:flex-start}.adm .off{opacity:.5}
.adm .meta{font-size:12px;color:#666}.adm button{background:#0f0a38;color:#fff;border:0;border-radius:7px;padding:8px 13px;cursor:pointer;font-size:14px;white-space:nowrap}.adm button.alt{background:#b8924a}.adm button.del{background:#a33}.adm header button{background:transparent;color:#E6CE97;text-decoration:underline}
.adm .msg{background:#e8f6ee;border:1px solid #9fd3b2;padding:10px;border-radius:8px}.adm .err{background:#fdecec;border:1px solid #e5a5a5;padding:10px;border-radius:8px;overflow-wrap:anywhere}
.adm pre{background:#111;color:#cfe;padding:10px;border-radius:8px;overflow:auto;font-size:12px;max-height:260px;white-space:pre-wrap}.adm form.i{display:inline-block;margin:0 6px 6px 0}
.adm .box{max-width:460px;margin:50px auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 10px 30px -15px rgba(0,0,0,.3)}
.adm label{display:block;font-weight:600;font-size:14px;margin-top:10px}.adm input[type=password],.adm input[type=text],.adm input[type=email],.adm input[type=number]{width:100%;padding:9px;margin:5px 0 4px;box-sizing:border-box;border:1px solid #bbb;border-radius:7px;font-size:14px}
.adm .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.adm .st{background:#fff;border:1px solid #ddd;border-radius:10px;padding:12px}.adm .st b{display:block;font-size:13px;color:#666;font-weight:400}
.adm .ok{color:#18794e;font-weight:700}.adm .ko{color:#b42318;font-weight:700}.adm .wa{color:#b8924a;font-weight:700}.adm .hint{font-size:12.5px;color:#555;margin:4px 0}.adm .panel{background:#fff;border:1px solid #ddd;border-radius:10px;padding:14px 16px}.adm .row{display:grid;grid-template-columns:2fr 1fr;gap:10px}`;
const ago = (f: string) => { const s = fileAgeSec(f); if (!isFinite(s)) return 'jamais'; return s < 3600 ? `il y a ${Math.max(1, Math.round(s / 60))} min` : s < 172800 ? `il y a ${Math.round(s / 3600)} h` : `il y a ${Math.round(s / 86400)} j`; };
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { timeZone: 'Africa/Tunis', dateStyle: 'short', timeStyle: 'short' }) : 'jamais');

export default async function Admin({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams; const cfg = getConfig();
  const notice = <>{sp.msg && <p className="msg">{sp.msg}</p>}{sp.err && <p className="err">{sp.err}</p>}</>;
  const shell = (inner: React.ReactNode, logged = false) => (
    <div className="adm"><style>{css}</style>
      <header><b>GEM Consult — administration du site</b>{logged && <form action={A.logout}><button>Déconnexion</button></form>}</header>{inner}</div>);

  if (!cfg.adminHash) {
    setupCode();
    return shell(<div className="box"><h3 style={{ marginTop: 0 }}>Première installation</h3>
      <p className="hint">Le <b>code d&apos;installation</b> figure dans les journaux du conteneur (<code>docker compose logs web</code>) et dans <code>gem-data/code-installation.txt</code>. Il protège cette page tant qu&apos;aucun mot de passe n&apos;est défini.</p>{notice}
      <form action={A.setup} autoComplete="off">
        <label>Code d&apos;installation<input type="text" name="code" required /></label>
        <label>Mot de passe administrateur (12 caractères min.)<input type="password" name="p1" required /></label>
        <label>Confirmer le mot de passe<input type="password" name="p2" required /></label>
        <label>Clé API Claude (facultatif à cette étape)<input type="password" name="key" placeholder="sk-ant-…" /></label>
        <label>ID de l&apos;espace de travail (si la clé commence par sk-ant-usr)<input type="text" name="workspace" placeholder="wrkspc_…" /></label>
        <label>E-mail de réception des alertes et demandes<input type="email" name="mail_to" defaultValue="contact@gemabm.com" /></label>
        <label>E-mail expéditeur du site<input type="email" name="mail_from" defaultValue="site@gemabm.com" /></label>
        <p><button>Terminer l&apos;installation</button></p></form></div>);
  }
  if (!(await isAdmin())) return shell(<div className="box"><form action={A.login} autoComplete="off"><label>Mot de passe administrateur<input type="password" name="pwd" autoFocus required /></label>{cfg.totpSecret && <label>Code à 6 chiffres de votre application<input type="text" name="code" inputMode="numeric" pattern="[0-9 ]{6,7}" autoComplete="one-time-code" required /></label>}<p><button>Se connecter</button></p>{notice}</form></div>);

  const p = getParams(); const ks = readJSON<{ ok: boolean; at: string } | null>('key-status.json', null); const hasKey = !!cfg.apiKey;
  const veille = readJSON<Veille>('veille.json', { days: [] }); const ech = readJSON<Echeances>('echeances.json', { mois: {} });
  const hist = (fs.existsSync(/*turbopackIgnore: true*/ DATA_DIR) ? fs.readdirSync(/*turbopackIgnore: true*/ DATA_DIR) : []).filter((f) => /^params-\d{8}-\d{6}\.json$/.test(f)).sort().reverse().slice(0, 8);
  const envKey = cfg.keySource === 'env'; void dataPath;
  const seo = readJSON<Snapshot | null>('seo-latest.json', null); const props = readJSON<Proposal[]>('seo-propositions.json', []);
  const ov = overrides(); const sa = parseServiceAccount(cfg.gscKey);
  const arrow = (a: number | null, b: number | null) => (a === null || b === null ? '' : b < a ? ' ▲' : b > a ? ' ▼' : ' =');
  const qr = cfg.totpPending ? await QRCode.toString(otpauthUrl(cfg.totpPending), { type: 'svg', margin: 1, width: 200 }) : '';
  return shell(<main>{notice}
    <h2>État du site</h2>
    <div className="grid">
      <div className="st"><b>Intelligence artificielle</b>{!hasKey ? <span className="ko">● Inactive — clé API à saisir</span> : !ks ? <span className="wa">● Clé enregistrée — à tester</span> : ks.ok ? <span className="ok">● Active (testée le {fmt(ks.at)})</span> : <span className="ko">● Clé refusée — voir le test</span>}</div>
      <div className="st"><b>Veille du cabinet</b>{ago('veille.json')}</div>
      <div className="st"><b>Repères fiscaux vérifiés</b>{fmt(p.verified)}</div>
      <div className="st"><b>Actualité de la profession</b>{ago('news.json')}</div>
      <div className="st"><b>Envoi d&apos;e-mails</b>{cfg.smtp?.host ? <span className="ok">● {cfg.smtp.host}</span> : <span className="ko">● SMTP à configurer</span>}</div>
    </div>

    <h2>Clé API Claude</h2>
    <div className="panel">
      {hasKey ? <><p>Clé enregistrée : <code>{maskKey(cfg.apiKey)}</code>{envKey ? ' (provenant du fichier .env du serveur — une clé saisie ci-dessous la remplacera)' : ' (saisie dans cette page)'}{cfg.workspaceId && cfg.apiKey?.startsWith('sk-ant-usr') && <> · espace de travail : <code>{cfg.workspaceId}</code></>}</p>
        <form className="i" action={A.testKey}><button className="alt">Tester la clé</button></form>
        {!envKey && <form className="i" action={A.deleteKey}><button className="del">Supprimer la clé</button></form>}</>
        : <p className="hint">Sans clé, l&apos;assistant répond à partir de la FAQ et les contenus ne sont pas actualisés par Claude.</p>}
      {<form action={A.saveKey} autoComplete="off" style={{ marginTop: 12 }}>
        <label>{hasKey && !envKey ? 'Remplacer la clé (laisser vide pour la conserver)' : 'Coller la clé API'}<input type="password" name="key" placeholder="sk-ant-api03-… ou sk-ant-usr-…" required={!hasKey || envKey} /></label>
        <label>ID de l&apos;espace de travail (obligatoire pour une clé « sk-ant-usr- »)<input type="text" name="workspace" defaultValue={cfg.workspaceId || ''} placeholder="wrkspc_…" /></label>
        <p className="hint">À créer sur <b>console.anthropic.com</b> → Clés API. Pour une clé « sk-ant-usr- », l&apos;ID d&apos;espace de travail s&apos;obtient par le lien « Trouver l&apos;ID de votre espace de travail » de la Console. Attention : ces clés ont une <b>date d&apos;expiration</b> (à renouveler ici avant l&apos;échéance). Fixez aussi un <b>plafond de dépense mensuel</b> (Billing → Limits). La clé est enregistrée sur le serveur, hors du site public, et n&apos;est jamais réaffichée en entier.</p>
        <button>Enregistrer</button></form>}
    </div>

    <h2>Référencement Google (suivi quotidien)</h2>
    <div className="grid">
      <div className="st"><b>Search Console</b>{gscReady() ? <span className="ok">● Reliée ({gscSite()})</span> : <span className="ko">● À relier</span>}</div>
      <div className="st"><b>Dernier contrôle</b>{seo ? `${seo.date}${seo.periode ? ` · données ${seo.periode.split(' (')[0]}` : ''}` : 'jamais'}</div>
      <div className="st"><b>Clics / apparitions (7 j)</b>{seo?.totals ? `${seo.totals.cur.clicks} / ${seo.totals.cur.impressions} (avant : ${seo.totals.prev.clicks} / ${seo.totals.prev.impressions})` : '—'}</div>
      <div className="st"><b>Alertes</b>{seo ? (seo.alerts.length ? <span className="ko">● {seo.alerts.length}</span> : <span className="ok">● Aucune</span>) : '—'}</div>
    </div>
    {seo?.alerts.map((a, i) => <p key={i} className={a.niveau === 'élevée' ? 'err' : 'msg'}>[{a.niveau}] {a.texte}</p>)}

    {props.filter((p) => p.statut === 'en attente').length > 0 && <><p><b>Propositions à valider</b> — rien n&apos;est modifié sur le site sans votre accord :</p>
      {props.filter((p) => p.statut === 'en attente').map((p) => <div key={p.id} className="card"><div>
        <b>[{p.priorite}] {p.type === 'meta' ? `Titre et description — page ${p.page} (${p.lang})` : p.type === 'article' ? 'Article à publier dans la veille' : 'Action à mener par le cabinet'}</b>
        {p.type === 'meta' && p.lang && p.page && <div className="meta">Actuel : {(ov[`${p.lang}:${p.page}`] || META[p.lang as Lang][p.page as PageId]).title}<br />Proposé : <b>{p.title}</b><br />{p.description}</div>}
        {p.type === 'article' && <div className="meta">{p.sujet}{p.requete && <> — requête visée : « {p.requete} »</>}</div>}
        {p.type === 'action' && <div className="meta">{p.texte}</div>}
        <div className="meta">Pourquoi : {p.raison} · proposé le {p.date}</div></div>
        <div><form className="i" action={A.seoDecide}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="d" value="ok" /><button>Valider</button></form>
          <form className="i" action={A.seoDecide}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="d" value="non" /><button className="del">Rejeter</button></form></div></div>)}</>}

    {seo && seo.keywords.length > 0 && <div className="panel" style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
      <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}><th>Recherche Google</th><th>Position (avant → maintenant)</th><th>Clics</th><th>Apparitions</th></tr></thead>
      <tbody>{seo.keywords.map((k) => <tr key={k.q} style={{ borderBottom: '1px solid #eee', opacity: k.tracked ? 1 : 0.75 }}>
        <td>{k.tracked ? <b>{k.q}</b> : k.q}</td><td>{k.prev.position ?? '—'} → {k.cur.position ?? 'non classé'}<span className={k.cur.position !== null && k.prev.position !== null && k.cur.position > k.prev.position ? 'ko' : 'ok'}>{arrow(k.prev.position, k.cur.position)}</span></td>
        <td>{k.cur.clicks}</td><td>{k.cur.impressions}</td></tr>)}</tbody></table>
      <p className="hint">En gras : recherches suivies. Position 1 = premier résultat. « Non classé » : le site n&apos;est pas apparu sur cette recherche pendant la période.</p></div>}
    {seo && <p className="hint">Contrôles techniques : {seo.tech.map((t) => `${t.check} ${t.ok ? '✓' : '✗ ' + t.detail}`).join(' · ')}{seo.sitemaps && ` · Google : ${seo.sitemaps}`}</p>}

    {Object.keys(ov).length > 0 && <><p><b>Titres modifiés à la suite du suivi :</b></p>{Object.entries(ov).map(([k, o]) =>
      <div key={k} className="card"><div><b>{k}</b> — {o.title}<div className="meta">{o.description} · le {o.date}</div></div>
        <form action={A.seoRevert}><input type="hidden" name="k" value={k} /><button className="alt">Rétablir l&apos;original</button></form></div>)}</>}

    <details className="panel" open={!gscReady()} style={{ marginTop: 10 }}><summary><b>Réglages du suivi</b></summary>
      {sa ? <p>Compte de service : <code>{sa.client_email}</code> — il doit figurer dans Search Console → Paramètres → Utilisateurs et autorisations (autorisation « Restreint » suffisante).</p>
        : <p className="hint">Relier Search Console : créez un compte de service Google Cloud (API « Google Search Console » activée), téléchargez sa clé JSON, collez son contenu ci-dessous, puis ajoutez son adresse e-mail comme utilisateur de la propriété gemabm.com dans Search Console.</p>}
      <form action={A.saveGsc} autoComplete="off">
        <label>{sa ? 'Remplacer la clé JSON du compte de service (laisser vide pour la conserver)' : 'Clé JSON du compte de service'}<textarea name="gsckey" rows={4} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }} placeholder={'{"type": "service_account", "client_email": "…", "private_key": "…"}'} /></label>
        <label>Propriété Search Console<input type="text" name="gscsite" defaultValue={gscSite()} /></label>
        <label>Recherches suivies (une par ligne)<textarea name="keywords" rows={8} style={{ width: '100%', fontSize: 13 }} defaultValue={keywords().join('\n')} /></label>
        <label style={{ fontWeight: 400 }}><input type="checkbox" name="daily" defaultChecked={cfg.seoDaily !== false} /> Recevoir chaque matin le rapport quotidien complet par e-mail (référencement, alertes, santé du site, demandes reçues)</label>
        <p className="hint">Par défaut : {DEFAULT_KEYWORDS.length} recherches (« expert comptable tunis », « commissaire aux comptes tunis »…). Le contrôle a lieu chaque jour à 8 h ; un e-mail est envoyé en cas de baisse et chaque lundi.</p>
        <button>Enregistrer</button></form>
      {sa && <form className="i" action={A.deleteGsc} style={{ marginTop: 8 }}><button className="del">Supprimer la clé</button></form>}
    </details>
    {sa && <form className="i" action={A.testGscAction} style={{ marginTop: 8 }}><button className="alt">Tester la connexion à Search Console</button></form>}

    <h2>Relancer une tâche maintenant</h2>
    {[['news', 'Actualité de la profession'], ['veille', 'Veille du jour'], ['reperes', 'Vérifier les repères fiscaux'], ['echeances', 'Échéances du mois'], ['seo', 'Suivi du référencement']].map(([k, l]) =>
      <form key={k} className="i" action={A.runNow}><input type="hidden" name="t" value={k} /><button className="alt">{l}</button></form>)}
    <p className="hint">Les tâches IA durent de 1 à 3 minutes.</p>

    <h2>Repères fiscaux publiés</h2>
    <pre>{paramsText(p)}</pre>
    {p.a_surveiller?.fr && <p><b>À surveiller :</b> {p.a_surveiller.fr}</p>}
    {p.changes.slice(0, 10).map((c, i) => <div className="card" key={i}><div>{c.description.fr}<div className="meta">Appliqué le {c.date} · effet {c.date_effet} · <a href={c.source} target="_blank" rel="noopener noreferrer">source</a></div></div></div>)}
    {hist.length > 0 && <><p><b>Versions précédentes :</b></p>{hist.map((h) =>
      <form key={h} className="i" action={A.restoreParams}><input type="hidden" name="f" value={h} /><button>Rétablir {h.replace(/params-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2}).*/, '$3/$2/$1 $4:$5')}</button></form>)}</>}

    <h2>Veille publiée (30 derniers jours)</h2>
    {!veille.days.length && <p className="hint">Aucune veille publiée pour le moment.</p>}
    {veille.days.flatMap((d) => d.items.map((it) =>
      <div key={it.id} className={`card${it.hidden ? ' off' : ''}`}><div><b>{it.titre.fr}</b><br />{it.resume.fr}<div className="meta">{d.date} · {it.theme} · <a href={it.source_url} target="_blank" rel="noopener noreferrer">{it.source_nom}</a></div></div>
        <form action={A.toggleVeille}><input type="hidden" name="id" value={it.id} /><button>{it.hidden ? 'Rétablir' : 'Retirer'}</button></form></div>))}

    <h2>Échéances du mois publiées</h2>
    {!Object.keys(ech.mois).length && <p className="hint">Aucune échéance publiée pour le moment.</p>}
    {Object.entries(ech.mois).map(([m, x]) =>
      <div key={m} className={`card${x.hidden ? ' off' : ''}`}><div><b>{m}</b> — {x.items.length} échéance(s) · <a href={x.source} target="_blank" rel="noopener noreferrer">source</a><div className="meta">{x.items.map((i) => <div key={i.date + i.libelle.fr}>{i.date} : {i.libelle.fr}</div>)}</div></div>
        <form action={A.toggleMois}><input type="hidden" name="m" value={m} /><button>{x.hidden ? 'Rétablir' : 'Retirer'}</button></form></div>)}

    <h2>E-mails</h2>
    <form className="panel" action={A.saveMail} autoComplete="off">
      <label>Réception des demandes, analyses et alertes<input type="email" name="mail_to" defaultValue={cfg.mailTo} /></label>
      <label>Expéditeur du site (adresse du domaine gemabm.com)<input type="email" name="mail_from" defaultValue={cfg.mailFrom} /></label>
      <div className="row"><label>Serveur SMTP<input type="text" name="smtp_host" defaultValue={cfg.smtp?.host || ''} placeholder="ssl0.ovh.net ou smtp.gmail.com" /></label>
        <label>Port<input type="number" name="smtp_port" defaultValue={cfg.smtp?.port || 465} /></label></div>
      <label style={{ fontWeight: 400 }}><input type="checkbox" name="smtp_secure" defaultChecked={cfg.smtp?.secure ?? true} /> Connexion chiffrée SSL/TLS (port 465 ; décocher pour 587)</label>
      <div className="row"><label>Identifiant<input type="text" name="smtp_user" defaultValue={cfg.smtp?.user || ''} /></label>
        <label>Mot de passe{cfg.smtp?.pass ? ' (laisser vide = inchangé)' : ''}<input type="password" name="smtp_pass" /></label></div>
      <p className="hint">Boîte OVH du domaine : ssl0.ovh.net, port 465. Gmail : smtp.gmail.com, port 587 (case décochée) avec un « mot de passe d&apos;application » Google.</p>
      <p><button>Enregistrer et envoyer un e-mail de test</button></p></form>

    <h2>Sécurité de l&apos;administration</h2>
    <div className="panel">
      {cfg.totpSecret ? <><p><span className="ok">● Double authentification active</span> — chaque connexion demande le mot de passe et le code du téléphone.</p>
        <details><summary>Désactiver la double authentification</summary><form action={A.totpDisable} autoComplete="off">
          <label>Mot de passe<input type="password" name="pwd" required /></label><label>Code actuel<input type="text" name="code" inputMode="numeric" required /></label><p><button className="del">Désactiver</button></p></form></details></>
      : cfg.totpPending ? <><p><b>1.</b> Installez sur votre téléphone <b>Google Authenticator</b> ou <b>Microsoft Authenticator</b>. <b>2.</b> Appuyez sur « + », puis « Scanner un code QR ». <b>3.</b> Saisissez ci-dessous le code à 6 chiffres affiché.</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}><div style={{ width: 200, background: '#fff' }} dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="hint">Sans appareil photo, saisissez cette clé dans l&apos;application :<br /><code style={{ fontSize: 15, letterSpacing: 1 }}>{cfg.totpPending.replace(/(.{4})/g, '$1 ').trim()}</code></p></div>
          <form className="i" action={A.totpConfirm} autoComplete="off"><label>Code affiché par l&apos;application<input type="text" name="code" inputMode="numeric" autoComplete="one-time-code" required /></label><button>Activer</button></form>
          <form className="i" action={A.totpCancel}><button className="alt">Annuler</button></form></>
      : <><p><span className="wa">● Double authentification non activée</span> — recommandée : même si le mot de passe était découvert, personne ne pourrait se connecter sans votre téléphone.</p>
          <form className="i" action={A.totpStart}><button>Activer la double authentification</button></form></>}
      <p className="hint">Protections automatiques : 5 essais manqués depuis une même connexion bloquent celle-ci 15 minutes ; 30 échecs en une heure ferment la connexion pendant 1 heure et vous alertent par e-mail. Chaque connexion réussie vous est signalée par e-mail (si l&apos;envoi d&apos;e-mails est configuré).</p>
      <form className="i" action={A.logoutAll}><button className="alt">Déconnecter toutes les sessions</button></form>
      <p style={{ marginBottom: 4 }}><b>Journal de sécurité</b></p><pre>{tailSecurite(15) || '(aucun événement)'}</pre>
    </div>

    <h2>Mot de passe administrateur</h2>
    <form className="panel" action={A.changePassword} autoComplete="off">
      <label>Mot de passe actuel<input type="password" name="old" required /></label>
      <label>Nouveau mot de passe (12 caractères min.)<input type="password" name="p1" required /></label>
      <label>Confirmer<input type="password" name="p2" required /></label><p><button>Modifier</button></p></form>

    <h2>Journal</h2>
    <pre>{tailLog('ia.log', 25) || '(vide)'}</pre>
  </main>, true);
}
