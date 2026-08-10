export const EVENT_TYPES = ["visit","step_view","next_step","bounce","session_end","checkout_start","purchase","refund","subscription_started","subscription_renewed","subscription_cancelled"] as const;
export type EventType = typeof EVENT_TYPES[number];
export interface AnalyticsEvent { event_id:string; event_type:EventType; occurred_at:string; property_id:string; funnel_id:string; experiment_id?:string; variant_id?:string; step_id?:string; previous_step_id?:string; visitor_id:string; session_id:string; campaign?:string; source?:string; medium?:string; consent:"analytics"|"essential"; amount_minor?:number; currency?:string; external_id?:string; metadata?:Record<string,string|number|boolean|null> }
export interface FunnelInput { id:string; property_id:string; name:string; status:"draft"|"published"|"archived"; steps:Array<{id:string;name:string;position:number;kind:"advertorial"|"sales"|"checkout"|"success"|"other";path:string}>; experiments:Array<{id:string;name:string;status:"draft"|"running"|"paused"|"completed";variants:Array<{id:string;name:string;weight:number}>}> }
const id=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,99}$/;
export function validateEvent(x:unknown): {ok:true;value:AnalyticsEvent}|{ok:false;errors:string[]} {
 const e=x as Partial<AnalyticsEvent>, errors:string[]=[];
 for(const k of ["event_id","property_id","funnel_id","visitor_id","session_id"] as const) if(typeof e?.[k]!=="string"||!id.test(e[k]!)) errors.push(`${k} is invalid`);
 if(!EVENT_TYPES.includes(e?.event_type as EventType)) errors.push("event_type is invalid");
 if(typeof e?.occurred_at!=="string"||!Number.isFinite(Date.parse(e.occurred_at))) errors.push("occurred_at is invalid");
 if(!["analytics","essential"].includes(e?.consent as string)) errors.push("consent is invalid");
 if(e?.amount_minor!==undefined&&(!Number.isInteger(e.amount_minor)||e.amount_minor<0)) errors.push("amount_minor must be a non-negative integer");
 if(e?.currency!==undefined&&!/^[A-Z]{3}$/.test(e.currency)) errors.push("currency must be ISO-4217 uppercase");
 if(e?.metadata&&JSON.stringify(e.metadata).length>4096) errors.push("metadata exceeds 4096 bytes");
 return errors.length?{ok:false,errors}:{ok:true,value:e as AnalyticsEvent};
}
export function assignVariant(visitorId:string, experimentId:string, variants:Array<{id:string;weight:number}>){
 const total=variants.reduce((n,v)=>n+v.weight,0); if(total<=0) throw new Error("variant weights must be positive");
 let h=2166136261; for(const c of `${experimentId}:${visitorId}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
 let bucket=(h>>>0)/4294967296*total; for(const v of variants){bucket-=v.weight;if(bucket<0)return v.id} return variants.at(-1)!.id;
}
