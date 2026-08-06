(function(){
  const form=document.querySelector('[data-reply-builder]');
  if(!form)return;
  const result=document.querySelector('[data-result]');
  const copy=document.querySelector('[data-copy]');
  const status=document.querySelector('[data-copy-status]');
  const clean=value=>(value||'').trim();
  const fill=(template,values)=>template.replace(/\{(\w+)\}/g,(_,key)=>values[key]||'');
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const data=new FormData(form);
    const tone=clean(data.get('tone'))||'warm';
    const values={
      recipient:clean(data.get('recipient'))||'there',
      context:clean(data.get('context'))||form.dataset.defaultContext,
      detail:clean(data.get('detail'))||form.dataset.defaultDetail
    };
    const template=form.dataset['template'+tone[0].toUpperCase()+tone.slice(1)]||form.dataset.templateWarm;
    result.textContent=fill(template,values).replace(/\n{3,}/g,'\n\n');
    result.classList.add('visible');
    copy.hidden=false;
    status.textContent='';
  });
  copy.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(result.textContent);status.textContent='Copied to clipboard';}
    catch(_){status.textContent='Select the draft and copy it';}
  });
})();
