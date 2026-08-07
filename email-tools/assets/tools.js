(function(){
  const form=document.querySelector('[data-reply-builder]');
  if(!form)return;

  let comparison=document.querySelector('.output-comparison');
  if(!comparison){
    comparison=document.createElement('div');
    comparison.className='output-comparison';
    comparison.innerHTML=`
      <div class="output-col">
        <h4>Basic Free Template</h4>
        <div class="draft-box" data-basic-result></div>
      </div>
      <div class="output-col premium">
        <h4>ReplyMind Draft <span>AI Example</span></h4>
        <div class="draft-box premium" data-premium-result></div>
      </div>
    `;
    const toolActions=document.querySelector('.tool-actions');
    if(toolActions && toolActions.parentNode){
      toolActions.parentNode.insertBefore(comparison, toolActions.nextSibling);
    } else {
      form.appendChild(comparison);
    }
  }

  const basicResult=comparison.querySelector('[data-basic-result]');
  const premiumResult=comparison.querySelector('[data-premium-result]');
  const copy=document.querySelector('[data-copy]');
  const status=document.querySelector('[data-copy-status]');
  let typingInterval=null;

  const clean=value=>(value||'').trim();
  const fill=(template,values)=>template.replace(/\{(\w+)\}/g,(_,key)=>values[key]||'');

  form.addEventListener('submit',event=>{
    event.preventDefault();
    const data=new FormData(form);
    const tone=clean(data.get('tone'))||'warm';
    const values={
      recipient:clean(data.get('recipient'))||'there',
      context:clean(data.get('context'))||form.dataset.defaultContext||'',
      detail:clean(data.get('detail'))||form.dataset.defaultDetail||''
    };

    // Basic Template
    const templateKey='template'+tone[0].toUpperCase()+tone.slice(1);
    const template=form.dataset[templateKey]||form.dataset.templateWarm||'';
    basicResult.textContent=fill(template,values).replace(/\n{3,}/g,'\n\n');

    // Premium Example (Hardcoded in HTML data attributes per tone)
    const premiumKey='premium'+tone[0].toUpperCase()+tone.slice(1);
    const premiumTemplate=form.dataset[premiumKey]||form.dataset.premiumWarm||form.dataset.defaultPremium||'';
    const premiumText=fill(premiumTemplate,values).replace(/\n{3,}/g,'\n\n');

    comparison.classList.add('visible');

    // Typing effect for premium draft
    if(typingInterval) clearInterval(typingInterval);
    if(premiumResult && premiumText){
      premiumResult.innerHTML='';
      let i=0;
      typingInterval=setInterval(()=>{
        if(i<premiumText.length){
          premiumResult.innerHTML=premiumText.substring(0,i+1)+'<span class="cursor"></span>';
          i++;
        }else{
          premiumResult.innerHTML=premiumText;
          clearInterval(typingInterval);
          typingInterval=null;
        }
      },14);
    }

    if(copy) copy.hidden=false;
    if(status) status.textContent='';
  });

  if(copy){
    copy.addEventListener('click',async()=>{
      try{
        await navigator.clipboard.writeText(basicResult.textContent);
        if(status) status.textContent='Copied basic draft to clipboard';
      }
      catch(_){
        if(status) status.textContent='Select the draft and copy it';
      }
    });
  }
})();
