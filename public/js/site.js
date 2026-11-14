/* GEM Consult — comportement du site (langues, pages, outils, assistant, veille). Chargé par Next.js après hydratation. */
(function(){
  var root=document.documentElement;
  function applyLang(l){
    root.setAttribute('data-lang',l); root.setAttribute('lang',l); root.setAttribute('dir', l==='ar'?'rtl':'ltr');
    document.title = l==='ar' ? 'GEM Consult — خبير محاسب ومراقب حسابات بتونس' : (l==='en' ? 'GEM Consult — Chartered Accountants & Statutory Auditors, Tunis' : 'GEM Consult — Expertise comptable & Commissariat aux comptes à Tunis');
    document.querySelectorAll('[data-fr]').forEach(function(el){ var v=el.getAttribute('data-'+l); if(v!=null) el.innerHTML=v; });
    document.querySelectorAll('[data-fr-ph]').forEach(function(el){ var v=el.getAttribute('data-'+l+'-ph'); if(v!=null) el.setAttribute('placeholder',v); });
    document.querySelectorAll('.langsel button').forEach(function(b){ var on=b.getAttribute('data-set')===l; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    try{ setPageTitle(); }catch(e){}
    try{localStorage.setItem('gem_lang',l);}catch(e){}
    if(legalOpen) renderLegal(legalOpen);
    try{ renderTmpl(); }catch(e){}
    try{ fillAllSel(); }catch(e){}
  }
  function LP(l){ l=l||root.getAttribute('data-lang')||'fr'; return l==='fr'?'':'/'+l; }
  function curPath(){ var segs=location.pathname.split('/').filter(Boolean); if(segs[0]==='en'||segs[0]==='ar') segs.shift(); return segs.length?'/'+segs.join('/'):''; }
  document.querySelectorAll('.langsel button').forEach(function(b){ b.addEventListener('click',function(e){ var l=b.getAttribute('data-set'); if(l===root.getAttribute('data-lang')) return; e.stopImmediatePropagation(); try{localStorage.setItem('gem_lang',l);}catch(x){} location.href=(LP(l)+curPath())||'/'; }); });
  applyLang(root.getAttribute('data-lang')||'fr');

  var mnav=document.getElementById('mnav');
  document.getElementById('burger').addEventListener('click',function(){var o=mnav.classList.toggle('show'); this.setAttribute('aria-expanded',o);});
  mnav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){mnav.classList.remove('show');});});

  document.querySelectorAll('.q-btn').forEach(function(b){ b.addEventListener('click',function(){
    var q=b.parentElement, a=q.querySelector('.q-a'); var open=q.classList.toggle('open'); b.setAttribute('aria-expanded',open);
    a.style.maxHeight = open ? a.scrollHeight+'px' : '0'; b.setAttribute('aria-expanded',open);
  });});

  function copy(txt,btn){ var okFr='Copié ✓',okEn='Copied ✓',okAr='نُسخ ✓';
    function done(){ var l=root.getAttribute('data-lang'); var old=btn.textContent; btn.textContent=(l==='ar'?okAr:l==='en'?okEn:okFr); setTimeout(function(){btn.textContent=old;},1600); }
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done).catch(function(){fb(txt);done();}); } else { fb(txt); done(); }
  }
  function fb(txt){ var t=document.createElement('textarea'); t.value=txt; t.style.position='fixed'; t.style.opacity='0'; document.body.appendChild(t); t.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(t); }
  var cm=document.getElementById('copyMail'); if(cm) cm.addEventListener('click',function(){copy('contact@gemabm.com',this);});


  /* ---- envoi serveur (api/contact.php sur l'hébergement OVH) ; repli e-mail si indisponible ---- */
  function apiSend(data,ok){ if(location.protocol==='file:') return; try{ var ctrl=new AbortController(); setTimeout(function(){ctrl.abort();},10000);
    fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:ctrl.signal})
      .then(function(r){return r.ok?r.json():null;}).then(function(j){ if(j&&j.ok) ok(); }).catch(function(){}); }catch(e){} }
  function resetSent(box){ var h=box.querySelector('h3'), pp=box.querySelector('p'); if(box.dataset.h){ h.innerHTML=box.dataset.h; pp.innerHTML=box.dataset.p; } }
  function markSent(box){ var l=CL(); var h=box.querySelector('h3'); var p0=box.querySelector('p'); if(!box.dataset.h){ box.dataset.h=h.innerHTML; box.dataset.p=p0.innerHTML; } if(h) h.innerHTML=(l==='ar'?'تمّ إرسال رسالتكم ✓':l==='en'?'Your message has been sent ✓':'Votre message a bien été envoyé ✓');
    var pp=box.querySelector('p'); if(pp) pp.textContent=(l==='ar'?'سنعود إليكم في أقرب الآجال. نسخة من طلبكم أسفله.':l==='en'?'We will get back to you shortly. A copy of your request is shown below.':'Nous revenons vers vous rapidement. Une copie de votre demande figure ci-dessous.');
    var m=box.querySelector('a[href^="mailto"]'); if(m) m.style.display='none'; }
  var form=document.getElementById('cForm'), fdone=document.getElementById('formDone');
  if(form){ form.addEventListener('submit',function(e){ e.preventDefault();
    var hp=form.querySelector('[name=site_web]'); if(hp&&hp.value){ return; }
    var ok=true;
    form.querySelectorAll('[required]').forEach(function(f){ var bad=!f.value.trim(); if(f.type==='email'&&f.value) bad=!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value);
      f.closest('.field').classList.toggle('invalid',bad); if(bad) ok=false; });
    if(!ok) return;
    var g=function(n){return (form.querySelector('[name='+n+']')||{}).value||'';};
    var l=root.getAttribute('data-lang');
    var txt=(l==='ar'
      ? 'طلب اتصال — GEM Consult\n————\nالاسم: '+g('nom')+'\nالبريد: '+g('email')+'\nالهاتف: '+g('tel')+'\nالموضوع: '+g('objet')+'\n\nالرسالة:\n'+g('message')
      : l==='en'
      ? 'Contact request — GEM Consult\n————\nName: '+g('nom')+'\nEmail: '+g('email')+'\nPhone: '+g('tel')+'\nSubject: '+g('objet')+'\n\nMessage:\n'+g('message')
      : 'Demande de contact — GEM Consult\n————\nNom: '+g('nom')+'\nEmail: '+g('email')+'\nTéléphone: '+g('tel')+'\nObjet: '+g('objet')+'\n\nMessage:\n'+g('message'));
    document.getElementById('readyText').textContent=txt;
    form.style.display='none'; fdone.classList.add('show'); fdone.scrollIntoView({behavior:'smooth',block:'center'});
    resetSent(fdone); var mr0=document.getElementById('mailReq'); if(mr0) mr0.style.display='';
    apiSend({type:'contact',lang:l,nom:g('nom'),email:g('email'),tel:g('tel'),objet:g('objet'),message:g('message'),hp:''},function(){markSent(fdone);});
    document.getElementById('copyReq').onclick=function(){copy(txt,this);};
    document.getElementById('mailReq').href='mailto:contact@gemabm.com?subject='+encodeURIComponent((l==='ar'?'طلب اتصال':l==='en'?'Contact request':'Demande de contact')+' — '+g('objet'))+'&body='+encodeURIComponent(txt);
  });
  document.getElementById('newReq').addEventListener('click',function(){ fdone.classList.remove('show'); form.reset(); form.style.display='grid';
    form.querySelectorAll('.invalid').forEach(function(f){f.classList.remove('invalid');}); }); }

  var legalOpen=null, overlay=document.getElementById('legal'), lc=document.getElementById('legalContent');
  var L={
    ml:{fr:{t:'Mentions légales',b:'<h3>Éditeur du site</h3><p>Le présent site est édité par le <b>Cabinet GEM Consult</b>, cabinet d\'expertise comptable et de commissariat aux comptes, dirigé par M. Ali Ben Mohamed, expert-comptable et commissaire aux comptes inscrit à l\'Ordre des Experts-Comptables de Tunisie depuis 1987 sous le n° 1085.</p><p>Le Cabinet GEM Consult est inscrit au tableau de l\'Ordre des Experts-Comptables de Tunisie (OECT) sous le n° 2449.</p><p>Siège : 11, rue Abderrahmen Azzem, Montplaisir, 1073 Tunis — Tunisie. Courriel : contact@gemabm.com — Tél. : +216 71 904 572</p><h3>Directeur de la publication</h3><p>M. Ali Ben Mohamed.</p><h3>Hébergement</h3><p>Le site est hébergé sur une infrastructure dédiée située en Union européenne (OVH).</p><h3>Propriété intellectuelle</h3><p>L\'ensemble des contenus (textes, marques, logos, plateforme AFGC — Audit Financier GEM Consult) est la propriété exclusive du Cabinet GEM Consult. Toute reproduction, totale ou partielle, sans autorisation préalable est interdite.</p><h3>Responsabilité</h3><p>Les informations publiées ont une vocation générale d\'information et ne constituent pas un conseil professionnel personnalisé. Seule une mission formalisée engage le cabinet.</p>'},
        en:{t:'Legal notice',b:'<h3>Site publisher</h3><p>This site is published by <b>Cabinet GEM Consult</b>, a chartered accountancy and statutory audit firm, led by Mr. Ali Ben Mohamed, chartered accountant and statutory auditor registered with the Order of Chartered Accountants of Tunisia (OECT) since 1987 under No. 1085.</p><p>Cabinet GEM Consult is registered on the roll of the Order of Chartered Accountants of Tunisia (OECT) under No. 2449.</p><p>Office: 11 Abderrahmen Azzem St., Montplaisir, 1073 Tunis — Tunisia. Email: contact@gemabm.com — Phone: +216 71 904 572</p><h3>Publication director</h3><p>Mr. Ali Ben Mohamed.</p><h3>Hosting</h3><p>The site is hosted on dedicated infrastructure located in the European Union (OVH).</p><h3>Intellectual property</h3><p>All content (texts, trademarks, logos, the AFGC platform — GEM Consult Financial Audit) is the exclusive property of Cabinet GEM Consult. Any reproduction, in whole or in part, without prior authorization is prohibited.</p><h3>Liability</h3><p>Published information is general in nature and does not constitute personalized professional advice. Only a formal engagement binds the firm.</p>'},
        ar:{t:'التنبيهات القانونية',b:'<h3>ناشر الموقع</h3><p>يُنشَر هذا الموقع من قِبل <b>مكتب GEM Consult</b>، مكتب خبرة محاسبية ومراقبة حسابات، يديره السيد علي بن محمد، خبير محاسب ومراقب حسابات مرسّم بهيئة الخبراء المحاسبين بتونس منذ <span dir="ltr">1987</span> تحت عدد <span dir="ltr">1085</span>.</p><p>مكتب GEM Consult مرسّم بجدول هيئة الخبراء المحاسبين بتونس تحت عدد <span dir="ltr">2449</span>.</p><p>المقرّ: <span dir="ltr">11</span> نهج عبد الرّحمن عزّام، منبليزير، <span dir="ltr">1073</span> تونس — البريد: contact@gemabm.com — الهاتف: <span dir="ltr">+216 71 904 572</span></p><h3>مدير النشر</h3><p>السيد علي بن محمد.</p><h3>الاستضافة</h3><p>يُستضاف الموقع على بنية تحتية مخصّصة بالاتحاد الأوروبي (OVH).</p><h3>الملكية الفكرية</h3><p>كلّ المحتويات (نصوص، علامات، شعارات، منصّة AFGC — التدقيق المالي GEM Consult) ملك حصري لمكتب GEM Consult. يُمنع كلّ استنساخ كلّي أو جزئي دون إذن مسبق.</p><h3>المسؤولية</h3><p>للمعلومات المنشورة طابع إعلامي عام ولا تُشكّل استشارة مهنية مخصّصة. ولا تُلزم المكتبَ إلّا مهمّة مُحرّرة رسميًا.</p>'}},
    conf:{fr:{t:'Politique de confidentialité',b:'<h3>Données collectées</h3><p>Via le formulaire de contact, nous collectons les données que vous fournissez : nom ou raison sociale, adresse électronique, numéro de téléphone et contenu de votre message.</p><h3>Finalité</h3><p>Ces données sont utilisées exclusivement pour répondre à votre demande et, le cas échéant, établir une relation professionnelle. Elles ne sont ni cédées ni vendues à des tiers.</p><h3>Base et durée de conservation</h3><p>Le traitement repose sur votre consentement. Les données sont conservées le temps nécessaire au traitement de la demande, puis archivées ou supprimées conformément aux obligations légales.</p><h3>Vos droits</h3><p>Vous disposez d\'un droit d\'accès, de rectification, d\'opposition et de suppression. Pour l\'exercer : contact@gemabm.com.</p><h3>Sécurité</h3><p>Les données sont hébergées en Union européenne et protégées par des mesures techniques et organisationnelles appropriées.</p>'},
          en:{t:'Privacy policy',b:'<h3>Data collected</h3><p>Through the contact form, we collect the data you provide: name or company name, email address, phone number and the content of your message.</p><h3>Purpose</h3><p>This data is used solely to respond to your request and, where applicable, establish a professional relationship. It is neither transferred nor sold to third parties.</p><h3>Basis and retention</h3><p>Processing is based on your consent. Data is kept for as long as needed to handle the request, then archived or deleted in line with legal obligations.</p><h3>Your rights</h3><p>You have the right to access, rectify, object to and delete your data. To exercise it: contact@gemabm.com.</p><h3>Security</h3><p>Data is hosted in the European Union and protected by appropriate technical and organizational measures.</p>'},
          ar:{t:'سياسة الخصوصية',b:'<h3>المعطيات المجمّعة</h3><p>عبر استمارة الاتصال، نجمع المعطيات التي تقدّمونها: الاسم أو التسمية الاجتماعية، البريد الإلكتروني، رقم الهاتف ومضمون الرسالة.</p><h3>الغاية</h3><p>تُستعمل هذه المعطيات حصريًا للردّ على طلبكم، وعند الاقتضاء لإقامة علاقة مهنية. ولا تُحال ولا تُباع للغير.</p><h3>الأساس ومدّة الحفظ</h3><p>تقوم المعالجة على موافقتكم. تُحفظ المعطيات طيلة المدّة اللازمة لمعالجة الطلب، ثمّ تُؤرشَف أو تُحذَف طبقًا للالتزامات القانونية.</p><h3>حقوقكم</h3><p>لكم حقّ النفاذ والتصحيح والاعتراض والحذف. لممارستها: contact@gemabm.com.</p><h3>الأمان</h3><p>تُستضاف المعطيات بالاتحاد الأوروبي وتُحمى بتدابير تقنية وتنظيمية ملائمة.</p>'}},
    inpdp:{fr:{t:'Conformité INPDP',b:'<h3>Protection des données personnelles</h3><p>Le Cabinet GEM Consult traite les données personnelles dans le respect de la loi organique n° 2004-63 du 27 juillet 2004 relative à la protection des données à caractère personnel et des exigences de l\'Instance Nationale de Protection des Données Personnelles (INPDP).</p><h3>Principes appliqués</h3><ul><li>Collecte limitée aux données strictement nécessaires.</li><li>Finalité déterminée et information de la personne concernée.</li><li>Confidentialité et accès contrôlé, journalisé.</li><li>Hébergement sécurisé en Union européenne.</li></ul><h3>Plateforme AFGC (Audit Financier GEM Consult)</h3><p>Les traitements réalisés via la plateforme AFGC respectent les mêmes principes, avec chiffrement, traçabilité scellée et conservation conforme aux obligations légales.</p><h3>Contact</h3><p>Pour toute question relative à vos données : contact@gemabm.com.</p>'},
           en:{t:'INPDP compliance',b:'<h3>Personal-data protection</h3><p>Cabinet GEM Consult processes personal data in compliance with Organic Law No. 2004-63 of 27 July 2004 on the protection of personal data and with the requirements of the National Authority for the Protection of Personal Data (INPDP).</p><h3>Principles applied</h3><ul><li>Collection limited to strictly necessary data.</li><li>Defined purpose and information of the data subject.</li><li>Confidentiality and controlled, logged access.</li><li>Secure hosting in the European Union.</li></ul><h3>AFGC platform (GEM Consult Financial Audit)</h3><p>Processing carried out through the AFGC platform follows the same principles, with encryption, sealed traceability and retention compliant with legal obligations.</p><h3>Contact</h3><p>For any question about your data: contact@gemabm.com.</p>'},
           ar:{t:'مطابقة حماية المعطيات',b:'<h3>حماية المعطيات الشخصية</h3><p>يعالج مكتب GEM Consult المعطيات الشخصية في احترام للقانون الأساسي عدد <span dir="ltr">2004-63</span> المؤرّخ في <span dir="ltr">27 جويلية 2004</span> المتعلّق بحماية المعطيات الشخصية ولمتطلّبات الهيئة الوطنية لحماية المعطيات الشخصية.</p><h3>المبادئ المطبّقة</h3><ul><li>جمع محدود بالمعطيات الضرورية فقط.</li><li>غاية محدّدة وإعلام الشخص المعني.</li><li>سرّية ونفاذ مراقَب ومُسجَّل.</li><li>استضافة آمنة بالاتحاد الأوروبي.</li></ul><h3>منصّة AFGC (التدقيق المالي GEM Consult)</h3><p>تحترم المعالجات المُنجزة عبر منصّة AFGC نفس المبادئ، مع التشفير والتتبّع المختوم والحفظ المطابق للالتزامات القانونية.</p><h3>الاتصال</h3><p>لكلّ سؤال يتعلّق بمعطياتكم: contact@gemabm.com.</p>'}},
    note_bareme:{
      fr:{t:'Barème des honoraires du CAC — révision 2022',b:'<h3>Textes applicables</h3><p>Arrêté du 28 février 2003, modifié en dernier lieu par l’arrêté du 29 avril 2022, applicable aux exercices ouverts à partir du 1er janvier 2021.</p><h3>Principe de calcul</h3><p>Les honoraires résultent de la somme de trois composantes, chacune à barème dégressif : total du bilan et engagements hors bilan, total des produits, et nombre de salariés.</p><h3>Ce qui change par rapport à 2003</h3><ul><li>Relèvement général des tarifs d’environ 54 %.</li><li>Assiette élargie aux trois composantes, et non au seul total du bilan.</li></ul><h3>Co-commissariat</h3><p>Majoration de 50 % lorsque la mission est confiée à un collège de commissaires (arrêté du 4 juillet 2006).</p><p>Estimez le montant pour votre société avec l’outil « Estimateur d’honoraires CAC » de la boîte à outils.</p>'},
      en:{t:'Auditor fee scale — 2022 revision',b:'<h3>Applicable texts</h3><p>Order of 28 February 2003, last amended by the order of 29 April 2022, applicable to financial years opened from 1 January 2021.</p><h3>Calculation principle</h3><p>Fees are the sum of three components, each on a regressive scale: total balance sheet plus off-balance-sheet commitments, total revenue, and number of employees.</p><h3>What changes vs. 2003</h3><ul><li>General increase of about 54%.</li><li>Base broadened to the three components, not the balance sheet alone.</li></ul><h3>Joint audit</h3><p>50% surcharge when the engagement is entrusted to a college of auditors (order of 4 July 2006).</p><p>Estimate the amount for your company with the “Auditor-fee estimator” in the toolbox.</p>'},
      ar:{t:'تعريفة أتعاب مراقب الحسابات — تنقيح 2022',b:'<h3>النصوص المنطبقة</h3><p>قرار <span dir="ltr">28</span> فيفري <span dir="ltr">2003</span>، المنقّح أخيرًا بقرار <span dir="ltr">29</span> أفريل <span dir="ltr">2022</span>، المنطبق على السنوات المفتوحة ابتداءً من <span dir="ltr">1</span> جانفي <span dir="ltr">2021</span>.</p><h3>مبدأ الاحتساب</h3><p>تنتج الأتعاب عن مجموع ثلاثة مكوّنات، لكلٍّ منها جدول تنازلي: مجموع الموازنة والتعهّدات خارج الموازنة، مجموع المداخيل، وعدد الأجراء.</p><h3>ما تغيّر مقارنة بـ<span dir="ltr">2003</span></h3><ul><li>رفع عام للتعريفات بنحو <span dir="ltr">54%</span>.</li><li>توسيع القاعدة إلى المكوّنات الثلاثة، لا إلى الموازنة وحدها.</li></ul><h3>المراقبة المشتركة</h3><p>زيادة بـ<span dir="ltr">50%</span> عند إسناد المهمّة إلى هيئة مراقبين (قرار <span dir="ltr">4</span> جويلية <span dir="ltr">2006</span>).</p><p>قدّروا المبلغ لشركتكم عبر أداة «تقدير أتعاب مراقب الحسابات».</p>'}},
    note_cac:{
      fr:{t:'Faut-il désigner un commissaire aux comptes ?',b:'<h3>Sociétés par actions</h3><p>Les SA et SCA doivent désigner un commissaire aux comptes, sans condition de seuil.</p><h3>Autres sociétés (SARL, SUARL, SNC, SCS)</h3><p>La désignation devient obligatoire dès que deux des trois seuils suivants sont dépassés : total du bilan 100 000 DT, total des produits 300 000 DT, effectif moyen 10.</p><h3>Quand le commissaire doit-il être expert-comptable (OECT) ?</h3><p>Lorsque deux des trois seuils supérieurs sont dépassés : bilan 1 500 000 DT, produits 2 000 000 DT, effectif 30. En deçà, un spécialiste en comptabilité inscrit peut être désigné.</p><h3>Base légale</h3><p>Article 13 du Code des sociétés commerciales ; décret n° 2006-1546 du 6 juin 2006.</p><p>Vérifiez votre cas avec l’assistant « Dois-je nommer un CAC ? » de la boîte à outils.</p>'},
      en:{t:'Must you appoint a statutory auditor?',b:'<h3>Joint-stock companies</h3><p>SA and SCA must appoint an auditor, with no threshold condition.</p><h3>Other companies (LLC, SNC, SCS)</h3><p>Appointment becomes mandatory once two of these three thresholds are exceeded: balance sheet 100,000 TND, revenue 300,000 TND, average headcount 10.</p><h3>When must the auditor be a chartered accountant (OECT)?</h3><p>When two of the higher thresholds are exceeded: balance sheet 1,500,000 TND, revenue 2,000,000 TND, headcount 30. Below that, a registered accounting specialist may be appointed.</p><h3>Legal basis</h3><p>Article 13 of the Commercial Companies Code; decree No. 2006-1546 of 6 June 2006.</p><p>Check your case with the “Must I appoint an auditor?” assistant.</p>'},
      ar:{t:'هل يجب تعيين مراقب حسابات؟',b:'<h3>شركات الأسهم</h3><p>يجب على شركات الأسهم (SA, SCA) تعيين مراقب حسابات دون شرط سقف.</p><h3>الشركات الأخرى (SARL, SUARL, SNC, SCS)</h3><p>يصبح التعيين إجباريًا بمجرّد تجاوز اثنين من السقوف الثلاثة: مجموع الموازنة <span dir="ltr">100 000</span> د.ت، مجموع المداخيل <span dir="ltr">300 000</span> د.ت، العدد المتوسّط للأعوان <span dir="ltr">10</span>.</p><h3>متى يجب أن يكون المراقب خبيرًا محاسبًا؟</h3><p>عند تجاوز اثنين من السقوف العليا: الموازنة <span dir="ltr">1 500 000</span> د.ت، المداخيل <span dir="ltr">2 000 000</span> د.ت، الأعوان <span dir="ltr">30</span>. دون ذلك، يمكن تعيين مختصّ في المحاسبة مرسّم.</p><h3>الأساس القانوني</h3><p>الفصل <span dir="ltr">13</span> من مجلة الشركات التجارية؛ الأمر عدد <span dir="ltr">2006-1546</span> المؤرّخ في <span dir="ltr">6</span> جوان <span dir="ltr">2006</span>.</p><p>تحقّقوا من حالتكم عبر مساعد «هل يجب تعيين مراقب حسابات؟».</p>'}},
    note_lf2027:{
      fr:{t:'Loi de finances 2027 : ce que l’on sait déjà',b:'<p><b>Statut au 2 novembre 2026 :</b> projet de loi de finances 2027 déposé à l’Assemblée mi-octobre 2026 ; adoption et publication au JORT attendues en décembre. Le texte peut encore être amendé : cette note sera mise à jour dès la publication.</p><h3>Ce qui change automatiquement au 1er janvier 2027</h3><ul><li><b>Contribution sociale de solidarité (salariés et personnes physiques) :</b> la réduction de 0,5 point prévue par l’article 87 de la loi de finances 2026 ne vise que les revenus de 2026. Sauf prorogation, la CSS revient au barème de l’IRPP majoré de <b>1 point</b>. Exonération maintenue si le revenu net annuel n’excède pas 5 000 DT.</li></ul><h3>Principales mesures annoncées dans le projet</h3><ul><li>Droits de douane sur les smartphones et les capteurs solaires ramenés à 10 % ; suppression des droits sur les terminaux de paiement électronique.</li><li>Batteries de stockage d’électricité exonérées à l’importation (droits de douane, TVA), sous réserve d’un avis technique.</li><li>Plateformes de livraison : transmission semestrielle à l’administration fiscale de la liste des vendeurs partenaires, sous peine d’une pénalité de 5 % des transactions non déclarées.</li><li>Droits d’enregistrement réduits pour la première acquisition d’un logement.</li><li>Taxe sur les voyages à l’étranger portée de 60 à 80 DT.</li></ul><h3>Ce qui ne change pas à ce stade</h3><p>Aucune modification du barème de l’IRPP ni des taux de l’IS n’est annoncée dans le projet.</p><p>Simulez l’effet sur votre salaire avec l’outil « Mon salaire net : 2026 → 2027 » de la page Outils.</p>'},
      en:{t:'2027 Finance Act: what we already know',b:'<p><b>Status at 2 November 2026:</b> the 2027 Finance Bill was filed with Parliament in mid-October 2026; adoption and publication in the JORT are expected in December. The text may still be amended; this note will be updated on publication.</p><h3>What changes automatically on 1 January 2027</h3><ul><li><b>Social solidarity contribution (employees and individuals):</b> the 0.5-point reduction under article 87 of the 2026 Finance Act only covers 2026 income. Unless extended, the contribution returns to the income-tax scale plus <b>1 point</b>. Exemption maintained for net annual income up to TND 5,000.</li></ul><h3>Main measures announced in the bill</h3><ul><li>Customs duties on smartphones and solar collectors cut to 10%; duties on electronic payment terminals removed.</li><li>Electricity storage batteries exempt on import (customs, VAT), subject to a technical opinion.</li><li>Delivery platforms: half-yearly reporting of partner sellers to the tax authority, with a 5% penalty on undeclared transactions.</li><li>Reduced registration duties on a first home purchase.</li><li>Travel-abroad tax raised from TND 60 to TND 80.</li></ul><h3>What does not change at this stage</h3><p>No change to the income-tax scale or corporate tax rates is announced in the bill.</p><p>Simulate the effect on your pay with the “My net pay: 2026 → 2027” tool.</p>'},
      ar:{t:'قانون المالية لسنة 2027: ما نعرفه إلى الآن',b:'<p><b>الوضعية في 2 نوفمبر 2026:</b> أُودع مشروع قانون المالية لسنة 2027 بالبرلمان في منتصف أكتوبر 2026، ويُنتظر المصادقة عليه ونشره بالرائد الرسمي في ديسمبر. قد يُعدَّل النصّ، وستُحيَّن هذه المذكّرة عند النشر.</p><h3>ما يتغيّر آليًا بداية من 1 جانفي 2027</h3><ul><li><b>المساهمة الاجتماعية التضامنية:</b> التخفيض بـ0,5 نقطة الوارد بالفصل 87 من قانون المالية لسنة 2026 يخصّ مداخيل 2026 فقط. وما لم يقع التمديد، تعود المساهمة إلى جدول الضريبة على الدخل مع زيادة <b>نقطة واحدة</b>، مع الإبقاء على الإعفاء إذا لم يتجاوز الدخل الصافي السنوي 5000 دينار.</li></ul><h3>أهمّ الإجراءات المعلنة في المشروع</h3><ul><li>تخفيض المعاليم الديوانية على الهواتف الذكية واللاقطات الشمسية إلى 10٪ وإلغاؤها على آلات الدفع الإلكتروني.</li><li>إعفاء بطاريات تخزين الكهرباء عند التوريد، بشرط رأي فنّي.</li><li>منصّات التوصيل: إحالة قائمة البائعين الشركاء على الإدارة الجبائية كلّ ستّة أشهر، وإلّا خطية بـ5٪ من المعاملات غير المصرّح بها.</li><li>معاليم تسجيل مخفّضة عند اقتناء أوّل مسكن.</li><li>الترفيع في معلوم السفر إلى الخارج من 60 إلى 80 دينارًا.</li></ul><h3>ما لا يتغيّر في هذه المرحلة</h3><p>لم يُعلَن عن أيّ تعديل لجدول الضريبة على الدخل أو لنسب الضريبة على الشركات.</p><p>احسبوا الأثر على أجركم عبر أداة «أجري الصافي: 2026 ← 2027».</p>'}},
    note_reperes:{
      fr:{t:'Repères fiscaux & sociaux 2026',b:'<h3>Impôt sur le revenu (IRPP) — barème annuel</h3><p>0 à 5 000 DT : 0 % · 5 000–10 000 : 15 % · 10 000–20 000 : 25 % · 20 000–30 000 : 30 % · 30 000–40 000 : 33 % · 40 000–50 000 : 36 % · 50 000–70 000 : 38 % · au-delà de 70 000 : 40 %.</p><h3>Cotisation CNSS — salarié</h3><p>Taux salarial de 9,68 % (régime général).</p><h3>Déductions au titre de la situation personnelle</h3><p>Frais professionnels : 10 % plafonnés à 2 000 DT/an · chef de famille : 300 DT/an · 100 DT par enfant à charge (maximum 4).</p><h3>Régime forfaitaire (BIC)</h3><p>Régime optionnel pour les personnes physiques dont le chiffre d’affaires n’excède pas 100 000 DT (loi de finances 2026, art. 91).</p><p>Tous ces paramètres sont modifiables dans nos simulateurs ; référez-vous toujours au dernier barème publié au JORT.</p>'},
      en:{t:'Tax & social key figures 2026',b:'<h3>Income tax (IRPP) — annual scale</h3><p>0 to 5,000 TND: 0% · 5,000–10,000: 15% · 10,000–20,000: 25% · 20,000–30,000: 30% · 30,000–40,000: 33% · 40,000–50,000: 36% · 50,000–70,000: 38% · above 70,000: 40%.</p><h3>Social contribution (CNSS) — employee</h3><p>Employee rate of 9.68% (general scheme).</p><h3>Personal-situation deductions</h3><p>Professional expenses: 10% capped at 2,000 TND/yr · head of household: 300 TND/yr · 100 TND per dependent child (max 4).</p><h3>Lump-sum regime (BIC)</h3><p>Optional regime for individuals whose turnover does not exceed 100,000 TND (Finance Act 2026, art. 91).</p><p>All these parameters are editable in our simulators; always refer to the latest scale published in the JORT.</p>'},
      ar:{t:'معالم جبائية واجتماعية 2026',b:'<h3>الضريبة على الدخل — الجدول السنوي</h3><p><span dir="ltr">0</span> إلى <span dir="ltr">5 000</span> د.ت: <span dir="ltr">0%</span> · <span dir="ltr">5 000–10 000</span>: <span dir="ltr">15%</span> · <span dir="ltr">10 000–20 000</span>: <span dir="ltr">25%</span> · <span dir="ltr">20 000–30 000</span>: <span dir="ltr">30%</span> · <span dir="ltr">30 000–40 000</span>: <span dir="ltr">33%</span> · <span dir="ltr">40 000–50 000</span>: <span dir="ltr">36%</span> · <span dir="ltr">50 000–70 000</span>: <span dir="ltr">38%</span> · أكثر من <span dir="ltr">70 000</span>: <span dir="ltr">40%</span>.</p><h3>مساهمة الضمان — الأجير</h3><p>نسبة الأجير <span dir="ltr">9,68%</span> (النظام العام).</p><h3>تخفيضات الوضعية الشخصية</h3><p>المصاريف المهنية: <span dir="ltr">10%</span> بسقف <span dir="ltr">2 000</span> د.ت/سنة · رب العائلة: <span dir="ltr">300</span> د.ت/سنة · <span dir="ltr">100</span> د.ت لكلّ ابن معال (أقصى <span dir="ltr">4</span>).</p><h3>النظام التقديري</h3><p>نظام اختياري للأشخاص الطبيعيين الذين لا يتجاوز رقم معاملاتهم <span dir="ltr">100 000</span> د.ت (قانون المالية <span dir="ltr">2026</span>، الفصل <span dir="ltr">91</span>).</p><p>كلّ هذه المعطيات قابلة للتعديل في محاكياتنا؛ ارجعوا دائمًا إلى آخر جدول منشور بالرائد الرسمي.</p>'}}
  };
  function renderLegal(k){ var l=root.getAttribute('data-lang'); var d=L[k][l]||L[k].fr; lc.innerHTML='<h2>'+d.t+'</h2><div class="legal-body">'+d.b+'</div>'; }
  function openLegal(b){ legalOpen=b.getAttribute('data-legal'); renderLegal(legalOpen); overlay.classList.add('show'); }
  document.querySelectorAll('[data-legal]').forEach(function(b){ b.addEventListener('click',function(){ openLegal(b); }); b.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openLegal(b); } }); });
  function closeLegal(){ overlay.classList.remove('show'); legalOpen=null; }
  document.getElementById('legalClose').addEventListener('click',closeLegal);
  overlay.addEventListener('click',function(e){ if(e.target===overlay) closeLegal(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeLegal(); });

  var reduce=false; try{ reduce=matchMedia('(prefers-reduced-motion:reduce)').matches; }catch(e){}
  if(!reduce && 'IntersectionObserver' in window){
    document.body.classList.add('anim-ready');
    var io=new IntersectionObserver(function(es){es.forEach(function(en){ if(en.isIntersecting){ var t=en.target;
      var isGrid=/(svc-grid|pillars|afgc-grid|ref-grid|news-grid|sectors)/.test(t.className);
      t.classList.add(isGrid?'in-stagger':'in'); io.unobserve(t);} });},{threshold:.12});
    document.querySelectorAll('.sec-head,.lead-card,.band-fig,.svc-grid,.pillars,.afgc-grid,.ref-grid,.news-grid,.sectors').forEach(function(el){io.observe(el);});
    setTimeout(function(){ document.querySelectorAll('.sec-head,.lead-card,.band-fig').forEach(function(e){e.classList.add('in');});
      document.querySelectorAll('.svc-grid,.pillars,.afgc-grid,.ref-grid,.news-grid,.sectors').forEach(function(e){e.classList.add('in-stagger');}); },1800);
  }
  function countUp(el){ var tgt=parseInt(el.getAttribute('data-count'),10), suf=el.getAttribute('data-suffix')||''; if(isNaN(tgt)) return;
    if(reduce){el.textContent=tgt+suf;return;} var t0=null,dur=1200; function ease(p){return 1-Math.pow(1-p,3);}
    function step(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1); el.textContent=Math.round(tgt*ease(p))+suf; if(p<1)requestAnimationFrame(step); else el.textContent=tgt+suf; } requestAnimationFrame(step); }
  if('IntersectionObserver' in window){ var cio=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){countUp(en.target);cio.unobserve(en.target);}});},{threshold:.6});
    document.querySelectorAll('.stat-n[data-count]').forEach(function(el){cio.observe(el);}); }

  var track=document.getElementById('logoTrack');
  if(track){ track.innerHTML = track.innerHTML + track.innerHTML; }

  /* ---- calendrier déclaratif ---- */
  var CAL={
    fr:{title:"Calendrier déclaratif",
      intro:"Échéances récurrentes de la déclaration mensuelle (portant sur le mois précédent) et des acomptes provisionnels. Les dates tiennent compte des week-ends et des jours fériés.",
      months:["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"],
      pp:"Personnes physiques",pm1:"Sociétés (télédéclaration)",pm2:"Sociétés (autres)",ac:"Acompte provisionnel",
      legMonth:"Déclaration mensuelle",legAc:"Acompte provisionnel (IS/IR)",
      note:"Les déclarations annuelles (IR, IS, déclaration de l'employeur, etc.) ont des échéances propres communiquées chaque période par la Direction Générale des Impôts (DGI). Les règles de ce calendrier suivent les notes communes de la DGI ; chaque échéance est à confirmer sur la note commune en vigueur."},
    en:{title:"Filing calendar",
      intro:"Recurring deadlines for the monthly return (covering the previous month) and advance instalments. Dates take weekends and public holidays into account.",
      months:["January","February","March","April","May","June","July","August","September","October","November","December"],
      pp:"Individuals",pm1:"Companies (e-filing)",pm2:"Companies (other)",ac:"Advance instalment",
      legMonth:"Monthly return",legAc:"Advance instalment (CIT/PIT)",
      note:"Annual returns (PIT, CIT, employer's return, etc.) have their own deadlines announced each period by the Tax Administration (DGI). This calendar follows the DGI common notes; each deadline should be confirmed against the applicable common note."},
    ar:{title:"رزنامة التصاريح",
      intro:"الآجال الدورية للتصريح الشهري (المتعلّق بالشهر السابق) وللأقساط الاحتياطية. تراعي التواريخ عطل نهاية الأسبوع والأعياد.",
      months:["جانفي","فيفري","مارس","أفريل","ماي","جوان","جويلية","أوت","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
      pp:"الأشخاص الطبيعيون",pm1:"الشركات (عن بُعد)",pm2:"الشركات (غير ذلك)",ac:"قسط احتياطي",
      legMonth:"التصريح الشهري",legAc:"قسط احتياطي (الضريبة على الشركات/الدخل)",
      note:"للتصاريح السنوية (الضريبة على الدخل، على الشركات، تصريح المؤجِّر…) آجالها الخاصّة التي تُعلنها الإدارة العامّة للأداءات دوريًا. تتبع هذه الرزنامة المذكّرات العامّة للإدارة؛ ويُثبَّت كلّ أجل بالرجوع إلى المذكّرة العامّة الجاري بها العمل."}
  };
  var ACOMPTE={5:true,8:true,11:true}; // juin, septembre, décembre
  var ANN_TITLE={fr:"Échéances annuelles",en:"Annual deadlines",ar:"الآجال السنوية"};
  var ANNUAL=[
    {d:25,m:1,fr:"Revenus fonciers, de capitaux et valeurs mobilières, de source étrangère ; plus-values sur titres",en:"Rental, capital & securities income, foreign-source income; gains on securities",ar:"المداخيل العقارية ومن رؤوس الأموال والأوراق المالية والمصدر الأجنبي؛ القيمة الزائدة على الأوراق المالية"},
    {d:25,m:2,fr:"Déclaration annuelle de l'IS (sociétés)",en:"Annual corporate income tax (CIT) return",ar:"التصريح السنوي بالضريبة على الشركات"},
    {d:25,m:3,fr:"IRPP — bénéfices des activités commerciales",en:"PIT — commercial business income",ar:"الضريبة على الدخل — أرباح الأنشطة التجارية"},
    {d:30,m:3,fr:"Déclaration de l'employeur",en:"Employer's annual return",ar:"تصريح المؤجِّر"},
    {d:25,m:4,fr:"IRPP — activités industrielles, professions non commerciales, services, revenus multiples",en:"PIT — industrial activities, non-commercial professions, services, multiple income",ar:"الضريبة على الدخل — الأنشطة الصناعية والمهن غير التجارية والخدمات والمداخيل المتعدّدة"},
    {d:25,m:5,fr:"Déclaration définitive de l'IS (sociétés soumises au commissariat aux comptes)",en:"Final CIT return (companies subject to statutory audit)",ar:"التصريح النهائي بالضريبة على الشركات (الخاضعة لمراقبة الحسابات)"},
    {d:25,m:6,fr:"IRPP — activités artisanales",en:"PIT — artisanal activities",ar:"الضريبة على الدخل — الأنشطة الحرفية"},
    {d:25,m:7,fr:"IRPP — exploitations agricoles ou de pêche",en:"PIT — agriculture or fishing",ar:"الضريبة على الدخل — الاستغلال الفلاحي أو الصيد البحري"},
    {d:5,m:11,fr:"IRPP — traitements, salaires et pensions",en:"PIT — wages, salaries and pensions",ar:"الضريبة على الدخل — الأجور والمرتّبات والجرايات"}
  ];
  function d(n){return '<span dir="ltr">'+n+'</span>';}
  var CALY=(new Date()).getFullYear();
  var HOLI={};
  function holidays(y){ if(HOLI[y]) return HOLI[y]; var h={}; function add(m,d){ h[m+'-'+d]=1; }
    [[1,1],[3,20],[4,9],[5,1],[7,25],[8,13],[10,15],[12,17]].forEach(function(x){add(x[0],x[1]);});
    /* fêtes religieuses (calendrier hégirien tabulaire, ±1 jour) */
    for(var hy=y-580;hy<=y-577;hy++){ [[1,1,1],[3,12,1],[10,1,2],[12,10,2]].forEach(function(f){ for(var k=0;k<f[2];k++){ var g=jd2g(i2jd(f[1]+k,f[0],hy)); if(g.y===y) add(g.m,g.d); } }); }
    HOLI[y]=h; return h; }
  function workday(y,m,d){ var h=holidays(y); var dt0=new Date(y,m-1,d); var moved=false;
    while(dt0.getDay()===0||dt0.getDay()===6||h[(dt0.getMonth()+1)+'-'+dt0.getDate()]){ dt0.setDate(dt0.getDate()+1); moved=true; if(dt0.getFullYear()!==y){ h=holidays(dt0.getFullYear()); } }
    return {d:dt0.getDate(), m:dt0.getMonth()+1, moved:moved}; }
  function wd(y,m,d,months,cur){ var r=workday(y,m,d); var lab=r.d+(r.m!==cur?' '+months[r.m-1].toLowerCase():''); return '<span class="d'+(r.moved?' moved':'')+'">'+d0(lab)+'</span>'; }
  function d0(n){return '<span dir="ltr">'+n+'</span>';}
  function renderCal(){
    var l=root.getAttribute('data-lang'); var c=CAL[l]||CAL.fr; var Y=CALY;
    var tiles='';
    for(var i=0;i<12;i++){
      var aco=ACOMPTE[i];
      tiles+='<div class="cal-month'+(aco?' acompte':'')+'">'
        +'<div class="cal-m-name">'+c.months[i]+(aco?'<span class="cal-badge">'+c.ac+'</span>':'')+'</div>'
        +'<div class="cal-line"><span>'+c.pp+'</span>'+wd(Y,i+1,15,c.months,i+1)+'</div>'
        +'<div class="cal-line"><span>'+c.pm1+'</span>'+wd(Y,i+1,20,c.months,i+1)+'</div>'
        +'<div class="cal-line"><span>'+c.pm2+'</span>'+wd(Y,i+1,28,c.months,i+1)+'</div>'
        +(aco?'<div class="cal-acompte"><span>'+c.ac+'</span>'+wd(Y,i+1,25,c.months,i+1)+'</div>':'')
        +'</div>';
    }
    var ann='';
    for(var j=0;j<ANNUAL.length;j++){ var a=ANNUAL[j];
      var rr=workday(Y,a.m+1,a.d); ann+='<div class="cal-arow"><span class="cal-adate'+(rr.moved?' moved':'')+'">'+d(rr.d)+' '+c.months[rr.m-1]+'</span><span class="cal-alabel">'+a[l]+'</span></div>';
    }
    var el=document.getElementById('calInline'); if(!el) return;
    var ys='<div class="cal-yr"><label for="calYear">'+(l==='ar'?'السنة':l==='en'?'Year':'Année')+'</label><select id="calYear">'+[CALY0-1,CALY0,CALY0+1].map(function(y){return '<option'+(y===Y?' selected':'')+'>'+y+'</option>';}).join('')+'</select></div>';
    var mv=l==='ar'?'* أجل مؤجَّل بسبب عطلة نهاية الأسبوع أو يوم عطلة. تواريخ الأعياد الدينية تقديرية (±1 يوم): يُرجع إلى بلاغ الإدارة العامّة للأداءات.':l==='en'?'* Deadline postponed because of a weekend or public holiday. Religious holiday dates are estimated (±1 day): check the DGI notice.':'* Échéance reportée pour cause de week-end ou de jour férié. Les dates des fêtes religieuses sont estimées (±1 jour) : se référer au communiqué de la DGI.';
    el.innerHTML='<h3 class="cal-h3" style="margin-top:0">'+c.title+' '+d0(Y)+'</h3>'+ys
      +'<p style="color:var(--muted);font-size:.96rem;margin-bottom:16px;max-width:72ch">'+c.intro+'</p>'
      +iaEchBlock(Y,c,l)+'<div class="cal-grid">'+tiles+'</div>'
      +'<div class="cal-legend"><span><span class="cal-dot" style="background:var(--line-2)"></span>'+c.legMonth+'</span>'
      +'<span><span class="cal-dot" style="background:var(--gold)"></span>'+c.legAc+'</span></div>'
      +'<h3 class="cal-h3">'+(ANN_TITLE[l]||ANN_TITLE.fr)+'</h3><div class="cal-annual">'+ann+'</div>'
      +'<p class="cal-note">'+mv+'<br>'+c.note+'</p>';
    var cy=document.getElementById('calYear'); if(cy) cy.addEventListener('change',function(){ CALY=parseInt(cy.value,10); renderCal(); });
  }
  var CALY0=CALY;
  renderCal();
  document.querySelectorAll('[data-cal]').forEach(function(b){
    function go(){ var el=document.getElementById('calInline'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
    b.addEventListener('click',go);
    b.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } });
  });
  document.querySelectorAll('.langsel button').forEach(function(b){ b.addEventListener('click',renderCal); });

  /* ---- outils de calcul ---- */
  function CL(){return root.getAttribute('data-lang')||'fr';}
  function nf(n){ if(!isFinite(n)) n=0; var s=(Math.round(n*1000)/1000).toFixed(3); var p=s.split('.'); p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,' '); return p[0]+','+p[1]; }
  function dt(s){return '<span dir="ltr">'+s+'</span>';}
  function tval(id){var el=document.getElementById(id); return el?parseFloat(el.value):NaN;}
  function tshow(id,html){var el=document.getElementById(id); if(el){el.innerHTML=html+(/class="big"/.test(html)?'<button type="button" class="t-print" data-print="'+id+'">'+(CL()==='ar'?'طباعة / PDF':CL()==='en'?'Print / PDF':'Imprimer / PDF')+'</button>':''); el.classList.add('show');}}
  function tline(k,v){return '<div class="line"><span>'+k+'</span><span class="v">'+v+'</span></div>';}
  var TL={
    fr:{dt:'DT',each:'Chaque acompte',total:'Total',due:'Échéances : 25 juin · 25 sept. · 25 déc.',pen:'Pénalité de retard',fix:'Pénalité fixe',toPay:'Total à payer',cot:'Cotisation CNSS (salarié)',net:'Salaire après CNSS',declIS:"Déclaration annuelle de l'IS",finIS:"Déclaration définitive (CAC)",acomp:'Acomptes provisionnels',on:'le'},
    en:{dt:'TND',each:'Each instalment',total:'Total',due:'Due: 25 Jun · 25 Sep · 25 Dec',pen:'Late-payment penalty',fix:'Fixed penalty',toPay:'Total to pay',cot:'Employee contribution',net:'Pay after social security',declIS:'Annual CIT return',finIS:'Final return (statutory audit)',acomp:'Advance instalments',on:'on'},
    ar:{dt:'د.ت',each:'كلّ قسط',total:'المجموع',due:'الآجال: 25 جوان · 25 سبتمبر · 25 ديسمبر',pen:'خطية التأخير',fix:'الخطية القارّة',toPay:'المبلغ الجملي',cot:'مساهمة الأجير',net:'الأجر بعد الضمان',declIS:'التصريح السنوي بالضريبة على الشركات',finIS:'التصريح النهائي (مراقبة الحسابات)',acomp:'الأقساط الاحتياطية',on:'يوم'}
  };
  var g;
  if((g=document.getElementById('ac-go'))) g.addEventListener('click',function(){ var t=TL[CL()]; var b=tval('ac-base'); if(!(b>=0)) b=0; var a=b*0.30;
    tshow('ac-out','<span class="big">'+dt(nf(a))+' '+t.dt+'</span>'+tline(t.each,dt(nf(a))+' '+t.dt)+tline(t.total,dt(nf(a*3))+' '+t.dt)+'<div class="line"><span>'+t.due+'</span><span></span></div>'); });
  if((g=document.getElementById('pen-go'))) g.addEventListener('click',function(){ var t=TL[CL()]; var b=tval('pen-base')||0, m=Math.ceil(tval('pen-mois')||0), r=tval('pen-taux')||0; var md=document.getElementById('pen-mode'); var spont=!md||md.value==='spont'; var pm=b*(r/100)*m; var fx=(spont&&m>0)?b*(m<=2?0.0125:0.025):0; var pen=pm+fx;
    tshow('pen-out','<span class="big">'+dt(nf(pen))+' '+t.dt+'</span>'+tline(t.pen+' ('+dt(r)+'% × '+dt(m)+')',dt(nf(pm))+' '+t.dt)+(spont?tline(t.fix+' ('+dt(m<=2?'1,25':'2,5')+'%)',dt(nf(fx))+' '+t.dt):'')+tline(t.toPay,dt(nf(b+pen))+' '+t.dt)); });
  (function(){ var md=document.getElementById('pen-mode'), tx=document.getElementById('pen-taux'); if(md&&tx) md.addEventListener('change',function(){ var pp=window.GEM_PEN||[0.75,1.25]; tx.value=String(md.value==='ctrl'?pp[1]:pp[0]); }); })();
  if((g=document.getElementById('cn-go'))) g.addEventListener('click',function(){ var t=TL[CL()]; var b=tval('cn-brut')||0, r=tval('cn-taux')||0; var cot=b*(r/100), net=b-cot;
    tshow('cn-out','<span class="big">'+dt(nf(net))+' '+t.dt+'</span>'+tline(t.cot,dt(nf(cot))+' '+t.dt)+tline(t.net,dt(nf(net))+' '+t.dt)); });
  if((g=document.getElementById('ech-go'))) g.addEventListener('click',function(){ var l=CL(); var t=TL[l]; var c=CAL[l]||CAL.fr; var v=document.getElementById('ech-date').value; var m=NaN; if(v){ m=parseInt(v.split('-')[1],10)-1; } if(isNaN(m)) m=11;
    function mo(add){ return c.months[(m+add)%12]; }
    tshow('ech-out', tline(t.declIS, t.on+' '+dt('25')+' '+mo(3))+tline(t.finIS, t.on+' '+dt('25')+' '+mo(6))
      +'<div class="line"><span>'+t.acomp+'</span><span class="v">'+dt('25')+' '+mo(6)+' · '+dt('25')+' '+mo(9)+' · '+dt('25')+' '+mo(12)+'</span></div>'); });
  document.querySelectorAll('.langsel button').forEach(function(b){ b.addEventListener('click',function(){ document.querySelectorAll('.t-out').forEach(function(o){o.classList.remove('show');}); }); });


  /* ---- impression d'un résultat d'outil ---- */
  document.addEventListener('click',function(e){ var b=e.target.closest?e.target.closest('.t-print'):null; if(!b) return;
    var out=document.getElementById(b.getAttribute('data-print')); var tool=out?out.closest('.tool'):null; if(!tool) return;
    var l=CL(); var ttl=(tool.querySelector('h3 .'+l)||tool.querySelector('h3')).textContent;
    var rows=[]; tool.querySelectorAll('input,select').forEach(function(f){ if(f.type==='checkbox'){ var lb=f.parentNode.textContent.trim(); rows.push([lb, f.checked?'✓':'—']); return; } var lab=f.closest('.t-row')?f.closest('.t-row').querySelector('label'):null; var v=f.tagName==='SELECT'?(f.options[f.selectedIndex]||{}).text:f.value; if(lab&&v!=='') rows.push([lab.textContent.trim(), v]); });
    var clone=out.cloneNode(true); var pb=clone.querySelector('.t-print'); if(pb) pb.remove();
    var esc=function(x){return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
    var disc=l==='ar'?'تقدير إرشادي لا يُغني عن دراسة مخصّصة من المكتب. النسب: يُرجع إلى آخر نصّ منشور بالرائد الرسمي.':l==='en'?'Indicative estimate; does not replace a tailored review by the firm. Rates: refer to the latest text published in the JORT.':'Estimation indicative, qui ne remplace pas une étude personnalisée du cabinet. Taux : se référer au dernier texte publié au JORT.';
    var w=window.open('','_blank'); if(!w) return;
    w.document.write('<!doctype html><html lang="'+l+'" dir="'+(l==='ar'?'rtl':'ltr')+'"><head><meta charset="utf-8"><title>GEM Consult — '+esc(ttl)+'</title><style>body{font:14px/1.5 Arial,sans-serif;color:#111;max-width:720px;margin:28px auto;padding:0 18px}h1{font-size:19px;margin:0 0 4px}.m{color:#555;font-size:12px;margin-bottom:18px;border-bottom:2px solid #CBA866;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin-bottom:16px}td{border-bottom:1px solid #ddd;padding:6px 4px}td+td{text-align:end}.line{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:6px 4px}.big{display:block;font-size:22px;font-weight:700;margin:6px 0 10px}.d{font-size:11px;color:#666;margin-top:18px}</style></head><body><h1>'+esc(ttl)+'</h1><div class="m">Cabinet GEM Consult · 11, rue Abderrahmen Azzem, Montplaisir, 1073 Tunis · +216 71 904 572 · contact@gemabm.com · '+new Date().toLocaleDateString(l==='ar'?'ar-TN':l==='en'?'en-GB':'fr-FR')+'</div><table>'+rows.map(function(r){return '<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td></tr>';}).join('')+'</table>'+clone.innerHTML+'<p class="d">'+disc+'</p></body></html>');
    w.document.close(); w.focus(); setTimeout(function(){ try{w.print();}catch(e){} },300); });

  /* ---- carte à la demande ---- */
  (function(){ var b=document.getElementById('mapLoad'); if(!b) return; b.addEventListener('click',function(){ var box=document.getElementById('mapBox');
    box.innerHTML='<iframe title="Plan d’accès GEM Consult" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q='+encodeURIComponent('11 rue Abderrahmen Azzem, Montplaisir, 1073 Tunis, Tunisie')+'&output=embed"></iframe>'; }); })();


  /* ---- bouton d'appel : téléphone direct ou WhatsApp ---- */
  (function(){ var f=document.getElementById('fab'), b=document.getElementById('fabBtn'); if(!f||!b) return;
    b.addEventListener('click',function(e){ e.stopPropagation(); var o=f.classList.toggle('open'); b.setAttribute('aria-expanded',o); });
    document.addEventListener('click',function(e){ if(!f.contains(e.target)){ f.classList.remove('open'); b.setAttribute('aria-expanded',false); } });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ f.classList.remove('open'); b.setAttribute('aria-expanded',false); } }); })();

  /* ==== SITE INTELLIGENT : contenus actualisés chaque jour par Claude (api/ia-data.php) ==== */
  var IA={params:null,veille:null,ech:null};
  var MOIS={fr:['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],en:['January','February','March','April','May','June','July','August','September','October','November','December'],ar:['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر']};
  function fdate(iso,l){ var d=new Date(iso); if(isNaN(d)) return iso||''; return d.getDate()+' '+MOIS[l][d.getMonth()]+' '+d.getFullYear(); }
  function esc2(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function setv(id,v){ var el=document.getElementById(id); if(el&&v!=null&&v!=='') el.value=v; }
  function iaGet(t){ return withTimeout(fetch('/api/ia-data?type='+t).then(function(r){ return r.ok?r.json():null; }),8000); }
  function applyParams(p){
    for(var i=1;i<=8;i++){ var r=p.irpp[i-1], be=document.getElementById('br'+i+'-b'), te=document.getElementById('br'+i+'-t'); if(!be||!te) continue;
      if(r){ be.value=(r[0]==null?'':r[0]); te.value=r[1]; } else { be.value=''; te.value=''; } }
    setv('fp-css',p.css_points); setv('lf-c26',p.css_points); setv('lf-c27',p.css_points_next); setv('is-t',p.is_general);
    setv('cn-taux',p.cnss_salarie); setv('fp-cnss',p.cnss_salarie); setv('fp-fp',p.frais_pro_taux); setv('fp-plaf',p.frais_pro_plafond);
    setv('fp-dchef',p.chef_famille); setv('fp-denf',p.enfant); setv('reg-seuil',p.forfait_seuil);
    window.GEM_PEN=[p.penalite_spontane,p.penalite_controle]; var md=document.getElementById('pen-mode'); setv('pen-taux', md&&md.value==='ctrl'?p.penalite_controle:p.penalite_spontane);
    var tv=document.getElementById('tva-t'); if(tv&&p.tva&&p.tva.length){ tv.innerHTML=p.tva.map(function(t){ return '<option value="'+t+'">'+t+'</option>'; }).join(''); }
    L.note_reperes=buildReperes(p); renderParamsStamp(); }
  function buildReperes(p){ var out={};
    ['fr','en','ar'].forEach(function(l){ var lo=0, rows=p.irpp.map(function(r){ var t=(r[0]==null?(l==='ar'?'أكثر من ':l==='en'?'above ':'au-delà de ')+nf0(lo):nf0(lo)+'–'+nf0(r[0]))+' : '+r[1]+' %'; if(r[0]!=null) lo=r[0]; return t; }).join(' · ');
      var T={fr:['Repères fiscaux & sociaux','Impôt sur le revenu (IRPP) — barème annuel','Contribution sociale de solidarité','barème IRPP majoré de '+p.css_points+' point(s) ; prévu en '+p.css_next_year+' : '+p.css_points_next+' point(s) ; exonération jusqu’à 5 000 DT de revenu net','Impôt sur les sociétés','taux général '+p.is_general+' % ; taux particuliers '+p.is_special.join(' / ')+' %','TVA','CNSS — salarié','Déductions','frais professionnels '+p.frais_pro_taux+' % plafonnés à '+nf0(p.frais_pro_plafond)+' DT/an · chef de famille '+p.chef_famille+' DT/an · '+p.enfant+' DT par enfant (4 max)','Forfait BIC','chiffre d’affaires jusqu’à '+nf0(p.forfait_seuil)+' DT','Vérifié automatiquement le ','Changements récents'],
        en:['Tax & social key figures','Income tax — annual scale','Social solidarity contribution','income-tax scale plus '+p.css_points+' point(s); planned for '+p.css_next_year+': '+p.css_points_next+' point(s); exempt up to TND 5,000 net income','Corporate income tax','general rate '+p.is_general+'%; special rates '+p.is_special.join(' / ')+'%','VAT','Social security — employee','Deductions','professional expenses '+p.frais_pro_taux+'% capped at TND '+nf0(p.frais_pro_plafond)+'/yr · head of household TND '+p.chef_famille+' · TND '+p.enfant+' per child (max 4)','Lump-sum regime','turnover up to TND '+nf0(p.forfait_seuil),'Automatically checked on ','Recent changes'],
        ar:['معالم جبائية واجتماعية','الضريبة على الدخل — الجدول السنوي','المساهمة الاجتماعية التضامنية','جدول الضريبة مع زيادة '+p.css_points+' نقطة؛ المبرمج لسنة '+p.css_next_year+': '+p.css_points_next+' نقطة؛ إعفاء إلى حدود 5000 د من الدخل الصافي','الضريبة على الشركات','النسبة العامّة '+p.is_general+'٪؛ النسب الخاصّة '+p.is_special.join(' / ')+'٪','الأداء على القيمة المضافة','الضمان الاجتماعي — الأجير','التخفيضات','المصاريف المهنية '+p.frais_pro_taux+'٪ بسقف '+nf0(p.frais_pro_plafond)+' د/سنة · رب العائلة '+p.chef_famille+' د · '+p.enfant+' د لكلّ ابن (4 أقصى)','النظام التقديري','رقم معاملات إلى حدود '+nf0(p.forfait_seuil)+' د','تمّ التثبّت آليًا في ','تغييرات حديثة']}[l];
      var ch=(p.changes||[]).slice(0,4).map(function(c){ return '<li>'+esc2((c.description||{})[l]||(c.description||{}).fr)+' — <a href="'+esc2(c.source)+'" target="_blank" rel="noopener noreferrer">source</a></li>'; }).join('');
      out[l]={t:T[0]+' '+(new Date()).getFullYear(),b:'<h3>'+T[1]+'</h3><p dir="auto">'+rows+'</p><h3>'+T[2]+'</h3><p>'+T[3]+'</p><h3>'+T[4]+'</h3><p>'+T[5]+'</p><h3>'+T[6]+'</h3><p>'+p.tva.join(' / ')+' %</p><h3>'+T[7]+'</h3><p>'+p.cnss_salarie+' %</p><h3>'+T[8]+'</h3><p>'+T[9]+'</p><h3>'+T[10]+'</h3><p>'+T[11]+'</p>'+(ch?'<h3>'+T[13]+'</h3><ul>'+ch+'</ul>':'')+(p.verified?'<p style="color:var(--faint);font-size:.82rem">'+T[12]+fdate(p.verified,l)+'.</p>':'')}; });
    return out; }
  function nf0(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' '); }
  function renderParamsStamp(){ var p=IA.params, el=document.getElementById('paramsStamp'); if(!p||!el||!p.verified) return; var l=CL();
    var t=(l==='ar'?'المعالم الجبائية (النسب، الجداول، السقوف) يتثبّت منها آليًا كلّ يوم — آخر تثبّت: ':l==='en'?'Tax figures (rates, scales, thresholds) are checked automatically every day — last check: ':'Taux, barèmes et seuils vérifiés automatiquement chaque jour — dernière vérification : ')+fdate(p.verified,l)+'.';
    var c=(p.changes||[])[0]; if(c) t+=' '+(l==='ar'?'آخر تغيير: ':l==='en'?'Latest change: ':'Dernier changement : ')+esc2((c.description||{})[l]||'');
    el.innerHTML=t; el.hidden=false; }
  function renderVeilleIA(){ var v=IA.veille, box=document.getElementById('veilleIA'); if(!v||!box) return; var l=CL();
    var H={fr:['La veille du cabinet','Analyse quotidienne','Rédigée chaque matin par l’assistant IA du cabinet à partir des sources citées. Information générale, à confirmer dans les textes officiels.','Ce que cela change pour vous : '],
           en:['The firm’s daily briefing','Daily analysis','Written every morning by the firm’s AI assistant from the sources cited. General information, to be confirmed against official texts.','What it means for you: '],
           ar:['متابعة المكتب','تحليل يومي','يُحرّرها المساعد الذكي للمكتب كلّ صباح انطلاقًا من المصادر المذكورة. معلومات عامّة يُتثبَّت منها في النصوص الرسمية.','ما الذي يتغيّر بالنسبة إليكم: ']}[l];
    var cards=v.items.slice(0,6).map(function(it){ var g=function(o){ return esc2((o||{})[l]||(o||{}).fr); };
      return '<div class="news"><div class="k">'+esc2(themeL(it.theme,l))+' · <span dir="ltr">'+esc2(fdate(it.date,l))+'</span></div><h3>'+g(it.titre)+'</h3><p>'+g(it.resume)+'</p><p class="imp"><b>'+H[3]+'</b>'+g(it.impact)+'</p><a class="srcl" href="'+LP()+'/veille/analyse/'+encodeURIComponent(it.id)+'">'+(CL()==='ar'?'← اقرأ التحليل':CL()==='en'?'Read the analysis →':'Lire l’analyse →')+'</a></div>'; }).join('');
    box.innerHTML='<div class="via-head"><h3>'+H[0]+'</h3><span class="ia-badge">IA · '+H[1]+'</span></div><p class="via-sub">'+H[2]+'</p><div class="news-grid in-stagger">'+cards+'</div>'; box.hidden=false; }
  var THEMES={'fiscalité':['Fiscalité','Tax','جباية'],'social':['Social','Social','اجتماعي'],'comptabilité-audit':['Comptabilité & audit','Accounting & audit','محاسبة وتدقيق'],'réglementation':['Réglementation','Regulation','تشريع'],'banque-marchés':['Banque & marchés','Banking & markets','بنوك وأسواق'],'sociétés':['Sociétés','Companies','شركات']};
  function themeL(t,l){ var k=String(t||'').toLowerCase().trim(); var x=THEMES[k]; return x?x[l==='en'?1:l==='ar'?2:0]:t; }
  function iaEchBlock(Y,c,l){ if(typeof IA==='undefined'||!IA||!IA.ech) return ''; var out='';
    Object.keys(IA.ech).sort().forEach(function(m){ if(String(Y)!==m.slice(0,4)) return; var x=IA.ech[m], mi=parseInt(m.slice(5),10)-1;
      out+='<div class="cal-dgi"><h4>'+(l==='ar'?'آجال شهر '+MOIS.ar[mi]+' '+Y+' — بلاغ الإدارة العامّة للأداءات':l==='en'?MOIS.en[mi]+' '+Y+' deadlines — DGI notice':'Échéances de '+MOIS.fr[mi]+' '+Y+' — communiqué de la DGI')+'</h4>'
        +x.items.map(function(it){ return '<div class="r"><b dir="ltr">'+esc2(it.date.split('-').reverse().join('/'))+'</b><span>'+esc2((it.libelle||{})[l]||(it.libelle||{}).fr)+'</span></div>'; }).join('')
        +'<a href="'+esc2(x.source)+'" target="_blank" rel="noopener noreferrer">'+(l==='ar'?'المصدر':l==='en'?'Source':'Source')+' →</a></div>'; });
    return out; }
  if(location.protocol!=='file:'){
    iaGet('params').then(function(p){ if(p&&p.irpp&&p.irpp.length){ IA.params=p; applyParams(p); } });
    iaGet('veille').then(function(v){ if(v&&v.items&&v.items.length){ IA.veille=v; renderVeilleIA(); } });
    iaGet('echeances').then(function(e){ if(e&&e.mois&&Object.keys(e.mois).length){ IA.ech=e.mois; renderCal(); } }); }
  document.querySelectorAll('.langsel button').forEach(function(b){ b.addEventListener('click',function(){ renderParamsStamp(); renderVeilleIA(); }); });

  /* ---- check-lists ---- */
  function clGet(id){ try{ return localStorage.getItem('gem_cl_'+id)==='1'; }catch(e){ return false; } }
  function clSet(id,v){ try{ localStorage.setItem('gem_cl_'+id, v?'1':'0'); }catch(e){} }
  function clUpd(panel){ if(!panel) return; var items=panel.querySelectorAll('.cl-item'); var done=0; items.forEach(function(it){ if(it.classList.contains('done')) done++; });
    var bar=panel.querySelector('.cl-prog span'); if(bar) bar.style.width=(items.length?Math.round(done/items.length*100):0)+'%';
    var d=panel.querySelector('.cl-done'); if(d) d.textContent=done; var t=panel.querySelector('.cl-tot'); if(t) t.textContent=items.length; }
  document.querySelectorAll('.cl-item').forEach(function(it){ var id=it.getAttribute('data-id'); if(clGet(id)) it.classList.add('done');
    it.addEventListener('click',function(){ var on=it.classList.toggle('done'); clSet(id,on); clUpd(it.closest('.cl-panel')); }); });
  document.querySelectorAll('.cl-panel').forEach(clUpd);
  document.querySelectorAll('.cl-tab').forEach(function(tb){ tb.addEventListener('click',function(){
    document.querySelectorAll('.cl-tab').forEach(function(x){x.classList.remove('on');});
    document.querySelectorAll('.cl-panel').forEach(function(x){x.classList.remove('on');});
    tb.classList.add('on'); var p=document.getElementById(tb.getAttribute('data-cl')); if(p) p.classList.add('on'); }); });

  /* ---- rendez-vous ---- */
  var rForm=document.getElementById('rForm'), rDone=document.getElementById('rDone');
  if(rForm){ rForm.addEventListener('submit',function(e){ e.preventDefault();
    var hp=rForm.querySelector('[name=site_web2]'); if(hp&&hp.value){ return; }
    var ok=true;
    rForm.querySelectorAll('[required]').forEach(function(f){ var bad=!f.value.trim(); if(f.type==='email'&&f.value) bad=!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value);
      f.closest('.field').classList.toggle('invalid',bad); if(bad) ok=false; });
    if(!ok) return;
    var G=function(n){return (rForm.querySelector('[name='+n+']')||{}).value||'';};
    var l=root.getAttribute('data-lang');
    var txt=(l==='ar'
      ? 'طلب موعد — GEM Consult\n————\nالاسم: '+G('rnom')+'\nالبريد: '+G('remail')+'\nالهاتف: '+G('rtel')+'\nالتاريخ المرغوب: '+G('rdate')+'\nالموضوع: '+G('robjet')+'\nنمط اللقاء: '+G('rmode')+'\n\nتوضيحات:\n'+G('rmsg')
      : l==='en'
      ? 'Appointment request — GEM Consult\n————\nName: '+G('rnom')+'\nEmail: '+G('remail')+'\nPhone: '+G('rtel')+'\nPreferred date: '+G('rdate')+'\nPurpose: '+G('robjet')+'\nFormat: '+G('rmode')+'\n\nDetails:\n'+G('rmsg')
      : 'Demande de rendez-vous — GEM Consult\n————\nNom: '+G('rnom')+'\nEmail: '+G('remail')+'\nTéléphone: '+G('rtel')+'\nDate souhaitée: '+G('rdate')+'\nObjet: '+G('robjet')+'\nMode: '+G('rmode')+'\n\nPrécisions:\n'+G('rmsg'));
    document.getElementById('rReady').textContent=txt;
    rForm.style.display='none'; rDone.classList.add('show'); rDone.scrollIntoView({behavior:'smooth',block:'center'});
    resetSent(rDone); var mr1=document.getElementById('rMail'); if(mr1) mr1.style.display='';
    apiSend({type:'rdv',lang:l,nom:G('rnom'),email:G('remail'),tel:G('rtel'),date:G('rdate'),objet:G('robjet'),mode:G('rmode'),message:G('rmsg'),hp:''},function(){markSent(rDone);});
    document.getElementById('rCopy').onclick=function(){copy(txt,this);};
    document.getElementById('rMail').href='mailto:contact@gemabm.com?subject='+encodeURIComponent((l==='ar'?'طلب موعد':l==='en'?'Appointment request':'Demande de rendez-vous')+' — '+G('robjet'))+'&body='+encodeURIComponent(txt);
  });
  document.getElementById('rNew').addEventListener('click',function(){ rDone.classList.remove('show'); rForm.reset(); rForm.style.display='grid';
    rForm.querySelectorAll('.invalid').forEach(function(f){f.classList.remove('invalid');}); }); }

  /* ---- lettre d'information ---- */
  var nlForm=document.getElementById('nlForm');
  if(nlForm){ nlForm.addEventListener('submit',function(e){ e.preventDefault();
    var em=nlForm.querySelector('[name=nlemail]'), ok=nlForm.querySelector('[name=nlok]');
    var valid = em && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value) && ok && ok.checked;
    if(!valid){ if(em) em.style.borderColor='var(--err)'; return; }
    if(em) em.style.borderColor='';
    var d=document.getElementById('nlDone'); var mail=em.value;
    function viaMail(){ if(d) d.classList.add('show'); try{ window.location.href='mailto:contact@gemabm.com?subject='+encodeURIComponent('Inscription — lettre d\'information GEM Consult')+'&body='+encodeURIComponent('Merci d\'inscrire l\'adresse suivante à la lettre d\'information du cabinet : '+mail); }catch(e){} }
    function viaApi(){ if(d){ var l=CL(); d.innerHTML=(l==='ar'?'شكرًا — تمّ تسجيل اشتراككم.':l==='en'?'Thank you — your subscription has been recorded.':'Merci — votre inscription est enregistrée.'); d.classList.add('show'); } }
    if(location.protocol==='file:'){ viaMail(); }
    else { try{ var c2=new AbortController(); setTimeout(function(){c2.abort();},8000); fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'newsletter',email:mail,hp:''}),signal:c2.signal}).then(function(r){return r.ok?r.json():null;}).then(function(j){ if(j&&j.ok) viaApi(); else viaMail(); }).catch(viaMail); }catch(e){ viaMail(); } }
    em.value=''; if(ok) ok.checked=false;
  }); }

  /* ---- calculateurs financiers ---- */
  var FL={
    fr:{ht:'Montant HT',tva:'TVA',ttc:'Montant TTC',ann:'Annuité',rate:'Taux annuel',sr:'Seuil de rentabilité (CA)',bfr:'Besoin en fonds de roulement',caf:'Capacité d’autofinancement',mens:'Mensualité',tint:'Total des intérêts',cost:'Coût total'},
    en:{ht:'Amount excl. VAT',tva:'VAT',ttc:'Amount incl. VAT',ann:'Annual charge',rate:'Annual rate',sr:'Break-even turnover',bfr:'Working capital need',caf:'Self-financing capacity',mens:'Monthly instalment',tint:'Total interest',cost:'Total cost'},
    ar:{ht:'المبلغ دون أداء',tva:'الأداء',ttc:'المبلغ مع الأداء',ann:'القسط السنوي',rate:'النسبة السنوية',sr:'عتبة المردودية (رقم المعاملات)',bfr:'الحاجة إلى رأس المال العامل',caf:'القدرة على التمويل الذاتي',mens:'القسط الشهري',tint:'جملة الفوائد',cost:'الكلفة الجملية'}
  };
  function unit(){return TL[CL()].dt;}
  var h;
  if((h=document.getElementById('tva-go'))) h.addEventListener('click',function(){ var f=FL[CL()]; var m=tval('tva-m')||0, s=document.getElementById('tva-sens').value, r=parseFloat(document.getElementById('tva-t').value)||0; var ht,tva,ttc;
    if(s==='ttc'){ ht=m/(1+r/100); tva=m-ht; ttc=m; } else { ht=m; tva=m*r/100; ttc=m+tva; }
    tshow('tva-out','<span class="big">'+dt(nf(ttc))+' '+unit()+'</span>'+tline(f.ht,dt(nf(ht))+' '+unit())+tline(f.tva+' ('+dt(r)+'%)',dt(nf(tva))+' '+unit())+tline(f.ttc,dt(nf(ttc))+' '+unit())); });
  if((h=document.getElementById('am-go'))) h.addEventListener('click',function(){ var f=FL[CL()]; var v=tval('am-v')||0, d2=tval('am-d')||0; if(d2<1){ tshow('am-out','—'); return; } var a=v/d2, tx=100/d2;
    tshow('am-out','<span class="big">'+dt(nf(a))+' '+unit()+'</span>'+tline(f.ann,dt(nf(a))+' '+unit())+tline(f.rate,dt((Math.round(tx*100)/100))+'%')); });
  if((h=document.getElementById('sr-go'))) h.addEventListener('click',function(){ var f=FL[CL()]; var cf=tval('sr-cf')||0, tx=tval('sr-tx')||0; if(tx<=0){ tshow('sr-out','—'); return; } var sr=cf/(tx/100);
    tshow('sr-out','<span class="big">'+dt(nf(sr))+' '+unit()+'</span>'+tline(f.sr,dt(nf(sr))+' '+unit())); });
  if((h=document.getElementById('bfr-go'))) h.addEventListener('click',function(){ var f=FL[CL()]; var b=(tval('bfr-s')||0)+(tval('bfr-c')||0)-(tval('bfr-f')||0);
    tshow('bfr-out','<span class="big">'+dt(nf(b))+' '+unit()+'</span>'+tline(f.bfr,dt(nf(b))+' '+unit())); });
  if((h=document.getElementById('caf-go'))) h.addEventListener('click',function(){ var f=FL[CL()]; var c=(tval('caf-r')||0)+(tval('caf-d')||0)-(tval('caf-rep')||0);
    tshow('caf-out','<span class="big">'+dt(nf(c))+' '+unit()+'</span>'+tline(f.caf,dt(nf(c))+' '+unit())); });
  if((h=document.getElementById('emp-go'))) h.addEventListener('click',function(){ var f=FL[CL()]; var c=tval('emp-c')||0, t=tval('emp-t')||0, n=tval('emp-n')||0; if(n<1){ tshow('emp-out','—'); return; } var i=t/100/12; var m=i>0? c*i/(1-Math.pow(1+i,-n)) : c/n; var tot=m*n; var intr=tot-c;
    tshow('emp-out','<span class="big">'+dt(nf(m))+' '+unit()+'</span>'+tline(f.mens,dt(nf(m))+' '+unit())+tline(f.tint,dt(nf(intr))+' '+unit())+tline(f.cost,dt(nf(tot))+' '+unit())); });

  /* ---- simulateurs fiscaux (taux éditable JORT) ---- */
  var SF={
    fr:{is:'Impôt sur les sociétés',net:'Net à payer',ret:'Retenue à la source',netb:'Net après retenue',tcl:'TCL due',de:'Droits d’enregistrement'},
    en:{is:'Corporate income tax',net:'Net to pay',ret:'Withholding',netb:'Net after withholding',tcl:'Local tax due',de:'Registration duties'},
    ar:{is:'الضريبة على الشركات',net:'الصافي المستوجب',ret:'الخصم من المورد',netb:'الصافي بعد الخصم',tcl:'المعلوم المستوجب',de:'معاليم التسجيل'}
  };
  var q;
  if((q=document.getElementById('is-go'))) q.addEventListener('click',function(){ var s=SF[CL()]; var b=tval('is-b')||0, t=tval('is-t')||0; var imp=b*t/100;
    tshow('is-out','<span class="big">'+dt(nf(imp))+' '+unit()+'</span>'+tline(s.is+' ('+dt(t)+'%)',dt(nf(imp))+' '+unit())); });
  if((q=document.getElementById('rs-go'))) q.addEventListener('click',function(){ var s=SF[CL()]; var m=tval('rs-m')||0, t=tval('rs-t')||0; var r=m*t/100;
    tshow('rs-out','<span class="big">'+dt(nf(r))+' '+unit()+'</span>'+tline(s.ret+' ('+dt(t)+'%)',dt(nf(r))+' '+unit())+tline(s.netb,dt(nf(m-r))+' '+unit())); });
  if((q=document.getElementById('tcl-go'))) q.addEventListener('click',function(){ var s=SF[CL()]; var b=tval('tcl-b')||0, t=tval('tcl-t')||0; var v=b*t/100;
    tshow('tcl-out','<span class="big">'+dt(nf(v))+' '+unit()+'</span>'+tline(s.tcl+' ('+dt(t)+'%)',dt(nf(v))+' '+unit())); });
  if((q=document.getElementById('de-go'))) q.addEventListener('click',function(){ var s=SF[CL()]; var b=tval('de-b')||0, t=tval('de-t')||0; var v=b*t/100;
    tshow('de-out','<span class="big">'+dt(nf(v))+' '+unit()+'</span>'+tline(s.de+' ('+dt(t)+'%)',dt(nf(v))+' '+unit())); });

  /* ---- barème IRPP éditable + paie ---- */
  function readBareme(){ var rows=[]; for(var i=1;i<=8;i++){ var be=document.getElementById('br'+i+'-b'), te=document.getElementById('br'+i+'-t'); if(!te) continue; var t=parseFloat(te.value); if(isNaN(t)) continue; var b=parseFloat(be.value); rows.push({b:isNaN(b)?Infinity:b, t:t}); } return rows; }
  function irppCalc(income,cssPts){ var rows=readBareme(); var cp=(cssPts!=null)?cssPts:tval('fp-css'); if(!(cp>=0)) cp=0; if(!rows.length||income<=0) return {tax:0, css:0, ok:rows.length>0}; var prev=0, tax=0, css=0; for(var i=0;i<rows.length;i++){ var up=rows[i].b; var portion=Math.max(0, Math.min(income,up)-prev); tax+=portion*rows[i].t/100; if(rows[i].t>0) css+=portion*cp/100; prev=up; if(income<=up) break; } return {tax:tax, css:css, ok:true}; }
  var NB={fr:{css:'CSS (contribution sociale de solidarité)',irpp:'IRPP annuel',avg:'Taux moyen',need:'Veuillez saisir le barème IRPP ci-dessus.',cnss:'Cotisation CNSS',base:'Base imposable (mensuelle)',imp:'IRPP mensuel',net:'Net à payer',brutM:'Salaire brut mensuel',frais:'Frais professionnels',fam:'Déductions familiales',lblB:'Salaire brut mensuel (DT)',lblN:'Salaire net mensuel (DT)'},
    en:{css:'Social solidarity contribution',irpp:'Annual income tax',avg:'Average rate',need:'Please enter the income-tax scale above.',cnss:'Social-security contribution',base:'Taxable base (monthly)',imp:'Monthly income tax',net:'Net to pay',brutM:'Gross monthly salary',frais:'Professional expenses',fam:'Family deductions',lblB:'Gross monthly salary (TND)',lblN:'Net monthly salary (TND)'},
    ar:{css:'المساهمة الاجتماعية التضامنية',irpp:'الضريبة السنوية',avg:'النسبة المتوسّطة',need:'يرجى إدراج جدول الضريبة أعلاه.',cnss:'مساهمة الضمان',base:'القاعدة الخاضعة (شهريًا)',imp:'الضريبة الشهرية',net:'الصافي المستوجب',brutM:'الأجر الخام الشهري',frais:'المصاريف المهنية',fam:'التخفيضات العائلية',lblB:'الأجر الخام الشهري (د.ت)',lblN:'الأجر الصافي الشهري (د.ت)'}};
  if((q=document.getElementById('irpp-go'))) q.addEventListener('click',function(){ var n=NB[CL()]; var r=tval('irpp-r')||0; var res=irppCalc(r);
    if(!res.ok){ tshow('irpp-out', n.need); return; } var avg=r>0?(res.tax/r*100):0;
    tshow('irpp-out','<span class="big">'+dt(nf(res.tax))+' '+unit()+'</span>'+tline(n.irpp,dt(nf(res.tax))+' '+unit())+tline(n.css+' /an',dt(nf(res.css))+' '+unit())+tline(n.avg,dt((Math.round(avg*100)/100))+'%')); });
  function fpNet(brut,o){ o=o||{}; var tx=tval('fp-cnss')||0, fpTx=tval('fp-fp')||0, plaf=tval('fp-plaf')||0, dchef=tval('fp-dchef')||0, denf=tval('fp-denf')||0;
    var chef=(o.chef!=null)?o.chef:document.getElementById('fp-chef').checked, enf=Math.min(4,Math.max(0,Math.round((o.enf!=null?o.enf:tval('fp-enf'))||0)));
    var cnssM=brut*tx/100; var apresA=(brut-cnssM)*12; var fraisA=Math.min(apresA*fpTx/100, plaf); var famA=(chef?dchef:0)+enf*denf;
    var baseA=Math.max(0, apresA-fraisA-famA); var res=irppCalc(baseA,o.css); var impM=res.ok?res.tax/12:0; var cssM=res.ok?res.css/12:0; var net=brut-cnssM-impM-cssM;
    return {brut:brut,cnssM:cnssM,fraisA:fraisA,famA:famA,baseM:baseA/12,impM:impM,cssM:cssM,net:net,ok:res.ok}; }
  function solveBrut(target){ var hi=Math.max(1000,target*2); for(var k=0;k<60&&fpNet(hi).net<target;k++) hi*=2; var lo=0; for(var i=0;i<100;i++){ var mid=(lo+hi)/2; if(fpNet(mid).net<target) lo=mid; else hi=mid; } return fpNet((lo+hi)/2); }
  if((q=document.getElementById('fp-sens'))) q.addEventListener('change',function(){ var n=NB[CL()]; var lbl=document.getElementById('fp-lbl'); var nb=this.value==='nb';
    lbl.setAttribute('data-fr', nb?NB.fr.lblN:NB.fr.lblB); lbl.setAttribute('data-en', nb?NB.en.lblN:NB.en.lblB); lbl.setAttribute('data-ar', nb?NB.ar.lblN:NB.ar.lblB); lbl.textContent=nb?n.lblN:n.lblB; });
  if((q=document.getElementById('fp-go'))) q.addEventListener('click',function(){ var n=NB[CL()]; var sens=document.getElementById('fp-sens').value; var val=tval('fp-brut')||0;
    var r=sens==='nb'?solveBrut(val):fpNet(val); if(!r.ok){ tshow('fp-out', n.need); return; } var tx=tval('fp-cnss')||0; var big=sens==='nb'?r.brut:r.net;
    tshow('fp-out','<span class="big">'+dt(nf(big))+' '+unit()+'</span>'+tline(n.brutM,dt(nf(r.brut))+' '+unit())+tline(n.cnss+' ('+dt(tx)+'%)',dt(nf(r.cnssM))+' '+unit())+tline(n.frais+' /an',dt(nf(r.fraisA))+' '+unit())+tline(n.fam+' /an',dt(nf(r.famA))+' '+unit())+tline(n.base,dt(nf(r.baseM))+' '+unit())+tline(n.imp,dt(nf(r.impM))+' '+unit())+tline(n.css,dt(nf(r.cssM))+' '+unit())+tline(n.net,dt(nf(r.net))+' '+unit())); });


  /* ---- comparateur salaire 2026 / 2027 ---- */
  if((q=document.getElementById('lf-go'))) q.addEventListener('click',function(){ var n=NB[CL()]; var l=CL(); var b=tval('lf-brut')||0;
    var o={chef:document.getElementById('lf-chef').checked, enf:tval('lf-enf')||0};
    var a=fpNet(b,{chef:o.chef,enf:o.enf,css:tval('lf-c26')||0}), c=fpNet(b,{chef:o.chef,enf:o.enf,css:tval('lf-c27')||0}); if(!a.ok){ tshow('lf-out', n.need); return; }
    var dm=c.net-a.net; var L=l==='ar'?{n26:'الصافي الشهري 2026',n27:'الصافي الشهري 2027',dm:'الفارق الشهري',da:'الفارق السنوي',c26:'المساهمة 2026',c27:'المساهمة 2027',nt:'تقدير يعتمد جدول الضريبة الحالي؛ يُحيَّن عند نشر قانون المالية 2027 بالرائد الرسمي.'}:l==='en'?{n26:'Monthly net 2026',n27:'Monthly net 2027',dm:'Monthly difference',da:'Annual difference',c26:'Contribution 2026',c27:'Contribution 2027',nt:'Estimate based on the current scale; to be updated once the 2027 Finance Act is published in the JORT.'}:{n26:'Net mensuel 2026',n27:'Net mensuel 2027',dm:'Écart mensuel',da:'Écart annuel',c26:'CSS 2026',c27:'CSS 2027',nt:'Estimation sur la base du barème actuel ; à mettre à jour dès la publication de la loi de finances 2027 au JORT.'};
    tshow('lf-out','<span class="big">'+dt(nf(dm))+' '+unit()+' / '+(l==='ar'?'شهر':l==='en'?'month':'mois')+'</span>'+tline(L.n26,dt(nf(a.net))+' '+unit())+tline(L.n27,dt(nf(c.net))+' '+unit())+tline(L.c26,dt(nf(a.cssM))+' '+unit())+tline(L.c27,dt(nf(c.cssM))+' '+unit())+tline(L.dm,dt(nf(dm))+' '+unit())+tline(L.da,dt(nf(dm*12))+' '+unit())+'<div style="margin-top:8px;font-size:.8rem;color:var(--faint)">'+L.nt+'</div>'); });

  /* ---- assistants de décision ---- */
  var CACL={
    fr:{ob:'Désignation obligatoire',no:'Non obligatoire',
      sa:'Toute société par actions (SA, SCA) doit désigner un commissaire aux comptes, quels que soient ses chiffres.',
      oect:"Seuils élevés atteints : le commissaire doit être un expert-comptable inscrit au tableau de l'OECT.",
      spec:'Le commissaire peut être un spécialiste en comptabilité inscrit, ou un expert-comptable.',
      under:'Moins de deux seuils dépassés : aucune obligation légale. La désignation volontaire reste possible et renforce la crédibilité financière.',
      met:'Seuils dépassés',labB:'Total bilan',labP:'Total produits',labE:'Effectif'},
    en:{ob:'Appointment required',no:'Not required',
      sa:'Every joint-stock company (SA, SCA) must appoint a statutory auditor, whatever its figures.',
      oect:'High thresholds reached: the auditor must be a chartered accountant on the OECT roll.',
      spec:'The auditor may be a registered accounting specialist, or a chartered accountant.',
      under:'Fewer than two thresholds exceeded: no legal obligation. Voluntary appointment remains possible and strengthens financial credibility.',
      met:'Thresholds exceeded',labB:'Balance-sheet total',labP:'Total revenue',labE:'Headcount'},
    ar:{ob:'التعيين إجباري',no:'غير إجباري',
      sa:'كل شركة خفية الاسم (SA, SCA) ملزمة بتعيين مراقب حسابات مهما كانت أرقامها.',
      oect:'بلوغ السقوف العليا: يجب أن يكون المراقب خبيرًا محاسبًا مرسّمًا بهيئة الخبراء المحاسبين.',
      spec:'يمكن أن يكون المراقب مختصًّا في المحاسبة مرسّمًا، أو خبيرًا محاسبًا.',
      under:'لم يُتجاوز سقفان: لا إلزام قانوني. يبقى التعيين الاختياري ممكنًا ويعزّز المصداقية المالية.',
      met:'السقوف المتجاوَزة',labB:'مجموع الموازنة',labP:'مجموع المداخيل',labE:'عدد الأعوان'}};
  if((q=document.getElementById('cac-go'))) q.addEventListener('click',function(){ var L=CACL[CL()]; var forme=document.getElementById('cac-forme').value;
    var bil=tval('cac-bilan')||0, prd=tval('cac-prod')||0, eff=tval('cac-eff')||0;
    if(forme==='sa'){ tshow('cac-out','<span class="verdict v-yes">✓ '+L.ob+'</span><div style="margin-top:4px">'+L.sa+'</div>'); return; }
    var base=(bil>100000?1:0)+(prd>300000?1:0)+(eff>10?1:0); var hi=(bil>1500000?1:0)+(prd>2000000?1:0)+(eff>30?1:0);
    var lines=tline(L.labB,dt(nf(bil))+' '+unit())+tline(L.labP,dt(nf(prd))+' '+unit())+tline(L.labE,dt(eff));
    if(base>=2){ var reg=hi>=2?L.oect:L.spec; tshow('cac-out','<span class="verdict v-yes">✓ '+L.ob+'</span><div style="margin:4px 0 10px">'+reg+'</div>'+lines+tline(L.met,dt(base)+'/3')); }
    else { tshow('cac-out','<span class="verdict v-no">'+L.no+'</span><div style="margin:4px 0 10px">'+L.under+'</div>'+lines+tline(L.met,dt(base)+'/3')); } });

  function honoComp(v, base, firstUp, rates){ if(v<=0) return 0; var h=base, prev=firstUp;
    for(var i=0;i<rates.length;i++){ var up=rates[i][0]; var portion=Math.max(0,Math.min(v,up)-prev); h+=portion*rates[i][1]; prev=up; if(v<=up) break; } return h; }
  function honoBilan(b){ return honoComp(b,700,300000,[[1000000,0.0015456],[3000000,0.0007728],[7000000,0.0003864],[15000000,0.0001546],[35000000,0.000116],[80000000,0.0000773],[200000000,0.0000388],[500000000,0.0000155],[1000000000,0.0000116],[Infinity,0.0000078]]); }
  function honoProd(p){ return honoComp(p,500,100000,[[300000,0.0034776],[700000,0.0023184],[1500000,0.0015456],[3000000,0.0007728],[7500000,0.0003864],[20000000,0.0001933],[50000000,0.0001546],[120000000,0.0000773],[350000000,0.0000388],[Infinity,0.0000193]]); }
  function honoEff(e){ return honoComp(e,800,50,[[150,13.1376],[500,7.728],[1200,3.864],[3000,1.932],[7000,1.5456],[Infinity,1.1592]]); }
  var HOL={fr:{res:'Honoraires annuels indicatifs',cb:'Composante bilan',cp:'Composante produits',ce:'Composante effectif',co:'Majoration co-commissariat (+50 %)',note:'Montant hors taxes. Barème officiel = somme des trois composantes (bilan, produits, effectif). Les honoraires définitifs tiennent compte des diligences effectives.'},
    en:{res:'Indicative annual fee',cb:'Balance-sheet component',cp:'Revenue component',ce:'Headcount component',co:'Joint-audit surcharge (+50%)',note:'Excl. tax. Official scale = sum of the three components (balance sheet, revenue, headcount). Final fees reflect the actual work performed.'},
    ar:{res:'الأتعاب السنوية الاسترشادية',cb:'مكوّن الموازنة',cp:'مكوّن المداخيل',ce:'مكوّن الأعوان',co:'زيادة المراقبة المشتركة (+50٪)',note:'المبلغ دون أداء. التعريفة الرسمية = مجموع المكوّنات الثلاثة (الموازنة، المداخيل، الأعوان). تُراعى في الأتعاب النهائية الأعمال المنجزة فعليًا.'}};
  if((q=document.getElementById('ho-go'))) q.addEventListener('click',function(){ var L=HOL[CL()]; var b=tval('ho-bilan')||0, p=tval('ho-prod')||0, e=tval('ho-eff')||0; var co=document.getElementById('ho-co').checked;
    var cb=honoBilan(b), cp=honoProd(p), ce=honoEff(e); var sum=cb+cp+ce; var tot=co?sum*1.5:sum;
    var lines=tline(L.cb,dt(nf(cb))+' '+unit())+tline(L.cp,dt(nf(cp))+' '+unit())+tline(L.ce,dt(nf(ce))+' '+unit());
    if(co) lines+=tline(L.co,dt(nf(sum*0.5))+' '+unit());
    tshow('ho-out','<span class="big">'+dt(nf(tot))+' '+unit()+'</span>'+lines+tline(L.res,dt(nf(tot))+' '+unit())+'<div style="margin-top:8px;font-size:.8rem;color:var(--faint)">'+L.note+'</div>'); });

  var REGL={fr:{reel:'Régime réel',forf:'Régime forfaitaire optionnel possible',
      servMsg:'Les professions libérales et non commerciales (BNC) relèvent du régime réel : le forfait ne concerne que les bénéfices industriels et commerciaux.',
      okMsg:'Chiffre d’affaires sous le seuil : l’option pour le forfait BIC est possible (art. 91 LF 2026), sous réserve des activités exclues et de ne pas avoir été reclassé au réel suite à un contrôle. Le régime réel reste toujours possible.',
      overMsg:'Chiffre d’affaires au-dessus du seuil : régime réel obligatoire.',labCA:'Chiffre d’affaires',labS:'Seuil forfait'},
    en:{reel:'Actual-profit regime',forf:'Optional lump-sum regime available',
      servMsg:'Liberal and non-commercial professions fall under the actual regime: the lump-sum regime only covers industrial and commercial profits.',
      okMsg:'Turnover below the threshold: you may opt for the lump-sum regime (art. 91 FL 2026), subject to excluded activities and not having been moved to the actual regime after an audit. The actual regime always remains available.',
      overMsg:'Turnover above the threshold: actual regime is mandatory.',labCA:'Turnover',labS:'Threshold'},
    ar:{reel:'النظام الحقيقي',forf:'إمكانية النظام التقديري الاختياري',
      servMsg:'المهن الحرّة وغير التجارية تخضع للنظام الحقيقي: النظام التقديري يخصّ الأرباح الصناعية والتجارية فقط.',
      okMsg:'رقم المعاملات دون السقف: يمكنكم اختيار النظام التقديري (الفصل 91 من ق.م 2026) مع مراعاة الأنشطة المستثناة. يبقى النظام الحقيقي ممكنًا دائمًا.',
      overMsg:'رقم المعاملات فوق السقف: النظام الحقيقي إجباري.',labCA:'رقم المعاملات',labS:'سقف النظام'}};
  if((q=document.getElementById('reg-go'))) q.addEventListener('click',function(){ var L=REGL[CL()]; var act=document.getElementById('reg-act').value; var ca=tval('reg-ca')||0, s=tval('reg-seuil')||0;
    var lines=tline(L.labCA,dt(nf(ca))+' '+unit())+tline(L.labS,dt(nf(s))+' '+unit());
    if(act==='serv'){ tshow('reg-out','<span class="verdict v-yes">'+L.reel+'</span><div style="margin:4px 0 10px">'+L.servMsg+'</div>'+lines); return; }
    if(ca<=s){ tshow('reg-out','<span class="verdict v-yes">'+L.forf+'</span><div style="margin:4px 0 10px">'+L.okMsg+'</div>'+lines); }
    else { tshow('reg-out','<span class="verdict v-no">'+L.reel+'</span><div style="margin:4px 0 10px">'+L.overMsg+'</div>'+lines); } });

  /* ---- convertisseur de dates (algorithme tabulaire de Kuwait) ---- */
  function g2jd(d,m,y){ var a=Math.floor((14-m)/12); var yy=y+4800-a; var mm=m+12*a-3; return d+Math.floor((153*mm+2)/5)+365*yy+Math.floor(yy/4)-Math.floor(yy/100)+Math.floor(yy/400)-32045; }
  function jd2g(jd){ var a=jd+32044; var b=Math.floor((4*a+3)/146097); var c=a-Math.floor((146097*b)/4); var dd=Math.floor((4*c+3)/1461); var e=c-Math.floor((1461*dd)/4); var m=Math.floor((5*e+2)/153); return {d:e-Math.floor((153*m+2)/5)+1, m:m+3-12*Math.floor(m/10), y:100*b+dd-4800+Math.floor(m/10)}; }
  function i2jd(d,m,y){ return Math.floor((11*y+3)/30)+354*y+30*m-Math.floor((m-1)/2)+d+1948440-385; }
  function jd2i(jd){ var l=jd-1948440+10632; var n=Math.floor((l-1)/10631); l=l-10631*n+354; var j=Math.floor((10985-l)/5316)*Math.floor((50*l)/17719)+Math.floor(l/5670)*Math.floor((43*l)/15238); l=l-Math.floor((30-j)/15)*Math.floor((17719*j)/50)-Math.floor(j/16)*Math.floor((15238*j)/43)+29; var m=Math.floor((24*l)/709); return {d:l-Math.floor((709*m)/24), m:m, y:30*n+j-30}; }
  var HMON={fr:['Mouharram','Safar','Rabia I','Rabia II','Joumada I','Joumada II','Rajab','Chaabane','Ramadan','Chawwal','Dhou al-Qida','Dhou al-Hijja'],
    en:['Muharram','Safar','Rabiʿ I','Rabiʿ II','Jumada I','Jumada II','Rajab','Shaʿban','Ramadan','Shawwal','Dhu al-Qidah','Dhu al-Hijjah'],
    ar:['محرّم','صفر','ربيع الأول','ربيع الثاني','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوّال','ذو القعدة','ذو الحجّة']};
  var GMON={fr:['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],
    en:['January','February','March','April','May','June','July','August','September','October','November','December'],
    ar:['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر']};
  var DCL={fr:{err:'Date invalide.',hres:'Date hégirienne',gres:'Date grégorienne',note:'Calendrier tabulaire — peut varier de ±1 jour par rapport au calendrier officiel observé.'},
    en:{err:'Invalid date.',hres:'Hijri date',gres:'Gregorian date',note:'Tabular calendar — may differ by ±1 day from the official observed calendar.'},
    ar:{err:'تاريخ غير صالح.',hres:'التاريخ الهجري',gres:'التاريخ الميلادي',note:'تقويم جدولي — قد يختلف بيوم واحد ± عن التقويم الرسمي المعتمد على الرؤية.'}};
  if((q=document.getElementById('dc-go'))) q.addEventListener('click',function(){ var L=DCL[CL()]; var lg=CL(); var sens=document.getElementById('dc-sens').value;
    var j=Math.round(tval('dc-j')||0), m=Math.round(tval('dc-m')||0), y=Math.round(tval('dc-a')||0);
    if(j<1||m<1||m>12||y<1){ tshow('dc-out','<span style="color:#e6a1a1">'+L.err+'</span>'); return; }
    if(sens==='gh'){ var r=jd2i(g2jd(j,m,y)); if(r.m<1||r.m>12){ tshow('dc-out','<span style="color:#e6a1a1">'+L.err+'</span>'); return; }
      tshow('dc-out','<span class="big">'+dt(r.d)+' '+HMON[lg][r.m-1]+' '+dt(r.y)+' '+(lg==='ar'?'هـ':'H')+'</span>'+tline(L.hres,dt(r.d)+'/'+dt(r.m)+'/'+dt(r.y))+'<div style="margin-top:8px;font-size:.8rem;color:var(--faint)">'+L.note+'</div>'); }
    else { var g=jd2g(i2jd(j,m,y)); if(g.m<1||g.m>12){ tshow('dc-out','<span style="color:#e6a1a1">'+L.err+'</span>'); return; }
      tshow('dc-out','<span class="big">'+dt(g.d)+' '+GMON[lg][g.m-1]+' '+dt(g.y)+'</span>'+tline(L.gres,dt(g.d)+'/'+dt(g.m)+'/'+dt(g.y))+'<div style="margin-top:8px;font-size:.8rem;color:var(--faint)">'+L.note+'</div>'); } });

  /* ---- modèles de documents ---- */
  var TMPL={
    fr:[
      {n:'Lettre de mission',d:'Cadre contractuel de la mission comptable',t:'LETTRE DE MISSION\n\nEntre les soussignés :\n[Dénomination du client], ci-après « le Client »,\net le Cabinet GEM Consult, Expert-Comptable membre de l’OECT,\n\nIl a été convenu ce qui suit :\n\n1. Objet de la mission\nLe Cabinet est chargé de [tenue de la comptabilité / établissement des états financiers / assistance fiscale et sociale] au titre de l’exercice [année].\n\n2. Obligations du Client\nLe Client s’engage à fournir, dans les délais, l’ensemble des pièces et informations nécessaires.\n\n3. Honoraires\nLes honoraires sont fixés à [montant] DT HT, payables [modalités].\n\n4. Durée\nLa présente mission est conclue pour la période du [..] au [..], renouvelable par tacite reconduction.\n\nFait à Tunis, le [date]\nLe Client    Le Cabinet'},
      {n:'PV d’assemblée générale ordinaire',d:'Approbation des comptes annuels',t:'PROCÈS-VERBAL DE L’ASSEMBLÉE GÉNÉRALE ORDINAIRE\n[Dénomination de la société] — Capital : [montant] DT\n\nL’an [année], le [date], les associés se sont réunis en assemblée générale ordinaire au siège social.\n\nOrdre du jour :\n1. Lecture des rapports de gestion [et du commissaire aux comptes] ;\n2. Approbation des états financiers de l’exercice [année] ;\n3. Affectation du résultat ;\n4. Quitus aux dirigeants.\n\nRésolutions :\nPremière résolution — L’assemblée approuve les états financiers arrêtés au 31/12/[année], faisant ressortir un résultat de [montant] DT. Adoptée.\nDeuxième résolution — L’assemblée décide d’affecter le résultat comme suit : [..]. Adoptée.\n\nPlus rien n’étant à l’ordre du jour, la séance est levée.\n\nLe Président    Le Secrétaire'},
      {n:'Demande d’attestation fiscale',d:'Courrier type à la recette des finances',t:'OBJET : Demande d’attestation de situation fiscale\n\n[Lieu], le [date]\n\nMonsieur le Chef de la Recette des Finances de [..],\n\nJ’ai l’honneur de solliciter la délivrance d’une attestation de situation fiscale au nom de [dénomination / nom], identifiant fiscal n° [..], en vue de [objet].\n\nVous trouverez ci-joint les pièces justificatives requises.\n\nDans l’attente de votre réponse, je vous prie d’agréer, Monsieur, l’expression de ma considération distinguée.\n\n[Signature]'}
    ],
    en:[
      {n:'Engagement letter',d:'Contractual scope of the accounting engagement',t:'ENGAGEMENT LETTER\n\nBetween the undersigned:\n[Client name], hereinafter “the Client”,\nand GEM Consult, Chartered Accountant (OECT member),\n\nIt has been agreed as follows:\n\n1. Scope\nThe Firm is engaged for [bookkeeping / preparation of financial statements / tax and social assistance] for the [year] financial year.\n\n2. Client obligations\nThe Client undertakes to provide, on time, all necessary documents and information.\n\n3. Fees\nFees are set at [amount] TND excl. tax, payable [terms].\n\n4. Term\nThis engagement is concluded for the period from [..] to [..], renewable by tacit agreement.\n\nTunis, [date]\nThe Client    The Firm'},
      {n:'Minutes of ordinary general meeting',d:'Approval of annual accounts',t:'MINUTES OF THE ORDINARY GENERAL MEETING\n[Company name] — Capital: [amount] TND\n\nIn the year [year], on [date], the partners met in ordinary general meeting at the registered office.\n\nAgenda:\n1. Reading of the management report [and auditor’s report];\n2. Approval of the [year] financial statements;\n3. Allocation of the result;\n4. Discharge to the managers.\n\nResolutions:\nFirst resolution — The meeting approves the financial statements as at 31/12/[year], showing a result of [amount] TND. Adopted.\nSecond resolution — The meeting decides to allocate the result as follows: [..]. Adopted.\n\nWith nothing further on the agenda, the meeting was closed.\n\nThe Chairman    The Secretary'},
      {n:'Tax-clearance request',d:'Template letter to the tax office',t:'SUBJECT: Request for a tax-standing certificate\n\n[Place], [date]\n\nTo the Head of the Finance Office of [..],\n\nI hereby request the issuance of a tax-standing certificate in the name of [name], tax ID no. [..], for the purpose of [purpose].\n\nPlease find enclosed the required supporting documents.\n\nYours faithfully,\n\n[Signature]'}
    ],
    ar:[
      {n:'رسالة التكليف',d:'الإطار التعاقدي للمهمة المحاسبية',t:'رسالة تكليف\n\nبين الممضيين أسفله:\n[اسم الحريف]، ويُشار إليه فيما يلي بـ«الحريف»،\nومكتب GEM Consult، خبير محاسب عضو بهيئة الخبراء المحاسبين،\n\nتمّ الاتفاق على ما يلي:\n\n1. موضوع المهمة: يُكلَّف المكتب بـ[مسك المحاسبة / إعداد القوائم المالية / المساعدة الجبائية والاجتماعية] بعنوان سنة [..].\n2. التزامات الحريف: يلتزم الحريف بتقديم جميع الوثائق والمعطيات اللازمة في الآجال.\n3. الأتعاب: حُدّدت بـ[المبلغ] د.ت دون أداء، تُدفع [الطريقة].\n4. المدّة: من [..] إلى [..]، قابلة للتجديد ضمنيًا.\n\nحُرّر بتونس في [التاريخ]\nالحريف    المكتب'},
      {n:'محضر الجلسة العامة العادية',d:'المصادقة على القوائم المالية السنوية',t:'محضر الجلسة العامة العادية\n[اسم الشركة] — رأس المال: [المبلغ] د.ت\n\nفي سنة [..]، بتاريخ [..]، اجتمع الشركاء في جلسة عامة عادية بالمقر الاجتماعي.\n\nجدول الأعمال:\n1. تلاوة تقرير التصرّف [وتقرير مراقب الحسابات]؛\n2. المصادقة على القوائم المالية لسنة [..]؛\n3. تخصيص النتيجة؛\n4. إبراء ذمّة المسيّرين.\n\nالقرارات:\nالقرار الأول — تصادق الجلسة على القوائم المالية المختومة في 31/12/[..]، والتي تُظهر نتيجة قدرها [المبلغ] د.ت. مُصادق عليه.\nالقرار الثاني — تقرّر الجلسة تخصيص النتيجة كما يلي: [..]. مُصادق عليه.\n\nوإذ لم يبق شيء بجدول الأعمال، رُفعت الجلسة.\n\nالرئيس    الكاتب'},
      {n:'مطلب شهادة جبائية',d:'نموذج مراسلة لقباضة المالية',t:'الموضوع: مطلب في شهادة الوضعية الجبائية\n\n[المكان]، في [التاريخ]\n\nالسيد رئيس قباضة المالية بـ[..]،\n\nأتشرّف بطلب تسليم شهادة في الوضعية الجبائية باسم [الاسم]، المعرّف الجبائي عدد [..]، قصد [الغرض].\n\nتجدون رفقته الوثائق المؤيّدة المطلوبة.\n\nوتقبّلوا، سيّدي، فائق التقدير والاحترام.\n\n[الإمضاء]'}
    ]};
  function renderTmpl(){ var box=document.getElementById('tmpl-list'); if(!box) return; var list=TMPL[CL()]; var cp=(CL()==='fr'?'Copier':CL()==='ar'?'نسخ':'Copy'); box.innerHTML='';
    list.forEach(function(it){ var row=document.createElement('div'); row.className='tmpl-item';
      row.innerHTML='<div style="min-width:0"><div class="tmpl-n">'+it.n+'</div><div class="tmpl-d">'+it.d+'</div></div><button class="tmpl-copy" type="button">'+cp+'</button>';
      var btn=row.querySelector('.tmpl-copy');
      btn.addEventListener('click',function(){ var done=(CL()==='fr'?'Copié ✓':CL()==='ar'?'نُسخ ✓':'Copied ✓');
        function ok(){ btn.textContent=done; btn.classList.add('ok'); setTimeout(function(){ btn.textContent=cp; btn.classList.remove('ok'); },1800); }
        try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(it.t).then(ok,function(){fallback();}); } else { fallback(); } }catch(e){ fallback(); }
        function fallback(){ try{ var ta=document.createElement('textarea'); ta.value=it.t; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); ok(); }catch(e){} } });
      box.appendChild(row); }); }
  renderTmpl();


  /* ---- Assistant IA GEM : serveur (api/assistant.php) + repli local sur la base FAQ ---- */
  var AI_H=[], AI_BUSY=false;
  var AIT={fr:{hello:'Bonjour, je suis l’assistant du cabinet GEM Consult. Posez-moi une question générale de comptabilité, de fiscalité, de CNSS ou de droit des sociétés en Tunisie.',typing:'Rédaction de la réponse…',local:'Réponse issue de notre FAQ (assistant en ligne indisponible).',none:'Je n’ai pas trouvé de réponse fiable à cette question dans notre base. Le cabinet vous répondra volontiers :',rdv:'Prendre rendez-vous',more:'Pour une analyse de votre situation précise, prenez rendez-vous avec le cabinet.',sugg:['Dois-je nommer un commissaire aux comptes ?','Quel est le taux de l’IS en 2026 ?','Mon association doit-elle être auditée ?','Comment fonctionne la conciliation pénale ?']},
    en:{hello:'Hello, I am GEM Consult’s assistant. Ask me a general question on accounting, tax, social security or company law in Tunisia.',typing:'Writing the answer…',local:'Answer from our FAQ (online assistant unavailable).',none:'I could not find a reliable answer to this question in our base. The firm will be glad to help:',rdv:'Book an appointment',more:'For an analysis of your specific situation, book an appointment with the firm.',sugg:['Must I appoint a statutory auditor?','What is the 2026 corporate tax rate?','Must my association be audited?','How does criminal settlement work?']},
    ar:{hello:'مرحبًا، أنا مساعد مكتب GEM Consult. اطرحوا عليّ سؤالًا عامًا في المحاسبة أو الجباية أو الضمان الاجتماعي أو قانون الشركات بتونس.',typing:'جارٍ تحرير الإجابة…',local:'إجابة من أسئلتنا المتكرّرة (المساعد المباشر غير متوفّر).',none:'لم أجد إجابة موثوقة عن هذا السؤال في قاعدتنا. يسعد المكتب بالردّ عليكم:',rdv:'حجز موعد',more:'لتحليل وضعيتكم الخاصّة، احجزوا موعدًا مع المكتب.',sugg:['هل يجب تعيين مراقب حسابات؟','ما هي نسبة الضريبة على الشركات في 2026؟','هل يجب تدقيق حسابات جمعيتي؟','كيف يتمّ الصلح الجزائي؟']}};
  var AIKB=[
    {k:'nommer nomme designer designation obligatoire obligation commissaire comptes cac seuils sarl suarl appoint auditor statutory must تعيين مراقب حسابات وجوبي',fr:'La désignation d’un commissaire aux comptes est obligatoire pour toute société anonyme (SA, SCA). Pour les SARL, SUARL, SNC et SCS, elle le devient dès que deux des trois seuils sont dépassés : total du bilan 100 000 DT, total des produits 300 000 DT, effectif moyen 10. Au-delà de deux des seuils de 1 500 000 DT, 2 000 000 DT et 30 salariés, le commissaire doit être un expert-comptable inscrit à l’OECT (art. 13 CSC, décret n° 2006-1546). Vérifiez votre cas avec l’outil « Dois-je nommer un commissaire aux comptes ? » de la page Outils.',en:'Appointing a statutory auditor is mandatory for every joint-stock company (SA, SCA). For SARL, SUARL, SNC and SCS it becomes mandatory once two of three thresholds are exceeded: balance sheet TND 100,000, revenue TND 300,000, average headcount 10. Above two of the thresholds of TND 1.5 million, TND 2 million and 30 employees, the auditor must be an OECT chartered accountant (art. 13 CSC, decree 2006-1546).',ar:'تعيين مراقب الحسابات وجوبي لكلّ شركة خفية الاسم. وبالنسبة للشركات ذات المسؤولية المحدودة وشركات الشخص الواحد وشركات المفاوضة والمقارضة البسيطة، يصبح وجوبيًا عند تجاوز اثنين من ثلاثة سقوف: مجموع الموازنة 100 ألف دينار، مجموع المداخيل 300 ألف دينار، معدّل الأعوان 10. وفوق اثنين من سقوف 1,5 مليون دينار و2 مليون دينار و30 عونًا، يجب أن يكون المراقب خبيرًا محاسبًا مرسّمًا بالهيئة (الفصل 13 من مجلة الشركات التجارية والأمر عدد 1546 لسنة 2006).'},
    {k:'taux impot societes is 2026 corporate tax rate نسبة الضريبة الشركات',fr:'Le taux général de l’impôt sur les sociétés est de 20 % depuis la loi de finances 2025. Des taux particuliers s’appliquent : 10 % (artisanat, agriculture, pêche…), 35 % (notamment opérateurs télécoms, activités pétrolières, concessionnaires automobiles) et 40 % (banques, établissements financiers, assurances).',en:'The general corporate tax rate is 20% since the 2025 Finance Act. Special rates apply: 10% (crafts, agriculture, fishing…), 35% (e.g. telecom operators, oil activities, car dealers) and 40% (banks, financial institutions, insurers).',ar:'النسبة العامّة للضريبة على الشركات هي 20٪ منذ قانون المالية لسنة 2025، مع نسب خاصّة: 10٪ (الحرف، الفلاحة، الصيد البحري…)، 35٪ (مشغّلو الاتصالات، الأنشطة البترولية، وكلاء السيارات…) و40٪ (البنوك والمؤسسات المالية والتأمين).'},
    {k:'tva taux vat 19 13 7 الأداء القيمة المضافة',fr:'Les taux de TVA en vigueur sont 19 % (taux général), 13 % et 7 % (taux réduits applicables à certaines opérations). Utilisez le calculateur TVA de la page Outils pour passer du HT au TTC.',en:'VAT rates are 19% (standard), 13% and 7% (reduced rates for certain transactions). Use the VAT calculator in the Tools page.',ar:'نسب الأداء على القيمة المضافة هي 19٪ (النسبة العامّة) و13٪ و7٪ (نسب مخفّضة لبعض العمليات).'},
    {k:'acompte provisionnel acomptes advance instalment الأقساط الاحتياطية',fr:'Les acomptes provisionnels sont au nombre de trois, chacun égal à 30 % de l’impôt de l’année précédente, payables au cours des 6e, 9e et 12e mois suivant la clôture (25 juin, 25 septembre et 25 décembre pour une clôture au 31 décembre).',en:'There are three advance instalments, each equal to 30% of the prior year’s tax, due in the 6th, 9th and 12th months after year-end (25 June, 25 September and 25 December for a 31 December year-end).',ar:'الأقساط الاحتياطية ثلاثة، كلّ منها يساوي 30٪ من ضريبة السنة الفارطة، تُدفع خلال الأشهر السادس والتاسع والثاني عشر الموالية لختم السنة.'},
    {k:'css contribution sociale solidarite salaire 2027 solidarity المساهمة الاجتماعية التضامنية',fr:'En 2026, la contribution sociale de solidarité des salariés est calculée en appliquant le barème de l’IRPP majoré de 0,5 point (art. 87 LF 2026), avec exonération si le revenu net annuel n’excède pas 5 000 DT. Cette réduction ne vise que les revenus de 2026 : sauf prorogation par la loi de finances 2027, la majoration revient à 1 point en 2027.',en:'In 2026, the employee social solidarity contribution is computed by applying the income-tax scale increased by 0.5 point (art. 87 FL 2026), exempt below TND 5,000 net annual income. Unless extended by the 2027 Finance Act, it returns to 1 point in 2027.',ar:'في 2026 تُحتسب المساهمة الاجتماعية التضامنية للأجراء بتطبيق جدول الضريبة على الدخل مع زيادة 0,5 نقطة (الفصل 87 من ق.م 2026)، مع الإعفاء إذا لم يتجاوز الدخل الصافي السنوي 5000 دينار. وما لم يقع التمديد بقانون المالية 2027، تعود الزيادة إلى نقطة واحدة في 2027.'},
    {k:'penalite retard paiement impot late penalty خطية التأخير',fr:'Selon l’article 81 du CDPF, la pénalité de retard est de 0,75 % par mois ou fraction de mois en cas de paiement spontané, majorée d’une pénalité fixe de 1,25 % (retard ≤ 60 jours) ou 2,5 % (au-delà). Suite à un contrôle fiscal, elle est de 1,25 % par mois.',en:'Under article 81 CDPF, the late-payment penalty is 0.75% per month or part-month for voluntary payment, plus a fixed penalty of 1.25% (≤ 60 days) or 2.5% (beyond). After a tax audit it is 1.25% per month.',ar:'حسب الفصل 81 من مجلّة الحقوق والإجراءات الجبائية، خطية التأخير 0,75٪ عن كلّ شهر أو جزء منه عند الخلاص التلقائي، تُضاف إليها خطية قارّة بـ1,25٪ (تأخير ≤ 60 يومًا) أو 2,5٪. وإثر مراقبة جبائية تكون 1,25٪ شهريًا.'},
    {k:'cnss cotisation taux salarie employeur social security الضمان الاجتماعي',fr:'Dans le régime général, la cotisation CNSS salariale est de 9,68 % du salaire brut ; la part patronale est d’environ 17,07 % (y compris l’accident du travail selon l’activité). Vérifiez le taux applicable à votre secteur.',en:'Under the general scheme, the employee CNSS contribution is 9.68% of gross salary; the employer share is about 17.07% (including work-accident cover depending on the activity).',ar:'في النظام العام، مساهمة الأجير في الضمان الاجتماعي 9,68٪ من الأجر الخام، ومساهمة المؤجّر في حدود 17,07٪ (بما في ذلك حوادث الشغل حسب النشاط).'},
    {k:'forfait regime forfaitaire bic petit commerce النظام التقديري',fr:'Le forfait BIC optionnel (art. 91 LF 2026) est ouvert aux personnes physiques dont le chiffre d’affaires annuel n’excède pas 100 000 DT : impôt annuel de 4 000 DT jusqu’à 50 000 DT de chiffre d’affaires et 5 000 DT au-delà (moitié en zone rurale), sous réserve des activités exclues.',en:'The optional lump-sum regime (art. 91 FL 2026) is open to individuals with turnover up to TND 100,000: TND 4,000 per year up to TND 50,000 and TND 5,000 above (half in rural areas), subject to excluded activities.',ar:'النظام التقديري الاختياري (الفصل 91 من ق.م 2026) مفتوح للأشخاص الطبيعيين الذين لا يتجاوز رقم معاملاتهم 100 ألف دينار: ضريبة سنوية بـ4000 دينار إلى حدود 50 ألف دينار و5000 دينار فوق ذلك (النصف في المناطق الريفية).'}
  ];
  function aiNorm(t){ return (t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[ً-ْـ]/g,'').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s]/gu,' '); }
  var AISTOP={fr:1,les:1,des:1,une:1,pour:1,dans:1,est:1,que:1,qui:1,quel:1,quelle:1,mon:1,mes:1,the:1,and:1,what:1,how:1,does:1,with:1,from:1,هل:1,على:1,في:1,من:1,ما:1,هي:1,عن:1};
  function aiToks(t){ return aiNorm(t).split(/\s+/).filter(function(w){ return w.length>2 && !AISTOP[w]; }); }
  function aiLocal(qs){ var l=CL(); var qt=aiToks(qs); if(!qt.length) return null; var best=null, bs=0;
    var docs=[];
    AIKB.forEach(function(e){ docs.push({k:e.k+' '+e.k+' '+e[l], a:e[l]}); });
    document.querySelectorAll('#faq .q').forEach(function(q){ var qq=q.querySelector('.q-btn .'+l), aa=q.querySelector('.q-a .'+l); if(qq&&aa) docs.push({k:qq.textContent+' '+qq.textContent+' '+aa.textContent, a:aa.textContent}); });
    document.querySelectorAll('#lexique .lex').forEach(function(x){ var t=x.querySelector('.term .'+l), d=x.querySelector('.def .'+l); if(t&&d) docs.push({k:t.textContent+' '+t.textContent+' '+t.textContent+' '+d.textContent, a:t.textContent+' : '+d.textContent}); });
    docs.forEach(function(d){ var dt=aiToks(d.k); var sc=0; qt.forEach(function(w){ if(dt.indexOf(w)>=0) sc+=1; else if(w.length>4 && dt.some(function(x){return x.indexOf(w.slice(0,5))===0;})) sc+=.6; }); sc=sc/Math.sqrt(qt.length); if(sc>bs){ bs=sc; best=d; } });
    return bs>=1? best.a : null; }
  function aiEsc(x){ return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function aiFmt(t){ var h=aiEsc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>'); var out='', inList=false;
    h.split(/\n/).forEach(function(line){ var m=line.match(/^\s*[-•*]\s+(.*)/); if(m){ if(!inList){ out+='<ul>'; inList=true; } out+='<li>'+m[1]+'</li>'; } else { if(inList){ out+='</ul>'; inList=false; } if(line.trim()) out+='<p>'+line+'</p>'; } });
    if(inList) out+='</ul>'; return out; }
  function aiAdd(role,html){ var c=document.getElementById('aiChat'); var d=document.createElement('div'); d.className='msg '+role; d.innerHTML=html; c.appendChild(d); c.scrollTop=c.scrollHeight; return d; }
  function aiRdvLink(){ var t=AIT[CL()]; return '<a href="'+LP()+'/contact#rdv">'+t.rdv+' →</a>'; }
  function aiSugg(){ var box=document.getElementById('aiSugg'); if(!box) return; box.innerHTML=''; if(AI_H.length) return; AIT[CL()].sugg.forEach(function(sg){ var b=document.createElement('button'); b.type='button'; b.textContent=sg; b.addEventListener('click',function(){ aiAsk(sg); }); box.appendChild(b); }); }
  function aiInit(){ var c=document.getElementById('aiChat'); if(!c) return; if(!AI_H.length){ c.innerHTML=''; aiAdd('a',aiFmt(AIT[CL()].hello)); } aiSugg(); }
  function aiAsk(qs){ qs=(qs||'').trim(); if(!qs||AI_BUSY) return; var t=AIT[CL()]; AI_BUSY=true; aiAdd('u',aiFmt(qs)); AI_H.push({role:'user',content:qs}); aiSugg();
    var typing=aiAdd('a typing',t.typing);
    function localAnswer(){ var a=aiLocal(qs); typing.remove(); if(a){ aiAdd('a',aiFmt(a)+'<p>'+t.more+' '+aiRdvLink()+'</p><span class="src">'+t.local+'</span>'); AI_H.push({role:'assistant',content:a}); } else { aiAdd('a','<p>'+t.none+'</p><p>+216 71 904 572 · contact@gemabm.com · '+aiRdvLink()+'</p>'); AI_H.pop(); } AI_BUSY=false; }
    if(location.protocol==='file:'){ setTimeout(localAnswer,350); return; }
    try{ var ctrl=new AbortController(); var to=setTimeout(function(){ctrl.abort();},45000);
      fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang:CL(),messages:AI_H.slice(-10)}),signal:ctrl.signal})
        .then(function(r){ return r.ok?r.json():null; }).then(function(j){ clearTimeout(to); if(j&&j.ok&&j.reply){ typing.remove(); aiAdd('a',aiFmt(j.reply)); AI_H.push({role:'assistant',content:j.reply}); AI_BUSY=false; } else localAnswer(); })
        .catch(function(){ clearTimeout(to); localAnswer(); });
    }catch(e){ localAnswer(); } }
  (function(){ var f=document.getElementById('aiForm'), ta=document.getElementById('ai-q'); if(!f) return;
    f.addEventListener('submit',function(e){ e.preventDefault(); var v=ta.value; ta.value=''; aiAsk(v); });
    ta.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit')); } });
    aiInit(); document.querySelectorAll('.langsel button').forEach(function(b){ b.addEventListener('click',function(){ if(!AI_H.length) aiInit(); else aiSugg(); }); }); })();


  /* ---- devises & change ---- */
  var CUR=[
    ['TND','Dinar tunisien','Tunisian Dinar','الدينار التونسي'],
    ['EUR','Euro','Euro','اليورو'],
    ['USD','Dollar US','US Dollar','الدولار الأمريكي'],
    ['GBP','Livre sterling','Pound Sterling','الجنيه الإسترليني'],
    ['CHF','Franc suisse','Swiss Franc','الفرنك السويسري'],
    ['JPY','Yen japonais','Japanese Yen','الين الياباني'],
    ['CAD','Dollar canadien','Canadian Dollar','الدولار الكندي'],
    ['AED','Dirham Émirats','UAE Dirham','الدرهم الإماراتي'],
    ['SAR','Riyal saoudien','Saudi Riyal','الريال السعودي'],
    ['KWD','Dinar koweïtien','Kuwaiti Dinar','الدينار الكويتي'],
    ['LYD','Dinar libyen','Libyan Dinar','الدينار الليبي'],
    ['DZD','Dinar algérien','Algerian Dinar','الدينار الجزائري'],
    ['MAD','Dirham marocain','Moroccan Dirham','الدرهم المغربي'],
    ['CNY','Yuan chinois','Chinese Yuan','اليوان الصيني']];
  function curName(code){ var l=CL()==='en'?2:(CL()==='ar'?3:1); for(var i=0;i<CUR.length;i++) if(CUR[i][0]===code) return CUR[i][l]; return code; }
  function rfmt(x,d){ d=(d==null?4:d); if(!isFinite(x)) return '—'; var s=Math.abs(x).toFixed(d); var p=s.split('.'); p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,' '); return (x<0?'-':'')+p.join(','); }
  function fillSel(id,sel){ var el=document.getElementById(id); if(!el) return; el.innerHTML=''; CUR.forEach(function(c){ var o=document.createElement('option'); o.value=c[0]; o.textContent=c[0]+' — '+curName(c[0]); if(c[0]===sel) o.selected=true; el.appendChild(o); }); }
  function fillAllSel(){ var f=document.getElementById('cv-from'), t=document.getElementById('cv-to'), b=document.getElementById('bct-dev');
    fillSel('cv-from', f&&f.value?f.value:'EUR'); fillSel('cv-to', t&&t.value?t.value:'TND'); fillSel('bct-dev', b&&b.value?b.value:'EUR'); }
  try{ var bm=document.getElementById('bct-mois'); if(bm&&!bm.value){ var dnow=new Date(); bm.value=dnow.getFullYear()+'-'+('0'+(dnow.getMonth()+1)).slice(-2); } }catch(e){}
  fillAllSel();
  var RATES=null, RDATE=null, RERR=false;
  var CVL={fr:{res:'Résultat',rate:'Taux appliqué',date:'Cours du',src:'Montant',loading:'Chargement des cours…',off:'Cours en ligne indisponibles. Vérifiez votre connexion ou utilisez le module « Taux moyen mensuel BCT » avec un taux saisi.',same:'Choisissez deux devises différentes.'},
    en:{res:'Result',rate:'Applied rate',date:'Rate as of',src:'Amount',loading:'Loading rates…',off:'Live rates unavailable. Check your connection or use the “BCT monthly average rate” module with a manual rate.',same:'Choose two different currencies.'},
    ar:{res:'النتيجة',rate:'السعر المطبّق',date:'سعر يوم',src:'المبلغ',loading:'جارٍ تحميل الأسعار…',off:'الأسعار المباشرة غير متوفّرة. تحقّق من الاتصال أو استعمل وحدة «السعر المتوسط الشهري» بسعر مُدرَج يدويًا.',same:'اختر عملتين مختلفتين.'}};
  function loadRates(){ try{ var ctrl=new AbortController(); var to=setTimeout(function(){ctrl.abort();},9000);
      var rurl='/api/rates';
      fetch(rurl,{signal:ctrl.signal}).then(function(r){ if(!r.ok) throw 0; return r; }).then(function(r){return r.json();}).then(function(d){ clearTimeout(to);
        if(d&&d.result==='success'&&d.rates){ RATES=d.rates; RDATE=d.time_last_update_utc||null; RERR=false; }
        else { RERR=true; } }).catch(function(){ clearTimeout(to); RERR=true; });
    }catch(e){ RERR=true; } }
  loadRates();
  if((q=document.getElementById('cv-go'))) q.addEventListener('click',function(){ var L=CVL[CL()]; var a=tval('cv-amt')||0; var fr=document.getElementById('cv-from').value, to=document.getElementById('cv-to').value;
    if(fr===to){ tshow('cv-out', L.same); return; }
    if(!RATES||!RATES[fr]||!RATES[to]){ if(RERR){ tshow('cv-out', L.off); } else { tshow('cv-out', L.loading); loadRates(); } return; }
    var tnd=a/RATES[fr]; var res=tnd*RATES[to]; var unitRate=(RATES[to]/RATES[fr]);
    var dstr=''; if(RDATE){ try{ var dd=new Date(RDATE); dstr=('0'+dd.getDate()).slice(-2)+'/'+('0'+(dd.getMonth()+1)).slice(-2)+'/'+dd.getFullYear(); }catch(e){} }
    var out='<span class="big">'+dt(rfmt(res,3))+' '+to+'</span>'
      +tline(L.src, dt(rfmt(a,3))+' '+fr)
      +tline(L.rate, '1 '+fr+' = '+dt(rfmt(unitRate,4))+' '+to)
      +(dstr?tline(L.date, dt(dstr)):'');
    tshow('cv-out', out); });

  /* taux moyens mensuels officiels BCT — dernier mois publié (ramenés à 1 unité de devise) */
  var BCT_MONTH='2026-09';
  var BCT_RATES={TND:1, EUR:3.3770, USD:2.9344, GBP:3.9377, CHF:3.58362, JPY:0.0187828, CAD:2.1019, AED:0.79914, SAR:0.78158, KWD:9.5544, LYD:0.4615, DZD:0.02198, MAD:0.30976, CNY:0.4374};
  function bctPrefill(){ var sel=document.getElementById('bct-dev'), tf=document.getElementById('bct-taux'), mf=document.getElementById('bct-mois'); if(!sel||!tf) return;
    if(mf&&!mf.dataset.touched) mf.value=BCT_MONTH; var r=BCT_RATES[sel.value]; if(r!=null&&!tf.dataset.touched) tf.value=r; }
  (function(){ var sel=document.getElementById('bct-dev'), tf=document.getElementById('bct-taux'), mf=document.getElementById('bct-mois');
    if(tf) tf.addEventListener('input',function(){ tf.dataset.touched='1'; }); if(mf) mf.addEventListener('input',function(){ mf.dataset.touched='1'; });
    if(sel) sel.addEventListener('change',function(){ var r=BCT_RATES[sel.value]; if(r!=null){ tf.dataset.touched=''; tf.value=r; } }); bctPrefill(); })();
  var BCTL={fr:{cv:'Contre-valeur en dinars',rate:'Taux moyen appliqué',need:'Saisissez le taux moyen BCT et le montant en devise.',note:'Pré-rempli au dernier taux moyen mensuel publié par la BCT (sept. 2026), modifiable. Mettez à jour avec le mois de votre opération.'},
    en:{cv:'Dinar countervalue',rate:'Average rate applied',need:'Enter the BCT average rate and the amount in currency.',note:'Pre-filled with the latest BCT monthly average rate (Sept. 2026), editable. Update it with your transaction month.'},
    ar:{cv:'القيمة المقابلة بالدينار',rate:'السعر المتوسط المطبّق',need:'أدرج السعر المتوسط للبنك المركزي والمبلغ بالعملة.',note:'مُعبّأ مسبقًا بآخر سعر متوسط شهري نشره البنك المركزي (سبتمبر 2026)، قابل للتعديل. حدّثه حسب شهر عمليتك.'}};
  if((q=document.getElementById('bct-go'))) q.addEventListener('click',function(){ var L=BCTL[CL()]; var dev=document.getElementById('bct-dev').value; var tx=tval('bct-taux')||0, m=tval('bct-mont')||0;
    if(tx<=0||m<=0){ tshow('bct-out', L.need); return; }
    var cv=m*tx;
    tshow('bct-out','<span class="big">'+dt(rfmt(cv,3))+' '+unit()+'</span>'+tline(L.cv,dt(rfmt(cv,3))+' '+unit())+tline(L.rate,'1 '+dev+' = '+dt(rfmt(tx,4))+' '+unit())+'<div style="margin-top:8px;font-size:.8rem;color:var(--faint)">'+L.note+'</div>'); });

  /* ---- index des outils : liste au clic, puis l'outil choisi ---- */
  (function(){
    var sec=document.getElementById('outils'); if(!sec) return;
    var wrap=sec.querySelector('.wrap'); if(!wrap) return;
    var head=wrap.querySelector('.sec-head'); if(!head) return;
    function mkHead(id,fr,en,ar){ var b=document.getElementById(id); if(!b) return; var g=b.closest('.tools-grid'); if(!g) return;
      var d=document.createElement('div'); d.className='tool-group-h'; d.innerHTML='<span class="fr">'+fr+'</span><span class="en">'+en+'</span><span class="ar">'+ar+'</span>'; var anchor=g; var sub=wrap.querySelector('.tool-group-sub[data-for="'+id+'"]'); if(sub) anchor=sub; g.parentNode.insertBefore(d,anchor); }
    mkHead('ac-go','Obligations fiscales &amp; sociales','Tax &amp; social obligations','الالتزامات الجبائية والاجتماعية');
    mkHead('tva-go','Calculateurs financiers','Financial calculators','حاسبات مالية');
    mkHead('is-go','Simulateurs fiscaux','Tax simulators','محاكيات جبائية');
    mkHead('irpp-go','Paie &amp; IRPP','Payroll &amp; income tax','الأجور والضريبة على الدخل');
    var groups=[],cur=null,tools=[];
    Array.prototype.forEach.call(wrap.children,function(ch){
      if(ch.classList && ch.classList.contains('tool-group-h')){ cur={head:ch,items:[]}; groups.push(cur); }
      else if(ch.classList && ch.classList.contains('tools-grid')){
        Array.prototype.forEach.call(ch.querySelectorAll('.tool'),function(t){
          if(!cur){ cur={head:null,items:[]}; groups.push(cur); }
          var uid='tl'+tools.length; var it={uid:uid,el:t,h3:t.querySelector('h3'),sub:t.querySelector('.t-sub'),group:cur}; cur.items.push(it); tools.push(it);
        });
      }
    });
    var bareme=wrap.querySelector('.bareme');
    var irpp=tools.filter(function(t){return t.el.querySelector('#irpp-go');})[0]; if(irpp&&bareme) irpp.extra=bareme;
    var portails=wrap.querySelector('.press-wrap');
    var note=wrap.querySelector('.tools-note');
    var details=[].concat([].slice.call(wrap.querySelectorAll('.tool')),[].slice.call(wrap.querySelectorAll('.tool-group-h')),[].slice.call(wrap.querySelectorAll('.tool-group-sub')),bareme?[bareme]:[],portails?[portails]:[],note?[note]:[]);
    var idx=document.createElement('div'); idx.className='tool-index';
    groups.forEach(function(g){
      if(g.head){ var hh=g.head.cloneNode(true); hh.classList.add('ti-grp'); idx.appendChild(hh); }
      var grid=document.createElement('div'); grid.className='home-tiles ti-grid';
      g.items.forEach(function(it){ var c=document.createElement('button'); c.type='button'; c.className='tool-pick'; c.setAttribute('data-open',it.uid);
        var hv=it.h3?it.h3.cloneNode(true):document.createElement('h3'); hv.classList.add('tp-h'); c.appendChild(hv);
        if(it.sub){ var sv=it.sub.cloneNode(true); sv.classList.add('tp-s'); c.appendChild(sv); }
        var go=document.createElement('span'); go.className='tp-go'; go.innerHTML='<span class="fr">Ouvrir →</span><span class="en">Open →</span><span class="ar">← فتح</span>'; c.appendChild(go);
        grid.appendChild(c); });
      idx.appendChild(grid);
    });
    if(portails){ var pgrid=document.createElement('div'); pgrid.className='home-tiles ti-grid';
      var pc=document.createElement('button'); pc.type='button'; pc.className='tool-pick'; pc.setAttribute('data-open','portails');
      pc.innerHTML='<h3 class="tp-h"><span class="t-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v14H4z" stroke-linejoin="round"/><path d="M4 9h16M8 13h5" stroke-linecap="round"/></svg></span><span class="fr">Portails officiels &amp; démarches</span><span class="en">Official portals</span><span class="ar">البوابات الرسمية</span></h3><p class="tp-s"><span class="fr">RNE, TEJ et liens officiels en ligne.</span><span class="en">RNE, TEJ and official online links.</span><span class="ar">السجل الوطني والمنصّات الرسمية.</span></p><span class="tp-go"><span class="fr">Ouvrir →</span><span class="en">Open →</span><span class="ar">← فتح</span></span>';
      pgrid.appendChild(pc); idx.appendChild(pgrid); }
    var back=document.createElement('button'); back.type='button'; back.id='tool-back'; back.className='tool-back';
    back.innerHTML='<span class="fr">← Liste des outils</span><span class="en">← All tools</span><span class="ar">قائمة الأدوات →</span>';
    head.insertAdjacentElement('afterend', idx);
    idx.insertAdjacentElement('beforebegin', back);
    function hideAll(){ details.forEach(function(e){ e.style.display='none'; }); [].slice.call(wrap.querySelectorAll('.tools-grid')).forEach(function(g){ g.classList.remove('ti-solo'); }); }
    function showList(){ idx.style.display='block'; back.style.display='none'; hideAll(); }
    function showOne(uid){ hideAll(); idx.style.display='none'; back.style.display='inline-flex';
      if(uid==='portails'){ if(portails) portails.style.display=''; }
      else { var it=tools.filter(function(t){return t.uid===uid;})[0]; if(!it) return;
        if(it.group&&it.group.head){ it.group.head.style.display=''; var ns=it.group.head.nextElementSibling; if(ns&&ns.classList.contains('tool-group-sub')) ns.style.display=''; }
        var gp=it.el.closest('.tools-grid'); if(gp) gp.classList.add('ti-solo');
        it.el.style.display='flex'; if(it.extra) it.extra.style.display=''; if(note) note.style.display=''; }
      try{ window.scrollTo({top:0,behavior:'auto'}); }catch(e){ window.scrollTo(0,0); } }
    idx.addEventListener('click',function(e){ var c=e.target.closest?e.target.closest('.tool-pick'):null; if(!c) return; showOne(c.getAttribute('data-open')); });
    back.addEventListener('click',showList);
    window.gemOpenTool=function(goId){ var it=tools.filter(function(t){return t.el.querySelector('#'+goId);})[0]; if(it) showOne(it.uid); };
    document.querySelectorAll('[data-tool]').forEach(function(a){ a.addEventListener('click',function(){ var id=a.getAttribute('data-tool'); setTimeout(function(){ window.gemOpenTool(id); },30); }); });
    document.querySelectorAll('a[href="/outils"]').forEach(function(a){ a.addEventListener('click',function(){ setTimeout(showList,0); }); });
    showList();
    try{ var o=new URLSearchParams(location.search).get('outil'); if(o&&/^[a-z-]+$/.test(o)) setTimeout(function(){ window.gemOpenTool(o); },30); }catch(e){}
  })();

  /* ---- actualité en direct + lecteur intégré ---- */
  var NEWS_DONE=false, NEWS_BUSY=false, NEWS_ITEMS=[];
  function newsDate(d){ try{ var x=new Date(d); if(isNaN(x)) return ''; return ('0'+x.getDate()).slice(-2)+'/'+('0'+(x.getMonth()+1)).slice(-2); }catch(e){ return ''; } }
  function safeUrl(u){ return (typeof u==='string' && /^https?:\/\//.test(u)) ? u : '#'; }
  function stripHtml(s){ try{ var d=new DOMParser().parseFromString('<div>'+(s||'')+'</div>','text/html'); var t=(d.body.textContent||'').replace(/\s+/g,' ').trim(); return t; }catch(e){ return (s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(); } }
  function clip(s,n){ s=s||''; return s.length>n? s.slice(0,n).replace(/\s+\S*$/,'')+'…' : s; }
  function newsStamp(txt,warn){ var box=document.querySelector('#veille .hl'); if(!box) return; var st=box.querySelector('.hl-stamp'); if(st){ st.textContent=txt; st.style.color = warn? '#e0a86a' : 'var(--faint)'; } }
  function openNews(it){ var lc=document.getElementById('legalContent'), ov=document.getElementById('legal'); if(!lc||!ov) return; if(typeof legalOpen!=='undefined') legalOpen=null; lc.textContent='';
    var h2=document.createElement('h2'); h2.textContent=it.t||''; lc.appendChild(h2);
    var meta=document.createElement('div'); meta.style.cssText='color:var(--muted);font-size:.85rem;margin:-6px 0 16px'; meta.textContent=(it.s||'')+(it.d?(' · '+newsDate(it.d)):''); lc.appendChild(meta);
    var body=document.createElement('div'); body.className='legal-body';
    if(it.desc){ it.desc.split(/\n{2,}/).forEach(function(par){ par=par.trim(); if(par){ var p=document.createElement('p'); p.textContent=par; body.appendChild(p); } }); }
    else { var p=document.createElement('p'); p.textContent=(CL()==='fr'?'Aperçu non disponible — ouvrez l\u2019article complet sur la source.':CL()==='en'?'Preview unavailable — open the full article on the source.':'المعاينة غير متوفّرة — افتح المقال كاملًا على المصدر.'); body.appendChild(p); }
    lc.appendChild(body);
    if(safeUrl(it.l)!=='#'){ var a=document.createElement('a'); a.href=it.l; a.target='_blank'; a.rel='noopener noreferrer'; a.style.cssText='display:inline-block;margin-top:16px;color:var(--gold-bright);font-weight:600;font-size:.92rem';
      a.textContent=(CL()==='fr'?'Lire l\u2019article complet sur '+(it.s||'la source')+' →':CL()==='en'?'Read the full article on '+(it.s||'the source')+' →':'اقرأ المقال كاملًا على '+(it.s||'المصدر')+' →'); lc.appendChild(a); }
    ov.classList.add('show'); }
  function anchorItem(a){ if(a.hasAttribute('data-nidx')){ var it=NEWS_ITEMS[+a.getAttribute('data-nidx')]; if(it) return it; }
    var box=a.closest('.hl'); var src='',date='',title='', desc=a.getAttribute('data-desc')||'';
    if(a.classList.contains('hl-lead')){ title=a.textContent.trim(); var m=box.querySelector('.hl-meta'); if(m){ src=(m.textContent||'').split('·')[0].trim(); date=(m.querySelector('[data-ltr]')||{}).textContent||''; } }
    else { var sp=a.querySelector('.src'); src=sp?sp.textContent.replace(/^[—-]\s*/,'').trim():''; date=(a.querySelector('.dt')||{}).textContent||''; var ts=a.querySelector('span:not(.dt)'); title= ts? ts.textContent.replace(sp?sp.textContent:'','').trim() : a.textContent.trim(); }
    return {t:title, l:a.getAttribute('data-href')||a.getAttribute('href'), s:src, d:date, desc:desc}; }
  function parseRss(xml,src){ try{ var doc=new DOMParser().parseFromString(xml,'text/xml'); if(doc.querySelector('parsererror')) return [];
      var items=[].slice.call(doc.getElementsByTagName('item')); if(!items.length) items=[].slice.call(doc.getElementsByTagName('entry'));
      return items.map(function(it){ function g(t){ var e=it.getElementsByTagName(t)[0]; return e?(e.textContent||'').trim():''; }
        var link=g('link'); var le=it.getElementsByTagName('link')[0]; if(le&&le.getAttribute&&le.getAttribute('href')) link=le.getAttribute('href')||link;
        var desc=g('description')||g('summary')||g('encoded')||g('content');
        return {t:g('title'), l:link, d:g('pubDate')||g('published')||g('updated')||g('date'), s:src, desc:clip(stripHtml(desc),700)}; }).filter(function(x){return x.t;});
    }catch(e){ return []; } }
  function withTimeout(pr,ms){ return new Promise(function(res){ var done=false; var t=setTimeout(function(){ if(!done){done=true;res(null);} },ms); pr.then(function(v){ if(!done){done=true;clearTimeout(t);res(v);} },function(){ if(!done){done=true;clearTimeout(t);res(null);} }); }); }
  function fetchFeed(f){ var own=(location.protocol==='file:')?null:'/api/rss?u='+encodeURIComponent(f.u);
    if(own) return withTimeout(fetch(own).then(function(r){ if(!r.ok) throw 0; return r.text(); }).then(function(x){ return parseRss(x,f.s); }),8000).then(function(a){ return (a&&a.length)?a:fetchFeedExt(f); }).catch(function(){ return fetchFeedExt(f); });
    return fetchFeedExt(f); }
  // Sécurité : plus aucun relais tiers (allorigins, corsproxy…) ; les flux passent uniquement par le serveur du cabinet.
  function fetchFeedExt(f){ return Promise.resolve([]); }
  function loadNews(force){ var box=document.querySelector('#veille .hl'); if(!box) return; if(NEWS_BUSY) return; if(NEWS_DONE && !force) return; NEWS_BUSY=true;
    newsStamp(CL()==='ar'?'جارٍ التحديث…':CL()==='en'?'Updating…':'Mise à jour…',false);
    var feeds=[ {u:'https://www.webmanagercenter.com/feed/', s:'Webmanager Center'},{u:'https://www.leconomistemaghrebin.com/feed/', s:"L'Économiste Maghrébin"},{u:'https://www.tunisienumerique.com/feed/', s:'Tunisie Numérique'},{u:'https://www.lapresse.tn/feed/', s:'La Presse'},{u:'https://managers.tn/feed/', s:'Managers'} ];
    var go=function(all,upd,fromCache){ NEWS_BUSY=fromCache?NEWS_BUSY:false;
      if(!all.length){ var c0=null; try{ c0=JSON.parse(localStorage.getItem('gem_news')||'null'); }catch(e){} if(c0&&c0.items&&c0.items.length){ go(c0.items,c0.at,true); newsStamp((CL()==='ar'?'تعذّر الاتصال بالمصادر — آخر تحيين ':CL()==='en'?'Sources unreachable — last update ':'Sources injoignables — dernière mise à jour ')+newsDate(c0.at)+' '+String(new Date(c0.at).getHours()).padStart(2,'0')+':'+String(new Date(c0.at).getMinutes()).padStart(2,'0'), true); return; } newsStamp(CL()==='ar'?'تعذّر الاتصال بمصادر الأخبار — تحقّقوا من الاتصال بالإنترنت':CL()==='en'?'News sources unreachable — check your internet connection':'Sources d’actualité injoignables — vérifiez votre connexion Internet', true); return; }
      var lim=Date.now()-8*864e5; all.forEach(function(it){ it.sc=(it.sc!=null)?it.sc:proScore(it); });
      var fresh=all.filter(function(it){ var t=new Date(it.d).getTime(); return !t||t>=lim; }); if(fresh.length>=3) all=fresh;
      var pro=all.filter(function(it){ return it.sc>0; }); if(pro.length>=3) all=pro;
      all.sort(function(a,b){ var da=new Date(a.d).toDateString()===new Date(b.d).toDateString(); return (da&&b.sc!==a.sc)? b.sc-a.sc : new Date(b.d)-new Date(a.d); }); var seen={}, uniq=[]; all.forEach(function(it){ var k=it.t.toLowerCase(); if(!seen[k]){ seen[k]=1; uniq.push(it); } });
      NEWS_ITEMS=uniq.slice(0,7); if(!fromCache){ try{ localStorage.setItem('gem_news',JSON.stringify({at:upd||new Date().toISOString(),items:NEWS_ITEMS.map(function(x){return {t:x.t,l:x.l,d:x.d,s:x.s,sc:x.sc};})})); }catch(e){} } var lead=NEWS_ITEMS[0], rest=NEWS_ITEMS.slice(1);
      var la=box.querySelector('.hl-lead'), meta=box.querySelector('.hl-meta'), ul=box.querySelector('.hl-list');
      if(la){ la.textContent=lead.t; la.setAttribute('href',safeUrl(lead.l)); la.setAttribute('target','_blank'); la.setAttribute('rel','noopener noreferrer'); }
      if(meta){ meta.textContent=''; meta.appendChild(document.createTextNode((lead.s||'')+' · ')); var sp=document.createElement('span'); sp.setAttribute('data-ltr',''); sp.textContent=newsDate(lead.d); meta.appendChild(sp); }
      if(ul){ ul.textContent=''; rest.forEach(function(it,i){ var li=document.createElement('li'); var a=document.createElement('a'); a.setAttribute('href',safeUrl(it.l)); a.setAttribute('target','_blank'); a.setAttribute('rel','noopener noreferrer');
        var dt=document.createElement('span'); dt.className='dt'; dt.setAttribute('data-ltr',''); dt.textContent=newsDate(it.d); var tx=document.createElement('span'); tx.appendChild(document.createTextNode(it.t+' ')); var src=document.createElement('span'); src.className='src'; src.textContent='— '+(it.s||''); tx.appendChild(src);
        a.appendChild(dt); a.appendChild(tx); li.appendChild(a); ul.appendChild(li); }); }
      if(fromCache){ return; } var n=upd?new Date(upd):new Date(); if(isNaN(n)) n=new Date(); newsStamp((CL()==='ar'?'حُدّث ':CL()==='en'?'Updated ':'Mis à jour ')+('0'+n.getDate()).slice(-2)+'/'+('0'+(n.getMonth()+1)).slice(-2)+' '+('0'+n.getHours()).slice(-2)+':'+('0'+n.getMinutes()).slice(-2), false); NEWS_DONE=true;
    };
    if(!force){ try{ var c1=JSON.parse(localStorage.getItem('gem_news')||'null'); if(c1&&c1.items&&c1.items.length>=3) go(c1.items,c1.at,true); }catch(e){} }
    function viaFeeds(){ Promise.all(feeds.map(fetchFeed)).then(function(res){ var all=[]; res.forEach(function(a){ (a||[]).forEach(function(it){ all.push(it); }); }); go(all,null); },function(){ NEWS_BUSY=false; }); }
    /* 1) sélection quotidienne préparée par le serveur (api/news.php, actualisée chaque jour par tâche planifiée) ; 2) repli : flux en direct */
    if(location.protocol!=='file:'){ withTimeout(fetch('/api/news'+(force?'?refresh=1':'')).then(function(r){ return r.ok?r.json():null; }),9000).then(function(j){ if(j&&j.items&&j.items.length>=3) go(j.items,j.updated); else viaFeeds(); }); }
    else viaFeeds(); }
  /* pertinence pour la profession comptable, fiscale et juridique */
  var PROKW=[[4,/fiscal|impôt|impot|imposition|\btva\b|irpp|loi de finances|\blf ?20|dgi|contribuable|retenue à la source|douan/i],[4,/comptab|audit|commissaire aux comptes|expert[- ]comptable|oect|ifrs|norme/i],[3,/cnss|cnam|cotisation|sécurité sociale|caisse sociale|droit du travail|salaire|smig/i],[3,/jort|décret|arrêté|circulaire|note commune|projet de loi|\barp\b|assemblée|réglementation|rne|registre national/i],[2,/\bbct\b|banque centrale|taux directeur|inflation|\bcmf\b|bourse|bvmt|tunindex|dinar|change/i],[1,/entreprise|société|banque|crédit|investissement|budget|dette|bilan|résultats|chiffre d'affaires|export/i]];
  function proScore(it){ var t=(it.t||'')+' '+(it.desc||''); var sc=0; PROKW.forEach(function(k){ if(k[1].test(t)) sc+=k[0]; }); return sc; }
  (function(){ var box=document.querySelector('#veille .hl'); if(box){ /* titres: liens directs (nouvel onglet) */
    var rb=box.querySelector('.hl-refresh'); if(rb) rb.addEventListener('click',function(e){ e.preventDefault(); loadNews(true); }); }
    loadNews();
    document.querySelectorAll('a[href="/veille"]').forEach(function(a){ a.addEventListener('click',function(){ loadNews(); }); }); })();

  /* ---- navigation par pages ---- */
  var PT={fr:{cabinet:'Le cabinet',services:'Services, associations & secteur public',references:'Références',outils:'Outils fiscaux et financiers gratuits',ressources:'FAQ, lexique et check-lists',veille:'Veille fiscale et calendrier déclaratif',contact:'Contact et rendez-vous'},
    en:{cabinet:'The firm',services:'Services, non-profit & public sector',references:'References',outils:'Free tax and financial tools',ressources:'FAQ, glossary and checklists',veille:'Tax insights and filing calendar',contact:'Contact and appointment'},
    ar:{cabinet:'المكتب',services:'الخدمات والقطاع الجمعياتي والعمومي',references:'المراجع',outils:'أدوات جبائية ومالية مجانية',ressources:'أسئلة متكرّرة ومعجم وقوائم تحقّق',veille:'متابعة جبائية ورزنامة التصاريح',contact:'اتصال وموعد'}};
  var CURPG='accueil';
  function setPageTitle(){ var l=root.getAttribute('data-lang')||'fr'; var base=l==='ar'?'GEM Consult — خبير محاسب ومراقب حسابات بتونس':(l==='en'?'GEM Consult — Chartered Accountants & Statutory Auditors, Tunis':'GEM Consult — Expertise comptable & Commissariat aux comptes à Tunis'); var t=(PT[l]||PT.fr)[CURPG]; document.title=t?(t+' | GEM Consult, Tunis'):base; }
  var PAGES=['accueil','cabinet','services','references','outils','ressources','veille','contact'];
  var SECMAP={}; document.querySelectorAll('section[data-pg]').forEach(function(s){ if(s.id) SECMAP[s.id]=s.getAttribute('data-pg'); });
  function revealIn(sc){ sc.querySelectorAll('.sec-head,.lead-card,.band-fig').forEach(function(e){e.classList.add('in');}); sc.querySelectorAll('.svc-grid,.pillars,.afgc-grid,.ref-grid,.news-grid,.sectors').forEach(function(e){e.classList.add('in-stagger');}); }
  function showPage(pg,noscroll){ if(PAGES.indexOf(pg)<0) pg='accueil'; CURPG=pg; try{ setPageTitle(); }catch(e){}
    document.querySelectorAll('section[data-pg]').forEach(function(s){ s.style.display=(s.getAttribute('data-pg')===pg)?'block':'none'; });
    document.querySelectorAll('section[data-pg="'+pg+'"]').forEach(function(s){ revealIn(s); });
    document.querySelectorAll('[data-page]').forEach(function(a){ a.classList.toggle('on-page', a.getAttribute('data-page')===pg); });
    if(!noscroll){ try{ window.scrollTo({top:0,behavior:'auto'}); }catch(e){ window.scrollTo(0,0); } } }
  function pathPage(){ var segs=location.pathname.split('/').filter(Boolean); if(segs[0]==='en'||segs[0]==='ar') segs.shift(); var seg=segs[0]||'accueil'; return PAGES.indexOf(seg)>=0?seg:'accueil'; }
  document.addEventListener('click',function(e){ if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey) return;
    var a=e.target.closest?e.target.closest('a[href]'):null; if(!a||a.target==='_blank') return;
    var raw=a.getAttribute('href'); if(!raw||raw==='#') return;
    if(raw.charAt(0)!=='#') return; var hh=raw.slice(1);
    var pg=PAGES.indexOf(hh)>=0?hh:SECMAP[hh]; if(!pg) return;
    e.preventDefault(); showPage(pg);
    if(SECMAP[hh]&&hh!==pg){ var el=document.getElementById(hh); if(el) setTimeout(function(){ try{el.scrollIntoView({behavior:'smooth',block:'start'});}catch(e2){} },70); } });
  window.addEventListener('popstate',function(){ showPage(pathPage(), true); });
  window.addEventListener('hashchange',function(){ var hh=(location.hash||'').slice(1); if(SECMAP[hh]){ showPage(SECMAP[hh], true); var el=document.getElementById(hh); if(el) el.scrollIntoView(); } });
  (function(){ var hh=(location.hash||'').slice(1); if(PAGES.indexOf(hh)>=0){ showPage(hh,true); return; } showPage(SECMAP[hh]||pathPage(), true);
    if(SECMAP[hh]){ var el=document.getElementById(hh); if(el) setTimeout(function(){ el.scrollIntoView(); },60); } })();
  /* application installable : service worker (HTTPS uniquement) */
  if('serviceWorker' in navigator && location.protocol==='https:'){ window.addEventListener('load',function(){ navigator.serviceWorker.register('/sw.js').catch(function(){}); }); }
})();
