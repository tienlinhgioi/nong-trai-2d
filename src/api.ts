import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { staticApi } from './static-api';
export let supabase:SupabaseClient|null=null;
const staticHost=import.meta.env.VITE_STATIC_HOST==='true';
export async function configure(){
 const r=await fetch(staticHost?`${import.meta.env.BASE_URL}game-config.json`:'/api/config');
 if(!r.ok)throw Error('Không kết nối được máy chủ.');
 const c=await r.json();
 if(c.configured){
  if(typeof c.url!=='string'||typeof c.key!=='string'||!c.key.startsWith('sb_publishable_')&&staticHost)throw Error('Cấu hình Supabase không hợp lệ.');
  if(!supabase)supabase=createClient(c.url,c.key);
 }
 return !!c.configured;
}
export function authRedirectUrl(){return new URL(import.meta.env.BASE_URL,location.href).href}
export async function api<T>(path:string,body?:unknown):Promise<T>{
 if(!supabase)throw Object.assign(new Error('Vui lòng đăng nhập.'),{status:401});
 if(staticHost)return staticApi<T>(supabase,path,body);
 const {data}=await supabase.auth.getSession();
 const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+data.session?.access_token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const result=await r.json();
 if(!r.ok)throw Object.assign(new Error(result.error||'Không kết nối được máy chủ.'),{status:r.status});
 return result;
}
