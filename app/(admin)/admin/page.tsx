/** Administration du site : configuration (clé API Claude, e-mails, mot de passe) et contenus publiés par l'IA. */
import fs from 'node:fs';
import type { Metadata } from 'next';
import { isAdmin, setupCode } from '@/lib/server/auth';
import { getConfig, maskKey } from '@/lib/server/config';
import { DATA_DIR, dataPath, fileAgeSec, readJSON, tailLog } from '@/lib/server/data';
import { getParams, paramsText } from '@/lib/server/params';
import type { Echeances, Veille } from '@/lib/server/tasks';
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
        <label>Mot de passe administrateur (10 caractères min.)<input type="password" name="p1" required /></label>
        <label>Confirmer le mot de passe<input type="password" name="p2" required /></label>
        <label>Clé API Claude (facultatif à cette étape)<input type="password" name="key" placeholder="sk-ant-…" /></label>
        <label>ID de l&apos;espace de travail (si la clé commence par sk-ant-usr)<input type="text" name="workspace" placeholder="wrkspc_…" /></label>
        <label>E-mail de réception des alertes et demandes<input type="email" name="mail_to" defaultValue="contact@gemabm.com" /></label>
        <label>E-mail expéditeur du site<input type="email" name="mail_from" defaultValue="site@gemabm.com" /></label>
        <p><button>Terminer l&apos;installation</button></p></form></div>);
  }
  if (!(await isAdmin())) return shell(<div className="box"><form action={A.login}><label>Mot de passe administrateur<input type="password" name="pwd" autoFocus /></label><p><button>Se connecter</button></p>{notice}</form></div>);

  const p = getParams(); const ks = readJSON<{ ok: boolean; at: string } | null>('key-status.json', null); const hasKey = !!cfg.apiKey;
  const veille = readJSON<Veille>('veille.json', { days: [] }); const ech = readJSON<Echeances>('echeances.json', { mois: {} });
  const hist = (fs.existsSync(/*turbopackIgnore: true*/ DATA_DIR) ? fs.readdirSync(/*turbopackIgnore: true*/ DATA_DIR) : []).filter((f) => /^params-\d{8}-\d{6}\.json$/.test(f)).sort().reverse().slice(0, 8);
  const envKey = !!process.env.ANTHROPIC_API_KEY; void dataPath;
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
      {hasKey ? <><p>Clé enregistrée : <code>{maskKey(cfg.apiKey)}</code>{envKey && ' (fournie par la variable d’environnement ANTHROPIC_API_KEY)'}{cfg.workspaceId && <> · espace de travail : <code>{cfg.workspaceId}</code></>}</p>
        <form className="i" action={A.testKey}><button className="alt">Tester la clé</button></form>
        {!envKey && <form className="i" action={A.deleteKey}><button className="del">Supprimer la clé</button></form>}</>
        : <p className="hint">Sans clé, l&apos;assistant répond à partir de la FAQ et les contenus ne sont pas actualisés par Claude.</p>}
      {!envKey && <form action={A.saveKey} autoComplete="off" style={{ marginTop: 12 }}>
        <label>{hasKey ? 'Remplacer la clé (laisser vide pour la conserver)' : 'Coller la clé API'}<input type="password" name="key" placeholder="sk-ant-api03-… ou sk-ant-usr-…" required={!hasKey} /></label>
        <label>ID de l&apos;espace de travail (obligatoire pour une clé « sk-ant-usr- »)<input type="text" name="workspace" defaultValue={cfg.workspaceId || ''} placeholder="wrkspc_…" /></label>
        <p className="hint">À créer sur <b>console.anthropic.com</b> → Clés API. Pour une clé « sk-ant-usr- », l&apos;ID d&apos;espace de travail s&apos;obtient par le lien « Trouver l&apos;ID de votre espace de travail » de la Console. Attention : ces clés ont une <b>date d&apos;expiration</b> (à renouveler ici avant l&apos;échéance). Fixez aussi un <b>plafond de dépense mensuel</b> (Billing → Limits). La clé est enregistrée sur le serveur, hors du site public, et n&apos;est jamais réaffichée en entier.</p>
        <button>Enregistrer</button></form>}
    </div>

    <h2>Relancer une tâche maintenant</h2>
    {[['news', 'Actualité de la profession'], ['veille', 'Veille du jour'], ['reperes', 'Vérifier les repères fiscaux'], ['echeances', 'Échéances du mois']].map(([k, l]) =>
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

    <h2>Mot de passe administrateur</h2>
    <form className="panel" action={A.changePassword} autoComplete="off">
      <label>Mot de passe actuel<input type="password" name="old" required /></label>
      <label>Nouveau mot de passe (10 caractères min.)<input type="password" name="p1" required /></label>
      <label>Confirmer<input type="password" name="p2" required /></label><p><button>Modifier</button></p></form>

    <h2>Journal</h2>
    <pre>{tailLog('ia.log', 25) || '(vide)'}</pre>
  </main>, true);
}
