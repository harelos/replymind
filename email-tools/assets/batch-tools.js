(function(){
  const form=document.querySelector('[data-batch-tool]');if(!form)return;
  const configNode=form.querySelector('[data-tool-config]');
  const errorNode=form.querySelector('[data-tool-error]');
  const outputNode=form.querySelector('[data-generated-message]');
  const subjectNode=form.querySelector('[data-generated-subject]');
  const bodyNode=form.querySelector('[data-generated-body]');
  const copyButton=form.querySelector('[data-copy]');
  const copyStatus=form.querySelector('[data-copy-status]');
  let config;
  try{config=JSON.parse(configNode.textContent);}catch(_){errorNode.textContent='This tool configuration could not be loaded.';errorNode.hidden=false;return;}
  const clean=value=>String(value==null?'':value).trim();
  const fill=(template,values)=>template.replace(/{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g,(_,key)=>clean(values[key]));
  const tidy=value=>value.replace(/[ \t]+\n/g,'\n').replace(/ {2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  form.addEventListener('submit',event=>{
    event.preventDefault();errorNode.hidden=true;copyStatus.textContent='';
    const data=new FormData(form);const values={};const missing=[];
    for(const field of config.fields){values[field.key]=clean(data.get(field.key));if(field.required&&!values[field.key])missing.push(field.key);}
    if(missing.length){errorNode.textContent='Complete the required fields before building the message.';errorNode.hidden=false;form.querySelector('[name="'+missing[0]+'"]')?.focus();return;}
    subjectNode.textContent=tidy(fill(config.subjectTemplate,values));bodyNode.textContent=tidy(fill(config.bodyTemplate,values));
    outputNode.hidden=false;copyButton.hidden=false;
  });
  copyButton.addEventListener('click',async()=>{
    const message='Subject: '+subjectNode.textContent+'\n\n'+bodyNode.textContent;
    try{await navigator.clipboard.writeText(message);copyStatus.textContent='Copied to clipboard';}
    catch(_){copyStatus.textContent='Select the generated message and copy it manually';}
  });
})();
