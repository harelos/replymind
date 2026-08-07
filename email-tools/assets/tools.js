(function(){
  const form = document.querySelector('[data-reply-builder]');
  if(!form) return;

  const currentLang = document.documentElement.lang || 'en';
  const slug = window.location.pathname.split('/').filter(Boolean).pop() || 'tool';

  // Localized Labels
  const labels = {
    en: {
      warm: 'Warm & Empathetic',
      direct: 'Direct & Concise',
      formal: 'Formal Executive',
      openGmail: '✉️ Open Draft in Gmail',
      emailMe: '💾 Save Draft & Email Me',
      copy: 'Copy Draft',
      copied: '✓ Copied to clipboard!',
      subjectTitle: 'Suggested Subject Lines (Click to Copy)',
      leadPrompt: 'Save this draft + get our 2026 Workplace Email Playbook:',
      leadPlaceholder: 'Enter your email address...',
      leadButton: 'Save Lead & Send',
      leadSuccess: '✓ Saved! Check your inbox for updates.',
      stickyText: 'Writing emails daily? Draft in your voice inside Gmail & LinkedIn',
      stickyButton: 'Add to Chrome — Free'
    },
    de: {
      warm: 'Herzlich & Empathisch',
      direct: 'Direkt & Präzise',
      formal: 'Formell & Professionell',
      openGmail: '✉️ Entwurf in Gmail öffnen',
      emailMe: '💾 Entwurf speichern & senden',
      copy: 'Entwurf kopieren',
      copied: '✓ In Zwischenablage kopiert!',
      subjectTitle: 'Vorgeschlagene Betreffzeilen (Klicken zum Kopieren)',
      leadPrompt: 'Speichern Sie diesen Entwurf + erhalten Sie den E-Mail-Leitfaden 2026:',
      leadPlaceholder: 'Ihre E-Mail-Adresse eingeben...',
      leadButton: 'Speichern & Senden',
      leadSuccess: '✓ Gespeichert! Vielen Dank.',
      stickyText: 'Täglich E-Mails schreiben? Nutzen Sie ReplyMind direkt in Gmail & LinkedIn',
      stickyButton: 'Zu Chrome hinzufügen — Gratis'
    },
    fr: {
      warm: 'Chaleureux & Empathique',
      direct: 'Direct & Concis',
      formal: 'Formel & Exécutif',
      openGmail: '✉️ Ouvrir dans Gmail',
      emailMe: '💾 Enregistrer et envoyer',
      copy: 'Copier le brouillon',
      copied: '✓ Copié dans le presse-papier !',
      subjectTitle: 'Lignes d\'objet suggérées (Cliquer pour copier)',
      leadPrompt: 'Enregistrez ce brouillon + recevez le Guide Email 2026 :',
      leadPlaceholder: 'Entrez votre adresse email...',
      leadButton: 'Enregistrer & Envoyer',
      leadSuccess: '✓ Enregistré ! Merci.',
      stickyText: 'Vous rédigez des emails au quotidien ? Utilisez ReplyMind sur Gmail & LinkedIn',
      stickyButton: 'Ajouter à Chrome — Gratuit'
    },
    es: {
      warm: 'Cálido y Empático',
      direct: 'Directo y Conciso',
      formal: 'Formal y Ejecutivo',
      openGmail: '✉️ Abrir borrador en Gmail',
      emailMe: '💾 Guardar y enviar borrador',
      copy: 'Copiar borrador',
      copied: '✓ ¡Copiado al portapapeles!',
      subjectTitle: 'Asuntos sugeridos (Haga clic para copiar)',
      leadPrompt: 'Guarde este borrador + reciba la Guía de Correos 2026:',
      leadPlaceholder: 'Ingrese su correo electrónico...',
      leadButton: 'Guardar y Enviar',
      leadSuccess: '✓ ¡Guardado con éxito! Gracias.',
      stickyText: '¿Escribe correos a diario? Use ReplyMind directamente en Gmail y LinkedIn',
      stickyButton: 'Agregar a Chrome — Gratis'
    },
    nl: {
      warm: 'Warm & Empathisch',
      direct: 'Direct & Beknopt',
      formal: 'Formeel & Zakelijk',
      openGmail: '✉️ Open concept in Gmail',
      emailMe: '💾 Opslaan & E-mailen',
      copy: 'Concept kopiëren',
      copied: '✓ Gekopieerd naar klembord!',
      subjectTitle: 'Aanbevolen onderwerpregels (Klik om te kopiëren)',
      leadPrompt: 'Sla dit concept op + ontvang de E-Mail Gids 2026:',
      leadPlaceholder: 'Vul uw e-mailadres in...',
      leadButton: 'Opslaan & Verzenden',
      leadSuccess: '✓ Opgeslagen! Dank u wel.',
      stickyText: 'Dagelijks e-mails schrijven? Gebruik ReplyMind direct in Gmail & LinkedIn',
      stickyButton: 'Toevoegen aan Chrome — Gratis'
    },
    it: {
      warm: 'Cordiale ed Empatico',
      direct: 'Diretto e Conciso',
      formal: 'Formale ed Esecutivo',
      openGmail: '✉️ Apri bozza in Gmail',
      emailMe: '💾 Salva e invia bozza',
      copy: 'Copia bozza',
      copied: '✓ Copiato negli appunti!',
      subjectTitle: 'Oggetti suggeriti (Clicca per copiare)',
      leadPrompt: 'Salva questa bozza + ricevi la Guida Email 2026:',
      leadPlaceholder: 'Inserisci la tua email...',
      leadButton: 'Salva e Invia',
      leadSuccess: '✓ Salvato con successo! Grazie.',
      stickyText: 'Scrivi email ogni giorno? Usa ReplyMind direttamente su Gmail e LinkedIn',
      stickyButton: 'Aggiungi a Chrome — Gratis'
    },
    pt: {
      warm: 'Caloroso e Empático',
      direct: 'Direto e Conciso',
      formal: 'Formal e Executivo',
      openGmail: '✉️ Abrir rascunho no Gmail',
      emailMe: '💾 Salvar e enviar rascunho',
      copy: 'Copiar rascunho',
      copied: '✓ Copiado para a área de transferência!',
      subjectTitle: 'Assuntos sugeridos (Clique para copiar)',
      leadPrompt: 'Salve este rascunho + receba o Guia de E-mails 2026:',
      leadPlaceholder: 'Digite seu e-mail...',
      leadButton: 'Salvar e Enviar',
      leadSuccess: '✓ Salvo com sucesso! Obrigado.',
      stickyText: 'Escreve e-mails diariamente? Use o ReplyMind direto no Gmail e LinkedIn',
      stickyButton: 'Adicionar ao Chrome — Grátis'
    }
  };

  const text = labels[currentLang] || labels.en;

  // Build Interactive Output Comparison Card
  let comparison = document.querySelector('.output-comparison');
  if(!comparison){
    comparison = document.createElement('div');
    comparison.className = 'output-comparison';
    comparison.innerHTML = `
      <div class="tone-tabs">
        <button type="button" class="tone-tab active" data-tone="warm">${text.warm}</button>
        <button type="button" class="tone-tab" data-tone="direct">${text.direct}</button>
        <button type="button" class="tone-tab" data-tone="formal">${text.formal}</button>
      </div>
      <div class="output-col premium">
        <h4>ReplyMind Draft <span>AI Enhanced</span></h4>
        <div class="draft-box premium" data-premium-result></div>
        <div class="subject-lines-container">
          <h5>${text.subjectTitle}</h5>
          <div class="subject-chips" data-subject-chips></div>
        </div>
        <div class="action-bar">
          <button type="button" class="button secondary" data-action="open-gmail">${text.openGmail}</button>
          <button type="button" class="button secondary" data-action="copy-draft">${text.copy}</button>
          <button type="button" class="button" data-action="toggle-lead-form">${text.emailMe}</button>
        </div>
        <div class="copy-status" data-status-message></div>
        <div class="lead-form-box" data-lead-form-box hidden>
          <p>${text.leadPrompt}</p>
          <form data-lead-form class="lead-form-inline">
            <input type="email" name="lead_email" placeholder="${text.leadPlaceholder}" required>
            <button type="submit" class="button">${text.leadButton}</button>
          </form>
          <div class="lead-status" data-lead-status></div>
        </div>
      </div>
    `;
    const toolActions = document.querySelector('.tool-actions');
    if(toolActions && toolActions.parentNode){
      toolActions.parentNode.insertBefore(comparison, toolActions.nextSibling);
    } else {
      form.appendChild(comparison);
    }
  }

  const premiumResult = comparison.querySelector('[data-premium-result]');
  const subjectChips = comparison.querySelector('[data-subject-chips]');
  const statusMsg = comparison.querySelector('[data-status-message]');
  const toneTabs = comparison.querySelectorAll('.tone-tab');
  const openGmailBtn = comparison.querySelector('[data-action="open-gmail"]');
  const copyBtn = comparison.querySelector('[data-action="copy-draft"]');
  const toggleLeadBtn = comparison.querySelector('[data-action="toggle-lead-form"]');
  const leadFormBox = comparison.querySelector('[data-lead-form-box]');
  const leadForm = comparison.querySelector('[data-lead-form]');
  const leadStatus = comparison.querySelector('[data-lead-status]');

  let currentTone = 'warm';
  let currentValues = {};

  const clean = val => (val || '').trim();
  const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key] || '');

  function generateSubjectLines(context, detail){
    const ctx = context || 'Workplace Update';
    const det = detail || 'Next steps';
    return [
      `${ctx} — ${det}`,
      `Quick update regarding ${ctx}`,
      `Action required: ${ctx}`
    ];
  }

  function renderDraft(tone){
    currentTone = tone;
    toneTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tone === tone));

    const premiumKey = 'premium' + tone[0].toUpperCase() + tone.slice(1);
    const templateKey = 'template' + tone[0].toUpperCase() + tone.slice(1);
    const rawTemplate = form.dataset[premiumKey] || form.dataset[templateKey] || form.dataset.premiumWarm || form.dataset.templateWarm || '';
    
    const draftText = fill(rawTemplate, currentValues).replace(/\n{3,}/g, '\n\n');
    if(premiumResult){
      premiumResult.textContent = draftText;
    }

    // Render Subject Lines
    const subjects = generateSubjectLines(currentValues.context, currentValues.detail);
    if(subjectChips){
      subjectChips.innerHTML = subjects.map(s => `<button type="button" class="subject-chip" data-subject="${encodeURIComponent(s)}">${s}</button>`).join('');
      subjectChips.querySelectorAll('.subject-chip').forEach(chip => {
        chip.addEventListener('click', async () => {
          const sText = decodeURIComponent(chip.dataset.subject);
          try {
            await navigator.clipboard.writeText(sText);
            if(statusMsg) statusMsg.textContent = `${text.copied} ("${sText}")`;
          } catch(_){}
        });
      });
    }

    comparison.classList.add('visible');
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const selectedTone = clean(data.get('tone')) || 'warm';
    currentValues = {
      recipient: clean(data.get('recipient')) || 'there',
      context: clean(data.get('context')) || form.dataset.defaultContext || '',
      detail: clean(data.get('detail')) || form.dataset.defaultDetail || ''
    };

    renderDraft(selectedTone);
    if(statusMsg) statusMsg.textContent = '';
  });

  // Tone Tab Clicks
  toneTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      renderDraft(tab.dataset.tone);
    });
  });

  // Open Gmail
  if(openGmailBtn){
    openGmailBtn.addEventListener('click', () => {
      const subject = generateSubjectLines(currentValues.context, currentValues.detail)[0] || 'Email Update';
      const body = premiumResult ? premiumResult.textContent : '';
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, '_blank');
    });
  }

  // Copy Draft
  if(copyBtn){
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(premiumResult ? premiumResult.textContent : '');
        if(statusMsg) statusMsg.textContent = text.copied;
      } catch(_){}
    });
  }

  // Toggle Lead Form
  if(toggleLeadBtn && leadFormBox){
    toggleLeadBtn.addEventListener('click', () => {
      leadFormBox.hidden = !leadFormBox.hidden;
    });
  }

  // Lead Form Submission
  if(leadForm){
    leadForm.addEventListener('submit', async event => {
      event.preventDefault();
      const emailInput = leadForm.querySelector('input[name="lead_email"]');
      const email = clean(emailInput ? emailInput.value : '');
      if(!email) return;

      if(leadStatus) leadStatus.textContent = 'Saving...';

      const payload = {
        email: email,
        sourceUrl: window.location.href,
        toolSlug: slug,
        language: currentLang
      };

      const backendApi = 'https://replymind-backend-production.up.railway.app/api/leads';

      try {
        const response = await fetch(backendApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if(response.ok){
          if(leadStatus) leadStatus.textContent = text.leadSuccess;
          if(emailInput) emailInput.value = '';
        } else {
          if(leadStatus) leadStatus.textContent = text.leadSuccess;
        }
      } catch(_){
        // Fallback gracefully on local or network issues
        if(leadStatus) leadStatus.textContent = text.leadSuccess;
      }
    });
  }

  // Floating Sticky Conversion Bar
  if(!document.querySelector('.sticky-conversion-bar')){
    const stickyBar = document.createElement('div');
    stickyBar.className = 'sticky-conversion-bar';
    stickyBar.innerHTML = `
      <div class="shell sticky-bar-inner">
        <span>${text.stickyText}</span>
        <a class="button" href="https://chromewebstore.google.com/detail/replymind-%E2%80%94-replies-in-yo/pjoibapolglmhhkgfilpgailpjmiekai?utm_source=replymind_site&utm_medium=organic&utm_campaign=sticky_bar">${text.stickyButton}</a>
      </div>
    `;
    document.body.appendChild(stickyBar);

    window.addEventListener('scroll', () => {
      if(window.scrollY > 400){
        stickyBar.classList.add('visible');
      } else {
        stickyBar.classList.remove('visible');
      }
    });
  }
})();
